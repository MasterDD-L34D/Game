#!/usr/bin/env python3
"""Batch calibration runner — enc_tutorial_06_hardcore (PR #1534).

Greedy player policy (atk-closest), AI auto. N=30 default.
Target: win_rate 15-25%, turns 14-18, K/D 0.6-0.9.
"""

import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.request

SCENARIO_ID = "enc_tutorial_06_hardcore"
MAX_ROUNDS = 40
DEFAULT_HOST = "http://localhost:3340"


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


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, {"error": str(e)}


def pressure_tier(p):
    if p < 25: return "Low"
    if p < 50: return "Medium"
    if p < 75: return "High"
    if p < 90: return "Critical"
    return "Apex"


def manhattan(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])


def step_toward(src, dst, grid_w, grid_h):
    dx = dst["x"] - src["x"]
    dy = dst["y"] - src["y"]
    nx, ny = src["x"], src["y"]
    # Prefer axis with larger diff (greedy orthogonal 1-step).
    if abs(dx) >= abs(dy) and dx != 0:
        nx += 1 if dx > 0 else -1
    elif dy != 0:
        ny += 1 if dy > 0 else -1
    nx = max(0, min(grid_w - 1, nx))
    ny = max(0, min(grid_h - 1, ny))
    return {"x": nx, "y": ny}


def plan_player_intents(state, occupied):
    units = state.get("units", [])
    grid = state.get("grid", {})
    gw, gh = grid.get("width", 10), grid.get("height", 10)
    players = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not enemies:
        return []

    # Prioritize BOSS last (focus minions first for swarm reduction).
    def enemy_priority(e):
        if e["id"] == "e_apex_boss":
            return 2
        if "elite" in e["id"]:
            return 1
        return 0

    intents = []
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}

    for pl in players:
        ap = pl.get("ap_remaining", pl.get("ap", 2))
        if ap <= 0:
            continue
        rng = pl.get("attack_range", 1)
        # Nearest enemy (prefer lower priority = minions first).
        enemies_sorted = sorted(enemies, key=lambda e: (enemy_priority(e), manhattan(pl["position"], e["position"])))
        target = enemies_sorted[0]
        dist = manhattan(pl["position"], target["position"])
        if dist <= rng and ap >= 1:
            intents.append({"actor_id": pl["id"], "action": {"type": "attack", "target_id": target["id"]}})
        elif ap >= 2:
            new_pos = step_toward(pl["position"], target["position"], gw, gh)
            if (new_pos["x"], new_pos["y"]) in reserved:
                # Try alt axis.
                alt = step_toward(pl["position"], {"x": target["position"]["x"] + 1, "y": target["position"]["y"]}, gw, gh)
                if (alt["x"], alt["y"]) not in reserved:
                    new_pos = alt
            # Move then attack if now in range, else skip atk.
            intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": new_pos}})
            new_dist = manhattan(new_pos, target["position"])
            if new_dist <= rng and ap >= 2:
                intents.append({"actor_id": pl["id"], "action": {"type": "attack", "target_id": target["id"]}})
            reserved.discard((pl["position"]["x"], pl["position"]["y"]))
            reserved.add((new_pos["x"], new_pos["y"]))
        else:
            intents.append({"actor_id": pl["id"], "action": {"type": "skip"}})
    return intents


def detect_outcome(state):
    units = state.get("units", [])
    pa = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    ea = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not pa: return "defeat"
    if not ea: return "victory"
    return None


def run_one(host, run_idx):
    # Fetch scenario.
    status, sc = get(f"{host}/api/tutorial/{SCENARIO_ID}")
    if status != 200:
        return {"error": f"fetch scenario failed: {sc}"}
    units = sc["units"]
    hazard = sc.get("hazard_tiles", [])
    pstart = sc.get("sistema_pressure_start", 75)

    # Start.
    status, start = post(f"{host}/api/session/start", {
        "units": units,
        "modulation": "full",
        "sistema_pressure_start": pstart,
        "hazard_tiles": hazard,
    })
    if status != 200:
        return {"error": f"session/start failed: {start}"}
    sid = start["session_id"]
    state = start["state"]

    ai_intent_tally = {}  # type -> count per tier
    pressure_samples = []
    dmg_to_boss = 0
    initial_units = {u["id"]: dict(u) for u in units}

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
            # End round if e.g. session already terminated; try to read state.
            st_status, st = get(f"{host}/api/session/state?session_id={sid}")
            if st_status == 200:
                state = st
                outcome = detect_outcome(state)
            break
        state = resp.get("state", state)
        pressure_samples.append(state.get("sistema_pressure", pstart))

        # Tally AI actions. Priority queue mixes sistema into `results` — detect
        # by actor_id prefix `e_`. Fallback: ai_result.ia_actions (legacy).
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

    # Final metrics.
    final_units = {u["id"]: u for u in state.get("units", [])}
    players_alive = sum(1 for u in final_units.values() if u.get("controlled_by") == "player" and u.get("hp", 0) > 0)
    players_dead = sum(1 for u in final_units.values() if u.get("controlled_by") == "player" and u.get("hp", 0) <= 0)
    enemies_alive = sum(1 for u in final_units.values() if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0)
    enemies_dead = sum(1 for u in final_units.values() if u.get("controlled_by") == "sistema" and u.get("hp", 0) <= 0)
    dmg_dealt_player = sum(max(0, initial_units[u_id]["hp"] - u.get("hp", 0))
                           for u_id, u in final_units.items() if u.get("controlled_by") == "sistema")
    dmg_taken_player = sum(max(0, initial_units[u_id]["hp"] - u.get("hp", 0))
                           for u_id, u in final_units.items() if u.get("controlled_by") == "player")
    boss_hp_remaining = final_units.get("e_apex_boss", {}).get("hp", 0)

    # VC scores.
    vc_status, vc = get(f"{host}/api/session/{sid}/vc")
    vc_data = vc if vc_status == 200 else {}

    # Cleanup.
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
        "vc": {
            "mbti": vc_data.get("mbti"),
            "ennea": vc_data.get("ennea"),
            "aggregate": vc_data.get("aggregate"),
        },
    }


def aggregate(runs):
    ok = [r for r in runs if "error" not in r]
    if not ok:
        return {"error": "no successful runs"}
    wins = [r for r in ok if r["outcome"] == "victory"]
    losses = [r for r in ok if r["outcome"] == "defeat"]
    timeouts = [r for r in ok if r["outcome"] == "timeout"]
    turns = [r["rounds"] for r in ok]
    kd = []
    for r in ok:
        d = r["players_dead"] or 0
        k = r["enemies_dead"] or 0
        kd.append(k / d if d > 0 else float(k))
    # Aggregate AI intent distribution by tier.
    ai_global = {}
    for r in ok:
        for k, v in r["ai_intent_tally"].items():
            ai_global[k] = ai_global.get(k, 0) + v

    return {
        "N": len(ok),
        "win_rate": len(wins) / len(ok),
        "win_count": len(wins),
        "loss_count": len(losses),
        "timeout_count": len(timeouts),
        "turns_avg": statistics.mean(turns),
        "turns_median": statistics.median(turns),
        "turns_stdev": statistics.pstdev(turns) if len(turns) > 1 else 0.0,
        "turns_min": min(turns),
        "turns_max": max(turns),
        "turns_hist": _hist(turns, bins=[(1,5),(6,10),(11,15),(16,20),(21,30),(31,40)]),
        "kd_avg": statistics.mean(kd),
        "kd_median": statistics.median(kd),
        "dmg_dealt_avg": statistics.mean(r["dmg_dealt_player"] for r in ok),
        "dmg_taken_avg": statistics.mean(r["dmg_taken_player"] for r in ok),
        "boss_hp_remaining_avg_on_loss": (
            statistics.mean(r["boss_hp_remaining"] for r in losses) if losses else None
        ),
        "players_alive_avg_on_win": (
            statistics.mean(r["players_alive"] for r in wins) if wins else None
        ),
        "ai_intent_distribution": ai_global,
    }


def _hist(values, bins):
    out = {}
    for lo, hi in bins:
        label = f"{lo}-{hi}"
        out[label] = sum(1 for v in values if lo <= v <= hi)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--n", type=int, default=30)
    ap.add_argument("--out", default=None, help="JSON output path")
    args = ap.parse_args()

    runs = []
    t0 = time.time()
    for i in range(args.n):
        r = run_one(args.host, i)
        runs.append(r)
        mark = "V" if r.get("outcome") == "victory" else "L" if r.get("outcome") == "defeat" else "T" if r.get("outcome") == "timeout" else "E"
        print(f"[{i+1}/{args.n}] {mark} rounds={r.get('rounds','?')} boss_hp={r.get('boss_hp_remaining','?')} pa={r.get('players_alive','?')}", flush=True)
    elapsed = time.time() - t0
    agg = aggregate(runs)
    agg["elapsed_sec"] = round(elapsed, 1)

    out = {"aggregate": agg, "runs": runs}
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nWrote {args.out}")
    print("\n=== AGGREGATE ===")
    print(json.dumps(agg, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
