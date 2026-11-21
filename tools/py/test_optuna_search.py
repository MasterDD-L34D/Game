#!/usr/bin/env python3
"""Unit tests for the injectable Optuna search core (G2 P3).

`optuna_search` is the backend-free core the orchestrator's OPTUNA stage calls:
it takes a manifest-style knob_space + an injectable `runner(knob_values, n) ->
metrics` + a `score_fn(metrics) -> float` (minimize), and returns the best knob
dict. Tested with a deterministic FAKE runner (no Game backend). See
docs/superpowers/specs/2026-06-17-per-template-calibration-design.md sec 7.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

optuna = pytest.importorskip("optuna")  # first-class dep (G2 P3); CI installs it

from calibrate_optuna import optuna_search  # noqa: E402

BAND = [0.15, 0.30]


def wr_distance(band):
    """Minimize: distance of WR to band-center, steep penalty if OOB."""
    center = (band[0] + band[1]) / 2.0

    def score(metrics):
        wr = metrics["win_rate"]
        oob = 0.0 if band[0] <= wr <= band[1] else min(abs(wr - band[0]), abs(wr - band[1]))
        return abs(wr - center) + 5.0 * oob

    return score


def test_single_knob_converges_in_band():
    # Monotonic-decreasing WR = clamp(0.90 - 0.55*boss_hp). Band center 0.225 -> x ~ 1.23.
    def runner(knob_values, n):
        x = knob_values["boss_hp_multiplier"]
        return {"win_rate": max(0.0, min(1.0, 0.90 - 0.55 * x)), "n": n}

    knob_space = {"boss_hp_multiplier": {"type": "float", "min": 0.50, "max": 1.30}}
    best = optuna_search(knob_space, runner, score_fn=wr_distance(BAND),
                         n_trials=30, n_per_trial=10, seed=42)
    assert "boss_hp_multiplier" in best
    wr = runner(best, 10)["win_rate"]
    assert BAND[0] <= wr <= BAND[1]


def test_multi_knob_converges_in_band():
    # WR depends on BOTH knobs; in-band region needs joint search (no single-knob bisection).
    def runner(knob_values, n):
        x = knob_values["boss_hp_multiplier"]
        y = knob_values["enemy_damage_multiplier_override"]
        # higher boss_hp and higher enemy_damage both lower WR.
        return {"win_rate": max(0.0, min(1.0, 1.10 - 0.40 * x - 0.20 * y)), "n": n}

    knob_space = {
        "boss_hp_multiplier": {"type": "float", "min": 0.50, "max": 1.30},
        "enemy_damage_multiplier_override": {"type": "float", "min": 1.0, "max": 2.5},
    }
    best = optuna_search(knob_space, runner, score_fn=wr_distance(BAND),
                         n_trials=60, n_per_trial=10, seed=42)
    assert set(best) == {"boss_hp_multiplier", "enemy_damage_multiplier_override"}
    wr = runner(best, 10)["win_rate"]
    assert BAND[0] <= wr <= BAND[1]


def test_unreachable_band_returns_best_effort_oob():
    # Negative control (L-041, debt-independent inject): flat runner, band physically
    # unreachable -> optuna_search still returns a knob, but WR stays OOB (no vacuous pass).
    def flat(knob_values, n):
        return {"win_rate": 0.90, "n": n}

    knob_space = {"boss_hp_multiplier": {"type": "float", "min": 0.50, "max": 1.30}}
    best = optuna_search(knob_space, flat, score_fn=wr_distance(BAND),
                         n_trials=12, n_per_trial=10, seed=42)
    assert "boss_hp_multiplier" in best
    wr = flat(best, 10)["win_rate"]
    assert not (BAND[0] <= wr <= BAND[1])  # honestly OOB


def test_int_knob_suggested_as_int():
    def runner(knob_values, n):
        c = knob_values["enemy_count"]
        return {"win_rate": max(0.0, min(1.0, 0.05 * c)), "n": n}

    knob_space = {"enemy_count": {"type": "int", "min": 1, "max": 8}}
    best = optuna_search(knob_space, runner, score_fn=wr_distance([0.15, 0.30]),
                         n_trials=20, n_per_trial=10, seed=42)
    assert isinstance(best["enemy_count"], int)


def test_start_knob_merged_into_runner_call():
    # Knobs NOT in knob_space (e.g. a held-fixed ratified knob) reach the runner via start_knob.
    seen = {}

    def runner(knob_values, n):
        seen.update(knob_values)
        x = knob_values["boss_hp_multiplier"]
        return {"win_rate": max(0.0, min(1.0, 0.90 - 0.55 * x)), "n": n}

    knob_space = {"boss_hp_multiplier": {"type": "float", "min": 0.50, "max": 1.30}}
    optuna_search(knob_space, runner, score_fn=wr_distance(BAND),
                  n_trials=5, n_per_trial=10, seed=42,
                  start_knob={"turn_limit_defeat_override": 41})
    assert seen.get("turn_limit_defeat_override") == 41
