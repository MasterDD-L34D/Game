#!/usr/bin/env python3
"""Method D v2 — MAP-Elites Quality-Diversity calibration explorer.

v2 redesign after the interrupted 2026-07-02 overnight (25/50, negative result:
docs/research/2026-07-02-map-elites-hc06-overnight-negative-result.md):

  F1 (degenerate grid): axes are now WR x turns_avg. defeat_rate was empirically
     collinear with WR (wr+defeat=1.00 in 25/25 v1 trials, timer-ON regime).
     TURNS_BUCKETS calibrated on the v1 corpus (turns_avg 21.8-24.9 under the
     client-pinned cap-25 regime) + headroom for the live knob range (cap 25-35).
  F2 (N-leak 18/40): root-caused 2026-07-02 to the v1 serial backend spawned with
     stdout=PIPE never drained (calibrate_optuna.start_backend) -- the Node event
     loop froze deterministically after run 18, NOT a warm-up race. v2 evaluates
     on calibrate_parallel shards (file-logged stdout, 4x-validated pattern),
     waits /api/health readiness AND runs the batch client WITHOUT --skip-health
     so its periodic re-check aborts early instead of burning retries.
  F3 (knobs lost on kill): per-iter checkpoint JSONL (append AFTER each
     evaluation) + --resume-from replays the archive placement (kill-safe).

  Also fixed vs v1: run_shard_batch receives curves_path=staging, so the batch
  CLIENT reads the trial candidate too (OD-032 no-op-bug class: in v1 the
  client read PRODUCTION overrides and pinned turn_limit_defeat at 25, making
  the turn_limit knob a client-side no-op -- that is why v1 turns_max was 25).

Parallelism (Method C hybrid): --shards N backends on ports base..base+N-1
(LOBBY_WS_ENABLED=false per shard, L-071), each shard evaluates an INDEPENDENT
knob-set concurrently (wave scheduling; archive updated as results land).

SPRT (Method B, optional --sprt): a trial is truncated once its Wilson CI95 on
WR lies entirely inside WR-columns whose cells are all already populated (the
trial can no longer discover a new cell).

Usage:
  # dry-run gate (3 iterations, 4 shards, checkpoint + N verification)
  py tools/py/calibrate_map_elites.py --scenario hardcore_06 --iterations 3 \\
      --n-per-trial 40 --shards 4 --base-port 3390 --label dryrun

  # overnight (only after dry-run gate + explicit owner OK)
  py tools/py/calibrate_map_elites.py --scenario hardcore_06 --iterations 50 \\
      --n-per-trial 40 --shards 4 --base-port 3390 --sprt

  # resume after kill
  py tools/py/calibrate_map_elites.py --scenario hardcore_06 --iterations 50 \\
      --resume-from docs/playtest/map-elites-hardcore_06-<label>

Refs:
- docs/research/2026-07-02-map-elites-hc06-overnight-negative-result.md (v2 spec)
- docs/research/2026-05-20-calibration-knob-patterns-industry.md "MAP-Elites QD"
- Mouret & Clune 2015 "Illuminating search spaces by mapping elites"
"""

import argparse
import json
import math
import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "tools" / "py"))

import calibrate_optuna as opt  # noqa: E402  (staging writer + scenario cfg)
import calibrate_parallel as cp  # noqa: E402  (shard lifecycle, file-logged)
from calibrate_sprt import wilson_ci  # noqa: E402

# ─────────────────────────────────────────────────────────────────────────
# Knob space + feature dimensions
# ─────────────────────────────────────────────────────────────────────────

KNOB_SPACE = {
    # hc06 ranges aligned to the manifest SoT (canonical-suite.yaml knob_space:
    # boss_hp 0.50-1.30, enemy_damage 1.0-2.5) after the v2-run finding that the
    # old boss_hp cap 1.00 left the WR<20% columns unreachable (WR floor ~28%
    # with the timer live). turn_limit stays a Method-D knob (turns-axis driver;
    # Optuna pins it 41 instead -- different regime by design, OD-032 C).
    "hardcore_06": {
        "boss_hp_multiplier": ("float", 0.50, 1.30),
        "turn_limit_defeat_override": ("int", 25, 35),
        "enemy_damage_multiplier_override": ("float", 1.0, 2.5),
    },
    "hardcore_07": {
        "enemy_count_modifier": ("int", -2, 2),
        # Future: enemy_damage_multiplier_override (knob #2 needed)
    },
}

# Feature buckets (2D grid). Cell coords = (wr_idx, turns_idx).
# WR unchanged from v1. TURNS calibrated on the v1 corpus: observed 21.8-24.9
# under client-pinned cap 25 (spans buckets 0-2); buckets 3-4 open up once the
# turn_limit knob is live client-side (caps 26-35, curves_path fix above).
WR_BUCKETS = [(0, 0.10), (0.10, 0.20), (0.20, 0.30), (0.30, 0.40), (0.40, 1.00)]
TURNS_BUCKETS = [(0, 22), (22, 24), (24, 26), (26, 30), (30, 36)]

# ─────────────────────────────────────────────────────────────────────────
# Knob sampling
# ─────────────────────────────────────────────────────────────────────────


def sample_random_knobs(scenario, rng):
    """Uniform random sample from full knob space."""
    out = {}
    for knob, spec in KNOB_SPACE[scenario].items():
        kind, lo, hi = spec
        if kind == "float":
            out[knob] = round(rng.uniform(lo, hi), 3)
        elif kind == "int":
            out[knob] = rng.randint(lo, hi)
    return out


def mutate_knobs(parent_knobs, scenario, rng, sigma=0.1):
    """Gaussian mutation around parent knob values, clipped to space."""
    out = {}
    for knob, spec in KNOB_SPACE[scenario].items():
        kind, lo, hi = spec
        parent_val = parent_knobs.get(knob)
        if parent_val is None:
            # Knob added since parent eval — sample fresh
            if kind == "float":
                out[knob] = round(rng.uniform(lo, hi), 3)
            else:
                out[knob] = rng.randint(lo, hi)
            continue
        if kind == "float":
            delta = rng.gauss(0, (hi - lo) * sigma)
            new_val = max(lo, min(hi, parent_val + delta))
            out[knob] = round(new_val, 3)
        elif kind == "int":
            delta = rng.choice([-2, -1, -1, 0, 0, 1, 1, 2])
            new_val = max(lo, min(hi, parent_val + delta))
            out[knob] = int(new_val)
    return out


# ─────────────────────────────────────────────────────────────────────────
# Feature mapping (WR x turns_avg)
# ─────────────────────────────────────────────────────────────────────────


def _bucket_idx(value, buckets):
    for i, (lo, hi) in enumerate(buckets):
        if lo <= value < hi or (i == len(buckets) - 1 and value == hi):
            return i
    return None


def feature_cell(wr, turns_avg):
    """Map (wr, turns_avg) to grid cell coordinates (wr_idx, turns_idx)."""
    return (_bucket_idx(wr, WR_BUCKETS), _bucket_idx(turns_avg, TURNS_BUCKETS))


def cell_fitness(wr, turns_avg, wr_idx, turns_idx):
    """Distance from cell center in bucket-width units — lower = better.

    Normalized per-axis (WR spans 0-1, turns spans ~0-36): raw hypot would let
    the turns axis dominate. One bucket-width off equals 1.0 on either axis.
    """
    if wr_idx is None or turns_idx is None:
        return float("inf")
    wr_lo, wr_hi = WR_BUCKETS[wr_idx]
    t_lo, t_hi = TURNS_BUCKETS[turns_idx]
    dx = (wr - (wr_lo + wr_hi) / 2) / (wr_hi - wr_lo)
    dy = (turns_avg - (t_lo + t_hi) / 2) / (t_hi - t_lo)
    return math.hypot(dx, dy)


# ─────────────────────────────────────────────────────────────────────────
# Archive placement — single SoT used by the live loop AND checkpoint replay
# ─────────────────────────────────────────────────────────────────────────


def place_in_map(feature_map, entry):
    """Place one evaluation in the archive.

    entry: {iter, knobs, wr, turns, origin, n_eff}
    Returns "populated" | "replaced" | "skipped" (out of range) | None (kept
    existing occupant).
    """
    wr, turns = entry["wr"], entry["turns"]
    cell = feature_cell(wr, turns)
    if cell[0] is None or cell[1] is None:
        return "skipped"
    fitness = cell_fitness(wr, turns, *cell)
    existing = feature_map.get(cell)
    if existing is not None and fitness >= existing["fitness"]:
        return None
    feature_map[cell] = {
        "knob_values": entry["knobs"],
        "features": [wr, turns],
        "fitness": fitness,
        "iter_first": existing["iter_first"] if existing else entry["iter"],
        "iter_last": entry["iter"],
        "origin": entry["origin"],
        "n_eff": entry.get("n_eff"),
    }
    return "replaced" if existing else "populated"


# ─────────────────────────────────────────────────────────────────────────
# Checkpoint (F3 fix) — append-per-iter JSONL + resume replay
# ─────────────────────────────────────────────────────────────────────────


def append_checkpoint(path, entry):
    """Append one evaluation AFTER it completed. Kill-safe (line-atomic)."""
    cell = feature_cell(entry["wr"], entry["turns"])
    line = {
        "iter": entry["iter"],
        "knobs": entry["knobs"],
        "features": [entry["wr"], entry["turns"]],
        "cell": list(cell),
        "fitness": cell_fitness(entry["wr"], entry["turns"], *cell),
        "origin": entry["origin"],
        "n_eff": entry.get("n_eff"),
    }
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(line) + "\n")
        f.flush()


def load_checkpoint(path):
    """Rebuild (feature_map, next_iter) by replaying checkpoint placements.

    Tolerates a truncated last line (kill mid-write). Missing file -> ({}, 0).
    """
    feature_map = {}
    next_iter = 0
    path = Path(path)
    if not path.exists():
        return feature_map, next_iter
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            raw = raw.strip()
            if not raw:
                continue
            try:
                line = json.loads(raw)
            except json.JSONDecodeError:
                continue  # truncated tail from a kill mid-write
            entry = {
                "iter": line["iter"],
                "knobs": line["knobs"],
                "wr": line["features"][0],
                "turns": line["features"][1],
                "origin": line.get("origin", "random"),
                "n_eff": line.get("n_eff"),
            }
            place_in_map(feature_map, entry)
            next_iter = max(next_iter, line["iter"] + 1)
    return feature_map, next_iter


# ─────────────────────────────────────────────────────────────────────────
# SPRT truncation (Method B, optional)
# ─────────────────────────────────────────────────────────────────────────


def sprt_should_truncate(feature_map, wins, n, min_n=10, z=1.96):
    """True when the Wilson CI95 on WR only reaches WR-columns whose cells are
    ALL populated — the trial cannot discover a new cell, so stop early.

    Conservative: boundary overlap counts as reachable; an empty map never
    truncates. feature_map may be a snapshot (staleness only reduces truncation).
    """
    if n < min_n:
        return False
    lo, hi = wilson_ci(wins, n, z=z)
    reachable = [
        i for i, (b_lo, b_hi) in enumerate(WR_BUCKETS)
        if b_lo <= hi and lo <= b_hi
    ]
    for col in reachable:
        for t_idx in range(len(TURNS_BUCKETS)):
            if (col, t_idx) not in feature_map:
                return False
    return True


# ─────────────────────────────────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────────────────────────────────


def evaluate_knobs_stub(knobs, rng):
    """Synthetic (wr, turns_avg) for algorithm validation — no backend."""
    boss_mult = knobs.get("boss_hp_multiplier", 1.0)
    turn_lim = knobs.get("turn_limit_defeat_override", 25)
    enemy_mod = knobs.get("enemy_count_modifier", 0)
    base_wr = max(0, 1.0 - boss_mult) * 0.5 + max(0, (turn_lim - 25) * 0.02)
    wr = max(0, min(1, base_wr - enemy_mod * 0.05 + rng.gauss(0, 0.05)))
    # Wins resolve early (~18-24 rounds), defeats sit at the timer cap.
    win_turns = rng.uniform(18, 24)
    turns = wr * win_turns + (1 - wr) * turn_lim + rng.gauss(0, 0.4)
    return wr, max(1.0, turns)


def evaluate_knobs_shard(knobs, scenario, n_per_trial, log_dir, label, port,
                         sprt_snapshot=None):
    """REAL evaluator on ONE dedicated shard backend (file-logged stdout).

    Lifecycle: per-shard staging yaml -> cp.start_shard(curves_path) ->
    wait /api/health (readiness gate) -> batch WITHOUT --skip-health, with
    curves_path so the CLIENT reads the candidate too -> aggregate from JSONL
    (works for both natural completion and SPRT truncation) -> teardown.

    sprt_snapshot: frozenset of populated cells at eval start; enables
    truncation via sprt_should_truncate. None = SPRT off.

    Returns (wr, turns_avg, n_eff, aggregate) or None on failure.
    """
    scenario_id = opt._OPTUNA_EXTRAS[scenario]["scenario_id"]
    cp_cfg = cp.SCENARIO_MAP[scenario]
    staging_path = REPO_ROOT / "data" / "core" / "balance" / (
        f"damage_curves.staging.shard{port}.yaml")
    opt.write_scenario_override(scenario_id, knobs, staging_path=staging_path)

    iter_dir = log_dir / f"{label}-shard"
    iter_dir.mkdir(parents=True, exist_ok=True)
    out_p = log_dir / f"{label}.json"
    jsonl_p = log_dir / f"{label}.jsonl"
    log_p = log_dir / f"{label}.log"
    host = f"http://127.0.0.1:{port}"  # IP not "localhost" (L-074 IPv6 stall)

    proc = fh = None
    batch = bfh = None
    truncated = False
    try:
        proc, fh = cp.start_shard(port, iter_dir, curves_path=staging_path)
        if cp.wait_healthy(host, max_wait=90) is None:
            print(f"[map-elites] {label} shard :{port} not healthy after 90s",
                  file=sys.stderr, flush=True)
            return None
        batch, bfh = cp.run_shard_batch(host, cp_cfg, n_per_trial, out_p,
                                        jsonl_p, log_p, curves_path=staging_path,
                                        skip_health=False)
        # Monitor: SPRT truncation (optional) while the batch runs.
        while batch.poll() is None:
            time.sleep(3)
            if sprt_snapshot is None:
                continue
            outcomes = _jsonl_outcomes(jsonl_p)
            n = len(outcomes)
            wins = sum(1 for o in outcomes if o == "victory")
            if sprt_should_truncate(dict.fromkeys(sprt_snapshot, True), wins, n):
                print(f"[map-elites] {label} SPRT truncate @ N={n} "
                      f"(no unpopulated cell reachable)", flush=True)
                batch.terminate()
                try:
                    batch.wait(timeout=15)
                except Exception:
                    batch.kill()
                truncated = True
                break
        if not truncated and batch.returncode != 0:
            print(f"[map-elites] {label} batch rc={batch.returncode}",
                  file=sys.stderr, flush=True)
            # fall through: partial JSONL may still hold valid runs
        runs = cp.merge_jsonl([jsonl_p])
        agg = cp.aggregate_merged(runs, scenario)
        wr = agg.get("win_rate")
        turns = agg.get("turns_avg")
        n_eff = agg.get("N", 0)
        if wr is None or turns is None or not n_eff:
            return None
        agg["sprt_truncated"] = truncated
        return float(wr), float(turns), int(n_eff), agg
    finally:
        if batch is not None and batch.poll() is None:
            batch.terminate()
        if bfh is not None:
            try:
                bfh.close()
            except Exception:
                pass
        if proc is not None:
            cp.stop_shard(proc, fh, port)
        opt.cleanup_staging(staging_path)


def _jsonl_outcomes(jsonl_path):
    outcomes = []
    if not Path(jsonl_path).exists():
        return outcomes
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue
            if d.get("outcome") in ("victory", "defeat", "timeout"):
                outcomes.append(d["outcome"])
    return outcomes


# ─────────────────────────────────────────────────────────────────────────
# Main loop — wave-parallel over shards, checkpoint after every evaluation
# ─────────────────────────────────────────────────────────────────────────


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--scenario", choices=list(KNOB_SPACE.keys()), required=True)
    p.add_argument("--iterations", type=int, default=50, help="Total iterations (default 50)")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out-dir", default="docs/playtest")
    p.add_argument("--label", default=None)
    p.add_argument("--stub-eval", action="store_true",
                   help="Use synthetic evaluator (algorithm validation, no backend).")
    p.add_argument("--n-per-trial", type=int, default=40,
                   help="Batch N per evaluation. Default 40 per L-073 "
                        "(N<40 = noise-placed cells).")
    p.add_argument("--shards", type=int, default=4,
                   help="Concurrent shard backends, each evaluating an "
                        "independent knob-set (default 4).")
    p.add_argument("--base-port", type=int, default=3390,
                   help="First shard port (3390-339x; NEVER prod 3334/3341).")
    p.add_argument("--sprt", action="store_true",
                   help="Truncate a trial when Wilson CI95 on WR only reaches "
                        "fully-populated WR columns (Method B pattern).")
    p.add_argument("--resume-from", default=None,
                   help="Existing log_dir (or its checkpoint.jsonl): rebuild "
                        "the archive and continue up to --iterations.")
    args = p.parse_args()

    rng = random.Random(args.seed)

    # Resume: reuse the prior log_dir so checkpoint keeps appending in place.
    if args.resume_from:
        resume_path = Path(args.resume_from)
        log_dir = resume_path.parent if resume_path.suffix == ".jsonl" else resume_path
        if not log_dir.is_absolute():
            log_dir = REPO_ROOT / log_dir
        checkpoint_path = log_dir / "checkpoint.jsonl"
        feature_map, start_iter = load_checkpoint(checkpoint_path)
        print(f"[map-elites] RESUME from {checkpoint_path}: "
              f"{len(feature_map)} cells, next iter {start_iter}", flush=True)
    else:
        label = args.label or time.strftime("%Y-%m-%d-%H%M%S")
        log_dir = REPO_ROOT / args.out_dir / f"map-elites-{args.scenario}-{label}"
        log_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path = log_dir / "checkpoint.jsonl"
        feature_map = {}
        start_iter = 0

    mode = "STUB" if args.stub_eval else "REAL"
    max_cells = len(WR_BUCKETS) * len(TURNS_BUCKETS)

    if not args.stub_eval and args.n_per_trial < 40:
        print(f"[map-elites] WARNING n_per_trial={args.n_per_trial} < 40 "
              f"(L-073 noise risk).", flush=True)

    print(f"[map-elites] scenario={args.scenario} iterations={args.iterations} "
          f"mode={mode} shards={args.shards} sprt={args.sprt}", flush=True)
    print(f"[map-elites] knob_space: {KNOB_SPACE[args.scenario]}", flush=True)
    print(f"[map-elites] grid: WR{len(WR_BUCKETS)} x turns{len(TURNS_BUCKETS)} "
          f"= {max_cells} cells", flush=True)
    print(f"[map-elites] log_dir: {log_dir}", flush=True)
    if not args.stub_eval:
        est_min = (args.iterations - start_iter) * args.n_per_trial * 0.5 / args.shards
        print(f"[map-elites] REAL eval: ~{est_min:.0f}min (~{est_min/60:.1f}h) "
              f"estimate ({args.iterations - start_iter} iter x N={args.n_per_trial} "
              f"x ~30s/run / {args.shards} shards). Ports "
              f"{args.base_port}-{args.base_port + args.shards - 1}.", flush=True)

    t0 = time.time()
    stats = {"populated": 0, "replaced": 0, "skipped": 0, "eval_failures": 0,
             "n_shortfall": 0, "sprt_truncated": 0}
    history = []
    lock = threading.Lock()

    def propose():
        with lock:
            if not feature_map or rng.random() < 0.5:
                return sample_random_knobs(args.scenario, rng), "random"
            parent = rng.choice(list(feature_map.values()))
            return mutate_knobs(parent["knob_values"], args.scenario, rng), "mutate"

    def run_one(i, knobs, origin, port):
        if args.stub_eval:
            wr, turns = evaluate_knobs_stub(knobs, rng)
            return i, knobs, origin, (wr, turns, args.n_per_trial, {})
        snapshot = frozenset(feature_map.keys()) if args.sprt else None
        res = evaluate_knobs_shard(knobs, args.scenario, args.n_per_trial,
                                   log_dir, f"iter-{i:03d}", port,
                                   sprt_snapshot=snapshot)
        return i, knobs, origin, res

    i = start_iter
    while i < args.iterations:
        wave = []
        for s in range(min(args.shards, args.iterations - i)):
            knobs, origin = propose()
            wave.append((i + s, knobs, origin, args.base_port + s))
        with ThreadPoolExecutor(max_workers=len(wave)) as ex:
            futures = [ex.submit(run_one, *w) for w in wave]
            for fut in as_completed(futures):
                it, knobs, origin, res = fut.result()
                if res is None:
                    stats["eval_failures"] += 1
                    print(f"[map-elites] iter {it} eval FAILED, skip", flush=True)
                    continue
                wr, turns, n_eff, agg = res
                if not args.stub_eval and n_eff < args.n_per_trial \
                        and not agg.get("sprt_truncated"):
                    stats["n_shortfall"] += 1
                    print(f"[map-elites] iter {it} WARNING N_eff={n_eff} < "
                          f"requested {args.n_per_trial}", flush=True)
                if agg.get("sprt_truncated"):
                    stats["sprt_truncated"] += 1
                entry = {"iter": it, "knobs": knobs, "wr": wr, "turns": turns,
                         "origin": origin, "n_eff": n_eff}
                with lock:
                    outcome = place_in_map(feature_map, entry)
                    if outcome in ("populated", "replaced", "skipped"):
                        stats[outcome] += 1
                    append_checkpoint(checkpoint_path, entry)
                    history.append({**entry, "cell": list(feature_cell(wr, turns)),
                                    "placement": outcome})
                print(f"[map-elites] iter {it} WR={wr*100:.1f}% turns={turns:.1f} "
                      f"N={n_eff} cell={feature_cell(wr, turns)} -> "
                      f"{outcome or 'kept-existing'}  "
                      f"[{len(feature_map)}/{max_cells} cells]", flush=True)
        i += len(wave)

    elapsed = time.time() - t0

    map_serializable = {
        f"{wr_idx},{t_idx}": cell for (wr_idx, t_idx), cell in feature_map.items()
    }
    report = {
        "scenario": args.scenario,
        "iterations": args.iterations,
        "mode": "STUB" if args.stub_eval else "real",
        "knob_space": {k: list(v) for k, v in KNOB_SPACE[args.scenario].items()},
        "wr_buckets": WR_BUCKETS,
        "turns_buckets": TURNS_BUCKETS,
        "feature_map": map_serializable,
        "n_per_trial": args.n_per_trial if not args.stub_eval else None,
        "shards": args.shards,
        "sprt": args.sprt,
        "resumed_from_iter": start_iter or None,
        "stats": {
            "cells_populated": stats["populated"],
            "cells_replaced": stats["replaced"],
            "cells_skipped": stats["skipped"],
            "eval_failures": stats["eval_failures"],
            "n_shortfall": stats["n_shortfall"],
            "sprt_truncated": stats["sprt_truncated"],
            "cells_active": len(feature_map),
            "max_cells": max_cells,
            "coverage_pct": len(feature_map) / max_cells * 100,
        },
        "history": history,
        "checkpoint": str(checkpoint_path),
        "elapsed_sec": elapsed,
        "method": "D-map-elites-qd-v2",
        "method_ref": "docs/research/2026-07-02-map-elites-hc06-overnight-negative-result.md",
        "seed": args.seed,
        "status": "stub-validated" if args.stub_eval else "real-eval",
    }
    report_path = log_dir / "map-elites-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n[map-elites] DONE elapsed={elapsed:.1f}s", flush=True)
    print(f"[map-elites] coverage: {len(feature_map)}/{max_cells} cells = "
          f"{report['stats']['coverage_pct']:.1f}%", flush=True)
    print(f"[map-elites] report: {report_path}", flush=True)

    print(f"\n[map-elites] Feature map (rows=turns_avg buckets, cols=WR buckets):")
    print(f"  {'WR:':<14}" + "  ".join(f"{lo*100:>3.0f}-{hi*100:<3.0f}" for lo, hi in WR_BUCKETS))
    for t_idx in range(len(TURNS_BUCKETS) - 1, -1, -1):
        lo, hi = TURNS_BUCKETS[t_idx]
        row = f"  turns {lo:>2.0f}-{hi:<2.0f}: "
        for wr_idx in range(len(WR_BUCKETS)):
            row += ("  X  " if (wr_idx, t_idx) in feature_map else "  .  ") + "  "
        print(row)

    return 0


if __name__ == "__main__":
    sys.exit(main())
