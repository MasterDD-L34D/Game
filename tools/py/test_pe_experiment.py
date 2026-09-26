import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from pe_experiment import run_to_stats, analyze_corpus  # noqa: E402
from pe_candidates import CANDIDATES  # noqa: E402


def _run(frac, mean, pmax, won):
    return {"outcome": "victory" if won else "defeat",
            "pressure_frac_ge75": frac, "pressure_mean": mean, "pressure_pmax": pmax}


def test_run_to_stats_maps_fields():
    # Subset check: run_to_stats also carries the contestedness terms
    # (rounds/dmg_taken_player/dmg_dealt_player, default 0.0 when absent from the run
    # record), so assert the mapped pressure fields rather than exact dict equality.
    s, won = run_to_stats(_run(0.6, 80.0, 96.0, True))
    assert s["frac_ge75"] == 0.6
    assert s["pressure_mean"] == 80.0
    assert s["pmax"] == 96.0
    assert won is True


def test_analyze_corpus_selects_least_collinear():
    corpus = [
        _run(0.50, 30.0, 80.0, False),
        _run(0.55, 95.0, 99.0, True),
        _run(0.52, 28.0, 70.0, False),
        _run(0.48, 96.0, 99.0, True),
    ]
    rep = analyze_corpus(corpus)
    # selected is one of CANDIDATES (the set grew to include the contestedness
    # candidates D/E/F); every candidate is ranked.
    assert rep["selected"] in CANDIDATES
    names = [r["name"] for r in rep["ranked"]]
    assert set(names) == set(CANDIDATES)


def test_synthetic_corpus_smoke():
    from pe_experiment import synthetic_corpus
    corpus = synthetic_corpus(n=20)
    assert len(corpus) == 20
    rep = analyze_corpus(corpus)
    assert "ranked" in rep and len(rep["ranked"]) == len(CANDIDATES)
    assert "verdict" in rep
