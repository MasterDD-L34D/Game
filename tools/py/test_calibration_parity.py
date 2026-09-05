#!/usr/bin/env python3
"""Parity guards: the manifest (docs/playtest/canonical-suite.yaml) is the single
human-facing SoT for band + knob_space.

G2 P1 guarded the manifest against a DUPLICATED copy in calibrate_optuna.py SCENARIO_CFG.
G2 P3 removed that copy: calibrate_optuna now SOURCES band + knob_space from the manifest
via `_scenario_cfg`, so the manifest<->optuna divergence is structurally impossible. These
tests now guard (a) the adapter actually reads the manifest (a regression that re-hardcoded
a band/knob would fail them), (b) the multi-band win_rate sub-band is injected from the
manifest band (never a second copy), and (c) the manifest band still matches the runtime
band in damage_curves.yaml (the remaining genuine cross-source parity).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

import batch_calibrate_hardcore06 as hc06batch  # noqa: E402
from calibrate_optuna import _scenario_cfg  # noqa: E402
from suite_manifest import (  # noqa: E402
    DEFAULT_MANIFEST_PATH,
    load_manifest,
    scenario_band,
    scenario_knob_space,
)

# manifest scenario id -> calibrate_optuna _OPTUNA_EXTRAS key
OPTUNA_KEY = {
    "enc_tutorial_06_hardcore": "hardcore_06",
    "enc_tutorial_07_hardcore_pod_rush": "hardcore_07",
}


@pytest.fixture(scope="module")
def manifest():
    return load_manifest(DEFAULT_MANIFEST_PATH)


def _norm_manifest_ks(ks):
    return {n: (v["type"], float(v["min"]), float(v["max"])) for n, v in ks.items()}


@pytest.mark.parametrize("mid,okey", list(OPTUNA_KEY.items()))
def test_scenario_cfg_sources_band_from_manifest(manifest, mid, okey):
    # The effective optuna band MUST be the manifest band (adapter reads the SoT, not a copy).
    assert list(_scenario_cfg(okey)["target_band"]) == list(scenario_band(manifest, mid))


@pytest.mark.parametrize("mid,okey", list(OPTUNA_KEY.items()))
def test_scenario_cfg_sources_knob_space_from_manifest(manifest, mid, okey):
    # The effective optuna knob_space (tuple form) MUST match the manifest knob_space.
    assert _scenario_cfg(okey)["knob_space"] == _norm_manifest_ks(scenario_knob_space(manifest, mid))


def test_secondary_bands_win_rate_tracks_manifest_band(manifest):
    # hc06 multi-band objective: the win_rate sub-band is injected from the manifest band,
    # so it can never diverge (kills the secondary_bands-vs-band footgun).
    cfg = _scenario_cfg("hardcore_06")
    assert tuple(cfg["secondary_bands"]["win_rate"]) == tuple(
        scenario_band(manifest, "enc_tutorial_06_hardcore")
    )


def test_band_parity_manifest_vs_damage_curves_hc06(manifest):
    # hc06 maps to damage_curves encounter-class "hardcore" -- the runtime band
    # the batch script actually reads via load_target_bands.
    dc_win = hc06batch.load_target_bands("hardcore")["win_rate"]
    assert list(scenario_band(manifest, "enc_tutorial_06_hardcore")) == list(dc_win)
