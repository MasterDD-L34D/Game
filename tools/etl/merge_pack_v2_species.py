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


def build_entry(species_id: str, pack: dict | None) -> dict:
    today = date.today().isoformat()
    if pack is not None:
        # Full Pack v2-plus metadata merge.
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
            'sentience_index': pack.get('sentience_index', 'T1'),
            'ecotypes': pack.get('ecotypes', []),
            'trait_refs': pack.get('trait_refs', []),
            'lifecycle_yaml': f'data/core/species/{species_id}_lifecycle.yaml',
            'source': 'pack-v2-full-plus',
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


def main():
    args = parse_args()
    pack_path = Path(args.pack_v2)
    lifecycle_dir = Path(args.lifecycle_dir)
    out_path = Path(args.out)

    if not pack_path.exists():
        print(f'ERROR: Pack v2 catalog not found: {pack_path}', file=sys.stderr)
        return 2

    pack_index = load_pack_v2(pack_path)
    lifecycle_ids = list_lifecycle_species(lifecycle_dir)

    print(f'[merge] Pack v2 species: {len(pack_index)}')
    print(f'[merge] Game/ lifecycle species: {len(lifecycle_ids)}')

    merged = []
    for species_id in lifecycle_ids:
        pack_entry = pack_index.get(species_id)
        entry = build_entry(species_id, pack_entry)
        merged.append(entry)

    # Stats
    by_source = {}
    by_tier = {}
    for entry in merged:
        by_source[entry['source']] = by_source.get(entry['source'], 0) + 1
        by_tier[entry['sentience_index']] = by_tier.get(entry['sentience_index'], 0) + 1

    output = {
        'version': '0.2.0',
        'merged_at': date.today().isoformat(),
        'source_provenance': {
            'pack_v2_full_plus': str(pack_path),
            'game_canonical_lifecycle': str(lifecycle_dir),
        },
        'sentience_assignment_method': {
            'pack_v2_plus_source': 'sentience_index field verbatim',
            'non_pack_species': 'RFC v0.1 heuristic mapping (animal→T1, pre-sociale→T2, emergente→T3)',
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
