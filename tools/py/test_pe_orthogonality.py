import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_orthogonality import pearson, analyze_candidate, selection_report  # noqa: E402


def test_pearson_perfect_and_zero():
    assert round(pearson([1, 2, 3, 4], [1, 2, 3, 4]), 6) == 1.0
    assert round(pearson([1, 2, 3, 4], [4, 3, 2, 1]), 6) == -1.0
    assert pearson([1, 1, 1], [1, 2, 3]) == 0.0  # zero variance -> 0 (no crash)


def test_analyze_candidate_abs_corr():
    vals = [0.2, 0.9, 0.3, 0.95]
    wons = [False, True, False, True]
    a = analyze_candidate(vals, wons)
    assert a["n"] == 4
    assert a["abs_corr"] > 0.9


def test_selection_report_ranks_least_collinear_first():
    wons = [False, True, False, True, False, True]
    per_candidate = {
        "collinear": [0.1, 0.9, 0.1, 0.9, 0.1, 0.9],   # tracks wins -> abs_corr 1.0
        "orthogonal": [0.4, 0.4, 0.6, 0.6, 0.5, 0.5],   # equal win/loss means -> abs_corr 0.0
    }
    eased = {"collinear": 0.05, "orthogonal": 0.2}
    ratified = {"collinear": 0.5, "orthogonal": 0.5}
    rep = selection_report(per_candidate, wons, ratified_value=ratified, eased_value=eased)
    assert rep["ranked"][0]["name"] == "orthogonal"
    assert rep["selected"] == "orthogonal"
    assert rep["ranked"][0]["discrimination"]["correct_direction"] is True
