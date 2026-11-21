#!/usr/bin/env python3
"""Drift validator Game ↔ catalog ↔ DB (Sprint v3.5).

Cross-check del bundle canonical biodiversità contro il catalog publishing
(packs/evo_tactics_pack/docs/catalog/catalog_data.json) per individuare drift
delle 3 viste del dominio (Game runtime + catalog publishing + Game-Database CMS).

Cross-check eseguiti:
  1) Network nodes presenti in entrambi (id-based)
  2) Edges count consistency (network.edges ↔ catalog.connessioni)
  3) Biome IDs consistency (bundle.biomes ↔ catalog.biomi)
  4) Species presence (sample-based su bridge_species_map)
  5) Ecosystems id mapping (bundle.ecosystems.id ↔ catalog.biomi[].network_id)

Usage:
  python tools/py/validate_bio_sync.py [--bundle PATH] [--catalog PATH] [--strict]

Exit codes:
  0 = sync OK
  1 = drift detected (strict mode) o errori bloccanti
  2 = setup error (file mancanti, parse error)

Genera report inline. UTF-8 esplicito.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

DEFAULT_BUNDLE = ROOT / "out/bio/biodiversity_bundle.json"
DEFAULT_CATALOG = ROOT / "packs/evo_tactics_pack/docs/catalog/catalog_data.json"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def relpath(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def cross_check(bundle: dict[str, Any], catalog: dict[str, Any]) -> tuple[list[str], list[str]]:
    """Esegue cross-check bundle ↔ catalog.

    Returns: (errors_list, warnings_list)
    """
    errors: list[str] = []
    warnings: list[str] = []

    eco_block = catalog.get("ecosistema", {}) or {}
    cat_biomi = eco_block.get("biomi", []) or []
    cat_connessioni = eco_block.get("connessioni", []) or []

    # 1) Network nodes intersect
    bundle_node_ids = {n.get("id") for n in (bundle.get("network", {}).get("nodes") or [])}
    catalog_node_ids = {b.get("network_id") for b in cat_biomi if b.get("network_id")}

    only_bundle = bundle_node_ids - catalog_node_ids
    only_catalog = catalog_node_ids - bundle_node_ids
    if only_bundle:
        errors.append(
            f"network nodes only in bundle (catalog out of sync): {sorted(only_bundle)}"
        )
    if only_catalog:
        errors.append(
            f"network nodes only in catalog (bundle out of sync): {sorted(only_catalog)}"
        )

    # 2) Edges count consistency
    bundle_edges = len(bundle.get("network", {}).get("edges") or [])
    cat_edges = len(cat_connessioni)
    if bundle_edges != cat_edges:
        warnings.append(
            f"network edges count mismatch: bundle={bundle_edges} catalog={cat_edges}"
        )

    # 3) Bundle ecosystems.id ↔ catalog.biomi[].network_id
    bundle_eco_ids = {e.get("id") for e in (bundle.get("ecosystems") or [])}
    if catalog_node_ids - bundle_eco_ids:
        missing = catalog_node_ids - bundle_eco_ids
        warnings.append(
            f"catalog network_ids without bundle ecosystem: {sorted(missing)}"
        )

    # 4) Bridge species sanity
    bridge_map = bundle.get("bridge_species_map") or []
    bundle_species_ids = {s.get("id") for s in (bundle.get("species") or [])}
    for entry in bridge_map:
        sid = entry.get("species_id")
        if sid and sid not in bundle_species_ids:
            warnings.append(
                f"bridge species '{sid}' not found in bundle species list"
            )

    # 5) Biome label coverage (bundle.biomes vs catalog biome_profile)
    bundle_biome_ids = {b.get("id") for b in (bundle.get("biomes") or [])}
    cat_biome_profiles = {b.get("biome_profile") for b in cat_biomi if b.get("biome_profile")}
    # Profile non in bundle è warn, non error (semantica diversa: profile != id runtime)
    if cat_biome_profiles - bundle_biome_ids:
        missing = sorted(cat_biome_profiles - bundle_biome_ids)
        if missing:
            warnings.append(
                f"catalog biome_profiles non presenti in bundle.biomes: {missing[:5]}"
                + (f" (+{len(missing)-5} more)" if len(missing) > 5 else "")
            )

    return errors, warnings


def print_report(
    bundle: dict[str, Any],
    errors: list[str],
    warnings: list[str],
) -> None:
    counts = bundle.get("manifests", {}).get("counts", {}) or {}
    print("[bio-sync] Bundle counts:")
    for k, v in counts.items():
        print(f"  {k}: {v}")
    print(f"  snapshot_id: {bundle.get('snapshot_id', '?')}")
    print()
    if errors:
        print(f"[bio-sync] ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
    if warnings:
        print(f"[bio-sync] WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")
    if not errors and not warnings:
        print("[bio-sync] OK — no drift detected")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bundle", type=Path, default=DEFAULT_BUNDLE)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 se ci sono warnings (oltre che errors)",
    )
    args = parser.parse_args(argv)

    if not args.bundle.exists():
        print(f"[bio-sync] FAIL — bundle not found: {relpath(args.bundle)}", file=sys.stderr)
        print(
            "  Run first: python tools/py/export_biodiversity_bundle.py", file=sys.stderr
        )
        return 2
    if not args.catalog.exists():
        print(f"[bio-sync] FAIL — catalog not found: {relpath(args.catalog)}", file=sys.stderr)
        return 2

    try:
        bundle = load_json(args.bundle)
        catalog = load_json(args.catalog)
    except Exception as exc:
        print(f"[bio-sync] FAIL — parse error: {exc}", file=sys.stderr)
        return 2

    errors, warnings = cross_check(bundle, catalog)
    print_report(bundle, errors, warnings)

    if errors:
        return 1
    if args.strict and warnings:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
