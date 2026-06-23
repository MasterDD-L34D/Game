"""PE_ratio contestedness candidates (design sec 4.5 / handoff 2026-06-20).

The contestedness candidates (D/E/F) read turns + damage off an aggregate() dict.
They are the non-saturating alternate PE source: the pressure candidates (A/B/C)
saturate ~0.81-0.94 on high-pressure oracles. Selection of the winner + the band =
master-dd (SDMG); these tests only prove the formulas + bounds.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "py"))
import pe_candidates as pc  # noqa: E402


def test_contestedness_candidates_registered():
    for name in ("D_turns_contest", "E_dmg_margin", "F_contest_combined"):
        assert name in pc._AGGREGATE_FORM


def test_turns_tension_normalized_and_capped():
    assert pc.pe_ratio_aggregate({"turns_avg": 20.0}, "D_turns_contest") == 0.5
    assert pc.pe_ratio_aggregate({"turns_avg": 40.0}, "D_turns_contest") == 1.0
    # a fight past the round cap stays clamped at 1.0 (pe_ratio_aggregate clamps)
    assert pc.pe_ratio_aggregate({"turns_avg": 80.0}, "D_turns_contest") == 1.0


def test_dmg_margin_self_normalizing_curbstomp_vs_nailbiter():
    # curb-stomp: party absorbs little of the total damage -> low margin
    low = pc.pe_ratio_aggregate({"dmg_taken_avg": 5.0, "dmg_dealt_avg": 45.0}, "E_dmg_margin")
    # nail-biter: party absorbs half -> high margin
    high = pc.pe_ratio_aggregate({"dmg_taken_avg": 40.0, "dmg_dealt_avg": 40.0}, "E_dmg_margin")
    assert low == pytest.approx(0.1)
    assert high == pytest.approx(0.5)
    assert low < high


def test_dmg_margin_zero_total_is_safe():
    assert pc.pe_ratio_aggregate({"dmg_taken_avg": 0.0, "dmg_dealt_avg": 0.0}, "E_dmg_margin") == 0.0


def test_combined_is_geometric_mean_of_D_and_E():
    agg = {"turns_avg": 40.0, "dmg_taken_avg": 50.0, "dmg_dealt_avg": 50.0}  # D=1.0, E=0.5
    v = pc.pe_ratio_aggregate(agg, "F_contest_combined")
    assert v == pytest.approx(0.5 ** 0.5)


def test_unknown_candidate_raises_not_fakes_zero():
    with pytest.raises(KeyError):
        pc.pe_ratio_aggregate({}, "Z_nonexistent")


def test_attach_composite_terms_consumes_a_contestedness_candidate():
    agg = {"kd_avg": 1.0, "turns_avg": 20.0, "dmg_taken_avg": 30.0, "dmg_dealt_avg": 30.0}
    out = pc.attach_composite_terms(dict(agg), candidate="E_dmg_margin")
    assert out["pe_ratio"] == pytest.approx(0.5)  # 30/(30+30)
    assert out["kd_ratio"] == pytest.approx(0.5)  # 1/(1+1)


def test_pressure_candidates_still_work():
    assert pc.pe_ratio_aggregate({"pressure_mean_avg": 80.0}, "B_time_avg") == pytest.approx(0.8)
