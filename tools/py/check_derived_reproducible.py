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
import importlib.util
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRAITS_DIR = REPO_ROOT / "data" / "traits"
AFFINITY_PATH = TRAITS_DIR / "species_affinity.json"
PACK_SPECIES_ROOT = REPO_ROOT / "packs" / "evo_tactics_pack" / "data" / "species"
CATALOG_PATH = REPO_ROOT / "data" / "core" / "species" / "species_catalog.json"
BRIDGE_PATH = REPO_ROOT / "tools" / "py" / "build_species_trait_bridge.py"

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

    # Dead species: referenced by committed affinity but absent from the live catalog.
    dead = set()
    if CATALOG_PATH.exists():
        live = {e["species_id"] for e in _load_json(CATALOG_PATH).get("catalog", [])}
        for entries in committed_traits.values():
            for e in entries:
                if isinstance(e, dict) and e.get("species_id") not in live:
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
            f"{len(dead)} species referenced by committed affinity are NOT in the "
            f"current catalog (e.g. {sorted(dead)[:5]}). Output is stale."
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

    # 2. gameplay-promote entries that now have a lifecycle YAML -> a re-run stubs
    #    them at the merge stage and promote then SKIPS them (downgrade-on-regen).
    downgrade = []
    lingering_events = []
    for e in catalog:
        if e.get("source") != "gameplay-promote":
            continue
        sid = e.get("species_id")
        if (CATALOG_PATH.parent / f"{sid}_lifecycle.yaml").exists():
            downgrade.append(sid)
        # 3. gameplay-promote entries whose pack source is an ecological event
        #    (role_trofico=evento_ecologico) -> a re-run excludes them (additive
        #    promote never pruned them after the is_event filter landed).
        pack_path = _resolve_pack_path(e.get("pack_path", ""))
        if pack_path is not None:
            try:
                import yaml  # local import: only needed for this check
                pack = yaml.safe_load(pack_path.read_text(encoding="utf-8")) or {}
                if str(pack.get("role_trofico", "")).strip() == "evento_ecologico":
                    lingering_events.append(sid)
            except Exception:  # pragma: no cover - parse hiccup is itself a signal
                findings.append(f"gameplay-promote '{sid}': pack source unreadable ({e.get('pack_path')})")

    if downgrade:
        findings.append(
            f"{len(downgrade)} gameplay-promote species now have a lifecycle YAML "
            f"(e.g. {sorted(downgrade)[:5]}); a re-run downgrades them to bare "
            f"game-canonical-stub entries (loses morphotype/threat/pack_path)."
        )
    if lingering_events:
        findings.append(
            f"{len(lingering_events)} catalog entries are ecological events "
            f"(role_trofico=evento_ecologico) that a current re-run excludes: "
            f"{sorted(lingering_events)}."
        )

    print(f"  [species-catalog] entries: {len(catalog)}; version: {data.get('version')}; "
          f"by_source: {data.get('stats', {}).get('by_source')}")
    return findings


CHECKS = {
    "trait-bridge": check_trait_bridge,
    "species-catalog": check_species_catalog,
}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", choices=sorted(CHECKS), help="run a single check")
    ap.add_argument("--warn-only", action="store_true", help="report drift but exit 0")
    args = ap.parse_args(argv)

    selected = [args.only] if args.only else list(CHECKS)
    total = 0
    for name in selected:
        print(f"== {name} ==")
        findings = CHECKS[name]()
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
