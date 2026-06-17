#!/usr/bin/env python3
"""Method A — Bayesian optimization via Optuna (L-070 follow-up).

Replaces manual knob ladder (iter3 + iter4 + 3A failures session 2026-05-20)
with auto-converge via Optuna TPE (Tree-structured Parzen Estimator).

Each trial:
  1. Optuna suggests knob values from posterior over knob space
  2. Script writes yaml overrides
  3. Spawns backend shard (LOBBY_WS_ENABLED=false)
  4. Runs N samples batch
  5. Computes objective (distance from target band center)
  6. Optuna updates posterior, suggests next trial

vs Manual iter1/2/3 ladder:
  - Manual: random walk, may need 5-10 iter to converge
  - Optuna: ~5-8 trials, joint-effect prediction prevents overshoot
  - Specifically solves L-070 multi-knob overshoot (iter3+iter4+3A)

Dependency:
  pip install optuna

  (Gated per CLAUDE.md — explicit approval required for new pip deps.
  User G1a approved 2026-05-21 session. Install may require Bash permission
  rule in .claude/settings.local.json or manual install via shell.)

Usage:
  # Hardcore_06 8 trials N=20 per trial
  python tools/py/calibrate_optuna.py --scenario hardcore_06 --n-trials 8 \\
      --n-per-trial 20 --host http://localhost:3340

  # Hardcore_07 5 trials parallel C N=40 per trial
  python tools/py/calibrate_optuna.py --scenario hardcore_07 --n-trials 5 \\
      --n-per-trial 40 --parallel --shards 4

Knob space defaults (overridable via --knob-config):
  boss_hp_multiplier: float [0.50, 1.00]
  turn_limit_defeat_override: int [25, 35]  (only hc06)
  enemy_damage_multiplier_override: float [1.5, 2.5]  (only hc07)
  enemy_count_modifier: int [-2, 2]

Refs:
- docs/research/2026-05-20-calibration-knob-patterns-industry.md
- docs/playtest/2026-05-20-hardcore-06-iter*-overshoot.md (L-070 evidence)
- docs/museum/cards/calibration-n-sample-authority-2026-05-20.md
- Optuna docs: https://optuna.org
"""

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = REPO_ROOT / "tools" / "py"
DAMAGE_CURVES = REPO_ROOT / "data" / "core" / "balance" / "damage_curves.yaml"
# 2026-05-21 staging-writer fix (issue #2356): candidate trials write to a
# STAGING copy, NEVER production. Backend reads it via DAMAGE_CURVES_PATH env.
# Eliminates 3rd-occurrence in-place clobber (write-to-prod + restore-on-finally
# was fragile when process killed mid-run before restore fired).
STAGING_CURVES = REPO_ROOT / "data" / "core" / "balance" / "damage_curves.staging.yaml"
BACKEND_INDEX = REPO_ROOT / "apps" / "backend" / "index.js"

SCENARIO_CFG = {
    "hardcore_06": {
        "scenario_id": "enc_tutorial_06_hardcore",
        "target_band": (0.15, 0.30),
        "target_center": 0.20,
        "batch_script": "batch_calibrate_hardcore06.py",
        # OD-032 A+C: boss_hp = difficulty/WR lever; enemy_damage = lethality lever
        # (high dmg -> faster wipes). turn_limit PINNED 41 (>= MAX_ROUNDS 40 =
        # disabled) — carried from the OD-032 C ALT probe that tried to open a
        # timeout-middle band. That band proved UNREACHABLE: hc06 combat resolves
        # win/wipe within 40 rounds, so timeout ~0 even timer-off (see the hardcore
        # comment in damage_curves.yaml + OD-032 A). Objective therefore targets the
        # CANONICAL defeat-heavy band below, not the old middle band. Searching
        # turn_limit wastes ~76% of trials in a dead zone, so it stays a
        # fixed_override not a knob.
        "knob_space": {
            "boss_hp_multiplier": ("float", 0.50, 1.30),
            "enemy_damage_multiplier_override": ("float", 1.0, 2.5),
        },
        "fixed_overrides": {"turn_limit_defeat_override": 41},
        "extra_batch_args": ["--encounter-class", "hardcore"],
        # Multi-band objective = CANONICAL hardcore target_bands (damage_curves.yaml
        # hardcore: win 15-30%, defeat 75-85%, timeout 0-5%, revised OD-032
        # 2026-05-21; WR upper widened 25->30% 2026-06-17 master-dd decision A).
        # WR primary-weighted (hard constraint). See parse_objective_multiband.
        "secondary_bands": {
            "win_rate": (0.15, 0.30),
            "defeat_rate": (0.75, 0.85),
            "timeout_rate": (0.00, 0.05),
        },
    },
    "hardcore_07": {
        "scenario_id": "enc_tutorial_07_hardcore_pod_rush",
        "target_band": (0.30, 0.50),
        "target_center": 0.40,
        "batch_script": "batch_calibrate_hardcore07.py",
        "knob_space": {
            # hc07 WR lever = enemy_damage_multiplier_override (ratified 2.5 -> 42% WR,
            # damage_curves.yaml). enemy_count -1 was REJECTED (inverted dir, 3a iter1) --
            # it is NOT the WR lever, so searching it cannot reproduce the ratified value.
            "enemy_damage_multiplier_override": ("float", 1.5, 2.5),
        },
        "extra_batch_args": [],
    },
}


def health_check(host, timeout=2):
    try:
        with urllib.request.urlopen(f"{host}/api/health", timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


def wait_healthy(host, max_wait=90):
    t0 = time.time()
    while time.time() - t0 < max_wait:
        if health_check(host):
            return time.time() - t0
        time.sleep(1)
    return None


def write_scenario_override(scenario_id, knob_values, staging_path=STAGING_CURVES):
    """Write candidate scenario_overrides to a STAGING copy (NEVER production).

    2026-05-21 staging-writer fix (issue #2356, 3rd-occurrence clobber):
    reads production damage_curves.yaml, replaces scenario_overrides block with
    trial-only candidate, writes to STAGING file. Production untouched. Backend
    reads staging via DAMAGE_CURVES_PATH env (set in start_backend).

    Eliminates fragile write-to-prod + restore-on-finally (restore skipped if
    process killed mid-run → production clobbered with stale trial knobs).

    Block-replace via line-by-line parser (no regex multiline traps; ASCII-only
    comment per anti-pattern #12).

    Returns: staging_path (Path) — pass to start_backend(curves_path=...).
    """
    # Always read from PRODUCTION (source of truth), write to STAGING.
    with open(DAMAGE_CURVES, "r", encoding="utf-8") as f:
        original = f.read()

    # Build trial override block (clean, no inherited entries). ASCII-only.
    block_lines = ["scenario_overrides:", f"  {scenario_id}:"]
    block_lines.append("    # OPTUNA/MAP-ELITES TRIAL -- auto-generated, staging only")
    for knob, val in knob_values.items():
        if val is None:
            block_lines.append(f"    {knob}: null")
        elif isinstance(val, bool):
            block_lines.append(f"    {knob}: {'true' if val else 'false'}")
        else:
            block_lines.append(f"    {knob}: {val}")
    trial_block = "\n".join(block_lines)

    # Find existing scenario_overrides block (line-by-line, no regex).
    lines = original.splitlines(keepends=False)
    start_idx = None
    end_idx = None  # exclusive
    for i, line in enumerate(lines):
        if start_idx is None:
            if line.startswith("scenario_overrides:"):
                start_idx = i
                continue
        else:
            stripped = line.rstrip()
            if not stripped:
                continue
            if stripped[0] not in (" ", "\t"):
                if stripped.startswith("# ─") or (stripped[0].isalpha() and ":" in stripped):
                    end_idx = i
                    break

    if start_idx is not None and end_idx is None:
        end_idx = len(lines)

    if start_idx is not None:
        new_lines = lines[:start_idx] + trial_block.split("\n") + [""] + lines[end_idx:]
        modified = "\n".join(new_lines)
        if not modified.endswith("\n"):
            modified += "\n"
    else:
        import re
        modified = re.sub(
            r"(\n# ─── Validation rules)",
            f"\n{trial_block}\n\\1",
            original,
            count=1,
        )

    with open(staging_path, "w", encoding="utf-8") as f:
        f.write(modified)
    return staging_path


def cleanup_staging(staging_path=STAGING_CURVES):
    """Remove staging file post-run (production was never touched)."""
    try:
        if os.path.exists(staging_path):
            os.remove(staging_path)
    except OSError:
        pass


def restore_yaml(yaml_path, original_text):
    """DEPRECATED (staging-writer fix): production never modified, nothing to
    restore. Kept as no-op for back-compat with callers expecting the signature.
    If original_text looks like a staging path string, treat as cleanup."""
    # No-op: production untouched under staging-writer model.
    return None


def start_backend(port=3340, curves_path=None):
    """Spawn backend. curves_path (staging file) sets DAMAGE_CURVES_PATH env
    so backend reads candidate overrides without touching production."""
    env = dict(os.environ)
    env["PORT"] = str(port)
    env["LOBBY_WS_ENABLED"] = "false"
    if curves_path is not None:
        env["DAMAGE_CURVES_PATH"] = str(curves_path)
    log = subprocess.PIPE
    proc = subprocess.Popen(
        ["node", str(BACKEND_INDEX)],
        stdout=log,
        stderr=subprocess.STDOUT,
        env=env,
        cwd=str(REPO_ROOT),
    )
    wait = wait_healthy(f"http://127.0.0.1:{port}", max_wait=90)
    if wait is None:
        proc.kill()
        return None, None
    return proc, f"http://127.0.0.1:{port}"


def stop_backend(proc):
    if proc is None:
        return
    try:
        if os.name == "nt":
            proc.terminate()
        else:
            proc.send_signal(signal.SIGTERM)
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)
    except Exception:
        pass


def run_batch(scenario, host, n, label, log_dir, curves_path=None):
    """Run batch_calibrate_*.py + return parsed result.

    curves_path (OD-032 no-op-bug fix): pass DAMAGE_CURVES_PATH to the batch CLIENT
    so its scenario-override parser reads the staging candidate (not production).
    """
    cfg = SCENARIO_CFG[scenario]
    script = TOOLS_PY / cfg["batch_script"]
    out_path = log_dir / f"{label}.json"
    jsonl_path = log_dir / f"{label}.jsonl"
    log_path = log_dir / f"{label}.log"
    cmd = [
        sys.executable, "-u", str(script),
        "--host", host,
        "--n", str(n),
        "--out", str(out_path),
        "--jsonl", str(jsonl_path),
        "--skip-health",
    ] + cfg["extra_batch_args"]
    env = dict(os.environ)
    if curves_path is not None:
        env["DAMAGE_CURVES_PATH"] = str(curves_path)
    with open(log_path, "w", encoding="utf-8") as fh:
        rc = subprocess.run(cmd, stdout=fh, stderr=subprocess.STDOUT, cwd=str(REPO_ROOT), env=env).returncode
    if rc != 0:
        return None
    try:
        with open(out_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def parse_objective(result, target_center):
    """Distance from target band center. Optuna minimizes."""
    if result is None:
        return float("inf")
    agg = result.get("aggregate") or result.get("summary") or {}
    wr_raw = agg.get("win_rate")
    if wr_raw is None:
        return float("inf")
    wr = float(wr_raw)
    if wr > 1.0:
        wr = wr / 100.0
    return abs(wr - target_center)


def _norm_rate(v):
    if v is None:
        return None
    v = float(v)
    return v / 100.0 if v > 1.0 else v


def _band_distance(val, lo, hi):
    """Out-of-band distance (0 inside band, else distance to nearest edge)."""
    if val < lo:
        return lo - val
    if val > hi:
        return val - hi
    return 0.0


def parse_objective_multiband(agg, bands, primary_key="win_rate", primary_weight=2.0):
    """Composite multi-band penalty. Optuna minimizes.

    Sum of weighted out-of-band distances across WR + defeat + timeout. WR is
    primary-weighted (hard constraint per L-069 — must stay in-band). A tiny
    center-pull tie-break (0.01x) gives gradient toward band centers even when
    all rates are already in-band. Returns inf if any required rate is missing.
    """
    if not agg:
        return float("inf")
    rates = {}
    for key in bands:
        v = _norm_rate(agg.get(key))
        if v is None:
            return float("inf")
        rates[key] = v
    penalty = 0.0
    tiebreak = 0.0
    for key, (lo, hi) in bands.items():
        w = primary_weight if key == primary_key else 1.0
        penalty += w * _band_distance(rates[key], lo, hi)
        tiebreak += abs(rates[key] - (lo + hi) / 2.0)
    return penalty + 0.01 * tiebreak


def _store_rates(trial, agg, n):
    """Persist observed rates as Optuna user_attrs so the report is self-contained."""
    try:
        trial.set_user_attr("win_rate", _norm_rate((agg or {}).get("win_rate")))
        trial.set_user_attr("defeat_rate", _norm_rate((agg or {}).get("defeat_rate")))
        trial.set_user_attr("timeout_rate", _norm_rate((agg or {}).get("timeout_rate")))
        trial.set_user_attr("n", n)
    except Exception:
        pass


def _fmt_rates(agg):
    """Compact WR/defeat/timeout log string from an aggregate dict."""
    def pct(key):
        v = _norm_rate((agg or {}).get(key))
        return "?" if v is None else f"{v * 100:.1f}%"
    return f"WR={pct('win_rate')} def={pct('defeat_rate')} to={pct('timeout_rate')}"


def make_objective_parallel(scenario, n_per_trial, shards, base_port, log_dir):
    """Parallel-internal objective: each trial uses N shards (4x speedup).

    Per-trial 24min serial -> ~6min via 4-shard parallel C. Staging-writer:
    all shards read same trial candidate via DAMAGE_CURVES_PATH env (production
    untouched). Imports calibrate_parallel helpers.
    """
    import importlib
    cfg = SCENARIO_CFG[scenario]
    cp = importlib.import_module("calibrate_parallel")
    cp_cfg = cp.SCENARIO_MAP[scenario]  # calibrate_parallel cfg (key "script", not "batch_script")

    def objective(trial):
        knob_values = {}
        for knob, spec in cfg["knob_space"].items():
            kind, lo, hi = spec
            if kind == "float":
                knob_values[knob] = round(trial.suggest_float(knob, lo, hi), 3)
            elif kind == "int":
                knob_values[knob] = trial.suggest_int(knob, lo, hi)
            else:
                raise ValueError(f"Unknown knob kind: {kind}")

        knob_values.update(cfg.get("fixed_overrides") or {})  # pinned non-search overrides
        trial_label = f"trial-{trial.number:03d}"
        print(f"\n[optuna-parallel] {trial_label} knobs: {knob_values}", flush=True)

        staging_path = write_scenario_override(cfg["scenario_id"], knob_values)
        ports = [base_port + i for i in range(shards)]
        # 127.0.0.1 not "localhost": Windows IPv6 ::1 stall ~2s/call (see calibrate_parallel.py).
        hosts = [f"http://127.0.0.1:{p}" for p in ports]
        shard_procs, shard_fhs = [], []
        try:
            # Pre-check ports free.
            for h in hosts:
                if cp.health_check(h, timeout=1):
                    print(f"[optuna-parallel] port busy {h}, abort trial", file=sys.stderr, flush=True)
                    return float("inf")
            # Spawn shards (staging-aware via curves_path).
            shard_logdir = log_dir / f"{trial_label}-shards"
            shard_logdir.mkdir(parents=True, exist_ok=True)
            for port in ports:
                proc, fh = cp.start_shard(port, shard_logdir, curves_path=staging_path)
                shard_procs.append(proc)
                shard_fhs.append(fh)
            for h in hosts:
                if cp.wait_healthy(h, max_wait=60) is None:
                    print(f"[optuna-parallel] shard {h} unhealthy, abort", file=sys.stderr, flush=True)
                    return float("inf")
            # Distribute N + run batches parallel.
            n_per = cp.distribute_n(n_per_trial, shards)
            batch_procs, jsonl_paths = [], []
            for i, (host, n) in enumerate(zip(hosts, n_per)):
                if n == 0:
                    continue
                out_p = log_dir / f"{trial_label}-shard{i}.json"
                jsonl_p = log_dir / f"{trial_label}-shard{i}.jsonl"
                log_p = log_dir / f"{trial_label}-shard{i}.log"
                jsonl_paths.append(jsonl_p)
                # OD-032 no-op-bug fix: batch CLIENT also reads staging candidate.
                proc, fh = cp.run_shard_batch(host, cp_cfg, n, out_p, jsonl_p, log_p,
                                              curves_path=staging_path)
                batch_procs.append((proc, fh))
            for proc, fh in batch_procs:
                proc.wait()
                try:
                    fh.close()
                except Exception:
                    pass
            runs = cp.merge_jsonl(jsonl_paths)
            agg = cp.aggregate_merged(runs, scenario)
            bands = cfg.get("secondary_bands")
            if bands:
                distance = parse_objective_multiband(agg, bands)
            else:
                distance = parse_objective({"aggregate": agg}, cfg["target_center"])
            _store_rates(trial, agg, len(runs))
            print(f"[optuna-parallel] {trial_label} {_fmt_rates(agg)} "
                  f"N={len(runs)} distance={distance:.3f}", flush=True)
            return distance
        finally:
            ports2 = [base_port + i for i in range(shards)]
            for proc, fh, port in zip(shard_procs, shard_fhs, ports2):
                cp.stop_shard(proc, fh, port)
            cleanup_staging(staging_path)

    return objective


def make_objective(scenario, host, n_per_trial, log_dir, backend_proc_ref):
    """Returns Optuna objective function closure (single-backend serial)."""
    cfg = SCENARIO_CFG[scenario]

    def objective(trial):
        # Suggest knob values from posterior.
        knob_values = {}
        for knob, spec in cfg["knob_space"].items():
            kind, lo, hi = spec
            if kind == "float":
                knob_values[knob] = round(trial.suggest_float(knob, lo, hi), 3)
            elif kind == "int":
                knob_values[knob] = trial.suggest_int(knob, lo, hi)
            else:
                raise ValueError(f"Unknown knob kind: {kind}")

        knob_values.update(cfg.get("fixed_overrides") or {})  # pinned non-search overrides
        trial_label = f"trial-{trial.number:03d}"
        print(f"\n[optuna] {trial_label} knobs: {knob_values}", flush=True)

        # Restart backend to pick up new staging yaml.
        if backend_proc_ref["proc"] is not None:
            stop_backend(backend_proc_ref["proc"])
            backend_proc_ref["proc"] = None
        # Staging-writer fix (issue #2356): write candidate to STAGING, backend
        # reads via DAMAGE_CURVES_PATH env. Production never touched.
        staging_path = write_scenario_override(cfg["scenario_id"], knob_values)
        try:
            proc, host_url = start_backend(port=3340, curves_path=staging_path)
            if proc is None:
                print(f"[optuna] {trial_label} backend start failed", file=sys.stderr, flush=True)
                return float("inf")
            backend_proc_ref["proc"] = proc

            # OD-032 no-op-bug fix: batch CLIENT also reads staging candidate.
            result = run_batch(scenario, host_url, n_per_trial, trial_label, log_dir,
                               curves_path=staging_path)
            bands = cfg.get("secondary_bands")
            if result:
                agg = result.get("aggregate") or result.get("summary") or {}
                if bands:
                    distance = parse_objective_multiband(agg, bands)
                else:
                    distance = parse_objective(result, cfg["target_center"])
                _store_rates(trial, agg, agg.get("n") or n_per_trial)
                print(f"[optuna] {trial_label} {_fmt_rates(agg)} distance={distance:.3f}", flush=True)
            else:
                distance = float("inf")
                print(f"[optuna] {trial_label} batch failed", file=sys.stderr, flush=True)
            return distance
        finally:
            cleanup_staging(staging_path)

    return objective


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--scenario", choices=list(SCENARIO_CFG.keys()), required=True)
    p.add_argument("--n-trials", type=int, default=8, help="Optuna trials (default 8)")
    p.add_argument("--n-per-trial", type=int, default=40,
                   help="Batch N per trial (default 40 — ratify-grade per L-073). "
                        "N<40 = optimizer converges to NOISE (smoke 2026-05-21: "
                        "N=20 trial WR 15% -> N=40 ratify WR 30%). Use parallel C "
                        "internal to make N=40/trial affordable (~3min/trial).")
    p.add_argument("--host", default="http://127.0.0.1:3340",
                   help="Backend URL (auto-managed if backend not running)")
    p.add_argument("--parallel", action="store_true",
                   help="Parallel-internal: each trial uses N shards (4x speedup). "
                        "Per-trial 24min serial -> ~6min. Staging-writer keeps "
                        "production untouched across shards.")
    p.add_argument("--shards", type=int, default=4, help="Shards per trial (--parallel)")
    p.add_argument("--base-port", type=int, default=3341,
                   help="First shard port (--parallel). Default 3341.")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out-dir", default="docs/playtest")
    p.add_argument("--label", default=None)
    args = p.parse_args()

    try:
        import optuna
    except ImportError:
        print("ERROR: optuna not installed.", file=sys.stderr)
        print("Install: pip install optuna", file=sys.stderr)
        print("(Gated per CLAUDE.md — explicit approval required. User G1a approved 2026-05-21.)",
              file=sys.stderr)
        return 1

    cfg = SCENARIO_CFG[args.scenario]
    label = args.label or time.strftime("%Y-%m-%d-%H%M%S")
    log_dir = REPO_ROOT / args.out_dir / f"optuna-{args.scenario}-{label}"
    log_dir.mkdir(parents=True, exist_ok=True)

    # n_startup_trials default 10 = pure random until then. With small trial budgets
    # (8-12) over 2-3 knobs that means no Bayesian guidance at all. Lower to 5 so TPE
    # exploits the posterior for the back half of the run.
    n_startup = min(5, max(2, args.n_trials // 2))
    sampler = optuna.samplers.TPESampler(seed=args.seed, n_startup_trials=n_startup)
    study = optuna.create_study(direction="minimize", sampler=sampler,
                                 study_name=f"calibrate-{args.scenario}-{label}")

    backend_proc_ref = {"proc": None}
    if args.parallel:
        objective = make_objective_parallel(
            args.scenario, args.n_per_trial, args.shards, args.base_port, log_dir
        )
        print(f"[optuna] PARALLEL-internal mode: {args.shards} shards/trial "
              f"base-port {args.base_port} (per-trial ~4x speedup)", flush=True)
    else:
        objective = make_objective(args.scenario, args.host, args.n_per_trial, log_dir, backend_proc_ref)

    if args.n_per_trial < 40:
        print(f"[optuna] WARNING — n_per_trial={args.n_per_trial} < 40 (L-073 noise risk).",
              flush=True)
        print(f"[optuna] Optimizer may converge to noise. Best params REQUIRE N=40 ratify.",
              flush=True)
    print(f"[optuna] scenario={args.scenario} n_trials={args.n_trials} n_per_trial={args.n_per_trial}",
          flush=True)
    print(f"[optuna] target band: {cfg['target_band']} (center: {cfg['target_center']})", flush=True)
    print(f"[optuna] knob_space: {cfg['knob_space']}", flush=True)
    print(f"[optuna] log_dir: {log_dir}", flush=True)

    t0 = time.time()
    try:
        study.optimize(objective, n_trials=args.n_trials)
    finally:
        if backend_proc_ref["proc"] is not None:
            stop_backend(backend_proc_ref["proc"])

    elapsed = time.time() - t0
    best = study.best_trial

    # best.params holds only the SAMPLED knobs; Optuna omits pinned fixed_overrides.
    # ratify_params is the full effective config a ratify run must reproduce (P2).
    fixed_overrides_eff = cfg.get("fixed_overrides") or {}
    ratify_params = {**best.params, **fixed_overrides_eff}

    report = {
        "scenario": args.scenario,
        "scenario_id": cfg["scenario_id"],
        "target_band": list(cfg["target_band"]),
        "target_center": cfg["target_center"],
        "n_trials_requested": args.n_trials,
        "n_per_trial": args.n_per_trial,
        "n_trials_completed": len(study.trials),
        "best_trial_number": best.number,
        "best_value_distance": best.value,
        "best_params": best.params,
        "fixed_overrides": fixed_overrides_eff,
        "ratify_params": ratify_params,
        "best_rates": dict(best.user_attrs),
        "secondary_bands": {k: list(v) for k, v in (cfg.get("secondary_bands") or {}).items()},
        "all_trials": [
            {
                "number": t.number,
                "value": t.value,
                "params": t.params,
                "rates": dict(t.user_attrs),
                "state": str(t.state),
            }
            for t in study.trials
        ],
        "elapsed_sec": elapsed,
        "method": "A-optuna-tpe",
        "method_ref": "docs/research/2026-05-20-calibration-knob-patterns-industry.md",
        "seed": args.seed,
    }
    report_path = log_dir / "optuna-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n[optuna] DONE elapsed={elapsed/60:.1f}min", flush=True)
    print(f"[optuna] best trial #{best.number}: distance={best.value:.3f} params={best.params}",
          flush=True)
    if best.user_attrs:
        print(f"[optuna] best rates: {_fmt_rates(best.user_attrs)} "
              f"(N={best.user_attrs.get('n')})", flush=True)
    print(f"[optuna] report: {report_path}", flush=True)
    if fixed_overrides_eff:
        print(f"[optuna] NEXT: N=40 ratify FULL params {ratify_params} before ship "
              f"(L-069). best_params omits pinned {fixed_overrides_eff} — include them.",
              flush=True)
    else:
        print(f"[optuna] NEXT: N=40 ratify best_params {best.params} before ship (L-069).",
              flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
