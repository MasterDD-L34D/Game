#!/usr/bin/env python3
"""M13 P6 Phase B — calibration harness hardcore 07 "Assalto Spietato".

Timer-driven scenario. Target win_rate 30-50%.
Greedy player policy (atk-closest, channel fisico), AI auto via /round/execute.
Measures: win/defeat/timeout rates, timer expire %, rounds avg, KD.
N=10 default. Output: docs/playtest/2026-04-25-hardcore-07-iter0.md report.
"""

import argparse
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request

SCENARIO_ID = "enc_tutorial_07_hardcore_pod_rush"
MAX_ROUNDS = 15
DEFAULT_HOST = "http://localhost:3334"


def post(url, payload):
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
            body = json.loads(body)
        except Exception:
            pass
        return e.code, body


def get(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, {}


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


def plan_intents(state):
    units = state.get("units", [])
    players = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not players or not enemies:
        return []
    grid = state.get("grid", {"width": 10, "height": 10})
    gw, gh = grid["width"], grid["height"]
    intents = []
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}
    for pl in players:
        ap = pl.get("ap_remaining", pl.get("ap", 2))
        if ap <= 0:
            continue
        rng = pl.get("attack_range", 1)
        # Nearest enemy by Manhattan.
        target = min(enemies, key=lambda e: manhattan(pl["position"], e["position"]))
        dist = manhattan(pl["position"], target["position"])
        if dist <= rng:
            intents.append({
                "actor_id": pl["id"],
                "action": {"type": "attack", "target_id": target["id"], "channel": "fisico"},
            })
        elif ap >= 2:
            new_pos = step_toward(pl["position"], target["position"], gw, gh)
            if (new_pos["x"], new_pos["y"]) not in reserved:
                intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": new_pos}})
                reserved.discard((pl["position"]["x"], pl["position"]["y"]))
                reserved.add((new_pos["x"], new_pos["y"]))
                new_dist = manhattan(new_pos, target["position"])
                if new_dist <= rng:
                    intents.append({
                        "actor_id": pl["id"],
                        "action": {"type": "attack", "target_id": target["id"], "channel": "fisico"},
                    })
    return intents


def detect_outcome(state, timer_expired):
    units = state.get("units", [])
    pa = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    ea = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not pa:
        return "defeat"
    if not ea:
        return "victory"
    if timer_expired:
        return "timeout"
    return None


def run_one(host, run_idx):
    status, sc = get(f"{host}/api/tutorial/{SCENARIO_ID}")
    if status != 200:
        return {"run": run_idx, "error": f"scenario fetch {status}"}

    status, start = post(f"{host}/api/session/start", {
        "units": sc["units"],
        "modulation": sc.get("recommended_modulation", "quartet"),
        "sistema_pressure_start": sc.get("sistema_pressure_start", 60),
        "hazard_tiles": sc.get("hazard_tiles", []),
        "encounter": {
            "mission_timer": sc.get("mission_timer"),
            "reinforcement_policy": sc.get("reinforcement_policy"),
            "reinforcement_pool": sc.get("reinforcement_pool"),
            "reinforcement_entry_tiles": sc.get("reinforcement_entry_tiles"),
        },
    })
    if status != 200:
        return {"run": run_idx, "error": f"start {status}: {start}"}

    sid = start["session_id"]
    state = start["state"]
    timer_expired = False
    outcome = None
    rounds = 0
    enemy_initial = sum(1 for u in state.get("units", []) if u.get("controlled_by") == "sistema")
    player_initial = sum(1 for u in state.get("units", []) if u.get("controlled_by") == "player")

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
        timer = resp.get("mission_timer") or {}
        if timer.get("expired"):
            timer_expired = True
        outcome = detect_outcome(state, timer_expired)
        if outcome:
            break

    if not outcome:
        outcome = "timeout"

    post(f"{host}/api/session/end", {"session_id": sid})

    final_units = state.get("units", [])
    players_alive = sum(
        1 for u in final_units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0
    )
    enemies_alive = sum(
        1 for u in final_units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0
    )
    kills = enemy_initial - enemies_alive
    losses = player_initial - players_alive
    return {
        "run": run_idx,
        "outcome": outcome,
        "rounds": rounds,
        "timer_expired": timer_expired,
        "players_alive": players_alive,
        "enemies_alive": enemies_alive,
        "kills": kills,
        "losses": losses,
        "kd": round(kills / max(1, losses), 2),
    }


def summarise(runs):
    ok = [r for r in runs if "outcome" in r]
    n = len(ok)
    if n == 0:
        return {"n": 0, "error": "no completed runs"}
    wins = sum(1 for r in ok if r["outcome"] == "victory")
    defeats = sum(1 for r in ok if r["outcome"] == "defeat")
    timeouts = sum(1 for r in ok if r["outcome"] == "timeout")
    expired = sum(1 for r in ok if r["timer_expired"])
    rounds = [r["rounds"] for r in ok]
    kds = [r["kd"] for r in ok]
    return {
        "n": n,
        "win_rate": round(wins / n * 100, 1),
        "defeat_rate": round(defeats / n * 100, 1),
        "timeout_rate": round(timeouts / n * 100, 1),
        "timer_expire_rate": round(expired / n * 100, 1),
        "rounds_avg": round(statistics.mean(rounds), 1),
        "rounds_median": statistics.median(rounds),
        "kd_avg": round(statistics.mean(kds), 2),
        "target_band": "win 30-50%",
        "in_band": 30 <= (wins / n * 100) <= 50,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--n", type=int, default=10)
    p.add_argument("--host", default=os.environ.get("P6_HOST", DEFAULT_HOST))
    p.add_argument("--out", default=None, help="JSON output path")
    args = p.parse_args()

    print(f"Hardcore 07 calibration: N={args.n} host={args.host}", flush=True)
    t0 = time.time()
    runs = []
    for i in range(args.n):
        r = run_one(args.host, i + 1)
        runs.append(r)
        if "error" in r:
            print(f"  run {i+1}: ERROR {r['error']}", flush=True)
        else:
            print(
                f"  run {i+1}: {r['outcome']} rounds={r['rounds']} "
                f"timer_expired={r['timer_expired']} KD={r['kd']}",
                flush=True,
            )

    summary = summarise(runs)
    elapsed = round(time.time() - t0, 1)
    summary["elapsed_s"] = elapsed
    out = {"scenario": SCENARIO_ID, "runs": runs, "summary": summary}
    print("\n=== SUMMARY ===", flush=True)
    print(json.dumps(summary, indent=2), flush=True)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"Saved: {args.out}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
