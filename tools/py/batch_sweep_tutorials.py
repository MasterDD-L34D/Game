#!/usr/bin/env python3
"""TKT-07 — generic tutorial balance sweep (enc_tutorial_01-05).

Runs N AI-vs-AI sessions per tutorial scenario and reports win/defeat/timeout
rates + a GREEN/AMBER/RED verdict against the canonical class target_bands
(damage_curves.yaml). Class is derived per scenario from its difficulty_rating
(1->tutorial, 2->tutorial_advanced, 3->standard, 4->hardcore, 5->boss).

Reuses batch_calibrate_hardcore06 helpers (HTTP retry, player intent planner,
outcome detection, band loader/verdict) so this stays a thin orchestrator. The
hardcore scripts are scenario-hardcoded (boss + hazard + turn_limit); this is
the missing GENERIC sweep across the tutorial ladder.

Usage:
  # Boot a backend first (PORT=3340 node apps/backend/index.js), then:
  python tools/py/batch_sweep_tutorials.py --n 10 \\
      --out docs/playtest/2026-05-21-tutorial-sweep.json

  # Subset / custom host (use 127.0.0.1, not localhost -- L-074 IPv6 stall):
  python tools/py/batch_sweep_tutorials.py --host http://127.0.0.1:3340 \\
      --scenarios enc_tutorial_01,enc_tutorial_03 --n 10 --skip-health

Refs: docs/playtest/2026-04-17-master-dd-tutorial-sweep.md (sweep #1 baseline).
"""

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import batch_calibrate_hardcore06 as h6  # noqa: E402  (reused helpers)

DIFF_TO_CLASS = {1: "tutorial", 2: "tutorial_advanced", 3: "standard", 4: "hardcore", 5: "boss"}
DEFAULT_SCENARIOS = [
    "enc_tutorial_01",
    "enc_tutorial_02",
    "enc_tutorial_03",
    "enc_tutorial_04",
    "enc_tutorial_05",
]


def run_one(host, scenario_id):
    """One session: fetch scenario -> start -> greedy player AI vs ai_auto sistema
    until outcome or MAX_ROUNDS -> end. Tutorials carry no turn_limit_defeat, so an
    unresolved game at the round cap stays a 'timeout' (not forced defeat)."""
    status, sc = h6.get(f"{host}/api/tutorial/{scenario_id}")
    if status != 200 or not isinstance(sc, dict):
        return {"error": f"fetch scenario {status}"}
    units = sc.get("units")
    if not units:
        return {"error": "scenario has no units"}
    difficulty = sc.get("difficulty") or sc.get("difficulty_rating") or 1
    status, start = h6.post(
        f"{host}/api/session/start",
        {
            "units": units,
            # #3157 F3: tag the session so per-scenario telemetry stops logging null
            "scenario_id": scenario_id,
            "modulation": sc.get("recommended_modulation", "full"),
            "sistema_pressure_start": sc.get("sistema_pressure_start", 50),
            "hazard_tiles": sc.get("hazard_tiles", []),
            "encounter": {"id": scenario_id},
        },
    )
    if status != 200 or not isinstance(start, dict):
        return {"error": f"session/start {status}"}
    sid = start.get("session_id")
    state = start.get("state", {})
    outcome = None
    for _ in range(1, h6.MAX_ROUNDS + 1):
        outcome = h6.detect_outcome(state, None)  # None => timeout stays timeout
        if outcome:
            break
        intents = h6.plan_player_intents(state, None)
        st, resp = h6.post(
            f"{host}/api/session/round/execute",
            {"session_id": sid, "player_intents": intents, "ai_auto": True, "priority_queue": True},
        )
        if st != 200 or not isinstance(resp, dict):
            # Codex P1: a failed round/execute must NOT be silently relabeled from
            # stale state as timeout/victory/defeat (would under-report failures and
            # fake a health pass). Surface it as an error run; end the session first.
            h6.post(f"{host}/api/session/end", {"session_id": sid})
            return {"error": f"round/execute {st}", "rounds": state.get("turn", 0)}
        state = resp.get("state", state)
    if outcome is None:
        outcome = h6.detect_outcome(state, None) or "timeout"
    # #3157 F2: declare the client-computed failure outcome so round-cap runs
    # stop surfacing as board-derived 'abandon' (server gate: downgrade-only).
    declared = {"outcome": outcome} if outcome in ("timeout", "defeat") else {}
    h6.post(f"{host}/api/session/end", {"session_id": sid, **declared})
    return {"outcome": outcome, "rounds": state.get("turn", 0), "difficulty": difficulty}


def aggregate(runs, scenario_id):
    ok = [r for r in runs if "outcome" in r]
    errs = [r for r in runs if "error" in r]
    n = len(ok)
    if n == 0:
        return {"scenario": scenario_id, "n": 0, "errors": len(errs), "verdict": "ERROR"}
    v = sum(1 for r in ok if r["outcome"] == "victory")
    d = sum(1 for r in ok if r["outcome"] == "defeat")
    t = sum(1 for r in ok if r["outcome"] == "timeout")
    wr, dr, tr = v / n, d / n, t / n
    difficulty = int(ok[0].get("difficulty") or 1)
    cls = DIFF_TO_CLASS.get(difficulty, "standard")
    bands = h6.load_target_bands(cls)
    verdict, reasons = h6.verdict_for(wr, dr, tr, bands) if bands else ("UNKNOWN", ["no bands for class"])
    return {
        "scenario": scenario_id,
        "n": n,
        "errors": len(errs),
        "difficulty": difficulty,
        "class": cls,
        "win_rate": round(wr, 3),
        "defeat_rate": round(dr, 3),
        "timeout_rate": round(tr, 3),
        "rounds_avg": round(sum(r.get("rounds", 0) for r in ok) / n, 1),
        "verdict": verdict,
        "reasons": reasons,
        "bands": bands,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--host", default="http://127.0.0.1:3340", help="Backend URL (127.0.0.1, not localhost)")
    p.add_argument("--n", type=int, default=10, help="Runs per scenario (default 10; L-069: direction probe, not ratify)")
    p.add_argument("--scenarios", default=",".join(DEFAULT_SCENARIOS), help="Comma-separated scenario ids")
    p.add_argument("--out", default=None, help="Write JSON report to this path")
    p.add_argument("--skip-health", action="store_true")
    args = p.parse_args()

    if not args.skip_health and not h6.health_check(args.host):
        print(f"ERROR: backend not healthy at {args.host}", file=sys.stderr)
        return 2

    scenarios = [s.strip() for s in args.scenarios.split(",") if s.strip()]
    results = []
    t0 = time.time()
    for s in scenarios:
        runs = [run_one(args.host, s) for _ in range(args.n)]
        agg = aggregate(runs, s)
        results.append(agg)
        if agg.get("n"):
            print(
                f"{s}: WR={agg['win_rate'] * 100:.0f}% def={agg['defeat_rate'] * 100:.0f}% "
                f"to={agg['timeout_rate'] * 100:.0f}% rounds~{agg['rounds_avg']} "
                f"[{agg['class']}] {agg['verdict']}",
                flush=True,
            )
        else:
            print(f"{s}: ERROR ({agg.get('errors')} failed runs)", file=sys.stderr, flush=True)

    report = {
        "method": "tutorial-sweep",
        "n_per_scenario": args.n,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),  # UTC (Codex P2)
        "elapsed_sec": round(time.time() - t0, 1),
        "caveat": (
            "Player side uses a SCRIPTED greedy planner (focus-fire + channel exploit), "
            "not the real ai_profiles (aggressive/balanced/cautious) nor human play, so "
            "win_rate is upward-biased. The verdict maps difficulty_rating->class bands, "
            "but tutorials are a learning ladder (designed-winnable), not hardcore/boss "
            "combat classes -- so RED for diff 4-5 is a mapping artifact, not a balance bug. "
            "Read this sweep as a HEALTH/completability check (all scenarios run + winnable), "
            "NOT a balance oracle. For true balance use real ai_profiles or master-dd playtest."
        ),
        "results": results,
    }
    if args.out:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"report: {args.out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
