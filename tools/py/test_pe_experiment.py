import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_experiment import run_to_stats, analyze_corpus  # noqa: E402


def _run(frac, mean, pmax, won):
    return {"outcome": "victory" if won else "defeat",
            "pressure_frac_ge75": frac, "pressure_mean": mean, "pressure_pmax": pmax}


def test_run_to_stats_maps_fields():
    s, won = run_to_stats(_run(0.6, 80.0, 96.0, True))
    assert s == {"frac_ge75": 0.6, "pressure_mean": 80.0, "pmax": 96.0}
    assert won is True


def test_analyze_corpus_selects_least_collinear():
    corpus = [
        _run(0.50, 30.0, 80.0, False),
        _run(0.55, 95.0, 99.0, True),
        _run(0.52, 28.0, 70.0, False),
        _run(0.48, 96.0, 99.0, True),
    ]
    rep = analyze_corpus(corpus)
    assert rep["selected"] in ("A_sustained_threat", "B_time_avg", "C_apex_reach")
    names = [r["name"] for r in rep["ranked"]]
    assert names.index("A_sustained_threat") < names.index("B_time_avg")
