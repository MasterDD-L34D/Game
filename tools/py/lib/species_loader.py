"""Species canonical loader — Phase 4c migration helper.

ADR-2026-05-15 Q1 Option A Phase 4c (autonomous 2026-05-15):
Unified loader that prefers data/core/species/species_catalog.json (canonical
single SOT post Phase 1+2) and falls back to data/core/species.yaml +
data/core/species_expansion.yaml legacy YAML during Phase 4c.6 transition
(git rm pending Python migration completion).

Schema map catalog v0.4.x → legacy fields:
    species_id        → id
    classification    → (no direct legacy equivalent, taxonomic)
    sentience_index   → sentience_tier (legacy) | sentience_index (mirror)
    clade_tag         → clade_tag (preserved verbatim via ETL)
    role_tags         → role_tags (preserved verbatim via ETL)
    biome_affinity    → biome_affinity (preserved verbatim via ETL)
    default_parts     → default_parts (preserved verbatim via ETL)
    trait_refs        → derived from trait_plan (core+optional+synergies)
    legacy_slug       → legacy_slug (preserved verbatim via ETL)

Cross-link:
    docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md
    tools/etl/merge_pack_v2_species.py
    apps/backend/services/traitEffects.js (JS equivalent loader)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def _project_root(start: Path | None = None) -> Path:
    """Walk up from start to find project root (contains data/core/)."""
    p = (start or Path(__file__).resolve()).parent
    for _ in range(8):
        if (p / 'data' / 'core' / 'species').is_dir():
            return p
        if p.parent == p:
            break
        p = p.parent
    return Path.cwd()


def load_species_canonical(
    catalog_path: Path | None = None,
    species_yaml: Path | None = None,
    expansion_yaml: Path | None = None,
    prefer_catalog: bool = True,
) -> tuple[list[dict[str, Any]], str]:
    """Load canonical species list. Returns (species_list, source).

    Catalog entries are normalized to legacy-compatible shape:
        - 'id' field aliased from 'species_id'
        - All fields preserved as-is (sentience_tier, clade_tag, role_tags,
          biome_affinity, default_parts, etc.)
    Legacy YAML fallback used when catalog absent (Phase 4c transition).

    Args:
        catalog_path: data/core/species/species_catalog.json path
        species_yaml: data/core/species.yaml fallback path
        expansion_yaml: data/core/species_expansion.yaml fallback path
        prefer_catalog: if True, try catalog first (default)

    Returns:
        (list of normalized species dicts, source label: 'catalog' | 'legacy_yaml')
    """
    root = _project_root()
    catalog_path = catalog_path or (root / 'data' / 'core' / 'species' / 'species_catalog.json')
    species_yaml = species_yaml or (root / 'data' / 'core' / 'species.yaml')
    expansion_yaml = expansion_yaml or (root / 'data' / 'core' / 'species_expansion.yaml')

    # PRIMARY: catalog JSON (canonical post ADR-2026-05-15)
    if prefer_catalog and catalog_path.exists():
        try:
            data = json.loads(catalog_path.read_text(encoding='utf-8'))
            catalog = data.get('catalog', [])
            normalized = []
            for entry in catalog:
                sid = entry.get('species_id')
                if not sid:
                    continue
                # Alias id ← species_id for legacy code compat
                norm = dict(entry)
                norm.setdefault('id', sid)
                normalized.append(norm)
            return (normalized, 'catalog')
        except (json.JSONDecodeError, OSError) as e:
            print(f'WARN: catalog load failed ({e}), fallback YAML', file=sys.stderr)

    # FALLBACK: legacy YAML (DEPRECATED, Phase 4c.6 removal pending)
    try:
        import yaml
    except ImportError:
        print('ERROR: PyYAML required for legacy YAML fallback', file=sys.stderr)
        return ([], 'none')

    species_list: list[dict[str, Any]] = []
    seen_ids = set()
    if species_yaml.exists():
        data = yaml.safe_load(species_yaml.read_text(encoding='utf-8'))
        for entry in data.get('species', []) or []:
            sid = entry.get('id')
            if sid and sid not in seen_ids:
                species_list.append(entry)
                seen_ids.add(sid)
    if expansion_yaml.exists():
        data = yaml.safe_load(expansion_yaml.read_text(encoding='utf-8'))
        for entry in data.get('species_examples', []) or []:
            sid = entry.get('id')
            if sid and sid not in seen_ids:
                species_list.append(entry)
                seen_ids.add(sid)
    return (species_list, 'legacy_yaml')


def load_catalog_synergies(
    catalog_path: Path | None = None,
    species_yaml: Path | None = None,
) -> list[dict[str, Any]]:
    """Load catalog.synergies top-level array. Phase 4c canonical = catalog JSON.

    Returns empty list if neither source available.
    """
    root = _project_root()
    catalog_path = catalog_path or (root / 'data' / 'core' / 'species' / 'species_catalog.json')
    species_yaml = species_yaml or (root / 'data' / 'core' / 'species.yaml')

    if catalog_path.exists():
        try:
            data = json.loads(catalog_path.read_text(encoding='utf-8'))
            return data.get('catalog_synergies', []) or []
        except (json.JSONDecodeError, OSError):
            pass

    # FALLBACK
    try:
        import yaml
    except ImportError:
        return []
    if species_yaml.exists():
        data = yaml.safe_load(species_yaml.read_text(encoding='utf-8'))
        return (data.get('catalog', {}) or {}).get('synergies', []) or []
    return []
