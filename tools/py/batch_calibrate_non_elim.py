#!/usr/bin/env python3
"""Batch calibration runner — non-elimination encounter scenarios.

Loads YAML encounter file, starts session with `encounter` payload, runs N
rounds via /round/begin-planning → /commit-round auto_resolve. Collects
outcome (win/wipe/timeout/objective_failed) da /end response objective_state.

Use con encounters che usano objectiveEvaluator (ADR-2026-04-20):
  - enc_capture_01 (capture_point)
  - enc_escort_01 (escort)
  - enc_survival_01 (survival)
  - enc_hardcore_reinf_01 (elimination + reinforcement_pool, ADR-04-19)

Usage:
  python3 tools/py/batch_calibrate_non_elim.py --scenario enc_capture_01 --n 10
  python3 tools/py/batch_calibrate_non_elim.py --scenario enc_survival_01 --probe

Requires backend running on --host (default localhost:3334).
YAML parsing via PyYAML — fallback a manual parse se non disponibile.
"""

import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_HOST = "http://localhost:3334"
MAX_ROUNDS = 30
ENCOUNTERS_DIR = Path(__file__).resolve().parent.parent.parent / "docs" / "planning" / "encounters"


def load_yaml(path):
    """Load YAML via PyYAML, fail gracefully se mancante."""
    try:
        import yaml  # type: ignore
    except ImportError:
        print("ERROR: PyYAML richiesto. Installa: pip install pyyaml", flush=True)
        sys.exit(2)
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def post(url, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": f"connection failed: {e}"}


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": f"connection failed: {e}"}


def health_check(host):
    status, _ = get(f"{host}/api/health")
    return status == 200


def encounter_to_units(encounter):
    """Build initial units list from encounter YAML (wave_id=1, turn_trigger=0).

    Returns list di unit dict compatibili con POST /api/session/start.
    Aggiunge escort_target come unit VIP se objective.type=escort.
    """
    units = []

    # Player spawn — 4 default skirmisher.
    for idx, pos in enumerate(encounter.get("player_spawn", [])):
        units.append({
            "id": f"p{idx + 1}",
            "species": "dune_stalker",
            "job": "skirmisher",
            "hp": 10,
            "ap": 2,
            "mod": 3,
            "dc": 12,
            "attack_range": 2,
            "initiative": 12 + idx,
            "position": {"x": pos[0], "y": pos[1]},
            "controlled_by": "player",
        })

    # Escort target unit (non-combattente) se objective.type == escort.
    objective = encounter.get("objective", {})
    if objective.get("type") == "escort":
        target_id = objective.get("escort_target", "escort_01")
        player_start = encounter.get("player_spawn", [[0, 0]])[0]
        units.append({
            "id": target_id,
            "species": "portatore_eco",
            "job": "civilian",
            "hp": 8,
            "ap": 1,
            "mod": 0,
            "dc": 10,
            "attack_range": 0,
            "initiative": 1,
            "position": {"x": player_start[0], "y": player_start[1] + 1},
            "controlled_by": "player",
        })

    # SIS units — wave_id=1 (turn_trigger=0 tipicamente).
    waves = sorted(encounter.get("waves", []), key=lambda w: w.get("turn_trigger", 0))
    if waves:
        wave1 = waves[0]
        sp = wave1.get("spawn_points", [[0, 0]])
        sp_idx = 0
        for unit_def in wave1.get("units", []):
            tier = unit_def.get("tier", "base")
            hp_by_tier = {"base": 7, "elite": 10, "apex": 14}
            hp = hp_by_tier.get(tier, 7)
            mod_by_tier = {"base": 1, "elite": 2, "apex": 4}
            dc_by_tier = {"base": 11, "elite": 12, "apex": 14}
            for i in range(unit_def.get("count", 1)):
                pos = sp[sp_idx % len(sp)]
                sp_idx += 1
                units.append({
                    "id": f"sis_{len(units)}",
                    "species": unit_def.get("species", "predoni_nomadi"),
                    "job": "vanguard",
                    "hp": hp,
                    "ap": 2,
                    "mod": mod_by_tier[tier],
                    "dc": dc_by_tier[tier],
                    "attack_range": 1,
                    "initiative": 10 + i,
                    "position": {"x": pos[0], "y": pos[1]},
                    "controlled_by": "sistema",
                    "ai_profile": unit_def.get("ai_profile", "aggressive"),
                })
    return units


def run_one(host, encounter, run_idx):
    units = encounter_to_units(encounter)

    encounter_payload = dict(encounter)

    status, start = post(f"{host}/api/session/start", {
        "units": units,
        "encounter": encounter_payload,
    })
    if status != 200:
        return {"run": run_idx, "error": f"session/start failed: {start}"}
    sid = start["session_id"]

    objective_state_seen = None
    for rnd in range(1, MAX_ROUNDS + 1):
        # Simplest path: /turn/end wraps round orchestrator (passes encounter).
        status, resp = post(f"{host}/api/session/turn/end", {"session_id": sid})
        if status != 200:
            break
        os_state = resp.get("objective_state") or {}
        objective_state_seen = os_state
        if os_state.get("completed") or os_state.get("failed"):
            break

    status, end_res = post(f"{host}/api/session/end", {"session_id": sid})
    if status != 200:
        return {"run": run_idx, "error": f"session/end failed: {end_res}"}

    return {
        "run": run_idx,
        "outcome": end_res.get("outcome"),
        "objective_state": end_res.get("objective_state"),
        "final_objective": objective_state_seen,
    }


def aggregate(runs):
    ok = [r for r in runs if "error" not in r]
    if not ok:
        return {"error": "no successful runs", "failures": len(runs)}
    outcomes = {}
    for r in ok:
        o = r.get("outcome", "unknown")
        outcomes[o] = outcomes.get(o, 0) + 1
    return {
        "N": len(ok),
        "failures": len(runs) - len(ok),
        "outcome_distribution": outcomes,
        "win_rate": outcomes.get("win", 0) / len(ok),
    }


def probe_one(host, encounter):
    print("\n=== PROBE N=1 ===", flush=True)
    units = encounter_to_units(encounter)
    print(f"Initial units: {len(units)} ({sum(1 for u in units if u['controlled_by']=='player')} player, {sum(1 for u in units if u['controlled_by']=='sistema')} sis)", flush=True)
    status, start = post(f"{host}/api/session/start", {"units": units, "encounter": encounter})
    print(f"POST /start -> {status}", flush=True)
    if status != 200:
        print(f"  body: {start}", flush=True)
        return
    sid = start["session_id"]
    status, resp = post(f"{host}/api/session/turn/end", {"session_id": sid})
    print(f"POST /turn/end -> {status}", flush=True)
    if status == 200:
        print(f"  reinforcement_spawned: {resp.get('reinforcement_spawned')}", flush=True)
        print(f"  objective_state: {json.dumps(resp.get('objective_state'), indent=2)}", flush=True)
    status, end_res = post(f"{host}/api/session/end", {"session_id": sid})
    print(f"POST /end -> {status}", flush=True)
    if status == 200:
        print(f"  outcome: {end_res.get('outcome')}", flush=True)
        print(f"  objective_state: {json.dumps(end_res.get('objective_state'), indent=2)}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", required=True, help="encounter slug (es. enc_capture_01) o path YAML")
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--out", default=None, help="JSON output path")
    ap.add_argument("--probe", action="store_true", help="N=1 verbose probe")
    ap.add_argument("--skip-health", action="store_true")
    args = ap.parse_args()

    # Resolve scenario path.
    scenario_arg = args.scenario
    if Path(scenario_arg).exists():
        path = Path(scenario_arg)
    else:
        path = ENCOUNTERS_DIR / f"{scenario_arg}.yaml"
    if not path.exists():
        print(f"ERROR: scenario non trovato: {path}", flush=True)
        return 1
    encounter = load_yaml(path)
    print(f"Loaded scenario: {encounter.get('encounter_id')} ({encounter.get('name')})", flush=True)
    print(f"  objective: {encounter.get('objective', {}).get('type')}", flush=True)

    if not args.skip_health and not health_check(args.host):
        print(f"ERROR: backend non risponde a {args.host}/api/health", flush=True)
        return 1

    if args.probe:
        probe_one(args.host, encounter)
        return 0

    runs = []
    t0 = time.time()
    for i in range(args.n):
        r = run_one(args.host, encounter, i)
        runs.append(r)
        mark = "V" if r.get("outcome") == "win" else "L" if r.get("outcome") in ("wipe", "objective_failed") else "T" if r.get("outcome") == "timeout" else "E"
        print(f"[{i+1}/{args.n}] {mark} outcome={r.get('outcome', 'err')}", flush=True)
        time.sleep(0.3)

    elapsed = time.time() - t0
    agg = aggregate(runs)
    agg["elapsed_sec"] = round(elapsed, 1)
    agg["scenario"] = encounter.get("encounter_id")

    out = {"aggregate": agg, "runs": runs}
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nWrote {args.out}", flush=True)
    print("\n=== AGGREGATE ===", flush=True)
    print(json.dumps(agg, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
