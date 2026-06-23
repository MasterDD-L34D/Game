#!/usr/bin/env python3
"""Unit tests for tools/py/suite_manifest.py (G2 P1 -- manifest accessor)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from objective import evaluate_metric  # noqa: E402
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


def test_composite_metric_dropped_pe_ratio(manifest):
    # 2026-06-23 SDMG ratification (master-dd): the PE_ratio term is DROPPED. The
    # canonical MULTI-POLICY N=40 experiment falsified every contestedness PE source
    # (E_dmg_margin is degenerate on timer-race oracles + an outcome-proxy on skilled
    # policies; no WR-orthogonal tension axis exists) -- evidence
    # docs/playtest/2026-06-23-pe-contestedness-multipolicy-n40.md. Composite =
    # re-weighted win_rate + kd_ratio (0.70/0.30 = the renormalized original weights).
    comp = manifest["composite_metric"]
    assert "pe_ratio" not in comp, comp
    assert comp == "0.70*win_rate + 0.30*kd_ratio", comp
    # Must evaluate with ONLY win_rate + kd_ratio (no KeyError for a missing pe_ratio).
    val = evaluate_metric(comp, {"win_rate": 0.5, "kd_ratio": 0.6})
    assert val == pytest.approx(0.70 * 0.5 + 0.30 * 0.6)


def test_unknown_scenario_raises(manifest):
    with pytest.raises(KeyError):
        get_scenario(manifest, "nope_does_not_exist")


def test_ratified_knob_lever_is_in_knob_space(manifest):
    # Every ratified_knob lever MUST appear in the scenario's knob_space, else a
    # manifest-driven calibration/Optuna path would search a lever that cannot
    # reproduce the ratified value (the hc07 enemy_damage_multiplier_override case).
    for sc in manifest["scenarios"]:
        ks = sc.get("knob_space")
        rk = sc.get("ratified_knob")
        if not ks or not rk:
            continue
        for lever in rk:
            assert lever in ks, (
                f"{sc['id']}: ratified knob '{lever}' not in knob_space {list(ks)}"
            )
