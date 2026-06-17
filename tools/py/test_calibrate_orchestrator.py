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
    # Flat runner: WR always 0.90 regardless of knob -> band [0.15,0.30] unreachable.
    def flat(knob_values, n):
        return {"win_rate": 0.90, "kd_ratio": 0.8, "pe_ratio": 0.5, "n": n}

    r = orchestrate(
        band=BAND, knob_space=KNOB_SPACE, start_knob={"boss_hp_multiplier": 0.90},
        objective_metric=OBJ, runner=flat, max_bisect=8,
    )
    assert r["status"] == "not-converged"
    assert "knob" in r and "metrics" in r  # still reports best-so-far


def test_orchestrate_scenario_resolves_from_real_manifest():
    manifest = load_manifest(DEFAULT_MANIFEST_PATH)

    def runner(knob_values, n):
        x = knob_values.get("boss_hp_multiplier", 1.0)
        wr = max(0.0, min(1.0, 0.90 - 0.55 * x))
        return {"win_rate": wr, "kd_ratio": 0.8, "pe_ratio": 0.5, "n": n}

    r = orchestrate_scenario(
        "enc_tutorial_06_hardcore", manifest=manifest, runner=runner, max_bisect=20
    )
    assert r["band"] == [0.15, 0.30]  # resolved from manifest
    assert "boss_hp_multiplier" in r["knob"]  # first knob_space lever
    assert r["status"] == "in-band"


def test_write_staging_emits_knob(tmp_path):
    out = tmp_path / "damage_curves.staging.yaml"
    write_staging("enc_tutorial_06_hardcore", {"boss_hp_multiplier": 1.15}, path=str(out))
    import yaml

    d = yaml.safe_load(out.read_text(encoding="utf-8"))
    ov = d["scenario_overrides"]["enc_tutorial_06_hardcore"]
    assert ov["boss_hp_multiplier"] == 1.15
