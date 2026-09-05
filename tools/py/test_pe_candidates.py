import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_candidates import (  # noqa: E402
    APEX,
    CANDIDATES,
    SELECTED_CANDIDATE,
    TURN_TENSION_NORM,
    candidate_D,
    candidate_F,
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


def test_per_run_contestedness_forms_read_a_single_record():
    # per-run forms (CANDIDATES) read a single run's rounds/dmg -> feed the orthogonality
    # selection (pe_experiment correlates these per-run vs `won`).
    assert candidate_value("D_turns_contest", {"rounds": 20.0}) == 0.5
    assert candidate_value("D_turns_contest", {"rounds": 80.0}) == 1.0  # clamped
    e = candidate_value("E_dmg_margin", {"dmg_taken_player": 5.0, "dmg_dealt_player": 45.0})
    assert abs(e - 0.1) < 1e-9
    assert candidate_value("E_dmg_margin", {"dmg_taken_player": 0.0, "dmg_dealt_player": 0.0}) == 0.0
    f = candidate_value(
        "F_contest_combined", {"rounds": 40.0, "dmg_taken_player": 50.0, "dmg_dealt_player": 50.0}
    )
    assert abs(f - (0.5 ** 0.5)) < 1e-9


def test_attach_composite_terms_consumes_a_contestedness_candidate():
    out = attach_composite_terms(
        {"kd_avg": 1.0, "turns_avg": 20.0, "dmg_taken_avg": 30.0, "dmg_dealt_avg": 30.0},
        candidate="E_dmg_margin",
    )
    assert abs(out["pe_ratio"] - 0.5) < 1e-9  # 30/(30+30)
    assert abs(out["kd_ratio"] - 0.5) < 1e-9  # 1/(1+1)


# --- edge-case pins (defensive branches + raw-vs-clamped, 2026-07-02) --------------


def test_module_constants():
    # ratified defaults / the apex threshold + the turns normalizer.
    assert APEX == 95
    assert TURN_TENSION_NORM == 40.0
    assert SELECTED_CANDIDATE == "E_dmg_margin"


def test_candidate_D_raw_is_unclamped_but_candidate_value_clamps():
    # candidate_D itself does NOT clamp (a fight beyond the round cap reads > 1.0);
    # the clamp lives in candidate_value (and pe_ratio_aggregate), not the raw form.
    assert candidate_D({"rounds": 20}) == 0.5
    assert candidate_D({"rounds": 80}) == 2.0
    assert candidate_value("D_turns_contest", {"rounds": 80}) == 1.0  # clamped path


def test_candidate_F_clamps_D_internally():
    # F = sqrt(clamp(D) * E): with rounds > cap, D is clamped to 1.0 INSIDE F, so
    # F does not exceed sqrt(E). 80 rounds -> D clamped 1.0; E = 30/40 = 0.75.
    f = candidate_F({"rounds": 80, "dmg_taken_player": 30, "dmg_dealt_player": 10})
    assert abs(f - (0.75 ** 0.5)) < 1e-9


def test_attach_composite_terms_defensive_contracts():
    # 1. default candidate = SELECTED_CANDIDATE (E_dmg_margin) when none passed.
    d = {"kd_avg": 1.0, "dmg_taken_avg": 30.0, "dmg_dealt_avg": 10.0}
    r = attach_composite_terms(d)
    assert r is d  # mutates + returns the SAME dict (chaining)
    assert r["kd_ratio"] == 0.5
    assert r["pe_ratio"] == 0.75  # 30/(30+10) via the default E candidate

    # 2. idempotent: setdefault never overwrites pre-existing terms.
    d2 = {"kd_avg": 1.0, "dmg_taken_avg": 30.0, "dmg_dealt_avg": 10.0,
          "kd_ratio": 0.99, "pe_ratio": 0.99}
    r2 = attach_composite_terms(d2)
    assert r2["kd_ratio"] == 0.99
    assert r2["pe_ratio"] == 0.99

    # 3. error dict -> untouched no-op (documented contract).
    e = {"error": "boom"}
    assert attach_composite_terms(e) is e
    assert "kd_ratio" not in e

    # 4. non-dict -> passthrough unchanged.
    assert attach_composite_terms(42) == 42

    # 5. missing kd_avg -> kd_ratio None (surfaced, never faked).
    r3 = attach_composite_terms({"dmg_taken_avg": 30.0, "dmg_dealt_avg": 10.0})
    assert r3["kd_ratio"] is None
