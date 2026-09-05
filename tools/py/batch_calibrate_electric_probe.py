#!/usr/bin/env python3
"""Electric channel scenario-probe -- TKT-D4-ENRICH (#2533, post-OD-058 D4).

Dedicated probe gate from issue #2533: tutorial/hardcore scenarios never field
a corazzato defender AGAINST an electric attacker, so a plain N=40 on those
scenarios would measure noise (anti-pattern #14, same caveat as #2389).
This harness builds the pairing inline (no backend scenario file needed:
/api/session/start accepts custom units) and runs PAIRED A/B arms:

  arm control: party WITHOUT electric traits, attacks channel 'fisico'
  arm live:    party WITH elettromagnete_biologico + seta_conduttiva_elettrica,
               attacks channel 'elettrico' (CHANNEL_EXPLOIT pattern, M6-#1b)

Same seed list on both arms (backend combat RNG pinned via /session/start seed)
-> per-seed paired comparison, zero cross-arm sampling variance.

Defender roster spans the resist matrix on the electric channel:
  2x corazzato    (elettrico 120 vuln    -- the #2381/#2389 dead-channel fix)
  1x bioelettrico (elettrico 80 post-retune -- this PR, was 70)
  1x adattivo     (elettrico 100 neutral -- reference)

Measured per arm: win/defeat/timeout rate, turns avg, per-archetype damage
per hit (the matrix signal), trait trigger tally (magnetic_overload /
voltaic_web_disorient), disorient unit-turns on enemies.

Usage:
  python tools/py/batch_calibrate_electric_probe.py --runs 40 --arm both \
      --out reports/sim/electric-probe-n40

  # Quick smoke (assumes nothing running on the port; backend autostarts):
  python tools/py/batch_calibrate_electric_probe.py --runs 3 --arm both

PERF NOTE: default host 127.0.0.1 (NEVER "localhost": Windows IPv6 resolution
stalls urllib ~2s/call, L-074).
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_INDEX = REPO_ROOT / "apps" / "backend" / "index.js"

DEFAULT_PORT = 3361  # off the calibrate_parallel range (3341+)
DEFAULT_HOST = f"http://127.0.0.1:{DEFAULT_PORT}"
MAX_ROUNDS = 30
SEED_BASE = 7000

ELECTRIC_TRAITS = ["elettromagnete_biologico", "seta_conduttiva_elettrica"]

# Defender archetype map (unit_id -> resistance_archetype) used both to build
# the roster and to bucket per-hit damage into the matrix table.
ENEMY_ARCHETYPES = {
    "e_corazzato_1": "corazzato",
    "e_corazzato_2": "corazzato",
    "e_bioelettrico": "bioelettrico",
    "e_adattivo": "adattivo",
}


def build_units(arm):
    """Inline probe roster. Party 4 vs 4 defenders.

    Player jobs: skirmisher/ranger carry the electric traits in the live arm
    (JOB_ARCHETYPE leaves them 'adattivo'); vanguard tank + warden support are
    identical across arms. Enemy corazzato pair gets archetype via job
    vanguard AND explicit resistance_archetype (belt + suspenders);
    bioelettrico/adattivo via explicit field (no job maps to them).
    """
    electric_1 = ELECTRIC_TRAITS[:1] if arm == "live" else []
    electric_2 = ELECTRIC_TRAITS[1:] if arm == "live" else []
    players = [
        {
            "id": "p_electro_1",
            "species": "chimera_probe_a",
            "job": "skirmisher",
            "traits": electric_1,
            "hp": 10, "ap": 2, "mod": 3, "dc": 12, "guardia": 1,
            "position": {"x": 0, "y": 2}, "controlled_by": "player", "facing": "E",
        },
        {
            "id": "p_electro_2",
            "species": "chimera_probe_b",
            "job": "ranger",
            "traits": electric_2,
            "hp": 10, "ap": 2, "mod": 3, "dc": 12, "guardia": 1,
            "position": {"x": 0, "y": 4}, "controlled_by": "player", "facing": "E",
        },
        {
            "id": "p_tank",
            "species": "umbroid_lurker",
            "job": "vanguard",
            "traits": ["pelle_elastomera"],
            "hp": 14, "ap": 2, "mod": 2, "dc": 14, "guardia": 2,
            "position": {"x": 1, "y": 3}, "controlled_by": "player", "facing": "E",
        },
        {
            "id": "p_support",
            "species": "mud_sentinel",
            "job": "warden",
            "traits": [],
            "hp": 11, "ap": 2, "mod": 3, "dc": 13, "guardia": 1,
            "position": {"x": 1, "y": 5}, "controlled_by": "player", "facing": "E",
        },
    ]
    enemies = [
        {
            "id": "e_corazzato_1",
            "species": "cacciatore_corazzato",
            "job": "vanguard",
            "resistance_archetype": "corazzato",
            "traits": [],
            "hp": 14, "ap": 2, "mod": 3, "dc": 13, "guardia": 2,
            "position": {"x": 7, "y": 3}, "controlled_by": "sistema",
            "ai_profile": "aggressive", "facing": "W",
        },
        {
            "id": "e_corazzato_2",
            "species": "cacciatore_corazzato",
            "job": "vanguard",
            "resistance_archetype": "corazzato",
            "traits": [],
            "hp": 14, "ap": 2, "mod": 3, "dc": 13, "guardia": 2,
            "position": {"x": 7, "y": 5}, "controlled_by": "sistema",
            "ai_profile": "aggressive", "facing": "W",
        },
        {
            "id": "e_bioelettrico",
            "species": "anguilla_fangosa",
            "job": "skirmisher",
            "resistance_archetype": "bioelettrico",
            "traits": [],
            "hp": 10, "ap": 2, "mod": 3, "dc": 12, "guardia": 1,
            "position": {"x": 7, "y": 7}, "controlled_by": "sistema",
            "ai_profile": "aggressive", "facing": "W",
        },
        {
            "id": "e_adattivo",
            "species": "predoni_nomadi",
            "job": "skirmisher",
            "resistance_archetype": "adattivo",
            "traits": [],
            "hp": 8, "ap": 2, "mod": 2, "dc": 12, "guardia": 1,
            "position": {"x": 7, "y": 1}, "controlled_by": "sistema",
            "ai_profile": "aggressive", "facing": "W",
        },
    ]
    return players + enemies


def http_json(method, url, payload=None, timeout=30):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}


def get(url):
    return http_json("GET", url)


def post(url, payload):
    return http_json("POST", url, payload)


def health(host):
    status, _ = get(f"{host}/api/health")
    return status == 200


def start_backend(port, log_path):
    env = dict(os.environ)
    env["PORT"] = str(port)
    env["LOBBY_WS_ENABLED"] = "false"  # L-071: avoid WS upgrade on probe port
    fh = open(log_path, "w", encoding="utf-8")
    proc = subprocess.Popen(
        ["node", str(BACKEND_INDEX)],
        stdout=fh, stderr=subprocess.STDOUT, env=env, cwd=str(REPO_ROOT),
    )
    return proc, fh


def manhattan(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])


def step_toward(src, dst, gw, gh):
    dx = dst["x"] - src["x"]
    dy = dst["y"] - src["y"]
    nx, ny = src["x"], src["y"]
    if abs(dx) >= abs(dy) and dx != 0:
        nx += 1 if dx > 0 else -1
    elif dy != 0:
        ny += 1 if dy > 0 else -1
    return {"x": max(0, min(gw - 1, nx)), "y": max(0, min(gh - 1, ny))}


def plan_player_intents(state, channel):
    """Greedy atk-closest (hc06 pattern) with a fixed attack channel."""
    units = state.get("units", [])
    grid = state.get("grid", {})
    gw, gh = grid.get("width", 10), grid.get("height", 10)
    players = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not enemies:
        return []
    intents = []
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}
    for pl in players:
        ap = pl.get("ap_remaining", pl.get("ap", 2))
        rng_atk = pl.get("attack_range", 1)
        target = min(enemies, key=lambda e: manhattan(pl["position"], e["position"]))
        dist = manhattan(pl["position"], target["position"])
        if dist <= rng_atk and ap >= 1:
            intents.append({
                "actor_id": pl["id"],
                "action": {"type": "attack", "target_id": target["id"], "channel": channel},
            })
        elif ap >= 2:
            new_pos = step_toward(pl["position"], target["position"], gw, gh)
            if (new_pos["x"], new_pos["y"]) in reserved:
                continue
            intents.append({
                "actor_id": pl["id"],
                "action": {"type": "move", "position": new_pos},
            })
            reserved.discard((pl["position"]["x"], pl["position"]["y"]))
            reserved.add((new_pos["x"], new_pos["y"]))
    return intents


def detect_outcome(state):
    units = state.get("units", [])
    pa = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    ea = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not pa:
        return "defeat"
    if not ea:
        return "victory"
    return None


def _extract_trait_ids(action_result):
    """Triggered trait ids via canonical result.trait_effects (hc06 FASE B)."""
    res = action_result.get("result") if isinstance(action_result, dict) else None
    if not isinstance(res, dict):
        return []
    out = []
    for eff in res.get("trait_effects") or []:
        if isinstance(eff, dict) and eff.get("triggered") and eff.get("trait"):
            out.append(str(eff["trait"]))
    return out


def run_one(host, arm, seed):
    units = build_units(arm)
    channel = "elettrico" if arm == "live" else "fisico"
    player_ids = {u["id"] for u in units if u["controlled_by"] == "player"}

    status, start = post(f"{host}/api/session/start", {
        "units": units,
        "seed": seed,
        "modulation": "full",
        "sistema_pressure_start": 75,
        "encounter_class": "standard",
    })
    if status != 200:
        return {"error": f"session/start failed: {start}"}
    sid = start["session_id"]
    state = start["state"]

    dmg = {a: {"total": 0, "hits": 0} for a in ("corazzato", "bioelettrico", "adattivo")}
    trait_tally = {}
    status_applied = {}  # status_id -> count (on_hit_status + apply_status producers)
    outcome = None
    turns = 0

    for _ in range(1, MAX_ROUNDS + 1):
        outcome = detect_outcome(state)
        if outcome:
            break
        intents = plan_player_intents(state, channel)
        # /round/execute attack results carry no top-level target_id: correlate
        # via the intents we just declared (max 1 intent per actor per round).
        target_by_actor = {
            i["actor_id"]: i["action"].get("target_id")
            for i in intents
            if i.get("action", {}).get("type") == "attack"
        }
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
        turns += 1

        for r in resp.get("results", []):
            if r.get("actor_id") not in player_ids:
                continue
            for tid in _extract_trait_ids(r):
                trait_tally[tid] = trait_tally.get(tid, 0) + 1
            atype = r.get("action_type") or r.get("type")
            if atype != "attack":
                continue
            res = r.get("result") or {}
            # Status producers surfaced by the round wrapper (TKT-D4-ENRICH).
            onhit = res.get("on_hit_status") or {}
            for a in onhit.get("applied") or []:
                sid_name = a.get("status_id")
                if sid_name:
                    status_applied[sid_name] = status_applied.get(sid_name, 0) + 1
            for s in res.get("status_applies") or []:
                sid_name = s.get("stato")
                if sid_name:
                    status_applied[sid_name] = status_applied.get(sid_name, 0) + 1
            arch = ENEMY_ARCHETYPES.get(target_by_actor.get(r.get("actor_id")))
            dealt = res.get("damage_dealt")
            if arch and isinstance(dealt, (int, float)) and dealt > 0:
                dmg[arch]["total"] += dealt
                dmg[arch]["hits"] += 1

    if outcome is None:
        outcome = detect_outcome(state) or "timeout"

    # #3157 F2: declare the client-computed failure outcome so round-cap runs
    # stop surfacing as board-derived 'abandon' (server gate: downgrade-only).
    declared = {"outcome": outcome} if outcome in ("timeout", "defeat") else {}
    post(f"{host}/api/session/end", {"session_id": sid, **declared})
    return {
        "arm": arm,
        "seed": seed,
        "outcome": outcome,
        "turns": turns,
        "dmg_by_archetype": dmg,
        "trait_tally": trait_tally,
        "status_applied": status_applied,
    }


def aggregate(runs, arm):
    rs = [r for r in runs if r.get("arm") == arm and "error" not in r]
    n = len(rs)
    if n == 0:
        return {"arm": arm, "n": 0}
    outcomes = {"victory": 0, "defeat": 0, "timeout": 0}
    for r in rs:
        outcomes[r["outcome"]] = outcomes.get(r["outcome"], 0) + 1
    dmg = {}
    for arch in ("corazzato", "bioelettrico", "adattivo"):
        total = sum(r["dmg_by_archetype"][arch]["total"] for r in rs)
        hits = sum(r["dmg_by_archetype"][arch]["hits"] for r in rs)
        dmg[arch] = {
            "hits": hits,
            "dmg_per_hit": round(total / hits, 3) if hits else None,
        }
    traits = {}
    for r in rs:
        for tid, c in r["trait_tally"].items():
            traits[tid] = traits.get(tid, 0) + c
    statuses = {}
    for r in rs:
        for sid_name, c in r.get("status_applied", {}).items():
            statuses[sid_name] = statuses.get(sid_name, 0) + c
    return {
        "arm": arm,
        "n": n,
        "win_rate": round(outcomes["victory"] / n, 4),
        "defeat_rate": round(outcomes["defeat"] / n, 4),
        "timeout_rate": round(outcomes["timeout"] / n, 4),
        "turns_avg": round(sum(r["turns"] for r in rs) / n, 2),
        "dmg_per_hit_by_archetype": dmg,
        "trait_trigger_tally": traits,
        "status_applied_tally": statuses,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--runs", type=int, default=40)
    p.add_argument("--arm", choices=["control", "live", "both"], default="both")
    p.add_argument("--host", default=DEFAULT_HOST,
                   help="backend host (use an IP, not 'localhost' -- L-074)")
    p.add_argument("--port", type=int, default=DEFAULT_PORT,
                   help="port for the autostarted backend when --host is down")
    p.add_argument("--out", default=None, help="output dir (summary.json + runs.jsonl)")
    p.add_argument("--seed-base", type=int, default=SEED_BASE)
    args = p.parse_args()

    out_dir = Path(args.out) if args.out else None
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)

    proc = fh = None
    if not health(args.host):
        log_path = (out_dir / "backend.log") if out_dir else Path("electric-probe-backend.log")
        print(f"[probe] backend not up at {args.host}, starting (log={log_path})", flush=True)
        proc, fh = start_backend(args.port, log_path)
        t0 = time.time()
        while time.time() - t0 < 60:
            if health(args.host):
                break
            time.sleep(1)
        else:
            print("[probe] FATAL: backend failed health check in 60s", flush=True)
            return 1

    arms = ["control", "live"] if args.arm == "both" else [args.arm]
    seeds = [args.seed_base + i for i in range(args.runs)]
    runs = []
    t_start = time.time()
    try:
        for arm in arms:
            for i, seed in enumerate(seeds):
                r = run_one(args.host, arm, seed)
                r["run_idx"] = i
                runs.append(r)
                if "error" in r:
                    print(f"[{arm} {i + 1}/{args.runs}] ERROR {r['error']}", flush=True)
                else:
                    print(
                        f"[{arm} {i + 1}/{args.runs}] seed={seed} {r['outcome']} "
                        f"turns={r['turns']} traits={r['trait_tally']}",
                        flush=True,
                    )
    finally:
        if proc is not None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
            if fh:
                fh.close()

    summary = {
        "probe": "electric_channel_tkt_d4_enrich_2533",
        "seed_base": args.seed_base,
        "runs_per_arm": args.runs,
        "elapsed_sec": round(time.time() - t_start, 1),
        "arms": {arm: aggregate(runs, arm) for arm in arms},
    }
    print("\n=== ELECTRIC PROBE SUMMARY ===", flush=True)
    print(json.dumps(summary, indent=2, ensure_ascii=False), flush=True)

    if out_dir:
        with open(out_dir / "runs.jsonl", "w", encoding="utf-8") as f:
            for r in runs:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        with open(out_dir / "summary.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        print(f"[probe] written {out_dir}/summary.json + runs.jsonl", flush=True)

    errors = [r for r in runs if "error" in r]
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
