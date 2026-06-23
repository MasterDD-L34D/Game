import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_candidates import (  # noqa: E402
    CANDIDATES,
    candidate_value,
    kd_normalize,
    pe_ratio_aggregate,
    attach_composite_terms,
    _AGGREGATE_FORM,
)

STATS = {"pressure_mean": 80.0, "frac_ge75": 0.6, "pmax": 96.0}


def test_candidate_A_sustained_threat():
    assert candidate_value("A_sustained_threat", STATS) == 0.6  # frac_ge75


def test_candidate_B_time_avg():
    assert candidate_value("B_time_avg", STATS) == 0.80  # pressure_mean/100


def test_candidate_C_apex_reach():
    assert candidate_value("C_apex_reach", STATS) == 1.0  # pmax 96 >= 95
    assert candidate_value("C_apex_reach", {"pmax": 80.0}) == 0.0


def test_all_candidates_return_0_1():
    for name in CANDIDATES:
        v = candidate_value(name, STATS)
        assert 0.0 <= v <= 1.0


def test_kd_normalize_bounded_monotonic():
    assert kd_normalize(0.0) == 0.0
    assert round(kd_normalize(0.8), 3) == 0.444
    assert 0.0 < kd_normalize(0.8) < kd_normalize(5.0) < 1.0
    assert kd_normalize(None) is None  # missing -> None, never a fake number


# --- Contestedness candidates (D/E/F, sec 4.5 alternate PE source) ----------------


def test_contestedness_candidates_registered():
    for name in ("D_turns_contest", "E_dmg_margin", "F_contest_combined"):
        assert name in _AGGREGATE_FORM


def test_turns_tension_normalized_and_capped():
    assert pe_ratio_aggregate({"turns_avg": 20.0}, "D_turns_contest") == 0.5
    assert pe_ratio_aggregate({"turns_avg": 40.0}, "D_turns_contest") == 1.0
    assert pe_ratio_aggregate({"turns_avg": 80.0}, "D_turns_contest") == 1.0  # clamped


def test_dmg_margin_self_normalizing_curbstomp_vs_nailbiter():
    low = pe_ratio_aggregate({"dmg_taken_avg": 5.0, "dmg_dealt_avg": 45.0}, "E_dmg_margin")
    high = pe_ratio_aggregate({"dmg_taken_avg": 40.0, "dmg_dealt_avg": 40.0}, "E_dmg_margin")
    assert abs(low - 0.1) < 1e-9
    assert abs(high - 0.5) < 1e-9
    assert low < high


def test_dmg_margin_zero_total_is_safe():
    assert pe_ratio_aggregate({"dmg_taken_avg": 0.0, "dmg_dealt_avg": 0.0}, "E_dmg_margin") == 0.0


def test_combined_is_geometric_mean_of_D_and_E():
    agg = {"turns_avg": 40.0, "dmg_taken_avg": 50.0, "dmg_dealt_avg": 50.0}  # D=1.0, E=0.5
    assert abs(pe_ratio_aggregate(agg, "F_contest_combined") - (0.5 ** 0.5)) < 1e-9


def test_unknown_candidate_raises_not_fakes_zero():
    raised = False
    try:
        pe_ratio_aggregate({}, "Z_nonexistent")
    except KeyError:
        raised = True
    assert raised


def test_attach_composite_terms_consumes_a_contestedness_candidate():
    out = attach_composite_terms(
        {"kd_avg": 1.0, "turns_avg": 20.0, "dmg_taken_avg": 30.0, "dmg_dealt_avg": 30.0},
        candidate="E_dmg_margin",
    )
    assert abs(out["pe_ratio"] - 0.5) < 1e-9  # 30/(30+30)
    assert abs(out["kd_ratio"] - 0.5) < 1e-9  # 1/(1+1)
