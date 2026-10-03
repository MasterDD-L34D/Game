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
        # contestedness (sec 4.5) -- per-run turns + party damage (already on every record).
        "rounds": run.get("rounds", 0.0),
        "dmg_taken_player": run.get("dmg_taken_player", 0.0),
        "dmg_dealt_player": run.get("dmg_dealt_player", 0.0),
    }
    return stats, run.get("outcome") == "victory"


def analyze_corpus(corpus, eased_run=None):
    """Compute each candidate's per-run values + outcomes, then the selection report.

    The PRIMARY result is |corr(candidate, won)| (least collinear = selected) -- read this
    as the decision. If an `eased_run` (a deliberately-trivialized-knob run) is given, an
    ADVISORY `discrimination` field compares the eased run's tension against the MEAN tension
    over this corpus (the corpus IS the ratified-knob runs, so its mean = mean ratified-knob
    tension). NB this secondary check is itself susceptible to the WR/pressure collinearity
    the experiment measures (an easy eased run can read HIGH pressure), so it can mislead --
    advisory only, not the selection criterion."""
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


def synthetic_corpus(n=20):
    """Deterministic synthetic corpus for the dry-run smoke (no backend, no randomness):
    half wins / half losses, with pressure stats that mimic the real collinearity
    (wins -> higher mean/pmax) so the analysis exercises end-to-end. Every candidate is
    collinear with wins here BY CONSTRUCTION, so the dry-run correctly reports a
    negative-result -- it only proves the harness runs end-to-end, not a real selection."""
    corpus = []
    for i in range(n):
        won = (i % 2 == 0)
        mean = 90.0 if won else 60.0
        corpus.append({
            "outcome": "victory" if won else "defeat",
            "pressure_frac_ge75": 0.9 if won else 0.3,
            "pressure_mean": mean,
            "pressure_pmax": 99.0 if won else 80.0,
        })
    return corpus


def make_corpus_from_backend(repo, scenario_key, *, seed=424242, n=100, shards=4):
    """BACKEND-DEPENDENT maintainer path: run calibrate_parallel seed-pinned on node 22, read
    the merged runs (each now carrying the per-run pressure stats), return the corpus.
    Validated by the maintainer on a real run; not unit-tested (no backend in CI)."""
    import json
    import subprocess
    import tempfile
    out_dir = Path(tempfile.mkdtemp(prefix="pe-exp-"))  # fresh dir: no stale-file masquerade
    cmd = [sys.executable, str(Path(repo) / "tools/py/calibrate_parallel.py"),
           "--scenario", scenario_key, "--n", str(n), "--seed", str(seed),
           "--shards", str(shards), "--out-dir", str(out_dir), "--label", "pe-exp"]
    subprocess.run(cmd, cwd=repo, check=True)
    merged = sorted(out_dir.glob("*pe-exp*.json"), key=lambda p: p.stat().st_mtime)
    if not merged:
        raise RuntimeError(f"calibrate_parallel produced no output under {out_dir} -- cannot build corpus")
    return json.loads(merged[-1].read_text(encoding="utf-8")).get("runs", [])


def main():
    import argparse
    import json

    ap = argparse.ArgumentParser(description="PE_ratio orthogonality experiment (analysis)")
    ap.add_argument("--corpus", required=False,
                    help="JSON: a list of run records (pressure_frac_ge75/pressure_mean/"
                         "pressure_pmax/outcome), e.g. the merged calibrate_parallel runs.")
    ap.add_argument("--eased", help="optional JSON: one trivialized-knob run record (discrimination).")
    ap.add_argument("--dry-run", action="store_true",
                    help="analyze a deterministic synthetic corpus (no backend); smoke only")
    args = ap.parse_args()
    if args.dry_run:
        print(json.dumps(analyze_corpus(synthetic_corpus()), indent=2))
        return 0
    if not args.corpus:
        print("--corpus <runs.json> required (or --dry-run)", file=sys.stderr)
        return 2
    corpus = json.loads(Path(args.corpus).read_text(encoding="utf-8"))
    if isinstance(corpus, dict):
        corpus = corpus.get("runs", [])
    eased = json.loads(Path(args.eased).read_text(encoding="utf-8")) if args.eased else None
    print(json.dumps(analyze_corpus(corpus, eased_run=eased), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
