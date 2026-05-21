#!/usr/bin/env python3
"""Method D STUB — MAP-Elites Quality-Diversity calibration explorer.

Sprint M14+ candidate. Stub implementation: structural skeleton ready, full
integration + smoke deferred until iter5/3A iter2 settled + Optuna baseline
established.

vs Optuna (Method A):
  - Optuna: greedy convergence to single optimum (best knob set)
  - MAP-Elites: ARCHIVE of diverse solutions across feature space
  - Use case: "show me knobs that produce WR ~25% AND defeat ~60% AND
    timeout ~15%" (multi-objective) vs "find best WR=20%" (single-objective)

Feature dimensions (2D map for hardcore_06):
  - x axis: WR bucket (5 buckets: 0-10, 10-20, 20-30, 30-40, 40-100%)
  - y axis: defeat_rate bucket (5 buckets: 0-30, 30-50, 50-70, 70-90, 90-100%)
  - 5x5 = 25 cells total

Each cell stores:
  - knob_values: dict {boss_hp_multiplier, turn_limit_defeat_override, ...}
  - observed_features: (wr, defeat_rate)
  - fitness: distance from cell center (lower = better representative)
  - n_trial_first: trial number that first populated cell

Iteration policy (50-100 iter recommended):
  1. With prob 0.5: random knob from full space (exploration)
  2. With prob 0.5: mutate knob from random non-empty cell (exploitation)
  3. Evaluate via batch N=20
  4. Place in feature cell — replace existing if better fitness

Compute budget: 50-100 trials × N=20 batch × ~10min = ~8-17h compute.
ONLY run when stable design baseline established (post Optuna convergence).

Dependency:
  numpy (already installed) — no new pip dep required

Refs:
- docs/research/2026-05-20-calibration-knob-patterns-industry.md "MAP-Elites QD"
- Mouret & Clune 2015 "Illuminating search spaces by mapping elites"
- Hodder et al 2024 "Quality-Diversity for game balance"
- Optuna Method A complementary: greedy vs full-archive

USAGE (when stable + integrated):
  python tools/py/calibrate_map_elites.py --scenario hardcore_06 \\
      --iterations 50 --n-per-trial 20 --host http://localhost:3340

  # Output: feature_map.json with all cell solutions + visualization data

STATUS: STUB — TPE evaluator placeholder uses synthetic objective (sin/cos).
Real backend integration follows pattern from calibrate_optuna.py
(write yaml override + restart backend + batch + parse).
"""

import argparse
import json
import math
import random
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# ─────────────────────────────────────────────────────────────────────────
# Knob space + feature dimensions
# ─────────────────────────────────────────────────────────────────────────

KNOB_SPACE = {
    "hardcore_06": {
        "boss_hp_multiplier": ("float", 0.50, 1.00),
        "turn_limit_defeat_override": ("int", 25, 35),
    },
    "hardcore_07": {
        "enemy_count_modifier": ("int", -2, 2),
        # Future: enemy_damage_multiplier_override (knob #2 needed)
    },
}

# Feature buckets (2D grid). Cell coords = (wr_bucket, defeat_bucket).
WR_BUCKETS = [(0, 0.10), (0.10, 0.20), (0.20, 0.30), (0.30, 0.40), (0.40, 1.00)]
DEFEAT_BUCKETS = [(0, 0.30), (0.30, 0.50), (0.50, 0.70), (0.70, 0.90), (0.90, 1.00)]

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
            # Discrete mutation: +/-1 with prob 0.5, +/-2 with prob 0.5
            delta = rng.choice([-2, -1, -1, 0, 0, 1, 1, 2])
            new_val = max(lo, min(hi, parent_val + delta))
            out[knob] = int(new_val)
    return out


# ─────────────────────────────────────────────────────────────────────────
# Feature mapping
# ─────────────────────────────────────────────────────────────────────────


def feature_cell(wr, defeat_rate):
    """Map (wr, defeat_rate) tuple to grid cell coordinates (wr_idx, def_idx)."""
    wr_idx = None
    for i, (lo, hi) in enumerate(WR_BUCKETS):
        if lo <= wr < hi or (i == len(WR_BUCKETS) - 1 and wr == hi):
            wr_idx = i
            break
    def_idx = None
    for i, (lo, hi) in enumerate(DEFEAT_BUCKETS):
        if lo <= defeat_rate < hi or (i == len(DEFEAT_BUCKETS) - 1 and defeat_rate == hi):
            def_idx = i
            break
    return (wr_idx, def_idx)


def cell_fitness(wr, defeat_rate, wr_idx, def_idx):
    """Distance from cell center — lower fitness = more representative.

    Used to decide whether a new sample REPLACES the existing cell occupant.
    """
    if wr_idx is None or def_idx is None:
        return float("inf")
    wr_lo, wr_hi = WR_BUCKETS[wr_idx]
    def_lo, def_hi = DEFEAT_BUCKETS[def_idx]
    wr_center = (wr_lo + wr_hi) / 2
    def_center = (def_lo + def_hi) / 2
    return math.hypot(wr - wr_center, defeat_rate - def_center)


# ─────────────────────────────────────────────────────────────────────────
# Evaluation placeholder (STUB)
# ─────────────────────────────────────────────────────────────────────────


def evaluate_knobs_stub(knobs, rng):
    """STUB: synthetic objective. Real impl writes yaml + spawns backend +
    runs batch_calibrate_*.py — see calibrate_optuna.py pattern for plug.

    Synthetic: maps knobs to features via deterministic + noisy formula.
    Useful for algorithm validation pre-real-backend-integration.
    """
    # Synthetic WR: function of boss_hp_multiplier (lower mult = higher WR)
    boss_mult = knobs.get("boss_hp_multiplier", 1.0)
    turn_lim = knobs.get("turn_limit_defeat_override", 25)
    enemy_mod = knobs.get("enemy_count_modifier", 0)

    # Synthetic WR formula (rough match to empirical pattern)
    base_wr = max(0, 1.0 - boss_mult) * 0.5  # lower boss HP = higher WR
    turn_bonus = max(0, (turn_lim - 25) * 0.02)  # more rounds = more wins
    enemy_bonus = -enemy_mod * 0.05  # fewer enemies = more wins
    wr = max(0, min(1, base_wr + turn_bonus + enemy_bonus + rng.gauss(0, 0.05)))

    # Synthetic defeat_rate: inversely correlated to WR
    defeat = max(0, min(1, 1 - wr - 0.10 + rng.gauss(0, 0.05)))

    return wr, defeat


# ─────────────────────────────────────────────────────────────────────────
# Real evaluator — reuses calibrate_optuna.py backend lifecycle + yaml writer
# ─────────────────────────────────────────────────────────────────────────

# Lazy import (calibrate_optuna in same dir). Reuses write_scenario_override
# (full-block replace, fixed L-073 bug), start_backend, stop_backend,
# restore_yaml, run_batch, DAMAGE_CURVES.
import importlib


def _load_optuna_helpers():
    """Import backend lifecycle + yaml helpers from calibrate_optuna module."""
    sys.path.insert(0, str(REPO_ROOT / "tools" / "py"))
    opt = importlib.import_module("calibrate_optuna")
    return opt


# Scenario_id mapping (MAP-Elites KNOB_SPACE keys → encounter scenario_id).
SCENARIO_ID_MAP = {
    "hardcore_06": "enc_tutorial_06_hardcore",
    "hardcore_07": "enc_tutorial_07_hardcore_pod_rush",
}


def evaluate_knobs_real(knobs, scenario, n_per_trial, log_dir, label, backend_ref):
    """REAL evaluator — write yaml override + restart backend + batch + parse.

    2026-05-21 implemented (was Sprint M14+ stub). Reuses calibrate_optuna.py
    helpers for backend lifecycle + yaml full-block replace (L-073-fixed writer).

    L-073 applied: caller passes n_per_trial>=40 (warns below). MAP-Elites
    feature placement uses observed (wr, defeat) — both need ratify-grade N
    or cells get noise-placed.

    Args:
        knobs: dict knob_values for this evaluation
        scenario: 'hardcore_06' | 'hardcore_07'
        n_per_trial: batch N (>=40 recommended per L-073)
        log_dir: Path for batch outputs
        label: unique label for this eval (cell coords or iter number)
        backend_ref: dict {'proc': Popen|None} for backend lifecycle reuse

    Returns:
        (wr, defeat_rate) tuple in [0, 1], OR (None, None) on failure.
    """
    opt = _load_optuna_helpers()
    scenario_id = SCENARIO_ID_MAP[scenario]

    # Stop prior backend (knob change requires fresh YAML cache).
    if backend_ref.get("proc") is not None:
        opt.stop_backend(backend_ref["proc"])
        backend_ref["proc"] = None

    original_yaml = opt.write_scenario_override(scenario_id, knobs)
    try:
        proc, host_url = opt.start_backend(port=3340)
        if proc is None:
            print(f"[map-elites] backend start FAIL for {label}", file=sys.stderr, flush=True)
            return (None, None)
        backend_ref["proc"] = proc

        result = opt.run_batch(scenario, host_url, n_per_trial, label, log_dir)
        if result is None:
            return (None, None)
        agg = result.get("aggregate") or result.get("summary") or {}
        wr_raw = agg.get("win_rate")
        defeat_raw = agg.get("defeat_rate")
        if wr_raw is None:
            return (None, None)
        wr = float(wr_raw)
        defeat = float(defeat_raw) if defeat_raw is not None else 0.0
        # Normalize percent → fraction if needed.
        if wr > 1.0:
            wr /= 100.0
        if defeat > 1.0:
            defeat /= 100.0
        return (wr, defeat)
    finally:
        opt.restore_yaml(opt.DAMAGE_CURVES, original_yaml)


# ─────────────────────────────────────────────────────────────────────────
# Main loop
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
                   help="(real eval only) batch N per cell eval. Default 40 per "
                        "L-073 (N<40 = noise-placed cells). Compute heavy: "
                        "iterations × N × ~30s. Use --stub-eval for fast algo test.")
    p.add_argument("--host", default="http://localhost:3340")
    args = p.parse_args()

    rng = random.Random(args.seed)
    label = args.label or time.strftime("%Y-%m-%d-%H%M%S")
    log_dir = REPO_ROOT / args.out_dir / f"map-elites-{args.scenario}-{label}"
    log_dir.mkdir(parents=True, exist_ok=True)

    mode = "STUB" if args.stub_eval else "REAL"
    backend_ref = {"proc": None}  # real-eval backend lifecycle

    if not args.stub_eval and args.n_per_trial < 40:
        print(f"[map-elites] WARNING n_per_trial={args.n_per_trial} < 40 (L-073 noise risk).",
              flush=True)
        print(f"[map-elites] Cells may be noise-placed. Best cell REQUIRES N=40 ratify.",
              flush=True)

    # Initialize empty 5x5 feature map
    feature_map = {}  # (wr_idx, def_idx) -> {knob_values, features, fitness, iter}

    print(f"[map-elites] scenario={args.scenario} iterations={args.iterations} mode={mode}", flush=True)
    print(f"[map-elites] knob_space: {KNOB_SPACE[args.scenario]}", flush=True)
    print(f"[map-elites] feature grid: {len(WR_BUCKETS)}x{len(DEFEAT_BUCKETS)} cells", flush=True)
    if not args.stub_eval:
        est_min = args.iterations * args.n_per_trial * 0.5 / 60  # ~30s/run / 60
        print(f"[map-elites] REAL eval: ~{est_min:.0f}min compute estimate "
              f"({args.iterations} iter × N={args.n_per_trial}). Heavy — Sprint M14+ budget.",
              flush=True)
    print(f"[map-elites] log_dir: {log_dir}", flush=True)

    t0 = time.time()
    cells_populated = 0
    cells_replaced = 0
    cells_skipped = 0
    eval_failures = 0
    history = []

    for i in range(args.iterations):
        # Iteration policy: 50% random / 50% mutation from existing cell
        if not feature_map or rng.random() < 0.5:
            knobs = sample_random_knobs(args.scenario, rng)
            origin = "random"
        else:
            parent_cell = rng.choice(list(feature_map.values()))
            knobs = mutate_knobs(parent_cell["knob_values"], args.scenario, rng)
            origin = "mutate"

        # Evaluate — STUB synthetic OR REAL backend batch.
        if args.stub_eval:
            wr, defeat = evaluate_knobs_stub(knobs, rng)
        else:
            wr, defeat = evaluate_knobs_real(
                knobs, args.scenario, args.n_per_trial, log_dir, f"iter-{i:03d}", backend_ref
            )
            if wr is None:
                eval_failures += 1
                print(f"[map-elites] iter {i} eval FAILED (backend/batch error), skip", flush=True)
                continue

        cell = feature_cell(wr, defeat)
        fitness = cell_fitness(wr, defeat, *cell)

        if cell == (None, None):
            cells_skipped += 1
            continue

        existing = feature_map.get(cell)
        if existing is None:
            feature_map[cell] = {
                "knob_values": knobs,
                "features": (wr, defeat),
                "fitness": fitness,
                "iter_first": i,
                "iter_last": i,
                "origin": origin,
            }
            cells_populated += 1
        elif fitness < existing["fitness"]:
            feature_map[cell] = {
                "knob_values": knobs,
                "features": (wr, defeat),
                "fitness": fitness,
                "iter_first": existing["iter_first"],
                "iter_last": i,
                "origin": origin,
            }
            cells_replaced += 1

        history.append({
            "iter": i,
            "knobs": knobs,
            "features": [wr, defeat],
            "cell": list(cell),
            "fitness": fitness,
            "origin": origin,
        })

        if (i + 1) % 10 == 0:
            print(
                f"[map-elites] iter {i+1}/{args.iterations}  "
                f"populated={cells_populated}  replaced={cells_replaced}  "
                f"skipped={cells_skipped}  cells_active={len(feature_map)}/25",
                flush=True,
            )

    elapsed = time.time() - t0

    # Real-eval backend cleanup.
    if not args.stub_eval and backend_ref.get("proc") is not None:
        opt = _load_optuna_helpers()
        opt.stop_backend(backend_ref["proc"])
        print("[map-elites] backend stopped", flush=True)

    # Compose report
    map_serializable = {
        f"{wr_idx},{def_idx}": cell_data
        for (wr_idx, def_idx), cell_data in feature_map.items()
    }
    # Convert tuples in features to lists for JSON
    for key, cell in map_serializable.items():
        cell["features"] = list(cell["features"])

    report = {
        "scenario": args.scenario,
        "iterations": args.iterations,
        "mode": "STUB" if args.stub_eval else "real",
        "knob_space": {k: list(v) for k, v in KNOB_SPACE[args.scenario].items()},
        "wr_buckets": WR_BUCKETS,
        "defeat_buckets": DEFEAT_BUCKETS,
        "feature_map": map_serializable,
        "n_per_trial": args.n_per_trial if not args.stub_eval else None,
        "stats": {
            "cells_populated": cells_populated,
            "cells_replaced": cells_replaced,
            "cells_skipped": cells_skipped,
            "eval_failures": eval_failures,
            "cells_active": len(feature_map),
            "max_cells": len(WR_BUCKETS) * len(DEFEAT_BUCKETS),
            "coverage_pct": len(feature_map) / (len(WR_BUCKETS) * len(DEFEAT_BUCKETS)) * 100,
        },
        "history": history,
        "elapsed_sec": elapsed,
        "method": "D-map-elites-qd",
        "method_ref": "docs/research/2026-05-20-calibration-knob-patterns-industry.md",
        "seed": args.seed,
        "status": "stub-validated" if args.stub_eval else "real-eval",
    }
    report_path = log_dir / "map-elites-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n[map-elites] DONE elapsed={elapsed:.1f}s", flush=True)
    print(
        f"[map-elites] coverage: {report['stats']['cells_active']}/{report['stats']['max_cells']} "
        f"cells = {report['stats']['coverage_pct']:.1f}%",
        flush=True,
    )
    print(f"[map-elites] report: {report_path}", flush=True)

    # Visualize map (text matrix)
    print(f"\n[map-elites] Feature map (rows=defeat_rate buckets, cols=WR buckets):")
    print(f"  {'WR:':<12}" + "  ".join(f"{lo*100:>3.0f}-{hi*100:<3.0f}" for lo, hi in WR_BUCKETS))
    for def_idx in range(len(DEFEAT_BUCKETS) - 1, -1, -1):
        lo, hi = DEFEAT_BUCKETS[def_idx]
        row = f"  def {lo*100:>3.0f}-{hi*100:<3.0f}: "
        for wr_idx in range(len(WR_BUCKETS)):
            cell = feature_map.get((wr_idx, def_idx))
            mark = "  X  " if cell else "  .  "
            row += mark + "  "
        print(row)

    return 0


if __name__ == "__main__":
    sys.exit(main())
