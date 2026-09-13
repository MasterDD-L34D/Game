#!/usr/bin/env python3
"""Unit tests for tools/py/calibrate_orchestrator.py (G2 P2).

The state machine is tested with a deterministic FAKE runner (no backend):
runner(knob_values, n) -> metrics dict. A monotonic synthetic WR lets the
single-knob bisection converge deterministically.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from calibrate_orchestrator import in_band, orchestrate, orchestrate_scenario, write_staging  # noqa: E402
from suite_manifest import DEFAULT_MANIFEST_PATH, load_manifest  # noqa: E402

BAND = [0.15, 0.30]
KNOB_SPACE = {"boss_hp_multiplier": {"type": "float", "min": 0.50, "max": 1.30}}
OBJ = "1.0*win_rate"  # objective == WR for these tests


def make_runner(slope=-0.55, intercept=0.90):
    """WR = clamp(intercept + slope*boss_hp). Monotonic-decreasing in boss_hp."""

    def runner(knob_values, n):
        x = knob_values["boss_hp_multiplier"]
        wr = max(0.0, min(1.0, intercept + slope * x))
        return {"win_rate": wr, "kd_ratio": 0.8, "pe_ratio": 0.5, "n": n}

    return runner


def test_in_band():
    assert in_band(0.20, BAND) is True
    assert in_band(0.15, BAND) is True
    assert in_band(0.30, BAND) is True
    assert in_band(0.31, BAND) is False
    assert in_band(0.10, BAND) is False


def test_start_already_in_band_no_bisection():
    # boss_hp 1.20 -> WR = 0.90 - 0.66 = 0.24 (in band) -> ratify, no bisection.
    runner = make_runner()
    r = orchestrate(
        band=BAND, knob_space=KNOB_SPACE, start_knob={"boss_hp_multiplier": 1.20},
        objective_metric=OBJ, runner=runner,
    )
    assert r["status"] == "in-band"
    assert in_band(r["metrics"]["win_rate"], BAND)
    # no bisection steps needed
    assert sum(1 for h in r["history"] if h["stage"] == "bisect") == 0


def test_oob_start_bisects_to_in_band():
    # boss_hp 0.50 -> WR = 0.625 (OOB high) -> bisect down toward band.
    runner = make_runner()
    r = orchestrate(
        band=BAND, knob_space=KNOB_SPACE, start_knob={"boss_hp_multiplier": 0.50},
        objective_metric=OBJ, runner=runner, max_bisect=20,
    )
    assert r["status"] == "in-band"
    assert in_band(r["metrics"]["win_rate"], BAND)
    assert KNOB_SPACE["boss_hp_multiplier"]["min"] <= r["knob"]["boss_hp_multiplier"] <= KNOB_SPACE["boss_hp_multiplier"]["max"]


def test_unreachable_band_reports_not_converged():
    # Negative control (L-041, spec sec 8): flat runner, band unreachable. Bisection
    # fails -> escalates to OPTUNA -> optuna also cannot reach -> non-in-band finalize
    # (no vacuous PASS). Inject a fake optuna that honestly returns an OOB knob.
    calls = {"optuna": 0}

    def flat(knob_values, n):
        return {"win_rate": 0.90, "kd_ratio": 0.8, "pe_ratio": 0.5, "n": n}

    def fake_optuna(knob_space, runner, *, score_fn, n_trials, n_per_trial, seed, start_knob=None):
        calls["optuna"] += 1
        return {"boss_hp_multiplier": 1.30}  # best effort, still 0.90 WR (OOB)

    r = orchestrate(
        band=BAND, knob_space=KNOB_SPACE, start_knob={"boss_hp_multiplier": 0.90},
        objective_metric=OBJ, runner=flat, max_bisect=8, optuna_search=fake_optuna,
    )
    assert calls["optuna"] == 1  # bisection failure escalated to optuna
    assert r["status"] == "not-converged"
    assert "knob" in r and "metrics" in r  # still reports best-so-far


# --- G2 P3: OPTUNA stage wiring -------------------------------------------------

MULTI_KNOB_SPACE = {
    "boss_hp_multiplier": {"type": "float", "min": 0.50, "max": 1.30},
    "enemy_damage_multiplier_override": {"type": "float", "min": 1.0, "max": 2.5},
}


def test_multi_knob_routes_straight_to_optuna():
    # >1 tunable knob -> single-knob bisection cannot tune jointly -> go straight to OPTUNA.
    calls = {"optuna": 0}

    def runner(knob_values, n):
        x = knob_values["boss_hp_multiplier"]
        y = knob_values["enemy_damage_multiplier_override"]
        wr = 0.22 if (abs(x - 1.0) < 0.01 and abs(y - 2.0) < 0.01) else 0.90
        return {"win_rate": wr, "kd_ratio": 0.8, "n": n}

    def fake_optuna(knob_space, run, *, score_fn, n_trials, n_per_trial, seed, start_knob=None):
        calls["optuna"] += 1
        assert len(knob_space) == 2  # the joint space was handed over
        return {"boss_hp_multiplier": 1.0, "enemy_damage_multiplier_override": 2.0}

    r = orchestrate(
        band=BAND, knob_space=MULTI_KNOB_SPACE, start_knob={"boss_hp_multiplier": 1.02},
        objective_metric=OBJ, runner=runner, optuna_search=fake_optuna,
    )
    assert calls["optuna"] == 1
    assert r["status"] == "in-band"
    assert r["knob"] == {"boss_hp_multiplier": 1.0, "enemy_damage_multiplier_override": 2.0}
    # multi-knob never bisects
    assert sum(1 for h in r["history"] if h["stage"] == "bisect") == 0


def test_single_knob_bisection_fallback_to_optuna():
    # Non-monotonic single-knob runner: bisection (monotonic assumption) misses the band;
    # only x==1.0 is in band. Bisection fails -> OPTUNA fallback finds it.
    calls = {"optuna": 0}

    def runner(knob_values, n):
        x = knob_values["boss_hp_multiplier"]
        wr = 0.22 if abs(x - 1.0) < 0.01 else 0.90
        return {"win_rate": wr, "kd_ratio": 0.8, "n": n}

    def fake_optuna(knob_space, run, *, score_fn, n_trials, n_per_trial, seed, start_knob=None):
        calls["optuna"] += 1
        return {"boss_hp_multiplier": 1.0}

    r = orchestrate(
        band=BAND, knob_space=KNOB_SPACE, start_knob={"boss_hp_multiplier": 0.50},
        objective_metric=OBJ, runner=runner, max_bisect=4, optuna_search=fake_optuna,
    )
    assert calls["optuna"] == 1
    assert r["status"] == "in-band"
    assert r["knob"]["boss_hp_multiplier"] == 1.0


def test_single_knob_in_band_never_calls_optuna():
    # Guard: when bisection converges, the OPTUNA stage must NOT fire.
    calls = {"optuna": 0}
    runner = make_runner()

    def fake_optuna(*a, **k):
        calls["optuna"] += 1
        return {"boss_hp_multiplier": 1.0}

    r = orchestrate(
        band=BAND, knob_space=KNOB_SPACE, start_knob={"boss_hp_multiplier": 0.50},
        objective_metric=OBJ, runner=runner, max_bisect=20, optuna_search=fake_optuna,
    )
    assert r["status"] == "in-band"
    assert calls["optuna"] == 0  # bisection sufficed


def test_orchestrate_scenario_resolves_from_real_manifest():
    # hc06 manifest knob_space has TWO levers -> orchestrate routes it to OPTUNA with the
    # band + joint knob_space resolved from the manifest. Inject a deterministic fake.
    manifest = load_manifest(DEFAULT_MANIFEST_PATH)
    captured = {}

    def runner(knob_values, n):
        x = knob_values.get("boss_hp_multiplier", 1.0)
        wr = max(0.0, min(1.0, 0.90 - 0.55 * x))
        return {"win_rate": wr, "kd_ratio": 0.8, "pe_ratio": 0.5, "n": n}

    def fake_optuna(knob_space, run, *, score_fn, n_trials, n_per_trial, seed, start_knob=None):
        captured["knob_space"] = set(knob_space)
        captured["start_knob"] = dict(start_knob or {})
        return {"boss_hp_multiplier": 1.20, "enemy_damage_multiplier_override": 1.5}

    r = orchestrate_scenario(
        "enc_tutorial_06_hardcore", manifest=manifest, runner=runner, optuna_search=fake_optuna
    )
    assert r["band"] == [0.15, 0.30]  # resolved from manifest
    # both manifest levers handed to the joint search; ratified knob is the search base
    assert captured["knob_space"] == {"boss_hp_multiplier", "enemy_damage_multiplier_override"}
    assert captured["start_knob"]["boss_hp_multiplier"] == 1.02  # ratified_knob from manifest
    assert "boss_hp_multiplier" in r["knob"]
    assert r["status"] == "in-band"  # WR(boss_hp=1.20) = 0.24, in band


def test_write_staging_emits_knob(tmp_path):
    out = tmp_path / "damage_curves.staging.yaml"
    write_staging("enc_tutorial_06_hardcore", {"boss_hp_multiplier": 1.15}, path=str(out))
    import yaml

    d = yaml.safe_load(out.read_text(encoding="utf-8"))
    ov = d["scenario_overrides"]["enc_tutorial_06_hardcore"]
    assert ov["boss_hp_multiplier"] == 1.15
