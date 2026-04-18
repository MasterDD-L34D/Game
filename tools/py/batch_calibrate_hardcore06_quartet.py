#!/usr/bin/env python3
"""Iter 5 Option A test — hardcore06 con modulation=quartet (4p) client-side.

Filtra units: primi 4 player + tutti 6 enemy. Passa modulation=quartet.
Test structural se rimuove asimmetria focus-fire 8v6 = wr band 15-25%.

Reuse engine da tools/py/batch_calibrate_hardcore06.py (import).
"""

import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, "tools/py")
from batch_calibrate_hardcore06 import (  # noqa: E402
    post, get, pressure_tier, plan_player_intents, detect_outcome,
    MAX_ROUNDS, aggregate,
)

SCENARIO_ID = "enc_tutorial_06_hardcore"
DEFAULT_HOST = "http://localhost:3340"


def run_one_quartet(host, run_idx):
    status, sc = get(f"{host}/api/tutorial/{SCENARIO_ID}")
    if status != 200:
        return {"error": f"fetch scenario failed: {sc}"}

    # Filter: keep first 4 player units + all sistema units.
    full_units = sc["units"]
    players = [u for u in full_units if u.get("controlled_by") == "player"]
    enemies = [u for u in full_units if u.get("controlled_by") == "sistema"]
    # Iter 5B: boss hp 40→22 compromise (full wr 100% / quartet wr 0% → target 15-25%).
    enemies_tuned = []
    for e in enemies:
        e2 = dict(e)
        if e["id"] == "e_apex_boss":
            e2["hp"] = 22
        enemies_tuned.append(e2)
    quartet_units = players[:4] + enemies_tuned

    hazard = sc.get("hazard_tiles", [])
    pstart = sc.get("sistema_pressure_start", 85)

    status, start = post(f"{host}/api/session/start", {
        "units": quartet_units,
        "modulation": "quartet",
        "sistema_pressure_start": pstart,
        "hazard_tiles": hazard,
    })
    if status != 200:
        return {"error": f"session/start failed: {start}"}
    sid = start["session_id"]
    state = start["state"]
    initial_units = {u["id"]: dict(u) for u in quartet_units}

    ai_intent_tally = {}
    pressure_samples = []
    outcome = None
    for rnd in range(1, MAX_ROUNDS + 1):
        outcome = detect_outcome(state)
        if outcome:
            break
        intents = plan_player_intents(state, None)
        status, resp = post(f"{host}/api/session/round/execute", {
            "session_id": sid,
            "player_intents": intents,
            "ai_auto": True,
            "priority_queue": True,
        })
        if status != 200:
            st_status, st = get(f"{host}/api/session/state?session_id={sid}")
            if st_status == 200:
                state = st
                outcome = detect_outcome(state)
            break
        state = resp.get("state", state)
        pressure_samples.append(state.get("sistema_pressure", pstart))

        tier = pressure_tier(state.get("sistema_pressure", pstart))
        for r in resp.get("results", []):
            actor = r.get("actor_id", "")
            if actor.startswith("e_"):
                key = (tier, r.get("action_type", "unknown"))
                ai_intent_tally[key] = ai_intent_tally.get(key, 0) + 1
        ai_res = resp.get("ai_result") or {}
        for a in ai_res.get("ia_actions", []):
            key = (tier, a.get("type", "unknown"))
            ai_intent_tally[key] = ai_intent_tally.get(key, 0) + 1

    if outcome is None:
        outcome = detect_outcome(state) or "timeout"

    final_units = {u["id"]: u for u in state.get("units", [])}
    players_alive = sum(1 for u in final_units.values() if u.get("controlled_by") == "player" and u.get("hp", 0) > 0)
    players_dead = sum(1 for u in final_units.values() if u.get("controlled_by") == "player" and u.get("hp", 0) <= 0)
    enemies_alive = sum(1 for u in final_units.values() if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0)
    enemies_dead = sum(1 for u in final_units.values() if u.get("controlled_by") == "sistema" and u.get("hp", 0) <= 0)
    dmg_dealt_player = sum(max(0, initial_units[u_id]["hp"] - u.get("hp", 0))
                           for u_id, u in final_units.items() if u.get("controlled_by") == "sistema" and u_id in initial_units)
    dmg_taken_player = sum(max(0, initial_units[u_id]["hp"] - u.get("hp", 0))
                           for u_id, u in final_units.items() if u.get("controlled_by") == "player" and u_id in initial_units)
    boss_hp_remaining = final_units.get("e_apex_boss", {}).get("hp", 0)

    post(f"{host}/api/session/end", {"session_id": sid})

    return {
        "run": run_idx,
        "outcome": outcome,
        "rounds": state.get("turn", 0),
        "players_alive": players_alive,
        "players_dead": players_dead,
        "enemies_alive": enemies_alive,
        "enemies_dead": enemies_dead,
        "dmg_dealt_player": dmg_dealt_player,
        "dmg_taken_player": dmg_taken_player,
        "boss_hp_remaining": boss_hp_remaining,
        "pressure_final": pressure_samples[-1] if pressure_samples else pstart,
        "ai_intent_tally": {f"{t}|{a}": c for (t, a), c in ai_intent_tally.items()},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    runs = []
    t0 = time.time()
    for i in range(args.n):
        r = run_one_quartet(args.host, i)
        runs.append(r)
        mark = "V" if r.get("outcome") == "victory" else "L" if r.get("outcome") == "defeat" else "T" if r.get("outcome") == "timeout" else "E"
        print(f"[{i+1}/{args.n}] {mark} rounds={r.get('rounds','?')} boss={r.get('boss_hp_remaining','?')} pa={r.get('players_alive','?')}/4", flush=True)
    elapsed = time.time() - t0
    agg = aggregate(runs)
    agg["elapsed_sec"] = round(elapsed, 1)
    agg["modulation"] = "quartet (4p, iter 5 option A)"

    out = {"aggregate": agg, "runs": runs}
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nWrote {args.out}")
    print("\n=== AGGREGATE (QUARTET 4p) ===")
    print(json.dumps(agg, indent=2))


if __name__ == "__main__":
    sys.exit(main())
