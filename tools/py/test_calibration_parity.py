#!/usr/bin/env python3
"""Parity guards (G2 P1): the manifest is the single human-facing SoT for band +
knob_space; these tests fail if it silently diverges from the other declarations
(calibrate_optuna.py SCENARIO_CFG, and damage_curves.yaml for the runtime band).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

import batch_calibrate_hardcore06 as hc06batch  # noqa: E402
from calibrate_optuna import SCENARIO_CFG  # noqa: E402
from suite_manifest import (  # noqa: E402
    DEFAULT_MANIFEST_PATH,
    load_manifest,
    scenario_band,
    scenario_knob_space,
)

# manifest scenario id -> calibrate_optuna SCENARIO_CFG key
OPTUNA_KEY = {
    "enc_tutorial_06_hardcore": "hardcore_06",
    "enc_tutorial_07_hardcore_pod_rush": "hardcore_07",
}


@pytest.fixture(scope="module")
def manifest():
    return load_manifest(DEFAULT_MANIFEST_PATH)


def _norm_manifest_ks(ks):
    return {n: (v["type"], float(v["min"]), float(v["max"])) for n, v in ks.items()}


def _norm_optuna_ks(ks):
    return {n: (t, float(lo), float(hi)) for n, (t, lo, hi) in ks.items()}


@pytest.mark.parametrize("mid,okey", list(OPTUNA_KEY.items()))
def test_band_parity_manifest_vs_optuna(manifest, mid, okey):
    assert list(scenario_band(manifest, mid)) == list(SCENARIO_CFG[okey]["target_band"])


@pytest.mark.parametrize("mid,okey", list(OPTUNA_KEY.items()))
def test_knob_space_parity_manifest_vs_optuna(manifest, mid, okey):
    assert _norm_manifest_ks(scenario_knob_space(manifest, mid)) == _norm_optuna_ks(
        SCENARIO_CFG[okey]["knob_space"]
    )


def test_band_parity_manifest_vs_damage_curves_hc06(manifest):
    # hc06 maps to damage_curves encounter-class "hardcore" -- the runtime band
    # the batch script actually reads via load_target_bands.
    dc_win = hc06batch.load_target_bands("hardcore")["win_rate"]
    assert list(scenario_band(manifest, "enc_tutorial_06_hardcore")) == list(dc_win)
