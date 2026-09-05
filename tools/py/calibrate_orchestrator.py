#!/usr/bin/env python3
"""Per-template calibration orchestrator (G2 P2).

State machine that tunes a scenario's KNOB to its band using an injectable
`runner` (so the logic is testable without a backend). P2 scope:
probe -> ratify -> single-knob bisection -> finalize (staging + report).
NO Optuna (P3), NO production auto-ratify (P4). See
docs/superpowers/specs/2026-06-17-per-template-calibration-design.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from objective import evaluate_metric  # noqa: E402


def in_band(value, band):
    return band[0] <= value <= band[1]


def orchestrate(
    *,
    band,
    knob_space,
    start_knob,
    objective_metric,
    runner,
    max_bisect=8,
    probe_n=10,
    ratify_n=40,
    optuna_search=None,
    optuna_trials=8,
    optuna_n_per_trial=20,
    seed=42,
):
    """Tune a scenario's KNOB(s) to land WR in `band`, using `runner(knob_values, n) -> metrics`.

    Escalation (P3): a single tunable knob uses probe -> ratify -> direction-aware
    bisection; if bisection cannot converge it escalates to the OPTUNA stage. More than
    one tunable knob cannot be tuned by single-knob bisection, so it goes straight to
    OPTUNA (joint Bayesian search, L-070). `optuna_search(knob_space, runner, *, score_fn,
    n_trials, n_per_trial, seed, start_knob) -> best_knob` is injectable (the real
    calibrate_optuna core in production, a deterministic fake in tests); when None it is
    lazily imported. Returns {status, knob, metrics, composite, band, n_used, history};
    status is 'in-band' if a ratify run lands in band, else 'not-converged'.
    """
    history = []
    if not knob_space:
        return {"status": "not-converged", "knob": dict(start_knob), "metrics": {},
                "composite": None, "band": band, "n_used": 0, "history": history}

    def run_full(knob_values, n, stage):
        m = runner({**start_knob, **knob_values}, n)
        wr = m["win_rate"]
        # Gates on WR (in_band). Composite is best-effort for the report: if the runner
        # did not emit every objective term (e.g. pe_ratio not yet wired in the batch
        # aggregate), composite stays None rather than crashing. Composite-driven gating
        # is a P4 concern.
        try:
            comp = evaluate_metric(objective_metric, m) if objective_metric else None
        except KeyError:
            comp = None
        history.append({"stage": stage, "knob": dict(knob_values), "win_rate": wr, "n": n})
        return m, wr, comp

    def result(status, knob_values, m, comp):
        return {"status": status, "knob": dict(knob_values), "metrics": m, "composite": comp,
                "band": band, "n_used": ratify_n, "history": history}

    def band_score(m):
        # Minimize: distance of WR to band-center, steep penalty when OOB (so the search
        # is pushed inside the existing band, never asked to redefine it -- CANONICAL sec 9).
        wr = m["win_rate"]
        center = (band[0] + band[1]) / 2.0
        oob = 0.0 if in_band(wr, band) else min(abs(wr - band[0]), abs(wr - band[1]))
        return abs(wr - center) + 5.0 * oob

    def optuna_stage():
        search = optuna_search
        if search is None:
            from calibrate_optuna import optuna_search as _impl  # noqa: E402
            search = _impl
        best = search(knob_space, runner, score_fn=band_score, n_trials=optuna_trials,
                      n_per_trial=optuna_n_per_trial, seed=seed, start_knob=start_knob)
        m2, wr2, c2 = run_full(best, ratify_n, "ratify")
        return result("in-band" if in_band(wr2, band) else "not-converged", best, m2, c2)

    # >1 tunable knob: single-knob bisection cannot tune jointly -> OPTUNA (joint search).
    if len(knob_space) > 1:
        return optuna_stage()

    name = next(iter(knob_space))
    spec = knob_space[name]
    lo, hi = float(spec["min"]), float(spec["max"])

    def run(x, n, stage):
        return run_full({name: x}, n, stage)

    # PROBE at the starting knob; if in band, RATIFY and finalize.
    x0 = float(start_knob[name])
    _m, wr, _c = run(x0, probe_n, "probe")
    if in_band(wr, band):
        m2, wr2, c2 = run(x0, ratify_n, "ratify")
        if in_band(wr2, band):
            return result("in-band", {name: x0}, m2, c2)

    # BISECTION (single knob, L-070). Bracket [lo,hi]; monotonic WR.
    _ml, wrlo, _ = run(lo, probe_n, "bisect")
    _mh, wrhi, _ = run(hi, probe_n, "bisect")
    target = (band[0] + band[1]) / 2.0
    increasing = (wrhi - wrlo) >= 0
    a, b = lo, hi
    best = None
    for _ in range(max_bisect):
        mid = (a + b) / 2.0
        m, wr, comp = run(mid, probe_n, "bisect")
        if best is None or abs(wr - target) < abs(best[1] - target):
            best = (mid, wr, m, comp)
        if in_band(wr, band):
            m2, wr2, c2 = run(mid, ratify_n, "ratify")
            if in_band(wr2, band):
                return result("in-band", {name: mid}, m2, c2)
        if increasing:
            a, b = (mid, b) if wr < target else (a, mid)
        else:
            a, b = (a, mid) if wr < target else (mid, b)

    # Bisection exhausted: ratify best-so-far; if still OOB, escalate to OPTUNA.
    mid, _wr, _m, _comp = best
    m2, wr2, c2 = run(mid, ratify_n, "ratify")
    if in_band(wr2, band):
        return result("in-band", {name: mid}, m2, c2)
    return optuna_stage()


def orchestrate_scenario(scenario_id, *, manifest, runner, **kw):
    """Resolve band / knob_space / start (ratified) / objective / escalation from the
    suite manifest and run `orchestrate`. A single-knob scenario tunes that lever (held
    others fixed); a multi-knob scenario goes to the joint OPTUNA stage (P3)."""
    from suite_manifest import (  # noqa: E402
        get_scenario,
        scenario_band,
        scenario_knob_space,
        scenario_objective,
    )

    band = scenario_band(manifest, scenario_id)
    knob_space = scenario_knob_space(manifest, scenario_id)
    if not knob_space:
        raise ValueError(f"{scenario_id}: no knob_space in manifest")
    objective = scenario_objective(manifest, scenario_id)
    sc = get_scenario(manifest, scenario_id)
    ratified = dict(sc.get("ratified_knob") or {})
    esc = sc.get("escalation_policy") or {}
    name = next(iter(knob_space))
    start = dict(ratified)
    if name not in start:
        spec = knob_space[name]
        start[name] = (float(spec["min"]) + float(spec["max"])) / 2.0
    return orchestrate(
        band=band,
        knob_space=knob_space,
        start_knob=start,
        objective_metric=objective,
        runner=runner,
        probe_n=kw.pop("probe_n", esc.get("probe_n", 10)),
        ratify_n=kw.pop("ratify_n", esc.get("ratify_n", 40)),
        optuna_trials=kw.pop("optuna_trials", esc.get("optuna_trials", 8)),
        optuna_n_per_trial=kw.pop("optuna_n_per_trial", esc.get("optuna_n_per_trial", 20)),
        **kw,
    )


def write_staging(scenario_id, knob, *, path=None):
    """Write the candidate knob to damage_curves.staging.yaml under scenario_overrides
    (never production -- that is a P4 gated step). Merges into any existing staging file."""
    import os

    import yaml

    if path is None:
        path = str(
            Path(__file__).resolve().parents[2] / "data/core/balance/damage_curves.staging.yaml"
        )
    data = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
    data.setdefault("scenario_overrides", {}).setdefault(scenario_id, {}).update(knob)
    with open(path, "w", encoding="utf-8") as fh:
        yaml.safe_dump(data, fh, sort_keys=False, allow_unicode=True)
    return path


# Manifest scenario id -> calibrate_parallel SCENARIO_MAP key.
_PARALLEL_KEY = {
    "enc_tutorial_06_hardcore": "hardcore_06",
    "enc_tutorial_07_hardcore_pod_rush": "hardcore_07",
}


def make_parallel_runner(scenario_id, *, seed=424242, shards=4):
    """Production runner: applies the candidate knob via a staging file (env
    DAMAGE_CURVES_PATH, the repro-contract mechanism), runs calibrate_parallel, and
    parses the merged aggregate for metrics.

    BACKEND-DEPENDENT: needs the Game backend (shards). The orchestrator is a
    maintainer/nightly tool (NOT a per-PR gate), so this path is validated by the
    maintainer on a real run; the merged-output glob should be confirmed on first use.
    Composite term pe_ratio is not emitted by the batch aggregate yet -> composite stays
    WR-only until wired (P3/P4)."""
    import json
    import os
    import subprocess
    import tempfile

    repo = Path(__file__).resolve().parents[2]
    scen = _PARALLEL_KEY.get(scenario_id, scenario_id)

    def runner(knob_values, n):
        tmp = Path(tempfile.gettempdir())
        staging = tmp / f"orch_staging_{scen}.yaml"
        for k, v in knob_values.items():
            write_staging(scenario_id, {k: v}, path=str(staging))
        env = {**os.environ, "DAMAGE_CURVES_PATH": str(staging)}
        cmd = [
            sys.executable,
            str(repo / "tools/py/calibrate_parallel.py"),
            "--scenario", scen, "--n", str(n), "--seed", str(seed),
            "--shards", str(shards), "--out-dir", str(tmp), "--label", "orch",
        ]
        subprocess.run(cmd, cwd=str(repo), env=env, check=True)
        merged = sorted(tmp.glob("*orch*.json"), key=lambda p: p.stat().st_mtime)
        agg = json.loads(merged[-1].read_text(encoding="utf-8")) if merged else {}
        return {"win_rate": agg.get("win_rate"), "kd_ratio": agg.get("kd_avg"), "n": n}

    return runner


if __name__ == "__main__":
    import argparse
    import json

    from suite_manifest import DEFAULT_MANIFEST_PATH, load_manifest  # noqa: E402

    ap = argparse.ArgumentParser(description="Per-template calibration orchestrator (G2 P2)")
    ap.add_argument("--scenario", required=True)
    ap.add_argument("--max-bisect", type=int, default=8)
    ap.add_argument("--dry-run", action="store_true", help="synthetic monotonic runner, no backend")
    args = ap.parse_args()

    manifest = load_manifest(DEFAULT_MANIFEST_PATH)
    if args.dry_run:

        def runner(knob_values, n):  # deterministic synthetic monotonic WR (smoke, no backend)
            x = float(next(iter(knob_values.values())))
            return {"win_rate": max(0.0, min(1.0, 0.90 - 0.55 * x)), "kd_ratio": 0.8, "n": n}

    else:
        runner = make_parallel_runner(args.scenario)

    res = orchestrate_scenario(
        args.scenario, manifest=manifest, runner=runner, max_bisect=args.max_bisect
    )
    write_staging(args.scenario, res["knob"])
    report = {k: res[k] for k in ("status", "knob", "composite", "band", "n_used")}
    print(json.dumps(report, indent=2))
    sys.exit(0 if res["status"] == "in-band" else 1)
