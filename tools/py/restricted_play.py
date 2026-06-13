#!/usr/bin/env python3
"""Restricted Play harness (Jaffe 2012 AIIDE) — multi-policy triangulation.

Replace single-policy greedy → human WR proxy (rejected by Jaffe 2012,
Politowski IEEE CoG 2023) with multi-policy band [random_WR, strong_WR].

Applies P0 finding from balance-illuminator agent smoke test
(docs/qa/2026-04-26-balance-illuminator-smoke.md). stdlib-only (policy
compliance: no new deps).

## Policies

- `random`: pick valid action uniformly (skill floor, noise baseline)
- `greedy`: attack closest enemy, move toward if out of range (current batch
  harness default)
- `utility`: prefer highest-HP enemy (tank priority) + low-HP self defense
  (lookahead-lite proxy for smart play)

## Usage

    # Single policy
    PYTHONPATH=. python3 tools/py/restricted_play.py \\
        --policy greedy --scenario enc_tutorial_06_hardcore --n 10

    # Triangulation (all 3 policies) + WR band + human WR estimate
    PYTHONPATH=. python3 tools/py/restricted_play.py \\
        --all-policies --scenario enc_tutorial_06_hardcore --n 10

    # Output report markdown
    PYTHONPATH=. python3 tools/py/restricted_play.py --all-policies \\
        --scenario enc_tutorial_06_hardcore --n 10 \\
        --out-md docs/playtest/2026-04-26-restricted-play-hardcore06.md

## Non-goals (deferred)

- MCTS smart policy (requires session state clone API)
- SPRT sequential early-stop (separate harness)
- MAP-Elites illumination archive

Ref agent: .claude/agents/balance-illuminator.md
Ref Jaffe 2012: https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf
"""

from __future__ import annotations

import argparse
import json
import os
import random
import statistics
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional


DEFAULT_HOST = "http://localhost:3334"
MAX_ROUNDS = 25
VALID_POLICIES = ("random", "greedy", "utility")

# Human WR estimation weighting (Jaffe 2012 style — tune post-TKT-M11B-06).
# Humans approximate "lookahead-2" skill level; greedy is floor, utility proxy for ceiling.
HUMAN_WR_GREEDY_WEIGHT = 0.55
HUMAN_WR_UTILITY_WEIGHT = 0.45


@dataclass
class RunResult:
    run: int
    outcome: str  # victory | defeat | timeout | error
    rounds: int
    players_alive: int
    enemies_alive: int
    kd: float


def http_post(url: str, payload: dict) -> tuple[int, dict]:
    """POST JSON, tolerant to HTTPError bodies."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except (json.JSONDecodeError, ValueError):
            parsed = {"error": body}
        return e.code, parsed
    except (urllib.error.URLError, TimeoutError) as e:
        return 0, {"error": str(e)}


def http_get(url: str) -> tuple[int, dict]:
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, {}
    except (urllib.error.URLError, TimeoutError):
        return 0, {}


def manhattan(a: dict, b: dict) -> int:
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])


def step_toward(a: dict, b: dict, gw: int, gh: int) -> dict:
    """Move 1 tile toward b, clamped to grid."""
    nx, ny = a["x"], a["y"]
    if b["x"] > nx:
        nx = min(nx + 1, gw - 1)
    elif b["x"] < nx:
        nx = max(nx - 1, 0)
    elif b["y"] > ny:
        ny = min(ny + 1, gh - 1)
    elif b["y"] < ny:
        ny = max(ny - 1, 0)
    return {"x": nx, "y": ny}


# ─────────────────────────────────────────────────────────
# Policies (stdlib-only, deterministic when rng seeded)
# ─────────────────────────────────────────────────────────


def plan_random(state: dict, rng: random.Random) -> list[dict]:
    """Random valid action per player. Skill floor."""
    units = state.get("units", [])
    players = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not players or not enemies:
        return []
    grid = state.get("grid", {"width": 10, "height": 10})
    gw, gh = grid["width"], grid["height"]
    intents: list[dict] = []
    for pl in players:
        ap = pl.get("ap_remaining", pl.get("ap", 2))
        if ap <= 0:
            continue
        rng_choice = rng.random()
        if rng_choice < 0.5 and enemies:
            # Attack random enemy in range
            rng_target = rng.choice(enemies)
            rng_range = pl.get("attack_range", 1)
            if manhattan(pl["position"], rng_target["position"]) <= rng_range:
                intents.append(
                    {
                        "actor_id": pl["id"],
                        "action": {
                            "type": "attack",
                            "target_id": rng_target["id"],
                            "channel": "fisico",
                        },
                    }
                )
        else:
            # Random adjacent move
            dx = rng.choice([-1, 0, 1])
            dy = rng.choice([-1, 0, 1])
            if dx or dy:
                new_pos = {
                    "x": max(0, min(gw - 1, pl["position"]["x"] + dx)),
                    "y": max(0, min(gh - 1, pl["position"]["y"] + dy)),
                }
                intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": new_pos}})
    return intents


def plan_greedy(state: dict, rng: random.Random) -> list[dict]:
    """Attack closest enemy, move toward if out of range. Current batch_calibrate pattern."""
    units = state.get("units", [])
    players = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not players or not enemies:
        return []
    grid = state.get("grid", {"width": 10, "height": 10})
    gw, gh = grid["width"], grid["height"]
    intents: list[dict] = []
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}
    for pl in players:
        ap = pl.get("ap_remaining", pl.get("ap", 2))
        if ap <= 0:
            continue
        rng_range = pl.get("attack_range", 1)
        target = min(enemies, key=lambda e: manhattan(pl["position"], e["position"]))
        dist = manhattan(pl["position"], target["position"])
        if dist <= rng_range:
            intents.append(
                {
                    "actor_id": pl["id"],
                    "action": {"type": "attack", "target_id": target["id"], "channel": "fisico"},
                }
            )
        elif ap >= 2:
            new_pos = step_toward(pl["position"], target["position"], gw, gh)
            if (new_pos["x"], new_pos["y"]) not in reserved:
                intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": new_pos}})
                reserved.discard((pl["position"]["x"], pl["position"]["y"]))
                reserved.add((new_pos["x"], new_pos["y"]))
    return intents


def plan_utility(state: dict, rng: random.Random) -> list[dict]:
    """Utility heuristic: target HIGHEST-HP enemy (kill big first). Smart-ish."""
    units = state.get("units", [])
    players = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not players or not enemies:
        return []
    grid = state.get("grid", {"width": 10, "height": 10})
    gw, gh = grid["width"], grid["height"]
    intents: list[dict] = []
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}
    # Sort enemies by HP desc — prioritize tanks/boss (TANK FIRST strategy).
    enemies_by_threat = sorted(enemies, key=lambda e: -e.get("hp", 0))
    top_target = enemies_by_threat[0]
    for pl in players:
        ap = pl.get("ap_remaining", pl.get("ap", 2))
        if ap <= 0:
            continue
        rng_range = pl.get("attack_range", 1)
        # Check if in range of top_target; fallback closest if not.
        dist_top = manhattan(pl["position"], top_target["position"])
        if dist_top <= rng_range:
            intents.append(
                {
                    "actor_id": pl["id"],
                    "action": {"type": "attack", "target_id": top_target["id"], "channel": "fisico"},
                }
            )
        else:
            closest = min(enemies, key=lambda e: manhattan(pl["position"], e["position"]))
            dist_close = manhattan(pl["position"], closest["position"])
            if dist_close <= rng_range:
                intents.append(
                    {
                        "actor_id": pl["id"],
                        "action": {
                            "type": "attack",
                            "target_id": closest["id"],
                            "channel": "fisico",
                        },
                    }
                )
            elif ap >= 2:
                # Move toward top_target (commit to kill big).
                new_pos = step_toward(pl["position"], top_target["position"], gw, gh)
                if (new_pos["x"], new_pos["y"]) not in reserved:
                    intents.append(
                        {"actor_id": pl["id"], "action": {"type": "move", "position": new_pos}}
                    )
                    reserved.discard((pl["position"]["x"], pl["position"]["y"]))
                    reserved.add((new_pos["x"], new_pos["y"]))
    return intents


POLICY_FUNCS = {
    "random": plan_random,
    "greedy": plan_greedy,
    "utility": plan_utility,
}


# ─────────────────────────────────────────────────────────
# Session runner
# ─────────────────────────────────────────────────────────


def detect_outcome(state: dict) -> str | None:
    units = state.get("units", [])
    pa = sum(1 for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0)
    ea = sum(1 for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0)
    if pa == 0:
        return "defeat"
    if ea == 0:
        return "victory"
    return None


def run_one(
    host: str,
    scenario_id: str,
    policy: str,
    seed: int,
    unit_override: Optional[Callable[[dict], dict]] = None,
) -> RunResult:
    """Run one session with specified policy. Returns outcome.

    If `unit_override` is provided it's applied to each unit dict before
    `/api/session/start`. Enables MAP-Elites or similar tools to inject build
    stats (hp/mod/dc/…) into specific roles without duplicating the runner.
    """
    rng = random.Random(seed)
    plan_fn = POLICY_FUNCS[policy]

    status, sc = http_get(f"{host}/api/tutorial/{scenario_id}")
    if status != 200:
        return RunResult(run=-1, outcome="error", rounds=0, players_alive=0, enemies_alive=0, kd=0.0)

    raw_units = sc.get("units", [])
    if unit_override is not None:
        raw_units = [unit_override(u) for u in raw_units]
    start_body = {
        "units": raw_units,
        "modulation": sc.get("recommended_modulation", "quartet"),
        "sistema_pressure_start": sc.get("sistema_pressure_start", 60),
        "hazard_tiles": sc.get("hazard_tiles", []),
    }
    if sc.get("mission_timer"):
        start_body["encounter"] = {
            "mission_timer": sc.get("mission_timer"),
            "reinforcement_policy": sc.get("reinforcement_policy"),
            "reinforcement_pool": sc.get("reinforcement_pool"),
            "reinforcement_entry_tiles": sc.get("reinforcement_entry_tiles"),
        }
    status, start = http_post(f"{host}/api/session/start", start_body)
    if status != 200:
        return RunResult(run=-1, outcome="error", rounds=0, players_alive=0, enemies_alive=0, kd=0.0)

    sid = start["session_id"]
    state = start["state"]
    enemy_initial = sum(1 for u in state.get("units", []) if u.get("controlled_by") == "sistema")
    player_initial = sum(1 for u in state.get("units", []) if u.get("controlled_by") == "player")

    outcome: str | None = None
    rounds = 0
    for r in range(1, MAX_ROUNDS + 1):
        rounds = r
        intents = plan_fn(state, rng)
        status, resp = http_post(
            f"{host}/api/session/round/execute",
            {"session_id": sid, "player_intents": intents, "ai_auto": True},
        )
        if status != 200:
            outcome = "error"
            break
        state = resp.get("state", state)
        outcome = detect_outcome(state)
        if outcome:
            break

    if not outcome:
        outcome = "timeout"

    http_post(f"{host}/api/session/end", {"session_id": sid})
    final_units = state.get("units", [])
    players_alive = sum(
        1 for u in final_units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0
    )
    enemies_alive = sum(
        1 for u in final_units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0
    )
    kills = enemy_initial - enemies_alive
    losses = player_initial - players_alive
    kd = round(kills / max(1, losses), 2)
    return RunResult(
        run=0, outcome=outcome, rounds=rounds, players_alive=players_alive, enemies_alive=enemies_alive, kd=kd
    )


def run_batch(
    host: str,
    scenario_id: str,
    policy: str,
    n: int,
    seed_base: int = 1000,
    unit_override: Optional[Callable[[dict], dict]] = None,
) -> dict:
    """Run N sessions with policy; return aggregate WR + stats."""
    runs: list[RunResult] = []
    for i in range(n):
        r = run_one(host, scenario_id, policy, seed=seed_base + i, unit_override=unit_override)
        r.run = i + 1
        runs.append(r)
    ok = [r for r in runs if r.outcome in ("victory", "defeat", "timeout")]
    if not ok:
        return {"policy": policy, "n": 0, "error": "no completed runs"}
    wins = sum(1 for r in ok if r.outcome == "victory")
    defeats = sum(1 for r in ok if r.outcome == "defeat")
    timeouts = sum(1 for r in ok if r.outcome == "timeout")
    rounds = [r.rounds for r in ok]
    kds = [r.kd for r in ok]
    return {
        "policy": policy,
        "n": len(ok),
        "win_rate": round(wins / len(ok) * 100, 1),
        "defeat_rate": round(defeats / len(ok) * 100, 1),
        "timeout_rate": round(timeouts / len(ok) * 100, 1),
        "rounds_avg": round(statistics.mean(rounds), 1),
        "rounds_median": statistics.median(rounds),
        "kd_avg": round(statistics.mean(kds), 2),
    }


def estimate_human_wr(results_by_policy: dict[str, dict]) -> dict:
    """Compute WR band + human WR estimate per Jaffe 2012 triangulation.

    human_wr ≈ greedy × 0.55 + utility × 0.45
    (tune constants post-TKT-M11B-06 playtest)
    """
    wr_values = [r.get("win_rate", 0) for r in results_by_policy.values() if "win_rate" in r]
    if not wr_values:
        return {"error": "no valid WR data"}
    band = [min(wr_values), max(wr_values)]
    greedy = results_by_policy.get("greedy", {}).get("win_rate", 0)
    utility = results_by_policy.get("utility", {}).get("win_rate", 0)
    estimate = round(
        greedy * HUMAN_WR_GREEDY_WEIGHT + utility * HUMAN_WR_UTILITY_WEIGHT, 1
    )
    return {
        "band": band,
        "band_width_pp": round(band[1] - band[0], 1),
        "human_wr_estimate": estimate,
        "skill_dominated": band[1] - band[0] >= 20,  # wide band = skill matters
        "luck_dominated": band[1] - band[0] < 10,  # narrow = RNG dominates
        "weights": {
            "greedy": HUMAN_WR_GREEDY_WEIGHT,
            "utility": HUMAN_WR_UTILITY_WEIGHT,
        },
    }


def format_markdown(scenario_id: str, results: dict[str, dict], band_estimate: dict, n: int) -> str:
    today = datetime.now().date().isoformat()
    lines: list[str] = []
    lines.append("---")
    lines.append(f"title: Restricted Play — {scenario_id} ({today})")
    lines.append("workstream: combat")
    lines.append("category: playtest")
    lines.append("doc_status: active")
    lines.append("doc_owner: claude-code")
    lines.append(f"last_verified: '{today}'")
    lines.append("source_of_truth: false")
    lines.append("language: it")
    lines.append("review_cycle_days: 30")
    lines.append("tags:")
    lines.append("  - restricted-play")
    lines.append("  - balance")
    lines.append("  - jaffe-2012")
    lines.append("  - generated")
    lines.append("---")
    lines.append("")
    lines.append(f"# Restricted Play Triangulation — `{scenario_id}`")
    lines.append("")
    lines.append(f"N = {n} per policy. Pattern Jaffe 2012 AIIDE (multi-policy band).")
    lines.append("")
    lines.append("## Policy results")
    lines.append("")
    lines.append("| Policy | N | Win rate | Defeat | Timeout | Rounds avg | KD avg |")
    lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
    for policy in VALID_POLICIES:
        r = results.get(policy, {})
        if "error" in r:
            lines.append(f"| `{policy}` | — | error: {r['error']} |  |  |  |  |")
            continue
        lines.append(
            f"| `{policy}` | {r.get('n',0)} | {r.get('win_rate',0):.1f}% | "
            f"{r.get('defeat_rate',0):.1f}% | {r.get('timeout_rate',0):.1f}% | "
            f"{r.get('rounds_avg',0):.1f} | {r.get('kd_avg',0):.2f} |"
        )
    lines.append("")
    if "band" in band_estimate:
        lines.append("## Triangulation (Jaffe 2012)")
        lines.append("")
        lines.append(f"- **Band**: [{band_estimate['band'][0]:.1f}%, {band_estimate['band'][1]:.1f}%]")
        lines.append(f"- **Band width**: {band_estimate['band_width_pp']:.1f}pp")
        lines.append(f"- **Human WR estimate**: {band_estimate['human_wr_estimate']:.1f}%")
        if band_estimate.get("skill_dominated"):
            lines.append("- Verdict: 🎯 **skill-dominated** (band ≥20pp) — positioning matters")
        elif band_estimate.get("luck_dominated"):
            lines.append("- Verdict: 🎲 **luck-dominated** (band <10pp) — RNG dominates, tune variance")
        else:
            lines.append("- Verdict: ⚖️ **mixed** (band 10-20pp)")
        lines.append("")
        weights = band_estimate.get("weights", {})
        lines.append(
            f"Formula: human_wr ≈ greedy × {weights.get('greedy',0)} + utility × {weights.get('utility',0)}"
        )
        lines.append("(Tunare constants post TKT-M11B-06 playtest live.)")
        lines.append("")
    lines.append("## Sources")
    lines.append("")
    lines.append("- [Jaffe AIIDE 2012 — Restricted Play](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf)")
    lines.append("- [Politowski IEEE CoG 2023](https://arxiv.org/abs/2304.08699)")
    lines.append("- Agent: `.claude/agents/balance-illuminator.md`")
    lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--policy", choices=VALID_POLICIES, default=None)
    parser.add_argument("--all-policies", action="store_true", help="Run all 3 policies")
    parser.add_argument("--scenario", required=True, help="Scenario id (es. enc_tutorial_06_hardcore)")
    parser.add_argument("--n", type=int, default=10, help="Runs per policy (default 10)")
    parser.add_argument("--host", default=os.environ.get("REST_PLAY_HOST", DEFAULT_HOST))
    parser.add_argument("--seed-base", type=int, default=1000)
    parser.add_argument("--out-md", default=None)
    parser.add_argument("--out-json", default=None)
    args = parser.parse_args(argv)

    if not args.all_policies and not args.policy:
        parser.error("Specify --policy or --all-policies")

    policies_to_run = list(VALID_POLICIES) if args.all_policies else [args.policy]

    print(f"Restricted Play: scenario={args.scenario} N={args.n} policies={policies_to_run}")
    t0 = time.time()
    results: dict[str, dict] = {}
    for policy in policies_to_run:
        print(f"  running policy={policy} …", flush=True)
        t_pol = time.time()
        results[policy] = run_batch(args.host, args.scenario, policy, args.n, args.seed_base)
        elapsed = round(time.time() - t_pol, 1)
        if "error" in results[policy]:
            print(f"    error: {results[policy]['error']}", flush=True)
        else:
            print(
                f"    WR={results[policy].get('win_rate',0):.1f}% elapsed={elapsed}s",
                flush=True,
            )

    band_estimate = estimate_human_wr(results) if args.all_policies else {}

    summary = {
        "scenario": args.scenario,
        "n": args.n,
        "elapsed_s": round(time.time() - t0, 1),
        "results": results,
        "triangulation": band_estimate,
    }
    print("\n=== SUMMARY ===")
    print(json.dumps(summary, indent=2))

    if args.out_md:
        md = format_markdown(args.scenario, results, band_estimate, args.n)
        out_path = Path(args.out_md)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(md, encoding="utf-8")
        print(f"Markdown saved: {out_path}")

    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"JSON saved: {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
