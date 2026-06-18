import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_candidates import CANDIDATES, candidate_value, kd_normalize  # noqa: E402

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
