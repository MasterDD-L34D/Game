#!/usr/bin/env python3
"""PE_ratio orthogonality experiment (G2 follow-up PR1). Analysis core: a runs-corpus
(per-run pressure stats + outcome) -> a candidate-selection report. The real N=100 run is
the owner's maintainer step (make_corpus_from_backend, backend-dependent); the analysis is
pure + hermetically tested. See docs/superpowers/specs/2026-06-18-composite-pe-ratio-experiment-design.md."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from pe_candidates import CANDIDATES, candidate_value  # noqa: E402
from pe_orthogonality import selection_report  # noqa: E402


def run_to_stats(run):
    """Map one calibrate_parallel run record -> (stats dict for candidates, won bool)."""
    stats = {
        "frac_ge75": run.get("pressure_frac_ge75", 0.0),
        "pressure_mean": run.get("pressure_mean", 0.0),
        "pmax": run.get("pressure_pmax", 0.0),
    }
    return stats, run.get("outcome") == "victory"


def analyze_corpus(corpus, eased_run=None):
    """Compute each candidate's per-run values + outcomes, then the selection report."""
    per_candidate = {name: [] for name in CANDIDATES}
    wons = []
    for run in corpus:
        stats, won = run_to_stats(run)
        wons.append(won)
        for name in CANDIDATES:
            per_candidate[name].append(candidate_value(name, stats))
    eased_value = ratified_value = None
    if eased_run is not None:
        es, _ = run_to_stats(eased_run)
        eased_value = {n: candidate_value(n, es) for n in CANDIDATES}
        ratified_value = {n: (sum(v) / len(v) if v else 0.0) for n, v in per_candidate.items()}
    return selection_report(per_candidate, wons, ratified_value=ratified_value,
                            eased_value=eased_value)


def main():
    import argparse
    import json

    ap = argparse.ArgumentParser(description="PE_ratio orthogonality experiment (analysis)")
    ap.add_argument("--corpus", required=True,
                    help="JSON: a list of run records (pressure_frac_ge75/pressure_mean/"
                         "pressure_pmax/outcome), e.g. the merged calibrate_parallel runs.")
    ap.add_argument("--eased", help="optional JSON: one trivialized-knob run record (discrimination).")
    args = ap.parse_args()
    corpus = json.loads(Path(args.corpus).read_text(encoding="utf-8"))
    if isinstance(corpus, dict):
        corpus = corpus.get("runs", [])
    eased = json.loads(Path(args.eased).read_text(encoding="utf-8")) if args.eased else None
    print(json.dumps(analyze_corpus(corpus, eased_run=eased), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
