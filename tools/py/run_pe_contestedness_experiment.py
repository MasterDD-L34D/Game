#!/usr/bin/env python3
"""PE_ratio contestedness orthogonality + composite-band, generalized to the canonical
MULTI-POLICY regime.

Each ORACLE pools per-combat runs across the canonical Restricted-Play policy set
[random, greedy, lookahead2, utility] (canonical-suite.yaml `policies`), NOT greedy-only.
Orthogonality = |corr(candidate, won)| on the pooled per-run records (LOWER = less
collinear with win-rate = better anti-false-balance); the composite band = mean +/- k*sd
of the SELECTED candidate's per-oracle aggregate value across the oracles.

Why this re-run: the committed N=100 evidence
(docs/playtest/2026-06-23-pe-contestedness-orthogonality-n100.md) selected E_dmg_margin but
its band was NOT ratifiable -- the corpora were `policy_mode=greedy-only` DIAGNOSTIC (wrong
regime: the composite gates multi-policy canonical balance) and the band was a 3-point
outlier artifact (dropping badlands_elite collapsed it). This runner consumes corpora
produced by `calibrate_parallel.py --policy {random,greedy,lookahead2,utility}` (one file per
oracle per policy) and pools them, over >=5 oracles incl. a low-pressure/easy one.

Pure analysis (no backend, no randomness). The owner ratifies the selection + the band
(SDMG, human-only); this script only proposes with numbers.

  # back-compat: re-analyze the committed greedy-only corpora (reproduces PR2 evidence)
  python tools/py/run_pe_contestedness_experiment.py

  # multi-policy re-run: point at a corpora config mapping oracle -> [per-policy paths]
  python tools/py/run_pe_contestedness_experiment.py --corpora-config corpora.json --json-out out.json
"""
import argparse
import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pe_experiment import run_to_stats  # noqa: E402
from pe_candidates import CANDIDATES, candidate_value, pe_ratio_aggregate  # noqa: E402
from pe_orthogonality import pearson, DEFAULT_MAX_CORR  # noqa: E402

ROOT = Path(__file__).parent.parent.parent

# Back-compat default = the committed greedy-only corpora (the PR2 evidence). The
# multi-policy re-run overrides this via --corpora-config (oracle -> [per-policy paths]).
DEFAULT_CORPORA = {
    "hardcore_06": ["docs/playtest/parallel-hardcore_06-iter5-optuna-ratify-merged.json"],
    "badlands_elite_01": ["docs/playtest/2026-06-18-badlands_elite_01-n100-merged.json"],
    "foresta_pilot_01": ["docs/playtest/2026-06-18-foresta_pilot_01-n100-merged.json"],
}
CONTEST = ["D_turns_contest", "E_dmg_margin", "F_contest_combined"]


def _read_corpus(path):
    """Read one corpus file -> list of clean run records. Accepts three shapes:
      - a bare list of run records;
      - a single-policy report  {..., 'runs': [...]}  (calibrate_parallel merged);
      - a multi-policy triangulation report  {..., 'policies': {pol: {'runs': [...]}}}
        (batch_calibrate_*.py --policy all) -> flatten all policies into one pool.
    Failed runs ({'error': ...}, no outcome/contestedness fields) are dropped so they
    cannot pollute the correlation or the aggregate. Repo-relative paths resolve under
    ROOT; absolute paths are read as-is (generated corpora outside the repo also load)."""
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    d = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(d, list):
        runs = d
    elif isinstance(d.get("policies"), dict):
        runs = []
        for pol in d["policies"].values():
            runs.extend(pol.get("runs", []) if isinstance(pol, dict) else [])
    else:
        runs = d.get("runs", [])
    return [r for r in runs if isinstance(r, dict) and "error" not in r]


def pool_oracle_runs(paths):
    """Concatenate the per-policy corpora for ONE oracle into a single run list
    (each record keeps its own `policy` field). This is the multi-policy pool the
    orthogonality + aggregate are computed over."""
    pooled = []
    for path in paths:
        pooled.extend(_read_corpus(path))
    return pooled


def load_corpora(config):
    """config = {oracle_name: [corpus_path, ...]} -> {oracle_name: pooled_runs}."""
    return {name: pool_oracle_runs(paths) for name, paths in config.items()}


def oracle_aggregate(runs):
    """Build the composite-form aggregate keys from a corpus (mean per-run rollups)."""
    return {
        "turns_avg": statistics.mean(r.get("rounds", 0.0) for r in runs) if runs else 0.0,
        "dmg_taken_avg": statistics.mean(r.get("dmg_taken_player", 0.0) for r in runs) if runs else 0.0,
        "dmg_dealt_avg": statistics.mean(r.get("dmg_dealt_player", 0.0) for r in runs) if runs else 0.0,
    }


def abs_corr_table(runs):
    """{candidate: |corr(candidate_value, won)|} over a run list + the binary wons."""
    wons, vals = [], {n: [] for n in CANDIDATES}
    for r in runs:
        stats, won = run_to_stats(r)
        wons.append(1.0 if won else 0.0)
        for n in CANDIDATES:
            vals[n].append(candidate_value(n, stats))
    return {n: abs(pearson(vals[n], wons)) for n in CANDIDATES}, wons


def derive_band(values, k=2.0, candidate=None):
    """Composite band = mean +/- k*sd over the per-oracle aggregate values, clamped
    to [0,1]. Population stdev (the oracles ARE the population, not a sample); single
    value -> zero spread."""
    vals = list(values)
    mu = statistics.mean(vals) if vals else 0.0
    sd = statistics.pstdev(vals) if len(vals) > 1 else 0.0
    return {
        "candidate": candidate,
        "k": k,
        "n": len(vals),
        "mu": mu,
        "sd": sd,
        "lo": max(0.0, mu - k * sd),
        "hi": min(1.0, mu + k * sd),
        "values": vals,
    }


def analyze(oracle_runs, candidate=None, k=2.0, max_corr=DEFAULT_MAX_CORR):
    """Core analysis over {oracle: pooled_runs}.

    - per-oracle + pooled orthogonality |corr(candidate, won)| (selection criterion);
    - select the least-collinear CONTEST candidate on the POOLED runs (None -> all
      rejected = escalate to drop-PE);
    - derive the composite band for `candidate` (explicit) or the selected candidate,
      over the per-oracle aggregate values.
    Returns a structured dict (no printing) so callers/tests can assert on it."""
    per_oracle = {}
    pooled = []
    for name, runs in oracle_runs.items():
        pooled.extend(runs)
        tbl, wons = abs_corr_table(runs)
        per_oracle[name] = {
            "n": len(runs),
            "wr": (sum(wons) / len(wons)) if wons else 0.0,
            "orthogonality": tbl,
            "aggregate": oracle_aggregate(runs),
        }
    ptbl, _ = abs_corr_table(pooled)
    sel = min(CONTEST, key=lambda n: ptbl[n]) if CONTEST else None
    rejected = sel is None or ptbl[sel] > max_corr
    chosen = candidate or (None if rejected else sel)
    band = None
    if chosen is not None:
        vals = []
        for name in oracle_runs:
            v = pe_ratio_aggregate(per_oracle[name]["aggregate"], chosen)
            per_oracle[name]["pe_value"] = v
            vals.append(v)
        band = derive_band(vals, k=k, candidate=chosen)
    return {
        "per_oracle": per_oracle,
        "pooled_orthogonality": ptbl,
        "selected": None if rejected else sel,
        "rejected": rejected,
        "band": band,
        "max_corr": max_corr,
    }


def _print_report(config, result):
    print("PE_ratio contestedness orthogonality (MULTI-POLICY) -- |corr(candidate, won)| "
          "(LOWER = less collinear = better)\n")
    for name, o in result["per_oracle"].items():
        policies = ", ".join(Path(p).name for p in config[name])
        print(f"== {name}  (n={o['n']}, WR={o['wr']:.2f})  corpora: {policies} ==")
        for cand in sorted(o["orthogonality"], key=o["orthogonality"].get):
            print(f"   {cand:20s} |corr|={o['orthogonality'][cand]:.3f}")
        print()
    print(f"== POOLED (all {len(result['per_oracle'])} oracles) ==")
    ptbl = result["pooled_orthogonality"]
    for cand in sorted(ptbl, key=ptbl.get):
        print(f"   {cand:20s} |corr|={ptbl[cand]:.3f}")
    sel = result["selected"]
    if result["rejected"]:
        worst = min(ptbl[c] for c in CONTEST)
        print(f"\nALL contestedness candidates rejected (min |corr|={worst:.3f} > "
              f"{result['max_corr']}) -> ESCALATE: drop the PE term (composite = re-weighted "
              f"win_rate + kd_ratio). Valid NEGATIVE result (handoff sec Escalation).")
    else:
        print(f"\nLeast-collinear contestedness candidate (pooled) = {sel}  |corr|={ptbl[sel]:.3f}  "
              f"(< {result['max_corr']} -> NOT rejected)")
    band = result["band"]
    if band:
        for name, o in result["per_oracle"].items():
            print(f"   aggregate {band['candidate']} @ {name} = {o['pe_value']:.3f}")
        print(f"\nPROPOSED band on {band['candidate']} (mean +/- {band['k']}*sd over "
              f"{band['n']} oracles): mu={band['mu']:.3f} sd={band['sd']:.3f} -> "
              f"[{band['lo']:.3f}, {band['hi']:.3f}]")
    print("\nNB: PROPOSED only. master-dd ratifies the selection AND the band (SDMG, human-only).")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--corpora-config", default=None,
                    help="JSON file mapping oracle_name -> [per-policy corpus paths]. "
                         "Omit = the committed greedy-only DEFAULT_CORPORA (back-compat).")
    ap.add_argument("--k", type=float, default=2.0, help="band half-width = k*sd (default 2.0)")
    ap.add_argument("--candidate", default=None,
                    help="force the band candidate (default = the selected least-collinear one)")
    ap.add_argument("--json-out", default=None, help="also write the structured result JSON here")
    args = ap.parse_args(argv)

    if args.corpora_config:
        config = json.loads(Path(args.corpora_config).read_text(encoding="utf-8"))
    else:
        config = DEFAULT_CORPORA
    oracle_runs = load_corpora(config)
    result = analyze(oracle_runs, candidate=args.candidate, k=args.k)
    _print_report(config, result)
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nWrote {args.json_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
