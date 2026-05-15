#!/usr/bin/env python3
"""Phase 3 polish review tool — filter species_catalog.json by _provenance.

ADR-2026-05-15 Phase 3 Path D HYBRID master-dd review queue helper.

Catalog v0.4.x entries enriched via tools/etl/enrich_species_heuristic.py
hanno _provenance dict tracking per-field origin:
- "heuristic-pattern-A-tag-driven" (Caves of Qud visual_description)
- "heuristic-pattern-B-foodweb" (Dwarf Fortress predates_on/by)
- "heuristic-pattern-C-mechanical" (RimWorld constraints)
- "needs-master-dd" (Pattern miss, narrative composition needed)
- "default-clade-nonkeystone" (symbiosis fallback)

Master-dd batch session workflow:
    # Show all species needing master-dd review for visual_description:
    python3 tools/py/review_phase3.py --field visual_description --filter needs-master-dd

    # Show all heuristic-derived constraints for review:
    python3 tools/py/review_phase3.py --field constraints --filter heuristic

    # Stats overview:
    python3 tools/py/review_phase3.py --stats

Cross-link: docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CATALOG_PATH = ROOT / "data" / "core" / "species" / "species_catalog.json"


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    p.add_argument(
        "--field",
        help="Filter by field (visual_description, constraints, interactions.predates_on, etc.)",
    )
    p.add_argument(
        "--filter",
        help="Provenance filter: 'needs-master-dd', 'heuristic', 'default', 'all' (default)",
        default="all",
    )
    p.add_argument("--source", help="Filter by source (legacy-yaml-merge, pack-v2-full-plus, game-canonical-stub)")
    p.add_argument("--stats", action="store_true", help="Print overall provenance stats")
    p.add_argument("--limit", type=int, default=50, help="Max entries to print")
    return p.parse_args()


def main():
    args = parse_args()
    if not args.catalog.exists():
        print(f"ERROR: {args.catalog} not found", file=sys.stderr)
        return 2
    data = json.loads(args.catalog.read_text(encoding="utf-8"))
    catalog = data.get("catalog", [])

    if args.stats:
        # Aggregate provenance stats across all entries
        field_provenance = {}
        for entry in catalog:
            prov = entry.get("_provenance", {})
            for field, source in prov.items():
                field_provenance.setdefault(field, {}).setdefault(source, 0)
                field_provenance[field][source] += 1
        print("=== Phase 3 polish provenance stats ===")
        print(f"Total species: {len(catalog)}")
        for field, sources in sorted(field_provenance.items()):
            total = sum(sources.values())
            print(f"\n{field} ({total} entries):")
            for src, count in sorted(sources.items(), key=lambda x: -x[1]):
                pct = 100.0 * count / total if total else 0
                print(f"  {src}: {count} ({pct:.1f}%)")
        return 0

    # Filter by source if specified
    filtered = catalog
    if args.source:
        filtered = [e for e in filtered if e.get("source") == args.source]

    # Filter by field + provenance
    if args.field:
        result = []
        for entry in filtered:
            prov = entry.get("_provenance", {})
            field_prov = prov.get(args.field, "")
            if args.filter == "all":
                match = args.field in prov
            elif args.filter == "heuristic":
                match = "heuristic" in field_prov
            elif args.filter == "needs-master-dd":
                match = field_prov == "needs-master-dd"
            elif args.filter == "default":
                match = "default" in field_prov
            else:
                match = field_prov == args.filter
            if match:
                result.append(entry)
        print(f"=== {len(result)} species matching field={args.field} filter={args.filter} ===\n")
        for entry in result[: args.limit]:
            sid = entry.get("species_id")
            val = entry.get(args.field)
            # Handle nested field path (interactions.predates_on)
            if "." in args.field:
                parts = args.field.split(".")
                val = entry.get(parts[0], {}).get(parts[1])
            print(f"--- {sid} ({entry.get('source')}) ---")
            print(f"  {args.field}: {val}")
            print(f"  _provenance.{args.field}: {entry['_provenance'].get(args.field)}")
            print()
    else:
        print("Use --stats or --field <name>. See --help.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
