#!/usr/bin/env python3
"""Skiv Goal 1 (2026-04-28) — calibration harness Skiv solo vs Pulverator pack.

Encounter `enc_savana_skiv_solo_vs_pack`: Skiv (Lv 4 mature) solo vs 3
Pulverator (1 alpha apex + 2 beta elite). Win NON eliminazione: survive
5 round + (idealmente) mark alpha. Target win_rate 35-45% (durissimo).

Greedy player policy: Skiv attacca nearest enemy (alpha priority),
disengage move quando hp < 50% per allungare survival.

N=20 default. Output: docs/playtest/2026-04-28-skiv-solo-pack-calibration.md.

Source: docs/planning/2026-04-27-skiv-personal-sprint-handoff.md §2 Goal 1
        + DoD Gate 3 calibration band 35-45%.

Pattern source: tools/py/batch_calibrate_hardcore07.py (timer-driven baseline).
"""

import argparse
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request

ENCOUNTER_ID = "enc_savana_skiv_solo_vs_pack"
SURVIVE_TURNS = 5
MAX_ROUNDS = 8
DEFAULT_HOST = "http://localhost:3334"


def _retry(fn, retries=5, backoff_base=0.5):
    """Retry exponential backoff su transient connection errors (TKT-08)."""
    last_err = None
    for attempt in range(retries):
        try:
            return fn()
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, ConnectionRefusedError, OSError) as e:
            last_err = e
            time.sleep(backoff_base * (2 ** attempt))
    raise last_err


def post(url, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        def _do():
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        return _retry(_do)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(body)
        except Exception:
            pass
        return e.code, body
    except Exception as e:
        return 0, {"error": f"connection failed after retries: {e}"}


def get(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        def _do():
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        return _retry(_do)
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception:
        return 0, {}


def health_check(host):
    status, _ = get(f"{host}/api/health")
    return status == 200


def manhattan(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])


def step_toward(a, b, gw, gh):
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


def step_away(a, b, gw, gh):
    """Disengage: move opposite to enemy."""
    nx, ny = a["x"], a["y"]
    if b["x"] > nx:
        nx = max(nx - 1, 0)
    elif b["x"] < nx:
        nx = min(nx + 1, gw - 1)
    elif b["y"] > ny:
        ny = max(ny - 1, 0)
    elif b["y"] < ny:
        ny = min(ny + 1, gh - 1)
    return {"x": nx, "y": ny}


def build_skiv_units():
    """Return units payload reflecting encounter spawns + tuned stats.

    Spawns close-range (Manhattan 2-3 da Skiv) per garantire pressure 1° round.
    Tuning iter1: enemy mod=2, dmg=2, Skiv mod=1, dc=12. Aim 35-45% win rate
    quando Skiv sceglie survival kite vs aggressive engage.
    """
    return [
        {
            "id": "skiv",
            "species": "dune_stalker",
            "job": "apex_predator",
            "hp": 6,
            "max_hp": 6,
            "ap": 2,
            "attack_range": 1,
            "mod": 0,
            "dc": 10,
            "initiative": 13,
            "position": {"x": 3, "y": 3},
            "controlled_by": "player",
            "status": {},
            "traits": ["marchio_predatorio"],
        },
        {
            "id": "pulverator_alpha",
            "species": "pulverator_gregarius",
            "job": "pack_alpha",
            "hp": 14,
            "max_hp": 14,
            "ap": 2,
            "attack_range": 1,
            "mod": 6,
            "dc": 15,
            "initiative": 11,
            "position": {"x": 4, "y": 5},
            "controlled_by": "sistema",
            "status": {},
        },
        {
            "id": "pulverator_beta_1",
            "species": "pulverator_gregarius",
            "job": "pack_beta",
            "hp": 10,
            "max_hp": 10,
            "ap": 2,
            "attack_range": 1,
            "mod": 5,
            "dc": 14,
            "initiative": 9,
            "position": {"x": 6, "y": 3},
            "controlled_by": "sistema",
            "status": {},
        },
        {
            "id": "pulverator_beta_2",
            "species": "pulverator_gregarius",
            "job": "pack_beta",
            "hp": 10,
            "max_hp": 10,
            "ap": 2,
            "attack_range": 1,
            "mod": 5,
            "dc": 14,
            "initiative": 8,
            "position": {"x": 3, "y": 6},
            "controlled_by": "sistema",
            "status": {},
        },
    ]


def plan_intents(state):
    units = state.get("units", [])
    skiv = next((u for u in units if u["id"] == "skiv" and u.get("hp", 0) > 0), None)
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not skiv or not enemies:
        return []
    grid = state.get("grid", {"width": 8, "height": 8})
    gw, gh = grid["width"], grid["height"]
    intents = []
    ap = skiv.get("ap_remaining", skiv.get("ap", 2))
    if ap <= 0:
        return []
    rng = skiv.get("attack_range", 1)
    # Priority: alpha first (mark_alpha condition), else nearest enemy
    alpha = next((e for e in enemies if e["id"] == "pulverator_alpha"), None)
    target = alpha or min(enemies, key=lambda e: manhattan(skiv["position"], e["position"]))
    dist = manhattan(skiv["position"], target["position"])
    hp_ratio = skiv.get("hp", 0) / max(1, skiv.get("max_hp", 14))
    # Survival flee logic: hp < 35% → kite away from nearest enemy
    nearest = min(enemies, key=lambda e: manhattan(skiv["position"], e["position"]))
    if hp_ratio < 0.35 and ap >= 1:
        new_pos = step_away(skiv["position"], nearest["position"], gw, gh)
        if new_pos != skiv["position"]:
            intents.append({"actor_id": "skiv", "action": {"type": "move", "position": new_pos}})
        return intents
    # Combat: attack if in range, else move + attack
    if dist <= rng:
        intents.append({
            "actor_id": "skiv",
            "action": {"type": "attack", "target_id": target["id"], "channel": "fisico"},
        })
    elif ap >= 2:
        new_pos = step_toward(skiv["position"], target["position"], gw, gh)
        intents.append({"actor_id": "skiv", "action": {"type": "move", "position": new_pos}})
        new_dist = manhattan(new_pos, target["position"])
        if new_dist <= rng:
            intents.append({
                "actor_id": "skiv",
                "action": {"type": "attack", "target_id": target["id"], "channel": "fisico"},
            })
    return intents


def detect_outcome(state, rounds):
    """Win = Skiv alive at end of round 5+. Defeat = Skiv dead.
    Note: pack always > Skiv numerically, so "all enemies dead" implausible
    but counted as win as well (same as survival)."""
    units = state.get("units", [])
    skiv_alive = any(u["id"] == "skiv" and u.get("hp", 0) > 0 for u in units)
    enemies_alive = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not skiv_alive:
        return "defeat"
    if not enemies_alive:
        return "victory"  # rare: Skiv kills full pack
    if rounds >= SURVIVE_TURNS:
        return "victory"  # survival success
    return None


def run_one(host, run_idx):
    units = build_skiv_units()
    status, start = post(f"{host}/api/session/start", {
        "units": units,
        "encounter_id": ENCOUNTER_ID,
        "biome_id": "savana",
    })
    if status != 200:
        return {"run": run_idx, "error": f"start {status}: {start}"}

    sid = start["session_id"]
    state = start.get("state", start)
    outcome = None
    rounds = 0
    skiv_initial_hp = 14
    alpha_marked = False

    for r in range(1, MAX_ROUNDS + 1):
        rounds = r
        intents = plan_intents(state)
        status, resp = post(f"{host}/api/session/round/execute", {
            "session_id": sid,
            "player_intents": intents,
            "ai_auto": True,
        })
        if status != 200:
            outcome = "error"
            break
        state = resp.get("state", state)
        # Check alpha marked status
        for u in state.get("units", []):
            if u["id"] == "pulverator_alpha" and u.get("status", {}).get("marked", 0) > 0:
                alpha_marked = True
        outcome = detect_outcome(state, r)
        if outcome:
            break

    if not outcome:
        # Fell through MAX_ROUNDS without resolution → treat as survival (win)
        outcome = "victory"

    post(f"{host}/api/session/end", {"session_id": sid})

    final_units = state.get("units", [])
    skiv_final = next((u for u in final_units if u["id"] == "skiv"), None)
    skiv_hp = skiv_final.get("hp", 0) if skiv_final else 0
    enemies_killed = sum(
        1 for u in final_units
        if u.get("controlled_by") == "sistema" and u.get("hp", 0) <= 0
    )
    return {
        "run": run_idx,
        "outcome": outcome,
        "rounds": rounds,
        "skiv_hp_final": skiv_hp,
        "skiv_hp_pct": round(skiv_hp / skiv_initial_hp * 100, 1) if skiv_hp else 0,
        "enemies_killed": enemies_killed,
        "alpha_marked": alpha_marked,
    }


def summarise(runs):
    ok = [r for r in runs if "outcome" in r]
    n = len(ok)
    if n == 0:
        return {"n": 0, "error": "no completed runs"}
    wins = sum(1 for r in ok if r["outcome"] == "victory")
    defeats = sum(1 for r in ok if r["outcome"] == "defeat")
    errors = len(runs) - n
    rounds = [r["rounds"] for r in ok]
    skiv_hp = [r["skiv_hp_final"] for r in ok]
    marks = sum(1 for r in ok if r.get("alpha_marked"))
    return {
        "n": n,
        "errors": errors,
        "win_rate": round(wins / n * 100, 1),
        "defeat_rate": round(defeats / n * 100, 1),
        "alpha_mark_rate": round(marks / n * 100, 1),
        "rounds_avg": round(statistics.mean(rounds), 2),
        "rounds_median": statistics.median(rounds),
        "skiv_hp_avg": round(statistics.mean(skiv_hp), 1) if skiv_hp else 0,
        "skiv_hp_median": statistics.median(skiv_hp),
    }


def write_report(host, args, runs, summary, target_band):
    out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "playtest")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "2026-04-28-skiv-solo-pack-calibration.md")

    lo, hi = target_band
    win_rate = summary.get("win_rate", 0)
    in_band = lo <= win_rate <= hi
    band_status = "in band" if in_band else (
        "below band (Skiv too weak / pack too strong)" if win_rate < lo
        else "above band (Skiv too strong / pack too weak)"
    )

    lines = [
        "---",
        "title: 'Skiv Goal 1 — encounter solo vs Pulverator pack calibration'",
        "date: 2026-04-28",
        "doc_status: active",
        "doc_owner: master-dd",
        "workstream: ops-qa",
        "last_verified: '2026-04-28'",
        "source_of_truth: false",
        "language: it",
        "review_cycle_days: 30",
        "tags: [calibration, skiv, encounter, solo-vs-pack, hardcore]",
        "---",
        "",
        "# Skiv Goal 1 — calibrazione encounter solo vs Pulverator pack",
        "",
        f"**Encounter**: `{ENCOUNTER_ID}`  ",
        f"**Target win band**: {lo}-{hi}%  ",
        f"**Survive turns**: {SURVIVE_TURNS} (round limit harness {MAX_ROUNDS})  ",
        f"**Sample size N**: {args.n}  ",
        f"**Host**: {host}  ",
        f"**Date**: 2026-04-28",
        "",
        "## Risultati aggregati",
        "",
        f"- N completed: **{summary['n']}** / {args.n} (errors: {summary.get('errors', 0)})",
        f"- Win rate: **{win_rate}%** ({band_status})",
        f"- Defeat rate: {summary['defeat_rate']}%",
        f"- Alpha mark rate: {summary['alpha_mark_rate']}% (mark_alpha condition surrogate)",
        f"- Rounds avg/median: {summary['rounds_avg']} / {summary['rounds_median']}",
        f"- Skiv HP final avg/median: {summary['skiv_hp_avg']} / {summary['skiv_hp_median']}",
        "",
        f"**Verdict**: {'IN BAND' if in_band else 'OUT OF BAND'}",
        "",
        "## Per-run breakdown",
        "",
        "| run | outcome | rounds | Skiv hp_final | enemies_killed | alpha_marked |",
        "|---|---|---|---|---|---|",
    ]
    for r in runs:
        if "outcome" in r:
            lines.append(
                f"| {r['run']} | {r['outcome']} | {r['rounds']} | "
                f"{r['skiv_hp_final']} | {r['enemies_killed']} | "
                f"{'YES' if r.get('alpha_marked') else 'no'} |"
            )
        else:
            lines.append(f"| {r['run']} | ERROR | — | — | — | — |")

    lines.extend([
        "",
        "## Tuning recommendations",
        "",
        "Se win_rate **below band** (<35%): ridurre 1 di:",
        "- Pulverator alpha hp 11 → 9",
        "- Pulverator beta hp 8 → 6 (entrambi)",
        "- Skiv hp 14 → 16",
        "",
        "Se win_rate **above band** (>45%): aumentare 1 di:",
        "- Pulverator beta count 2 → 3 (4 enemy totali)",
        "- Skiv attack_range 1 → 0 (force adj only, ineffective vs ranged)",
        "- Aggiungere status panic AoE alpha round 2 (simil voce_imperiosa)",
        "",
        "_Generated by `tools/py/batch_calibrate_skiv_solo_pack.py`._",
    ])

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return out_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default=DEFAULT_HOST, help="backend base URL")
    parser.add_argument("--n", type=int, default=20, help="run count (default 20)")
    parser.add_argument("--target-low", type=int, default=35)
    parser.add_argument("--target-high", type=int, default=45)
    parser.add_argument("--no-report", action="store_true", help="skip md report write")
    parser.add_argument("--json-out", help="optional path to dump raw runs JSON")
    args = parser.parse_args()

    host = args.host.rstrip("/")
    if not health_check(host):
        print(f"ERROR: backend non risponde a {host}/api/health", file=sys.stderr)
        print("Avvia con: npm run start:api (porta 3334)", file=sys.stderr)
        sys.exit(2)

    runs = []
    for i in range(1, args.n + 1):
        result = run_one(host, i)
        runs.append(result)
        outcome = result.get("outcome", "ERROR")
        marker = " ✓mark" if result.get("alpha_marked") else ""
        print(f"[run {i:02d}/{args.n}] {outcome:8s} rounds={result.get('rounds', '?'):2} hp={result.get('skiv_hp_final', '?'):2}{marker}")

    summary = summarise(runs)
    print()
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print()

    if not args.no_report:
        report_path = write_report(host, args, runs, summary, (args.target_low, args.target_high))
        print(f"Report: {report_path}")

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump({"summary": summary, "runs": runs}, f, indent=2, ensure_ascii=False)
        print(f"JSON: {args.json_out}")

    win_rate = summary.get("win_rate", 0)
    in_band = args.target_low <= win_rate <= args.target_high
    sys.exit(0 if in_band else 1)


if __name__ == "__main__":
    main()
