"""Characterization tests for tools/py/pe_candidates.py (PE_ratio candidates)."""

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

import pe_candidates as pe  # noqa: E402


def test_constants():
    assert pe.APEX == 95
    assert pe.TURN_TENSION_NORM == 40.0
    assert pe.SELECTED_CANDIDATE == "E_dmg_margin"
    assert sorted(pe.CANDIDATES) == [
        "A_sustained_threat",
        "B_time_avg",
        "C_apex_reach",
        "D_turns_contest",
        "E_dmg_margin",
        "F_contest_combined",
    ]


def test_per_run_candidates():
    assert pe.candidate_A({"frac_ge75": 0.5}) == 0.5
    assert pe.candidate_A({}) == 0.0

    assert pe.candidate_B({"pressure_mean": 80}) == 0.8
    assert pe.candidate_B({}) == 0.0

    assert pe.candidate_C({"pmax": 95}) == 1.0
    assert pe.candidate_C({"pmax": 94.9}) == 0.0
    assert pe.candidate_C({}) == 0.0

    assert pe.candidate_D({"rounds": 20}) == 0.5
    assert pe.candidate_D({"rounds": 80}) == 2.0

    assert pe.candidate_E({"dmg_taken_player": 30, "dmg_dealt_player": 10}) == 0.75
    assert pe.candidate_E({}) == 0.0

    assert pe.candidate_F({"rounds": 40, "dmg_taken_player": 30, "dmg_dealt_player": 10}) == pytest.approx(0.75 ** 0.5)
    assert pe.candidate_F({"rounds": 80, "dmg_taken_player": 30, "dmg_dealt_player": 10}) == pytest.approx(0.75 ** 0.5)


def test_candidate_value():
    assert pe.candidate_value("D_turns_contest", {"rounds": 80}) == 1.0
    assert pe.candidate_value("A_sustained_threat", {"frac_ge75": 0.3}) == 0.3
    with pytest.raises(KeyError):
        pe.candidate_value("ZZZ", {})


def test_aggregate_helpers():
    assert pe._dmg_taken_margin({"dmg_taken_avg": 30, "dmg_dealt_avg": 10}) == 0.75
    assert pe._dmg_taken_margin({}) == 0.0
    assert pe._turns_tension({"turns_avg": 20}) == 0.5


def test_pe_ratio_aggregate():
    assert pe.pe_ratio_aggregate({"pressure_frac_ge75_avg": 0.4}, "A_sustained_threat") == 0.4
    assert pe.pe_ratio_aggregate({"pressure_mean_avg": 60}, "B_time_avg") == 0.6
    assert pe.pe_ratio_aggregate({"apex_reach_rate": 0.25}, "C_apex_reach") == 0.25
    assert pe.pe_ratio_aggregate({"turns_avg": 20}, "D_turns_contest") == 0.5
    assert pe.pe_ratio_aggregate({"turns_avg": 80}, "D_turns_contest") == 1.0
    assert pe.pe_ratio_aggregate({"dmg_taken_avg": 30, "dmg_dealt_avg": 10}, "E_dmg_margin") == 0.75
    assert pe.pe_ratio_aggregate({"turns_avg": 40, "dmg_taken_avg": 30, "dmg_dealt_avg": 10}, "F_contest_combined") == pytest.approx(0.75 ** 0.5)
    with pytest.raises(KeyError):
        pe.pe_ratio_aggregate({}, "ZZZ")


def test_kd_normalize():
    assert pe.kd_normalize(1.0) == 0.5
    assert pe.kd_normalize(0) == 0.0
    assert pe.kd_normalize(None) is None


def test_attach_composite_terms():
    d = {"kd_avg": 1.0, "dmg_taken_avg": 30, "dmg_dealt_avg": 10}
    r = pe.attach_composite_terms(d)
    assert r is d
    assert r["kd_ratio"] == 0.5
    assert r["pe_ratio"] == 0.75

    d2 = {"kd_avg": 1.0, "dmg_taken_avg": 30, "dmg_dealt_avg": 10, "kd_ratio": 0.99, "pe_ratio": 0.99}
    r2 = pe.attach_composite_terms(d2)
    assert r2["kd_ratio"] == 0.99
    assert r2["pe_ratio"] == 0.99

    e = {"error": "boom"}
    r_e = pe.attach_composite_terms(e)
    assert r_e is e
    assert "kd_ratio" not in e

    assert pe.attach_composite_terms(42) == 42

    d3 = {"dmg_taken_avg": 30, "dmg_dealt_avg": 10}
    r3 = pe.attach_composite_terms(d3)
    assert r3["kd_ratio"] is None

    d4 = {"kd_avg": 1.0, "apex_reach_rate": 0.25}
    r4 = pe.attach_composite_terms(d4, candidate="C_apex_reach")
    assert r4["pe_ratio"] == 0.25
