#!/usr/bin/env python3
"""Seed lifecycle YAML stubs per le 44 species senza lifecycle.
# DEPRECATED 2026-05-15 (ADR-2026-05-15 Phase 4c.5 partial migration):
# Reads legacy data/core/species.yaml + species_expansion.yaml. Canonical SOT
# moved to data/core/species/species_catalog.json (catalog v0.4.x). Full
# migration via tools/py/lib/species_loader.py pending master-dd Phase 4c.6
# sprint dedicato (file removal). Tool may break post Phase 4c.6 git rm —
# refactor required to consume catalog.
# See: docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md

Source: docs/reports/2026-04-26-deep-analysis-creature.md GAP-1
P0 deep-analysis residual gap: 44/45 species senza lifecycle YAML.
Sprint 2 §IV (autonomous plan 2026-04-27).

Genera 1 stub minimal per ogni species (5 phase: hatchling/juvenile/mature/apex/legacy)
con biome_affinity_per_stage canonicale (Subnautica pattern).

Usage:
    python tools/py/seed_lifecycle_stubs.py [--dry-run]

Skip species già presenti (e.g. dune_stalker_lifecycle.yaml).
Output: data/core/species/<species_id>_lifecycle.yaml stub (status: stub).
"""

import argparse
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml", file=sys.stderr)
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[2]
SPECIES_DIR = ROOT / "data" / "core" / "species"
SPECIES_INDEX = ROOT / "data" / "core" / "species.yaml"


# Canonical biome affinity per phase (Subnautica pattern, customizable per species).
# Defaults derive from species's primary_biome se presente in species.yaml.
DEFAULT_BIOME_PROGRESSION = {
    "hatchling": "savana",  # safe entry biome
    "juvenile": "deserto",  # exploration phase
    "mature": "caverna",  # combat-tested phase
    "apex": "any",  # free roam
    "legacy": "any",  # legacy free
}


def load_species_index():
    """Load species.yaml — supports both dict (legacy) and list (canonical) formats.

    Canonical format (data/core/species.yaml): species: [{id, biome_affinity, display_name_it, ...}, ...]
    Legacy dict format: species: {species_id: {primary_biome, name_it, ...}}
    Returns dict {species_id: meta} normalized.
    """
    if not SPECIES_INDEX.is_file():
        return {}
    with SPECIES_INDEX.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    raw = (data or {}).get("species", {})
    if isinstance(raw, list):
        # Canonical: list of {id, biome_affinity, display_name_it, ...}
        normalized = {}
        for entry in raw:
            if not isinstance(entry, dict):
                continue
            sid = entry.get("id")
            if not sid:
                continue
            normalized[sid] = {
                "primary_biome": entry.get("biome_affinity") or entry.get("primary_biome"),
                "name_it": entry.get("display_name_it") or entry.get("display_name"),
            }
        return normalized
    return raw or {}


def species_has_lifecycle(species_id: str) -> bool:
    candidates = [
        SPECIES_DIR / f"{species_id}_lifecycle.yaml",
        SPECIES_DIR / f"{species_id}.yaml",
    ]
    for c in candidates:
        if c.is_file():
            try:
                with c.open(encoding="utf-8") as fh:
                    data = yaml.safe_load(fh)
                if isinstance(data, dict) and "phases" in data:
                    return True
            except yaml.YAMLError:
                continue
    return False


def make_stub(species_id: str, species_meta: dict) -> dict:
    primary_biome = species_meta.get("primary_biome") or "savana"
    name_it = species_meta.get("name_it") or species_id.replace("_", " ").title()
    affinity_map = DEFAULT_BIOME_PROGRESSION.copy()
    # Override mature with primary_biome (where species lives "naturally").
    affinity_map["mature"] = primary_biome
    return {
        "species_id": species_id,
        "label_it": name_it,
        "doc_status": "stub",
        "doc_owner": "auto-seeded",
        "last_verified": "2026-04-27",
        "language": "it",
        "biome_affinity_per_stage": affinity_map,
        "phases": {
            "hatchling": {
                "id": "hatchling",
                "label_it": f"Cucciolo {name_it}",
                "level_range": [1, 1],
                "mutations_required": 0,
                "thoughts_internalized_required": 0,
                "mbti_polarity_required": False,
            },
            "juvenile": {
                "id": "juvenile",
                "label_it": f"Giovane {name_it}",
                "level_range": [2, 4],
                "mutations_required": 1,
                "thoughts_internalized_required": 0,
                "mbti_polarity_required": False,
            },
            "mature": {
                "id": "mature",
                "label_it": f"{name_it} maturo",
                "level_range": [5, 9],
                "mutations_required": 2,
                "thoughts_internalized_required": 1,
                "mbti_polarity_required": True,
            },
            "apex": {
                "id": "apex",
                "label_it": f"{name_it} apicale",
                "level_range": [10, 14],
                "mutations_required": 4,
                "thoughts_internalized_required": 2,
                "mbti_polarity_required": True,
            },
            "legacy": {
                "id": "legacy",
                "label_it": f"{name_it} legacy",
                "level_range": [15, 99],
                "mutations_required": 5,
                "thoughts_internalized_required": 3,
                "mbti_polarity_required": True,
            },
        },
        "_notes": [
            "Auto-seeded stub via tools/py/seed_lifecycle_stubs.py (Sprint 2 §IV).",
            "Customizza per species reale: aspect_token, sprite_ascii, tactical_signature,",
            "diary_milestone_event per phase. Cf dune_stalker_lifecycle.yaml come template.",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="show would-create without writing")
    ap.add_argument("--limit", type=int, default=0, help="limit number of stubs (0 = all)")
    args = ap.parse_args()

    species = load_species_index()
    if not species:
        print("WARN: species.yaml index empty or missing", file=sys.stderr)
        return 1

    SPECIES_DIR.mkdir(parents=True, exist_ok=True)
    created = 0
    skipped = 0
    for sid, meta in species.items():
        if species_has_lifecycle(sid):
            skipped += 1
            continue
        stub = make_stub(sid, meta if isinstance(meta, dict) else {})
        out_path = SPECIES_DIR / f"{sid}_lifecycle.yaml"
        if args.dry_run:
            print(f"[DRY-RUN] would create: {out_path.relative_to(ROOT)}")
        else:
            with out_path.open("w", encoding="utf-8") as fh:
                yaml.safe_dump(stub, fh, allow_unicode=True, sort_keys=False, indent=2)
            print(f"  CREATED: {out_path.relative_to(ROOT)}")
        created += 1
        if args.limit and created >= args.limit:
            break

    print()
    print(f"Total: {created} stub created, {skipped} skipped (already present).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
