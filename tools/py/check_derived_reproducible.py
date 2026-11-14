#!/usr/bin/env python3
"""Guard: detect drift between committed DERIVED data artifacts and what their
generators would produce from the CURRENT in-repo sources.

Context + root-cause writeup: docs/guide/derived-artifacts-reproducibility.md

Why this exists (TKT-P6-TRAIT-ORPHAN-DESIGN-B, 2026-06-22): two families of
committed derived artifacts are STALE vs their current in-repo sources, so a
naive "just regenerate it" on a plain dev checkout produces a huge spurious diff
that corrupts the canon and blocks otherwise-simple trait/species data work:

  1. Trait bridge   -- data/traits/index.json + data/traits/species_affinity.json
                       (tools/py/build_species_trait_bridge.py). Committed affinity
                       references ~80 species that no longer exist in the catalog;
                       a default regen collapses it (~287 -> ~54 trait entries).
  2. Species catalog -- data/core/species/species_catalog.json (the merge -> enrich
                       -> promote -> derive -> apply ETL chain in tools/etl/).
                       Committed catalog is stale vs the current sources (lingering
                       evento_ecologico entries, gameplay-promote entries that a
                       re-run would downgrade to bare stubs, missing newer species).

  3. Derived-analysis bundle -- data/derived/analysis/* (8 artifacts + manifest,
                       scripts/generate_derived_analysis.py). Added 2026-06-28
                       after this bundle drifted unnoticed for months: the
                       committed artifacts must hash to their manifest sha256 and
                       the manifest must carry only host-independent stamps.

This is DRIFT, not a build-host split: every real source IS in-repo. The /tmp
paths in the catalog's source_provenance are misleading leftover stamps from the
original one-off build host, not a required external input.

This script makes the drift VISIBLE (and CI-gateable) WITHOUT writing any
corrupt artifact. It never touches a tracked file:
  - trait-bridge:    regenerates the affinity map in-process to memory and
                     semantic-diffs it vs the committed file (ignores newline /
                     schema_version wrapper / ordering noise).
  - species-catalog: NON-destructive fingerprint scan that predicts exactly which
                     committed entries a full ETL re-run would add/drop/downgrade,
                     plus a provenance + input-existence check. (The promote/derive/
                     apply stages write the real catalog in-place with no --out, so
                     re-running them here would dirty the tree -- we predict instead.)

Exit code: non-zero when drift is found (so CI can gate). --warn-only forces 0.

Usage:
  python tools/py/check_derived_reproducible.py                 # both checks
  python tools/py/check_derived_reproducible.py --only trait-bridge
  python tools/py/check_derived_reproducible.py --warn-only     # advisory (exit 0)
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

_DRIVE_RE = re.compile(r"^[A-Za-z]:")


def _has_absolute_path(value: str) -> bool:
    """True if a manifest stamp embeds an absolute or backslash path token, i.e.
    it is host/checkout-location dependent. Catches POSIX abs (`/Users/...`,
    `/home/ci/...`, `/tmp/...`, `/workspace/...`), Windows drives (`C:\\...`), and
    any backslash. `value` may be a bare path or a full command line embedding
    paths, so check every whitespace-separated token."""
    for token in value.split():
        if token.startswith("/") or token.startswith("\\") or _DRIVE_RE.match(token) or "\\" in token:
            return True
    return False

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAITS_DIR = REPO_ROOT / "data" / "traits"
AFFINITY_PATH = TRAITS_DIR / "species_affinity.json"
PACK_SPECIES_ROOT = REPO_ROOT / "packs" / "evo_tactics_pack" / "data" / "species"
CATALOG_PATH = REPO_ROOT / "data" / "core" / "species" / "species_catalog.json"
BRIDGE_PATH = REPO_ROOT / "tools" / "py" / "build_species_trait_bridge.py"
ANALYSIS_DIR = REPO_ROOT / "data" / "derived" / "analysis"
ANALYSIS_MANIFEST = ANALYSIS_DIR / "manifest.json"

RUNBOOK = "docs/guide/derived-artifacts-reproducibility.md"


def _load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _import_bridge():
    """Import build_species_trait_bridge as a module so we can call its pure
    build_species_affinity() without spawning a subprocess or writing files."""
    name = "_build_species_trait_bridge"
    spec = importlib.util.spec_from_file_location(name, BRIDGE_PATH)
    module = importlib.util.module_from_spec(spec)
    # Register before exec so the module's @dataclass can resolve cls.__module__.
    sys.modules[name] = module
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def check_trait_bridge() -> list[str]:
    """Return a list of drift findings (empty == reproducible)."""
    findings: list[str] = []
    if not AFFINITY_PATH.exists():
        return [f"{AFFINITY_PATH.relative_to(REPO_ROOT)} missing"]

    committed = _load_json(AFFINITY_PATH)
    committed_traits = {k: v for k, v in committed.items() if isinstance(v, list)}

    bridge = _import_bridge()
    # Compare against the bridge's ACTUAL serialized output (schema_version wrapper
    # + sorted traits), so the schema_version key is no longer flagged as drift now
    # that the bridge emits it.
    regen = bridge.build_affinity_output(
        bridge.build_species_affinity(PACK_SPECIES_ROOT), AFFINITY_PATH
    )
    schema_parity = ("schema_version" not in committed) or ("schema_version" in regen)

    c_ids = set(committed_traits)
    r_ids = {k for k, v in regen.items() if isinstance(v, list)}
    only_committed = c_ids - r_ids
    only_regen = r_ids - c_ids

    # Dead species (C2 pack-scoped, 2026-06-28): the bridge reads pack species YAMLs,
    # so a species in the affinity is "dead" only if a FRESH REGEN no longer produces
    # it (a deleted pack species), NOT if it is absent from the separate catalog
    # registry. Pack and catalog are different id-spaces by design (~23 overlap), so a
    # pack-vs-catalog check is a permanent false alarm. Compare committed affinity
    # species against the regen's own species set (its source of truth).
    regen_species = set()
    for entries in regen.values():
        if isinstance(entries, list):
            for e in entries:
                if isinstance(e, dict) and e.get("species_id"):
                    regen_species.add(e.get("species_id"))
    dead = set()
    for entries in committed_traits.values():
        for e in entries:
            if isinstance(e, dict) and e.get("species_id") not in regen_species:
                dead.add(e.get("species_id"))

    print(f"  [trait-bridge] committed trait entries: {len(c_ids)}; "
          f"regen from {PACK_SPECIES_ROOT.relative_to(REPO_ROOT)}: {len(r_ids)}")
    if only_committed or only_regen:
        findings.append(
            f"trait-id set differs: {len(only_committed)} only-committed (stale), "
            f"{len(only_regen)} only-regen (new). A no-op regen would rewrite "
            f"species_affinity.json (and index.json) wholesale."
        )
    if dead:
        findings.append(
            f"{len(dead)} species referenced by committed affinity are no longer "
            f"produced by a fresh regen (deleted pack species, e.g. "
            f"{sorted(dead)[:5]}). Output is stale."
        )
    if not schema_parity:
        findings.append(
            "bridge output is missing the schema_version wrapper that committed "
            "species_affinity.json carries (the #2885 contract)."
        )
    return findings


def _resolve_pack_path(rel: str) -> Path | None:
    if not rel:
        return None
    p = (REPO_ROOT / rel)
    return p if p.exists() else None


def check_species_catalog() -> list[str]:
    """Non-destructive prediction of what a full ETL re-run would change."""
    findings: list[str] = []
    if not CATALOG_PATH.exists():
        return [f"{CATALOG_PATH.relative_to(REPO_ROOT)} missing"]

    data = _load_json(CATALOG_PATH)
    catalog = data.get("catalog", [])

    # 1. Provenance points at out-of-repo /tmp build-host leftovers.
    prov = data.get("source_provenance") or {}
    tmp_prov = sorted(k for k, v in prov.items() if isinstance(v, str) and ("/tmp" in v or v.startswith("\\tmp")))
    if tmp_prov:
        findings.append(
            f"source_provenance points at ephemeral build-host paths for {tmp_prov}; "
            f"the real in-repo inputs are data/external/evo/species/species_catalog.json "
            f"+ docs/archive/historical-snapshots/2026-05-15_species-deprecation/."
        )

    # 2. gameplay-promote entries whose pack source is an ecological event
    #    (role_trofico=evento_ecologico) -> a fresh re-run excludes them (additive
    #    promote never pruned them after the is_event filter landed). They linger in
    #    the committed catalog until the re-baseline.
    #    (The earlier lifecycle-stub "downgrade" finding is retired: promote now
    #    UPGRADES a bare stub in place instead of skipping it -- Phase 0.3.)
    lingering_events = []
    for e in catalog:
        if e.get("source") != "gameplay-promote":
            continue
        sid = e.get("species_id")
        pack_path = _resolve_pack_path(e.get("pack_path", ""))
        if pack_path is not None:
            try:
                import yaml  # local import: only needed for this check
                pack = yaml.safe_load(pack_path.read_text(encoding="utf-8")) or {}
                if str(pack.get("role_trofico", "")).strip() == "evento_ecologico":
                    lingering_events.append(sid)
            except Exception:  # pragma: no cover - parse hiccup is itself a signal
                findings.append(f"gameplay-promote '{sid}': pack source unreadable ({e.get('pack_path')})")

    if lingering_events:
        findings.append(
            f"{len(lingering_events)} catalog entries are ecological events "
            f"(role_trofico=evento_ecologico) that a current re-run excludes: "
            f"{sorted(lingering_events)}."
        )

    print(f"  [species-catalog] entries: {len(catalog)}; version: {data.get('version')}; "
          f"by_source: {data.get('stats', {}).get('by_source')}")
    return findings


# Hook for any derived artifact whose generator output is NOT byte-stable across
# Python versions (a regen-vs-committed byte compare would false-positive when the
# running interpreter differs from the one that produced the committed bundle).
# Currently EMPTY: `skydock_siege_xp.json` (balance_progression.py) used to carry a
# raw sum(cadence_minutes) that repr-differs between CPython 3.11 (23.299999999999997)
# and 3.12 (23.3 -- 3.12 added compensated float summation to sum()); that sum is now
# rounded at the source, so the whole bundle is byte-identical cross-version and gets
# the full deep byte compare. Add a rel-path here only if a future artifact
# reintroduces cross-version float drift.
_DEEP_FLOAT_FRAGILE: set[str] = set()

# The ONLY artifacts scripts/generate_derived_analysis.py actually writes (via
# generate_trait_coverage + generate_progression). The other manifest artifacts
# (trait_gap_report.json, trait_baseline.yaml, trait_env_mapping.json) are produced
# by SIBLING generators run as separate dataset-checks steps, so the --deep regen
# (which runs only this generator) must NOT delete/orphan-check them.
_GENERATOR_OUTPUTS = {
    "data/derived/analysis/trait_coverage_report.json",
    "data/derived/analysis/trait_coverage_matrix.csv",
    "data/derived/analysis/progression/skydock_siege_xp.json",
    "data/derived/analysis/progression/skydock_siege_xp_summary.csv",
    "data/derived/analysis/progression/skydock_siege_xp_profiles.csv",
}


def _check_analysis_source_drift(artifact_rels: list[str]) -> list[str]:
    """Deep (opt-in) source-drift check: DELETE the committed generator outputs,
    regenerate, then compare -- catching the gap the cheap hash check misses (bundle
    stale vs CHANGED source data, still matching its own equally-stale manifest).

    Deleting first is essential: an on-top regen would MISS an output that
    DISAPPEARS (e.g. balance_progression skips skydock_siege_xp_profiles.csv when
    the mission loses its profiles block) -- the stale file would survive and the
    check would wrongly pass. Detects three drifts: ORPHAN (committed artifact a
    regen no longer produces), CHANGED (regen rewrites it differently), NET-NEW
    (regen produces a file not committed).

    Restores the committed bytes in a finally (opt-in, ~seconds). Any artifact
    listed in _DEEP_FLOAT_FRAGILE (currently empty) still gets the orphan + net-new
    checks but NOT the byte compare -- for cross-version-fragile floats, run under
    the bundle's own interpreter.
    """
    findings: list[str] = []
    generator = REPO_ROOT / "scripts" / "generate_derived_analysis.py"
    if not generator.exists():
        return [f"deep: generator {generator.relative_to(REPO_ROOT)} missing"]

    # Only this generator's own outputs are deletable/orphan-checkable (the rest of
    # the manifest comes from sibling generators we don't run here).
    targets = [rel for rel in artifact_rels if rel in _GENERATOR_OUTPUTS]

    saved = {p: p.read_bytes() for p in ANALYSIS_DIR.rglob("*") if p.is_file()}
    # All target artifacts (incl float-fragile) get the orphan check; the byte
    # compare below skips the fragile ones.
    before_hash = {
        rel: hashlib.sha256((REPO_ROOT / rel).read_bytes()).hexdigest()
        for rel in targets
        if (REPO_ROOT / rel).exists()
    }

    env = dict(os.environ)
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    env.setdefault("PYTHONHASHSEED", "0")
    try:
        # Clear this generator's committed outputs so a regen that STOPS producing
        # one (orphan) is detectable -- an on-top regen would leave the stale file.
        for rel in targets:
            artifact = REPO_ROOT / rel
            if artifact.exists():
                artifact.unlink()

        result = subprocess.run(
            [sys.executable, str(generator), "--update-readme"],
            cwd=REPO_ROOT,
            env=env,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            findings.append(
                f"deep: generator failed (rc={result.returncode}): "
                f"{(result.stderr or '').strip()[-300:]}"
            )
        else:
            orphan = sorted(rel for rel in before_hash if not (REPO_ROOT / rel).exists())
            changed = sorted(
                rel
                for rel in before_hash
                if rel not in _DEEP_FLOAT_FRAGILE
                and (REPO_ROOT / rel).exists()
                and hashlib.sha256((REPO_ROOT / rel).read_bytes()).hexdigest() != before_hash[rel]
            )
            after = {p for p in ANALYSIS_DIR.rglob("*") if p.is_file()}
            net_new = sorted(p.relative_to(REPO_ROOT).as_posix() for p in after if p not in saved)
            if orphan:
                findings.append(
                    f"deep: SOURCE-DRIFT -- a fresh regen NO LONGER produces {orphan} "
                    f"(committed bundle has stale/removed outputs)."
                )
            if changed:
                findings.append(
                    f"deep: SOURCE-DRIFT -- a fresh regen CHANGES {changed} "
                    f"(committed bundle stale vs current source data)."
                )
            if net_new:
                findings.append(
                    f"deep: SOURCE-DRIFT -- a fresh regen produces NEW uncommitted files: {net_new}."
                )
            if orphan or changed or net_new:
                findings.append(
                    "Run `python scripts/generate_derived_analysis.py --update-readme` and commit."
                )
    finally:
        for path in ANALYSIS_DIR.rglob("*"):
            if path.is_file() and path not in saved:
                path.unlink()
        for path, data in saved.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    return findings


def check_derived_analysis(deep: bool = False) -> list[str]:
    """Verify the derived-analysis bundle is self-consistent + host-independent.

    Added 2026-06-28: this 8-artifact bundle (generated by
    scripts/generate_derived_analysis.py) drifted unnoticed for months because the
    guard didn't cover it. Two non-destructive checks (no regen, no writes):

      1. Each artifact's committed bytes must hash to the sha256 the manifest
         stored. A mismatch means the bundle was hand-edited, the manifest is
         stale, OR it was regenerated by a generator that wrote CRLF while git
         stores LF (.gitattributes eol=lf) -- the exact class of bug a verifier
         on a fresh clone would hit.
      2. The manifest must carry only host-independent stamps: repo-relative,
         forward-slash core_root/pack_root/command and NO per-commit `commit`
         pin -- otherwise it is not byte-reproducible across hosts/commits.

    With ``deep=True`` (--deep) a third check ALSO runs the generator and compares
    the regenerated artifacts to the committed bytes -- catching source-drift where
    the bundle is stale vs CHANGED source data but still matches its own (equally
    stale) manifest. It restores the committed bytes afterwards (opt-in; ~seconds).
    """
    findings: list[str] = []
    if not ANALYSIS_MANIFEST.exists():
        return [f"{ANALYSIS_MANIFEST.relative_to(REPO_ROOT)} missing"]

    manifest = _load_json(ANALYSIS_MANIFEST)
    artifacts = manifest.get("artifacts", {})
    if not isinstance(artifacts, dict) or not artifacts:
        return ["derived-analysis manifest has no artifacts block"]

    missing: list[str] = []
    mismatches: list[str] = []
    for rel, stored in artifacts.items():
        path = REPO_ROOT / rel
        if not path.exists():
            missing.append(rel)
            continue
        if hashlib.sha256(path.read_bytes()).hexdigest() != stored:
            mismatches.append(rel)

    bad_stamps: list[str] = []
    for key in ("core_root", "pack_root", "command"):
        value = manifest.get(key, "")
        if isinstance(value, str) and _has_absolute_path(value):
            bad_stamps.append(key)
    if "commit" in manifest:
        bad_stamps.append("commit (non-deterministic per-commit pin)")

    print(f"  [derived-analysis] artifacts: {len(artifacts)}; "
          f"hash-verified: {len(artifacts) - len(missing) - len(mismatches)}")
    if missing:
        findings.append(f"{len(missing)} manifest artifact(s) absent on disk: {sorted(missing)}.")
    if mismatches:
        findings.append(
            f"{len(mismatches)} artifact(s) do not match their committed sha256 "
            f"(hand-edited / stale manifest / CRLF-vs-LF): {sorted(mismatches)}. "
            f"Regenerate via `python scripts/generate_derived_analysis.py --update-readme`."
        )
    if bad_stamps:
        findings.append(
            f"manifest carries host/commit-dependent stamps {bad_stamps} -> not "
            f"byte-reproducible across hosts. Regenerate with the current generator."
        )

    if deep and not missing:
        findings.extend(_check_analysis_source_drift(list(artifacts.keys())))
    return findings


CHECKS = {
    "trait-bridge": check_trait_bridge,
    "species-catalog": check_species_catalog,
    "derived-analysis": check_derived_analysis,
}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", choices=sorted(CHECKS), help="run a single check")
    ap.add_argument("--warn-only", action="store_true", help="report drift but exit 0")
    ap.add_argument(
        "--deep",
        action="store_true",
        help="also run the source-drift check (regenerates the derived-analysis "
        "bundle in place + restores it; ~seconds)",
    )
    args = ap.parse_args(argv)

    selected = [args.only] if args.only else list(CHECKS)
    total = 0
    for name in selected:
        print(f"== {name} ==")
        findings = (
            CHECKS[name](deep=args.deep)
            if name == "derived-analysis"
            else CHECKS[name]()
        )
        if findings:
            for f in findings:
                print(f"  DRIFT: {f}")
            total += len(findings)
        else:
            print("  OK: reproducible from current in-repo sources.")

    print()
    if total:
        print(f"FOUND {total} drift finding(s). Committed derived artifacts are NOT a "
              f"no-op regen on this checkout.")
        print(f"Do NOT commit a naive regenerate. See {RUNBOOK} for the owner-gated "
              f"remediation (re-baseline + generator/pipeline fixes).")
        return 0 if args.warn_only else 1
    print("All checked derived artifacts reproduce from current in-repo sources.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
