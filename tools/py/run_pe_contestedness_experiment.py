#!/usr/bin/env python3
"""Re-analyze the committed N=100 oracle corpora with the contestedness candidates
(D/E/F) -> per-oracle + pooled orthogonality |corr(candidate, won)| (the SELECTION)
+ the proposed composite band for the least-collinear contestedness candidate.

Deterministic: pure analysis of the saved seed-pinned (424242) node-22 corpora from
the 2026-06-18 PR2 run -- NO backend, NO prod, no randomness. The owner ratifies the
selection + the band (SDMG); this script only proposes with numbers.

  python tools/py/run_pe_contestedness_experiment.py
"""
import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pe_experiment import run_to_stats  # noqa: E402
from pe_candidates import CANDIDATES, candidate_value, pe_ratio_aggregate  # noqa: E402
from pe_orthogonality import pearson, DEFAULT_MAX_CORR  # noqa: E402

ROOT = Path(__file__).parent.parent.parent
# The 3 ratified balance oracles (NOT badlands_ambient = designed-winnable, not an oracle).
CORPORA = {
    "hardcore_06": "docs/playtest/parallel-hardcore_06-iter5-optuna-ratify-merged.json",
    "badlands_elite_01": "docs/playtest/2026-06-18-badlands_elite_01-n100-merged.json",
    "foresta_pilot_01": "docs/playtest/2026-06-18-foresta_pilot_01-n100-merged.json",
}
CONTEST = ["D_turns_contest", "E_dmg_margin", "F_contest_combined"]


def load_runs(path):
    d = json.loads((ROOT / path).read_text(encoding="utf-8"))
    return d if isinstance(d, list) else d.get("runs", [])


def abs_corr_table(runs):
    wons, vals = [], {n: [] for n in CANDIDATES}
    for r in runs:
        stats, won = run_to_stats(r)
        wons.append(1.0 if won else 0.0)
        for n in CANDIDATES:
            vals[n].append(candidate_value(n, stats))
    return {n: abs(pearson(vals[n], wons)) for n in CANDIDATES}, wons


def oracle_aggregate(runs):
    """Build the composite-form aggregate keys from a corpus (mean per-run rollups)."""
    return {
        "turns_avg": statistics.mean(r.get("rounds", 0.0) for r in runs),
        "dmg_taken_avg": statistics.mean(r.get("dmg_taken_player", 0.0) for r in runs),
        "dmg_dealt_avg": statistics.mean(r.get("dmg_dealt_player", 0.0) for r in runs),
    }


def main():
    print("PE_ratio contestedness orthogonality -- |corr(candidate, won)| (LOWER = less collinear = better)\n")
    pooled = []
    for name, path in CORPORA.items():
        runs = load_runs(path)
        pooled += runs
        tbl, wons = abs_corr_table(runs)
        print(f"== {name}  (n={len(runs)}, WR={sum(wons) / len(wons):.2f}) ==")
        for n in sorted(tbl, key=tbl.get):
            print(f"   {n:20s} |corr|={tbl[n]:.3f}")
        print()

    print(f"== POOLED (all 3 oracles, n={len(pooled)}) ==")
    ptbl, _ = abs_corr_table(pooled)
    for n in sorted(ptbl, key=ptbl.get):
        print(f"   {n:20s} |corr|={ptbl[n]:.3f}")

    sel = min(CONTEST, key=lambda n: ptbl[n])
    rejected = ptbl[sel] >= DEFAULT_MAX_CORR
    print(f"\nLeast-collinear contestedness candidate (pooled) = {sel}  |corr|={ptbl[sel]:.3f}")
    print(f"max_corr threshold = {DEFAULT_MAX_CORR} -> {'REJECTED (escalate: drop PE term)' if rejected else 'NOT rejected'}")

    # Composite band on the SELECTED candidate: per-oracle aggregate value (what the
    # composite consumes) -> mean +/- k*sd over the 3 oracle configs.
    k = 2.0
    agg_vals = []
    for name, path in CORPORA.items():
        agg = oracle_aggregate(load_runs(path))
        v = pe_ratio_aggregate(agg, sel)
        agg_vals.append(v)
        print(f"   aggregate {sel} @ {name} = {v:.3f}")
    mu = statistics.mean(agg_vals)
    sd = statistics.pstdev(agg_vals) if len(agg_vals) > 1 else 0.0
    lo, hi = max(0.0, mu - k * sd), min(1.0, mu + k * sd)
    print(f"\nPROPOSED band on {sel} (mean +/- {k}*sd): mu={mu:.3f} sd={sd:.3f} -> [{lo:.3f}, {hi:.3f}]")
    print("\nNB: PROPOSED only. master-dd ratifies the selection AND the band (SDMG, human-only).")


if __name__ == "__main__":
    main()
