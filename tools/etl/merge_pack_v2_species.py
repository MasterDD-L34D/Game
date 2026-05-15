#!/usr/bin/env python3
"""ETL: merge Pack v2-full-plus species catalog into Game/ canonical.

OD-031 (pack drift merge) + OD-027 (full Species type) + OD-024 (sentience full
45/45 — wave A: 10 Pack v2 species with sentience_index already assigned).

Input:
    Pack v2-full-plus species_catalog.json (vault Sources/raw or local path)
    Game/ canonical lifecycle YAML stubs (data/core/species/*_lifecycle.yaml)

Output:
    data/core/species/species_catalog.json (consolidated source-of-truth JSON,
        15 species with full Pack v2-plus metadata merged where available,
        sentience_index assigned per RFC sentience v0.1 mapping):
        - Pack v2-plus species (10): sentience_index from source JSON (T1-T3)
        - Frattura Abissale (4): T1 (animal types per RFC mapping)
        - dune_stalker (1): T2 (pre-sociale per signature)

Schema (consolidated JSON entry):
    {
        "species_id": "elastovaranus_hydrus",
        "scientific_name": "Elastovaranus hydrus",
        "common_names": [...],
        "classification": {"macro_class": ..., "habitat": ...},
        "functional_signature": "...",
        "visual_description": "...",
        "risk_profile": {"danger_level": int, "vectors": [...]},
        "interactions": {"predates_on": [...], "predated_by": [...], "symbiosis": str},
        "constraints": [...],
        "sentience_index": "T1"|...|"T6",
        "ecotypes": [...],
        "trait_refs": [...],
        "lifecycle_yaml": "data/core/species/<id>_lifecycle.yaml",
        "source": "pack-v2-full-plus" | "frattura-abissale" | "game-canonical-stub",
        "merged_at": "2026-05-14"
    }

Usage:
    python tools/etl/merge_pack_v2_species.py \\
        --pack-v2 <path-to-species_catalog.json> \\
        --out data/core/species/species_catalog.json

ai-station Envelope B — additive merge, no destructive overwrite of lifecycle
YAML. Lifecycle YAML stays canonical for phases/level_range/mutations_required;
JSON catalog is the metadata superset (Pack v2-plus fields + sentience_index).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

# Sentience tier defaults for non-Pack-v2 species (RFC v0.1 heuristic mapping).
# Animal types → T1 (Proto-Sentiente, reattivo).
# Skiv/Custode pre-canonical → T3 (Emergente).
# Senzienti rare → T5+.
NON_PACK_DEFAULTS = {
    # Frattura Abissale 4 — animal types tier T1 baseline per RFC.
    'leviatano_risonante': 'T2',  # uses sonar (signature → pre-sociale)
    'polpo_araldo_sinaptico': 'T3',  # neural relay → emergente
    'sciame_larve_neurali': 'T2',  # swarm signaling → pre-sociale
    'simbionte_corallino_riflesso': 'T1',  # reflex symbiont → proto-sentiente
    # Game canonical stub.
    'dune_stalker': 'T2',  # pre-sociale stalker per signature
}


def parse_args():
    p = argparse.ArgumentParser(description='Merge Pack v2-full-plus species into Game/ canonical JSON.')
    p.add_argument('--pack-v2', required=True, help='Path to Pack v2 species_catalog.json')
    p.add_argument('--lifecycle-dir', default='data/core/species', help='Game/ lifecycle YAML directory')
    p.add_argument('--out', required=True, help='Output consolidated species_catalog.json')
    # ADR-2026-05-15 Phase 1 — absorb legacy YAML residue species (38 species).
    p.add_argument('--species-yaml', default='data/core/species.yaml', help='Legacy species.yaml absorb path')
    p.add_argument('--expansion-yaml', default='data/core/species_expansion.yaml', help='Legacy species_expansion.yaml absorb path')
    return p.parse_args()


def scientific_to_id(scientific_name: str) -> str:
    return scientific_name.lower().replace(' ', '_').replace('-', '_')


def load_pack_v2(path: Path) -> dict[str, dict]:
    data = json.loads(path.read_text(encoding='utf-8'))
    indexed = {}
    for entry in data.get('catalog', []):
        sid = scientific_to_id(entry['scientific_name'])
        indexed[sid] = entry
    return indexed


def list_lifecycle_species(lifecycle_dir: Path) -> list[str]:
    if not lifecycle_dir.exists():
        return []
    return sorted(
        p.stem.replace('_lifecycle', '')
        for p in lifecycle_dir.glob('*_lifecycle.yaml')
    )


def _max_tier(*tiers: str) -> str:
    """Return highest tier among non-null T<n> values (T0 < T1 < ... < T6).

    ADR-2026-05-15 Phase 1 — preserve legacy sentience_tier when more refined
    than pack v2 default (es. T5 rare-sentience species incorrectly defaulted
    to T1 in pack v2 source).
    """
    valid = [t for t in tiers if isinstance(t, str) and len(t) == 2 and t[0] == 'T' and t[1].isdigit()]
    if not valid:
        return 'T1'
    return max(valid, key=lambda t: int(t[1]))


def build_entry(species_id: str, pack: dict | None, legacy: dict | None = None) -> dict:
    today = date.today().isoformat()
    if pack is not None:
        # Full Pack v2-plus metadata merge. Legacy sentience override when higher.
        pack_tier = pack.get('sentience_index', 'T1')
        legacy_tier = legacy.get('sentience_tier') if legacy else None
        sentience = _max_tier(pack_tier, legacy_tier) if legacy_tier else pack_tier
        # Preserve source label when re-merging from previous output (backup
        # input). Default 'pack-v2-full-plus' for fresh Pack v2 source.
        source = pack.get('source', 'pack-v2-full-plus')
        return {
            'species_id': species_id,
            'scientific_name': pack.get('scientific_name', species_id.replace('_', ' ').title()),
            'common_names': pack.get('common_names', []),
            'classification': pack.get('classification', {}),
            'functional_signature': pack.get('functional_signature', ''),
            'visual_description': pack.get('visual_description', ''),
            'risk_profile': pack.get('risk_profile', {'danger_level': 1, 'vectors': []}),
            'interactions': pack.get('interactions', {}),
            'constraints': pack.get('constraints', []),
            'sentience_index': sentience,
            'ecotypes': pack.get('ecotypes', []),
            'trait_refs': pack.get('trait_refs', []),
            'lifecycle_yaml': f'data/core/species/{species_id}_lifecycle.yaml',
            'source': source,
            'merged_at': today,
        }
    # Stub for species missing from Pack v2 (Frattura Abissale + dune_stalker).
    return {
        'species_id': species_id,
        'scientific_name': species_id.replace('_', ' ').title(),
        'common_names': [],
        'classification': {'macro_class': 'unknown', 'habitat': 'unknown'},
        'functional_signature': '',
        'visual_description': '',
        'risk_profile': {'danger_level': 1, 'vectors': []},
        'interactions': {'predates_on': [], 'predated_by': [], 'symbiosis': 'nessuna'},
        'constraints': [],
        'sentience_index': NON_PACK_DEFAULTS.get(species_id, 'T1'),
        'ecotypes': [],
        'trait_refs': [],
        'lifecycle_yaml': f'data/core/species/{species_id}_lifecycle.yaml',
        'source': 'game-canonical-stub',
        'merged_at': today,
    }


def load_legacy_yaml(species_yaml: Path, expansion_yaml: Path) -> dict[str, dict]:
    """Load legacy species data from species.yaml + species_expansion.yaml.

    ADR-2026-05-15 Phase 1 — absorb 38 residue species into species_catalog.json.
    Returns dict[species_id, legacy_entry_dict] across both files.
    """
    try:
        import yaml
    except ImportError:
        print('WARN: PyYAML not installed — legacy YAML absorb skipped', file=sys.stderr)
        return {}

    legacy = {}
    if species_yaml.exists():
        data = yaml.safe_load(species_yaml.read_text(encoding='utf-8'))
        for entry in data.get('species', []):
            sid = entry.get('id')
            if sid:
                legacy[sid] = entry
    if expansion_yaml.exists():
        data = yaml.safe_load(expansion_yaml.read_text(encoding='utf-8'))
        for entry in data.get('species_examples', []):
            sid = entry.get('id')
            if sid and sid not in legacy:
                legacy[sid] = entry
    return legacy


def build_entry_from_legacy(species_id: str, legacy: dict) -> dict:
    """Build catalog entry from legacy species.yaml/expansion.yaml entry.

    ADR-2026-05-15 Phase 1 — heuristic field population from legacy schema:
    - scientific_name = "<genus> <epithet>" (titlecase)
    - sentience_index = legacy.sentience_tier (already mirrored via TKT-ECO-A4-residue)
    - common_names = [legacy.display_name_it] (single-element list fallback)
    - classification = derived from clade_tag + preferred_biomes if available
    - trait_refs = derived from trait_plan field (if present)
    - ecotypes = derived from role_tags (if present)
    - rich fields (visual_description, risk_profile, interactions) = empty
      pending Phase 3 master-dd review.
    """
    today = date.today().isoformat()
    genus = legacy.get('genus', '')
    epithet = legacy.get('epithet', '')
    if genus and epithet:
        scientific = f'{genus.capitalize()} {epithet.lower()}'
    else:
        scientific = species_id.replace('_', ' ').title()

    display_it = legacy.get('display_name_it', '')
    common_names = [display_it] if display_it else []

    clade_tag = legacy.get('clade_tag', '')
    preferred_biomes = legacy.get('preferred_biomes', [])
    classification = {
        'macro_class': clade_tag if clade_tag else 'unknown',
        'habitat': preferred_biomes[0] if preferred_biomes else 'unknown',
    }

    # trait_refs from trait_plan if present.
    # Schema: trait_plan può essere list[str|dict] OR dict {core, optional, synergies, ...}
    trait_plan = legacy.get('trait_plan', [])
    trait_refs = []
    if isinstance(trait_plan, list):
        for tp in trait_plan:
            if isinstance(tp, str):
                trait_refs.append(tp)
            elif isinstance(tp, dict) and 'trait_id' in tp:
                trait_refs.append(tp['trait_id'])
    elif isinstance(trait_plan, dict):
        # Canonical species.yaml schema: trait_plan = {core: [...], optional: [...], synergies: [...]}
        for key in ('core', 'optional', 'synergies'):
            section = trait_plan.get(key, [])
            if isinstance(section, list):
                trait_refs.extend(t for t in section if isinstance(t, str))

    # ecotypes from role_tags (defensive).
    role_tags = legacy.get('role_tags', [])
    ecotypes = role_tags if isinstance(role_tags, list) else []

    sentience = legacy.get('sentience_index') or legacy.get('sentience_tier') or 'T1'

    return {
        'species_id': species_id,
        'scientific_name': scientific,
        'common_names': common_names,
        'classification': classification,
        'functional_signature': '',  # Phase 3 master-dd fill
        'visual_description': '',  # Phase 3 master-dd fill
        'risk_profile': {'danger_level': 1, 'vectors': []},  # Phase 3 master-dd fill
        'interactions': {'predates_on': [], 'predated_by': [], 'symbiosis': 'nessuna'},  # Phase 3
        'constraints': [],  # Phase 3 master-dd fill
        'sentience_index': sentience,
        'ecotypes': ecotypes,
        'trait_refs': trait_refs,
        'lifecycle_yaml': None,  # legacy species without lifecycle YAML
        'source': 'legacy-yaml-merge',
        'merged_at': today,
    }


def main():
    args = parse_args()
    pack_path = Path(args.pack_v2)
    lifecycle_dir = Path(args.lifecycle_dir)
    out_path = Path(args.out)
    species_yaml = Path(args.species_yaml) if hasattr(args, 'species_yaml') and args.species_yaml else None
    expansion_yaml = Path(args.expansion_yaml) if hasattr(args, 'expansion_yaml') and args.expansion_yaml else None

    if not pack_path.exists():
        print(f'ERROR: Pack v2 catalog not found: {pack_path}', file=sys.stderr)
        return 2

    pack_index = load_pack_v2(pack_path)
    lifecycle_ids = list_lifecycle_species(lifecycle_dir)

    print(f'[merge] Pack v2 species: {len(pack_index)}')
    print(f'[merge] Game/ lifecycle species: {len(lifecycle_ids)}')

    # ADR-2026-05-15 Phase 1 — pre-load legacy YAML for sentience override + residue absorb.
    legacy_index = {}
    if species_yaml and expansion_yaml:
        legacy_index = load_legacy_yaml(species_yaml, expansion_yaml)
        print(f'[merge] Legacy YAML species: {len(legacy_index)}')

    merged = []
    seen_ids = set()
    for species_id in lifecycle_ids:
        pack_entry = pack_index.get(species_id)
        legacy_entry = legacy_index.get(species_id)
        entry = build_entry(species_id, pack_entry, legacy=legacy_entry)
        merged.append(entry)
        seen_ids.add(species_id)

    # ADR-2026-05-15 Phase 1 — absorb legacy YAML residue species (38 species without lifecycle YAML).
    legacy_added = 0
    if legacy_index:
        for sid, legacy_entry in legacy_index.items():
            if sid in seen_ids:
                continue  # already covered by lifecycle (same species, legacy override applied)
            entry = build_entry_from_legacy(sid, legacy_entry)
            merged.append(entry)
            seen_ids.add(sid)
            legacy_added += 1
        print(f'[merge] Legacy residue absorbed: {legacy_added}')

    # Stats
    by_source = {}
    by_tier = {}
    for entry in merged:
        by_source[entry['source']] = by_source.get(entry['source'], 0) + 1
        by_tier[entry['sentience_index']] = by_tier.get(entry['sentience_index'], 0) + 1

    output = {
        'version': '0.3.0',
        'merged_at': date.today().isoformat(),
        'source_provenance': {
            'pack_v2_full_plus': str(pack_path),
            'game_canonical_lifecycle': str(lifecycle_dir),
            'legacy_yaml_species': str(species_yaml) if species_yaml else None,
            'legacy_yaml_expansion': str(expansion_yaml) if expansion_yaml else None,
        },
        'sentience_assignment_method': {
            'pack_v2_plus_source': 'sentience_index field verbatim',
            'non_pack_species': 'RFC v0.1 heuristic mapping (animal→T1, pre-sociale→T2, emergente→T3)',
            'legacy_yaml_residue': 'sentience_tier mirror via TKT-ECO-A4-residue (PR #2271)',
        },
        'stats': {
            'total_species': len(merged),
            'by_source': by_source,
            'by_sentience_tier': by_tier,
        },
        'catalog': merged,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    print(f'[merge] Output: {out_path}')
    print(f'[merge] Stats:')
    print(f'  by_source: {by_source}')
    print(f'  by_sentience_tier: {dict(sorted(by_tier.items()))}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
