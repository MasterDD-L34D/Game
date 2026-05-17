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
import random
import statistics
import sys
import time
import urllib.error
import urllib.request

SCENARIO_ID = "enc_tutorial_07_hardcore_pod_rush"
MAX_ROUNDS = 15
DEFAULT_HOST = "http://localhost:3334"


def _retry(fn, retries=5, backoff_base=0.5):
    """Retry exponential backoff su ConnectionRefusedError / URLError.
    Mitiga TCP port exhaustion Windows + transient backend stalls (TKT-08)."""
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
    data = json.dumps(payload).encode("utf-8")
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
    """Probe /api/health. Ritorna True se backend risponde 200."""
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


def _bootstrap_ci(samples, statistic_fn, n_boot=1000, alpha=0.05, seed=42):
    """P1-20 (telemetry-viz-illuminator audit 2026-04-26): bootstrap 95% CI per
    point estimate. Senza scipy, riproducibile via seed.

    Args:
        samples: list of values
        statistic_fn: callable list -> float (es. statistics.mean)
        n_boot: bootstrap samples (default 1000, plateau accuracy)
        alpha: significance (0.05 = 95% CI)
        seed: RNG seed riproducibilita

    Returns:
        (lo, hi) tuple percentili (alpha/2, 1-alpha/2)
    """
    if not samples:
        return (0.0, 0.0)
    rng = random.Random(seed)
    n = len(samples)
    boots = []
    for _ in range(n_boot):
        resample = [samples[rng.randrange(n)] for _ in range(n)]
        try:
            boots.append(statistic_fn(resample))
        except statistics.StatisticsError:
            continue
    boots.sort()
    lo_idx = int(alpha / 2 * len(boots))
    hi_idx = int((1 - alpha / 2) * len(boots)) - 1
    return (round(boots[lo_idx], 2), round(boots[hi_idx], 2))


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
    # P1-20 bootstrap CI 95% per metriche continue (rounds, kd) + binomial
    # for rates (win/defeat/timeout). N=10 binomial CI ±15pp tipico.
    win_indicator = [1 if r["outcome"] == "victory" else 0 for r in ok]
    defeat_indicator = [1 if r["outcome"] == "defeat" else 0 for r in ok]
    timeout_indicator = [1 if r["outcome"] == "timeout" else 0 for r in ok]
    win_ci = _bootstrap_ci(win_indicator, statistics.mean)
    return {
        "n": n,
        "win_rate": round(wins / n * 100, 1),
        "win_rate_ci95": [round(win_ci[0] * 100, 1), round(win_ci[1] * 100, 1)],
        "defeat_rate": round(defeats / n * 100, 1),
        "defeat_rate_ci95": [
            round(_bootstrap_ci(defeat_indicator, statistics.mean)[0] * 100, 1),
            round(_bootstrap_ci(defeat_indicator, statistics.mean)[1] * 100, 1),
        ],
        "timeout_rate": round(timeouts / n * 100, 1),
        "timeout_rate_ci95": [
            round(_bootstrap_ci(timeout_indicator, statistics.mean)[0] * 100, 1),
            round(_bootstrap_ci(timeout_indicator, statistics.mean)[1] * 100, 1),
        ],
        "timer_expire_rate": round(expired / n * 100, 1),
        "rounds_avg": round(statistics.mean(rounds), 1),
        "rounds_ci95": list(_bootstrap_ci(rounds, statistics.mean)),
        "rounds_median": statistics.median(rounds),
        "kd_avg": round(statistics.mean(kds), 2),
        "kd_ci95": list(_bootstrap_ci(kds, statistics.mean)),
        "target_band": "win 30-50%",
        "in_band": 30 <= (wins / n * 100) <= 50,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--n", type=int, default=10)
    p.add_argument("--host", default=os.environ.get("P6_HOST", DEFAULT_HOST))
    p.add_argument("--out", default=None, help="JSON output path")
    p.add_argument("--jsonl", default=None, help="JSONL incremental output (resume)")
    p.add_argument("--cooldown", type=float, default=0.5, help="Sec between runs")
    p.add_argument("--skip-health", action="store_true", help="Skip /api/health probe")
    args = p.parse_args()

    # TKT-08: health probe fail-fast prima di batch.
    if not args.skip_health:
        if not health_check(args.host):
            print(f"ERROR: backend health check failed at {args.host}/api/health", flush=True)
            return 1
        print(f"OK: backend healthy at {args.host}", flush=True)

    print(f"Hardcore 07 calibration: N={args.n} host={args.host}", flush=True)
    t0 = time.time()
    runs = []
    failures = 0
    jsonl_fh = open(args.jsonl, "a", encoding="utf-8") if args.jsonl else None
    try:
        for i in range(args.n):
            r = run_one(args.host, i + 1)
            runs.append(r)
            if "error" in r:
                failures += 1
                print(f"  run {i+1}: ERROR {r['error']}", flush=True)
            else:
                print(
                    f"  run {i+1}: {r['outcome']} rounds={r['rounds']} "
                    f"timer_expired={r['timer_expired']} KD={r['kd']}",
                    flush=True,
                )
            # TKT-10: incremental JSONL write (resume-friendly).
            if jsonl_fh:
                jsonl_fh.write(json.dumps(r) + "\n")
                jsonl_fh.flush()
            # TKT-08: inter-run cooldown — mitiga TCP port exhaustion Windows.
            if i + 1 < args.n and args.cooldown > 0:
                time.sleep(args.cooldown)
            # TKT-08: periodic health re-check ogni 10 run (auto-abort on backend death).
            if (i + 1) % 10 == 0 and not args.skip_health and i + 1 < args.n:
                if not health_check(args.host):
                    print(f"WARN: health check failed dopo run {i+1}, retry sleep 5s", flush=True)
                    time.sleep(5)
                    if not health_check(args.host):
                        print(
                            f"ABORT: backend non recuperato, stop batch (run completati: {i+1})",
                            flush=True,
                        )
                        break
    finally:
        if jsonl_fh:
            jsonl_fh.close()

    summary = summarise(runs)
    elapsed = round(time.time() - t0, 1)
    summary["elapsed_s"] = elapsed
    summary["failures"] = failures
    out = {"scenario": SCENARIO_ID, "runs": runs, "summary": summary}
    print("\n=== SUMMARY ===", flush=True)
    print(json.dumps(summary, indent=2), flush=True)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"Saved: {args.out}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
