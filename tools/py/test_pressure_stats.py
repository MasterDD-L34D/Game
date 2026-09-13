import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pressure_stats import pressure_stats  # noqa: E402


def test_basic_trajectory():
    s = pressure_stats([75, 80, 95, 100])
    assert s["pmax"] == 100
    assert round(s["pressure_mean"], 2) == 87.5
    assert s["frac_ge75"] == 1.0  # all >= 75


def test_mixed_tiers():
    s = pressure_stats([10, 50, 75, 90])  # 2 of 4 >= 75
    assert s["frac_ge75"] == 0.5
    assert s["pmax"] == 90


def test_empty_is_zeroed_not_crash():
    s = pressure_stats([])
    assert s == {"pressure_mean": 0.0, "frac_ge75": 0.0, "pmax": 0.0}
