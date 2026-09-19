#!/usr/bin/env python3
"""Advisory stale-band detector (G2 P5).

For each ratified balance-oracle scenario, re-run it seed-pinned at N=40 and, if the
win-rate CONFIDENCE INTERVAL is DISJOINT from the existing band (a real OOB, not a near-
edge point) while AI regression is green (the #2719 signature: a *correct* change shifted
the band), surface a CANDIDATE for human triage. It NEVER edits a band/knob/manifest --
pure signal, advisory-only (ADR-0026 #7 SDMG). Live GitHub-issue emission + the nightly CI
job + the band-invalidation label are DEFERRED (owner decision 2026-06-18) until the harsh-
review falsification corpus (#2719 TP, #2764/iter3 TN) is green; this module ships the
detection core + an injectable runner + a --dry-run/print CLI. See
docs/superpowers/specs/2026-06-17-per-template-calibration-design.md sec 6.

False-positive discipline (from the P5 verify+red-team): (1) runtime-assert canonical
node 22 -- determinism is within-runtime only, the steep hc06 lever reads 12.5% vs 22%
across V8 versions (#2764); (2) measure the RATIFIED knob, abort if staging diverged
(iter3 transient); (3) CI-overlap, not point-over-edge -- file only if the N=40 Wilson CI
is band-disjoint (hc06's [0.15,0.30] vs +-15pp CI is the worst geometry); (4) it detects a
SYMPTOM (WR OOB at the ratified knob), NOT a verdict -- bug-vs-stale is a human git-bisect
(CANONICAL sec 9 step 2).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from auto_ratify import _is_real_number, _node_major, wilson_interval  # noqa: E402  reuse
from objective import evaluate_metric  # noqa: E402

CANONICAL_NODE = "22"
RATIFY_N = 40


def node_matches_canonical(node_version, expected=CANONICAL_NODE):
    """True only if the running node MAJOR matches the canonical runtime (sec 3 rule 8).
    Determinism is within-runtime only; a mismatched runtime gets NO verdict, never a flag."""
    return _node_major(node_version) == str(expected)


def _valid_band(band):
    """A usable band is a 2-element [lo, hi] of real numbers with lo <= hi. A malformed
    band (half-null [None, 0.30], short [0.15], scalar, inverted) is NOT indexable/comparable
    -> callers must skip it, never crash mid-loop."""
    if not isinstance(band, (list, tuple)) or len(band) != 2:
        return False
    lo, hi = band
    return _is_real_number(lo) and _is_real_number(hi) and lo <= hi


def ci_disjoint_from_band(wins, n, band):
    """Return (disjoint, lo, hi): the N-run Wilson 95% CI is ENTIRELY outside the band
    (hi<band[0] or lo>band[1]). Point-over-edge whose CI still overlaps the band is NOT
    disjoint = statistically in-band = no false flag. Missing counts OR a malformed band
    -> (False, None, None) (advisory: never claim a flag on data we cannot compute)."""
    if not _is_real_number(wins) or not _is_real_number(n) or n <= 0:
        return (False, None, None)
    if not _valid_band(band):
        return (False, None, None)
    lo, hi = wilson_interval(wins, n)
    return (hi < band[0] or lo > band[1], lo, hi)


def _try_composite(objective_metric, metrics):
    """(value, pending): value when computable; (None, True) = 'composite-pending' when a
    term is missing (e.g. pe_ratio not yet in the aggregate). Unlike P4's fail-closed write
    gate, the advisory detector degrades to WR-only and annotates -- it must NOT go silent."""
    if not objective_metric:
        return (None, False)
    try:
        comp = evaluate_metric(objective_metric, metrics)
    except (KeyError, ValueError, TypeError):
        return (None, True)
    return (comp, False) if _is_real_number(comp) else (None, True)


def detect_scenario(scenario, *, runner, node_version, regression_green=True,
                    objective_metric=None, seed=None, expected_node=CANONICAL_NODE):
    """Per-scenario advisory verdict. `runner(scenario) -> aggregate` is injectable (the
    production seed-pinned N=40 harness, or a deterministic fake in tests). Returns a dict
    with status in {flag, in-band, skip-runtime-mismatch, skip-regression-red,
    skip-staging-divergence, skip-no-data}. The 'old band' is read from the STRUCTURED
    target_band, never the (possibly stale) note prose."""
    base = {
        "scenario_id": scenario.get("id"),
        "band": scenario.get("target_band"),
        "ratified_knob": scenario.get("ratified_knob") or {},
        "seed": seed,
        "node_version": node_version,
    }
    if not _valid_band(base["band"]):
        # A malformed structured band cannot be verdicted -> skip, never crash the pass.
        return {**base, "status": "skip-malformed-band"}
    if not node_matches_canonical(node_version, expected_node):
        return {**base, "status": "skip-runtime-mismatch"}
    if not regression_green:
        # WR OOB with a RED regression = a bug to fix/revert, NOT a stale band (sec 9 step 2).
        return {**base, "status": "skip-regression-red"}

    agg = runner(scenario) or {}
    knob_used = agg.get("knob_used")
    if knob_used is not None and knob_used != base["ratified_knob"]:
        return {**base, "status": "skip-staging-divergence", "knob_used": knob_used}

    wins, n, wr = agg.get("win_count"), agg.get("n"), agg.get("win_rate")
    composite, composite_pending = _try_composite(objective_metric, agg)
    disjoint, lo, hi = ci_disjoint_from_band(wins, n, base["band"])
    result = {
        **base, "observed_wr": wr, "n": n,
        "ci": [lo, hi] if lo is not None else None,
        "composite": composite, "composite_pending": composite_pending,
    }
    if lo is None:
        result["status"] = "skip-no-data"
        return result
    result["status"] = "flag" if disjoint else "in-band"
    return result


def detect_stale_bands(manifest, *, runner, node_version, regression_green=True,
                       expected_node=CANONICAL_NODE):
    """Loop the manifest's RATIFIED balance oracles (skip tutorials / non-oracle / band=null)
    and return a per-scenario verdict list. Objective + seed resolved from the manifest
    (suite_manifest, P1's single accessor)."""
    from suite_manifest import scenario_objective

    seed = (manifest.get("repro") or {}).get("canonical_seed")
    results = []
    for sc in manifest.get("scenarios", []):
        if sc.get("role") != "balance_oracle" or sc.get("status") != "ratified":
            continue
        if not sc.get("target_band"):
            continue
        results.append(detect_scenario(
            sc, runner=runner, node_version=node_version, regression_green=regression_green,
            objective_metric=scenario_objective(manifest, sc.get("id")), seed=seed,
            expected_node=expected_node,
        ))
    return results


# --- Advisory issue body + culprit hint (composed; emission is DEFERRED) --------

CULPRIT_PATHS = [
    "data/core/balance/damage_curves.yaml",
    "apps/backend/services/combat",
    "apps/backend/services/balance",
]


def build_culprit_log_cmd(since=None, repo="."):
    """Cheap culprit HINT command: balance+combat commits since the band was ratified. Pure
    git metadata, ZERO sim runs (an authoritative bisect would re-run the sim per commit --
    that is the cost the detector exists to avoid; the human runs the real bisect)."""
    cmd = ["git", "-C", repo, "log", "--format=%h %ad %s", "--date=short"]
    if since:
        cmd += ["--since", since]
    cmd += ["--", *CULPRIT_PATHS]
    return cmd


def build_candidate_body(candidate, culprit_hint=None):
    """Compose the advisory issue body. Asserts only the OBSERVABLE (WR OOB at the ratified
    knob), framed as a CANDIDATE/symptom -- never a stale-band verdict (that is a human
    git-bisect, CANONICAL sec 9). 'old band' comes from the STRUCTURED target_band, never the
    note prose (which can be stale)."""
    sid = candidate["scenario_id"]
    pending = candidate.get("composite_pending")
    L = []
    L.append(f"## Stale-band CANDIDATE: {sid} -- WR out-of-band at the ratified knob (regression-green)")
    L.append("")
    L.append("**This is a SYMPTOM, not a verdict.** The detector cannot classify "
             "bug-vs-stale-band; run git-bisect (CANONICAL-AI-PLAYTEST sec 9 step 2) to decide. "
             "It NEVER edits the band or knob -- pure advisory signal.")
    L.append("")
    L.append(f"- scenario: `{sid}`")
    L.append(f"- old band (ratified, structured target_band): `{candidate.get('band')}`")
    ci = candidate.get("ci")
    L.append(f"- observed win_rate: `{candidate.get('observed_wr')}`"
             + (f" (Wilson95 CI `{ci}`)" if ci else ""))
    if pending:
        L.append("- composite: `composite-pending` (pe_ratio not yet wired in the batch "
                 "aggregate -> only WR-band drift was checked; absence of an issue is NOT a "
                 "clean composite bill of health)")
    else:
        L.append(f"- composite: `{candidate.get('composite')}`")
    L.append(f"- N used: `{candidate.get('n')}`")
    L.append(f"- seed: `{candidate.get('seed')}`")
    L.append(f"- runtime: node `{candidate.get('node_version')}` (canonical {CANONICAL_NODE})")
    L.append(f"- ratified knob: `{candidate.get('ratified_knob')}`")
    L.append("")
    L.append("### Suspected culprit (HINT)")
    if culprit_hint:
        L.append("Commits touching balance+combat since the band was ratified -- these are "
                 "**candidates, NOT an authoritative bisect**. Run git-bisect to confirm:")
        L.append("")
        L.append("```")
        L.append(culprit_hint)
        L.append("```")
    else:
        L.append("_culprit window unavailable_ (could not recover the band's last-ratify "
                 "anchor) -- run git-bisect from the last known-good ratify commit.")
    L.append("")
    L.append("_Intended labels: sot-drift-candidate + band-invalidation (advisory; human "
             "triage + re-ratify per CANONICAL sec 9). Emission is DEFERRED until the SDMG "
             "falsification corpus is green._")
    return "\n".join(L)


# --- Best-effort culprit anchor + backend runner (maintainer/CLI path) ----------

def band_since_anchor(repo, manifest_path):
    """Best-effort '--since' bound = the last commit date that touched the manifest's band
    declarations. Coarse (not the per-scenario git log -L); refined when emission lands.
    Returns a YYYY-MM-DD string or None (-> body prints 'window unavailable')."""
    import subprocess
    try:
        r = subprocess.run(["git", "-C", repo, "log", "-1", "--format=%ad", "--date=short",
                            "--", manifest_path], capture_output=True, text=True, check=True)
        return r.stdout.strip() or None
    except Exception:
        return None


def culprit_hint(repo, since):
    """Run the scoped culprit-log command and return its stdout (candidate commits), or None.
    Pure git metadata; NEVER an authoritative bisect (no per-commit sim)."""
    if not since:
        return None
    import subprocess
    try:
        r = subprocess.run(build_culprit_log_cmd(since=since, repo=repo),
                           capture_output=True, text=True, check=True)
        return r.stdout.strip() or None
    except Exception:
        return None


def read_prod_knob(damage_curves_path, scenario_id, field):
    """Read the ON-DISK ratified knob value for a scenario from production
    damage_curves.yaml (`scenario_overrides[scenario_id][field]`). This is an INDEPENDENT
    measurement of what the sim actually applies -- distinct from the manifest's
    ratified_knob -- so the staging-divergence guard can compare disk-vs-manifest. Returns
    the scalar value or None (absent scenario/field)."""
    import yaml
    try:
        data = yaml.safe_load(Path(damage_curves_path).read_text(encoding="utf-8")) or {}
    except OSError:
        return None
    return ((data.get("scenario_overrides") or {}).get(scenario_id) or {}).get(field)


def make_seed_pinned_runner(repo, *, seed=424242, n=RATIFY_N, shards=4):
    """Production runner: for a scenario, run calibrate_parallel at the on-disk
    damage_curves.yaml knob, seed-pinned, parse the merged aggregate.

    BACKEND-DEPENDENT (needs the Game backend); the detector is a maintainer/nightly tool,
    so this path is validated by the maintainer on a real run. `knob_used` is the
    INDEPENDENTLY-measured on-disk knob (via read_prod_knob), NOT the manifest value -- so
    the staging-divergence guard genuinely compares disk-vs-manifest (if prod drifted from
    the ratified value, the guard skips rather than flagging a phantom stale band). A knob it
    cannot measure stays None and detect_scenario simply omits the staging check (the
    maintainer validates the on-disk state on a real run)."""
    import json
    import subprocess
    import tempfile

    from calibrate_orchestrator import _PARALLEL_KEY

    dc_path = str(Path(repo) / "data/core/balance/damage_curves.yaml")

    def runner(scenario):
        sid = scenario.get("id")
        scen = _PARALLEL_KEY.get(sid, sid)
        field = next(iter(scenario.get("ratified_knob") or {}), None)
        tmp = Path(tempfile.gettempdir())
        cmd = [sys.executable, str(Path(repo) / "tools/py/calibrate_parallel.py"),
               "--scenario", scen, "--n", str(n), "--seed", str(seed),
               "--shards", str(shards), "--out-dir", str(tmp), "--label", "drift"]
        subprocess.run(cmd, cwd=repo, check=True)
        merged = sorted(tmp.glob("*drift*.json"), key=lambda p: p.stat().st_mtime)
        agg = json.loads(merged[-1].read_text(encoding="utf-8")).get("aggregate", {}) if merged else {}
        on_disk = read_prod_knob(dc_path, sid, field) if field else None
        return {"win_rate": agg.get("win_rate"), "win_count": agg.get("win_count"),
                "n": agg.get("N") or agg.get("n"), "kd_avg": agg.get("kd_avg"),
                "defeat_rate": agg.get("defeat_rate"),
                "knob_used": {field: on_disk} if on_disk is not None else None}

    return runner


def _synthetic_agg(wr, knob):
    return {"win_rate": wr, "win_count": int(round(wr * 100)), "n": 100, "kd_avg": 0.8,
            "defeat_rate": 1 - wr, "knob_used": knob}


def main():
    import argparse
    import json

    from auto_ratify import _node_version_string  # reuse node detection
    from suite_manifest import DEFAULT_MANIFEST_PATH, load_manifest

    ap = argparse.ArgumentParser(
        description="G2 P5 advisory stale-band detector (detect + print/JSON; emission DEFERRED)")
    ap.add_argument("--dry-run", action="store_true",
                    help="synthetic in-band runner, no backend (smoke); real run needs the Game backend")
    ap.add_argument("--regression-red", dest="regression_green", action="store_false", default=True,
                    help="a RED AI-regression means a bug, not a stale band -> detector files nothing")
    ap.add_argument("--repo", default=None)
    args = ap.parse_args()

    repo = args.repo or str(Path(__file__).resolve().parents[2])
    manifest = load_manifest(DEFAULT_MANIFEST_PATH)
    node_ver = _node_version_string()

    if args.dry_run:
        def runner(s):
            b = s["target_band"]
            return _synthetic_agg((b[0] + b[1]) / 2.0, s.get("ratified_knob"))
    else:
        runner = make_seed_pinned_runner(repo)

    results = detect_stale_bands(manifest, runner=runner, node_version=node_ver,
                                 regression_green=args.regression_green)
    flags = [r for r in results if r["status"] == "flag"]
    summary = {
        "node_version": node_ver, "canonical_node": CANONICAL_NODE,
        "regression_green": args.regression_green, "flags": len(flags),
        "results": [{k: r.get(k) for k in
                     ("scenario_id", "status", "observed_wr", "ci", "band", "n", "seed",
                      "composite_pending")} for r in results],
    }
    print(json.dumps(summary, indent=2))
    if flags:
        since = band_since_anchor(repo, str(DEFAULT_MANIFEST_PATH))
        for r in flags:
            print("\n" + build_candidate_body(r, culprit_hint=culprit_hint(repo, since)),
                  file=sys.stderr)
    # Advisory: ALWAYS exit 0 (never a gate; no exit-1 -> stays non-blocking when wired to CI).
    return 0


if __name__ == "__main__":
    sys.exit(main())
