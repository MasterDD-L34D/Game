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

import calibrate_policies

SCENARIO_ID = "enc_tutorial_07_hardcore_pod_rush"
MAX_ROUNDS = 15
DEFAULT_HOST = "http://127.0.0.1:3334"  # IP not "localhost" (Windows IPv6 ~2s/call stall)

# TKT-PLAYTEST-TRIANGULATE: hc07 is a timer scenario with no archetype channel
# exploit -> fisico focus, equal enemy priority.
POLICY_CTX = {
    "channel_for": lambda _tid: "fisico",
    "enemy_priority": lambda _e: 0,
    "attack_range_default": 1,
}


def _policy_rng(policy, run_seed):
    """random.Random for the 'random' policy (seeded -> reproducible); None else."""
    if policy != "random":
        return None
    return random.Random(run_seed) if run_seed is not None else random.Random()


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


def run_one(host, run_idx, seed=None, policy="greedy", rng=None):
    status, sc = get(f"{host}/api/tutorial/{SCENARIO_ID}")
    if status != 200:
        return {"run": run_idx, "error": f"scenario fetch {status}"}

    status, start = post(f"{host}/api/session/start", {
        "units": sc["units"],
        # TKT-PLAYTEST-SEED: pin backend combat RNG for bit-identical replay.
        # None -> key omitted -> backend stays on Math.random (no behavior change).
        **({"seed": seed} if seed is not None else {}),
        "modulation": sc.get("recommended_modulation", "quartet"),
        "sistema_pressure_start": sc.get("sistema_pressure_start", 60),
        "hazard_tiles": sc.get("hazard_tiles", []),
        "encounter": {
            # 2026-05-21 hc07 iter2: id enables enemy_damage_multiplier_override
            # scenario resolution at /start (session.js scenarioIdForEdm).
            "id": SCENARIO_ID,
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
    # 2026-05-20 method F: player + trait telemetry (anti-pattern #8 close).
    player_actor_ids = {
        u["id"] for u in state.get("units", []) if u.get("controlled_by") == "player"
    }
    player_action_tally = {}
    trait_used_tally = {}

    for r in range(1, MAX_ROUNDS + 1):
        rounds = r
        if policy == "greedy":
            intents = plan_intents(state)
        else:
            intents = calibrate_policies.pick_intents(policy, state, POLICY_CTX, rng)
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
        # Tally player actions + trait usage per round.
        # 2026-05-21 FASE B fix: canonical schema lettura via trait_effects
        # array (sessionRoundBridge.js:753) — esisteva già backend. Cattura
        # solo triggered=true (effect attivato runtime).
        for pa in resp.get("results", []):
            if pa.get("actor_id") not in player_actor_ids:
                continue
            ptype = pa.get("action_type") or pa.get("type", "unknown")
            player_action_tally[ptype] = player_action_tally.get(ptype, 0) + 1
            res = pa.get("result") if isinstance(pa.get("result"), dict) else {}
            effects = res.get("trait_effects") if isinstance(res, dict) else None
            if isinstance(effects, list):
                for eff in effects:
                    if not isinstance(eff, dict):
                        continue
                    if not eff.get("triggered"):
                        continue
                    tid = eff.get("trait")
                    if tid:
                        trait_used_tally[str(tid)] = trait_used_tally.get(str(tid), 0) + 1
        outcome = detect_outcome(state, timer_expired)
        if outcome:
            break

    if not outcome:
        outcome = "timeout"

    # #3157 F2: declare the client-computed failure outcome so round-cap runs
    # stop surfacing as board-derived 'abandon' (server gate: downgrade-only).
    declared = {"outcome": outcome} if outcome in ("timeout", "defeat") else {}
    post(f"{host}/api/session/end", {"session_id": sid, **declared})

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
        "seed": seed,
        "policy": policy,
        "outcome": outcome,
        "rounds": rounds,
        "timer_expired": timer_expired,
        "players_alive": players_alive,
        "enemies_alive": enemies_alive,
        "kills": kills,
        "losses": losses,
        "kd": round(kills / max(1, losses), 2),
        # 2026-05-20 method F: anti-pattern #8 close (empirical not heuristic).
        "player_action_tally": dict(player_action_tally),
        "trait_used_tally": dict(trait_used_tally),
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
    # 2026-05-20 method F: aggregate empirical player + trait usage.
    player_global = {}
    trait_global = {}
    for r in ok:
        for k, v in (r.get("player_action_tally") or {}).items():
            player_global[k] = player_global.get(k, 0) + v
        for k, v in (r.get("trait_used_tally") or {}).items():
            trait_global[k] = trait_global.get(k, 0) + v
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
        "player_action_distribution": player_global,
        "trait_used_distribution": trait_global,
    }


def run_triangulation(args):
    """TKT-PLAYTEST-TRIANGULATE: run every policy at N and report a WR band.
    Output shape is additive (mode=triangulation) so single-policy callers
    (calibrate_parallel.py) are unaffected."""
    from calibrate_policies import POLICIES, compute_band

    print(
        f"Hardcore 07 TRIANGULATION: policies={list(POLICIES)} N={args.n}/policy "
        f"host={args.host} seed={'None' if args.seed is None else args.seed}",
        flush=True,
    )
    t0 = time.time()
    per_policy = {}
    policy_summaries = {}
    for pol in POLICIES:
        runs = []
        for i in range(args.n):
            run_seed = args.seed + i if args.seed is not None else None
            r = run_one(args.host, i + 1, seed=run_seed, policy=pol,
                        rng=_policy_rng(pol, run_seed))
            runs.append(r)
            print(f"  [{pol}] run {i+1}: {r.get('outcome', 'error')} "
                  f"rounds={r.get('rounds', '?')}", flush=True)
            if args.cooldown > 0 and i + 1 < args.n:
                time.sleep(args.cooldown)
        per_policy[pol] = runs
        policy_summaries[pol] = summarise(runs)

    band = compute_band(per_policy)
    elapsed = round(time.time() - t0, 1)
    pwr = band["policy_win_rate"]
    print("\n=== TRIANGULATION BAND ===", flush=True)
    for pol in POLICIES:
        wr = pwr.get(pol)
        print(f"  {pol:11s} WR={'n/a' if wr is None else f'{wr * 100:.1f}%'}", flush=True)
    lo, hi = band["band"]
    human = band["human_wr_est"]
    lo_s = "n/a" if lo is None else f"{lo * 100:.1f}%"
    hi_s = "n/a" if hi is None else f"{hi * 100:.1f}%"
    human_s = "n/a" if human is None else f"{human * 100:.1f}%"
    print(f"  band=[{lo_s}, {hi_s}]  human_est={human_s} ({band['human_wr_formula']})", flush=True)

    out = {
        "scenario": SCENARIO_ID,
        "mode": "triangulation",
        "n_per_policy": args.n,
        "seed": args.seed,
        "elapsed_s": elapsed,
        "band": band,
        "policies": {pol: {"summary": policy_summaries[pol], "runs": per_policy[pol]} for pol in POLICIES},
    }
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"Saved: {args.out}", flush=True)
    return 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--n", type=int, default=10)
    p.add_argument("--host", default=os.environ.get("P6_HOST", DEFAULT_HOST))
    p.add_argument("--out", default=None, help="JSON output path")
    p.add_argument("--jsonl", default=None, help="JSONL incremental output (resume)")
    p.add_argument("--cooldown", type=float, default=0.5, help="Sec between runs")
    p.add_argument("--skip-health", action="store_true", help="Skip /api/health probe")
    p.add_argument("--seed", type=int, default=None,
                   help="TKT-PLAYTEST-SEED: base seed for bit-identical runs. Run i uses "
                        "seed+i (so the whole batch is reproducible). Omit = legacy "
                        "Math.random (statistical reproducibility only).")
    p.add_argument("--policy", default="greedy",
                   choices=["random", "greedy", "lookahead2", "utility", "all"],
                   help="TKT-PLAYTEST-TRIANGULATE: player policy proxy. 'all' runs every "
                        "policy and reports a WR band (Jaffe 2012 Restricted Play). "
                        "Default greedy (back-compat single-policy output).")
    args = p.parse_args()

    # TKT-08: health probe fail-fast prima di batch.
    if not args.skip_health:
        if not health_check(args.host):
            print(f"ERROR: backend health check failed at {args.host}/api/health", flush=True)
            return 1
        print(f"OK: backend healthy at {args.host}", flush=True)

    # TKT-PLAYTEST-TRIANGULATE: multi-policy band mode short-circuits single flow.
    if args.policy == "all":
        return run_triangulation(args)

    seed_note = f"seed={args.seed} (bit-identical)" if args.seed is not None else "seed=None (statistical)"
    print(f"Hardcore 07 calibration: N={args.n} host={args.host} {seed_note}", flush=True)
    t0 = time.time()
    runs = []
    failures = 0
    jsonl_fh = open(args.jsonl, "a", encoding="utf-8") if args.jsonl else None
    try:
        for i in range(args.n):
            run_seed = args.seed + i if args.seed is not None else None
            r = run_one(args.host, i + 1, seed=run_seed, policy=args.policy,
                        rng=_policy_rng(args.policy, run_seed))
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
