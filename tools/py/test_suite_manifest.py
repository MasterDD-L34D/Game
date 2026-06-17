#!/usr/bin/env python3
"""Unit tests for tools/py/suite_manifest.py (G2 P1 -- manifest accessor)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from suite_manifest import (  # noqa: E402
    DEFAULT_MANIFEST_PATH,
    get_scenario,
    load_manifest,
    scenario_band,
    scenario_knob_space,
    scenario_objective,
)

HC06 = "enc_tutorial_06_hardcore"


@pytest.fixture(scope="module")
def manifest():
    return load_manifest(DEFAULT_MANIFEST_PATH)


def test_band(manifest):
    assert scenario_band(manifest, HC06) == [0.15, 0.30]


def test_knob_space(manifest):
    ks = scenario_knob_space(manifest, HC06)
    assert ks["boss_hp_multiplier"] == {"type": "float", "min": 0.50, "max": 1.30}


def test_objective_falls_back_to_global_composite(manifest):
    # No per-scenario objective_metric -> global composite_metric.
    obj = scenario_objective(manifest, HC06)
    assert "win_rate" in obj


def test_unknown_scenario_raises(manifest):
    with pytest.raises(KeyError):
        get_scenario(manifest, "nope_does_not_exist")
