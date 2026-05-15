#!/usr/bin/env python3
"""Phase 3 Path Quick — heuristic enrichment per legacy-yaml-merge species.

ADR-2026-05-15 Q1 Option A Phase 3 (autonomous Path Quick):
Fill 4 heuristic fields per 38 legacy-yaml-merge entries in species_catalog.json:

1. functional_signature — derived from clade_tag + trait_plan summary
2. risk_profile.danger_level — derived from sentience_index + offensive trait count
3. risk_profile.vectors — derived from trait_plan offensive trait mapping
4. interactions.predates_on + predated_by — derived from foodweb edges cross-lookup

Master-dd review pending (Phase 3 polish):
- visual_description (narrative scope)
- interactions.symbiosis (narrative scope)
- constraints (design scope)

Usage:
    python3 tools/etl/enrich_species_heuristic.py \\
        --catalog data/core/species/species_catalog.json \\
        --foodwebs-dir packs/evo_tactics_pack/data/foodwebs \\
        --in-place

Cross-link: docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    print('ERROR: PyYAML required for foodweb parsing', file=sys.stderr)
    sys.exit(2)

# Trait → danger vector mapping (heuristic, master-dd review-able).
# Maps trait_id substring patterns to specific danger vector labels.
TRAIT_VECTOR_MAP = {
    # Offensive physical
    'artigli': 'graffi',
    'zanne': 'morsi',
    'corna': 'cariche',
    'pungiglione': 'puntura',
    'tentacoli': 'presa',
    'becco': 'beccate',
    # Elemental/chemical
    'elettr': 'scariche elettriche',
    'fuoco': 'ustioni termiche',
    'gelo': 'shock criogenico',
    'acid': 'ustioni acide',
    'velen': 'tossine paralizzanti',
    'tossi': 'tossine',
    'gas': 'gas tossico',
    'fumo': 'fumo soffocante',
    'spore': 'spore patogene',
    'nebbia': 'nebbia disorientante',
    # Sensory/control
    'psion': 'attacco psionico',
    'eco': 'shock sonico',
    'sonor': 'shock sonico',
    'ipnos': 'ipnosi',
    'panic': 'panico contagioso',
    # Defensive
    'corazz': 'controattacco',
    'spine': 'spine difensive',
    # Magnetic/exotic
    'magnet': 'pulse magnetico',
    'gravit': 'gravità distorta',
    'radiaz': 'radiazione',
}

# Sentience tier → base danger level (T0=1, T6=5 — log-scaled).
SENTIENCE_DANGER_BASE = {
    'T0': 1,
    'T1': 1,
    'T2': 2,
    'T3': 2,
    'T4': 3,
    'T5': 4,
    'T6': 5,
}

# Clade tag → functional signature template fragment.
CLADE_FUNCTION_HINTS = {
    'predator': 'caccia attiva con',
    'predator_apex': 'predatore apicale con',
    'predator_ambush': 'cacciatore in agguato con',
    'predator_pack': 'predatore di branco con',
    'herbivore': 'foraggiamento erbivoro con',
    'grazer': 'pascolatore con',
    'omnivore': 'opportunista onnivoro con',
    'scavenger': 'spazzino con',
    'decomposer': 'decompositore con',
    'symbiote': 'simbionte con',
    'parasite': 'parassita con',
    'detritivore': 'detritivoro con',
    'piscivore': 'pescivoro con',
    'insectivore': 'insettivoro con',
}


def parse_args():
    p = argparse.ArgumentParser(description='Enrich species_catalog.json with heuristic fields.')
    p.add_argument('--catalog', required=True, help='Path to species_catalog.json')
    p.add_argument(
        '--foodwebs-dir',
        default='packs/evo_tactics_pack/data/foodwebs',
        help='Foodweb YAML directory',
    )
    p.add_argument('--in-place', action='store_true', help='Write back to catalog path')
    p.add_argument('--out', help='Output path (if not --in-place)')
    return p.parse_args()


def load_foodweb_index(foodwebs_dir: Path) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Build predator-prey index from all foodweb YAML files.

    Returns:
        predates_on_index: dict[species_id, list[prey_ids]] — species hunts these
        predated_by_index: dict[species_id, list[predator_ids]] — these hunt species
    """
    predates_on: dict[str, set[str]] = {}
    predated_by: dict[str, set[str]] = {}

    if not foodwebs_dir.is_dir():
        print(f'WARN: foodwebs dir not found: {foodwebs_dir}', file=sys.stderr)
        return ({}, {})

    for fw_path in sorted(foodwebs_dir.glob('*_foodweb.yaml')):
        try:
            data = yaml.safe_load(fw_path.read_text(encoding='utf-8'))
        except yaml.YAMLError as e:
            print(f'WARN: skip {fw_path.name} parse error: {e}', file=sys.stderr)
            continue

        # Build node alias map (id + legacy_slug → canonical species_id).
        alias_to_canonical = {}
        for node in data.get('nodes', []):
            if node.get('kind') != 'species':
                continue
            nid = node.get('id') or node.get('node_id')
            legacy = node.get('legacy_slug')
            canonical = legacy or nid
            if canonical:
                # Normalize: hyphen → underscore for catalog matching
                canonical = canonical.replace('-', '_')
                if nid:
                    alias_to_canonical[nid] = canonical
                if legacy:
                    alias_to_canonical[legacy] = canonical
                    alias_to_canonical[legacy.replace('-', '_')] = canonical

        # Process edges: from -> to (prey → predator).
        for edge in data.get('edges', []):
            edge_type = edge.get('type', '')
            # Filter: include predation/herbivory/grazing/scavenging/parasitism.
            if edge_type not in (
                'predation',
                'herbivory',
                'grazing',
                'scavenging',
                'parasitism',
                'predates',
                'consumes',
            ):
                continue
            prey_raw = edge.get('from', '')
            pred_raw = edge.get('to', '')
            prey = alias_to_canonical.get(prey_raw, prey_raw.replace('-', '_'))
            pred = alias_to_canonical.get(pred_raw, pred_raw.replace('-', '_'))
            # Only track if both are species (not resources).
            if prey in alias_to_canonical.values() and pred in alias_to_canonical.values():
                predates_on.setdefault(pred, set()).add(prey)
                predated_by.setdefault(prey, set()).add(pred)
            elif pred in alias_to_canonical.values():
                # Predator hunts non-species resource — include in predates_on with raw label.
                predates_on.setdefault(pred, set()).add(prey)

    # Convert sets to sorted lists.
    return (
        {k: sorted(v) for k, v in predates_on.items()},
        {k: sorted(v) for k, v in predated_by.items()},
    )


def derive_functional_signature(entry: dict) -> str:
    """Heuristic: combine clade_tag + top 2 trait_refs into 1-line description.

    Example output: "Predatore apicale con artigli_sette_vie + scarica_elettrica."
    """
    clade = entry.get('classification', {}).get('macro_class', '')
    traits = entry.get('trait_refs', [])
    hint = CLADE_FUNCTION_HINTS.get(clade, f'specie {clade} con' if clade else 'specie con')
    if not traits:
        return f'{hint.capitalize()} adattamenti non specificati.'
    # Pick top 2 traits (shortest names = often most distinctive).
    top_traits = traits[:2]
    trait_str = ' + '.join(top_traits)
    return f'{hint.capitalize()} {trait_str}.'


def derive_danger_level(entry: dict) -> int:
    """Heuristic: base from sentience tier + offensive trait count modifier."""
    tier = entry.get('sentience_index', 'T1')
    base = SENTIENCE_DANGER_BASE.get(tier, 1)
    traits = entry.get('trait_refs', [])
    # Count offensive-vector traits (overlap with TRAIT_VECTOR_MAP).
    offensive_count = sum(
        1 for t in traits if any(k in t.lower() for k in TRAIT_VECTOR_MAP)
    )
    # +1 if ≥3 offensive traits, +2 if ≥5.
    mod = 0
    if offensive_count >= 5:
        mod = 2
    elif offensive_count >= 3:
        mod = 1
    return min(5, base + mod)


def derive_vectors(entry: dict) -> list[str]:
    """Heuristic: map trait_refs → danger vectors via TRAIT_VECTOR_MAP."""
    traits = entry.get('trait_refs', [])
    vectors: set[str] = set()
    for trait in traits:
        tlower = trait.lower()
        for pattern, vector in TRAIT_VECTOR_MAP.items():
            if pattern in tlower:
                vectors.add(vector)
    return sorted(vectors)


def enrich_entry(
    entry: dict,
    predates_on_index: dict,
    predated_by_index: dict,
) -> dict:
    """Apply 4 heuristic fills to a legacy-yaml-merge entry (idempotent)."""
    if entry.get('source') != 'legacy-yaml-merge':
        return entry  # Skip non-legacy entries

    species_id = entry['species_id']

    # 1. functional_signature
    if not entry.get('functional_signature'):
        entry['functional_signature'] = derive_functional_signature(entry)

    # 2 + 3. risk_profile
    risk = entry.get('risk_profile', {})
    if risk.get('danger_level', 1) == 1 and not risk.get('vectors'):
        new_level = derive_danger_level(entry)
        new_vectors = derive_vectors(entry)
        entry['risk_profile'] = {
            'danger_level': new_level,
            'vectors': new_vectors,
        }

    # 4. interactions.predates_on + predated_by
    interactions = entry.get('interactions', {})
    if not interactions.get('predates_on') and species_id in predates_on_index:
        interactions['predates_on'] = predates_on_index[species_id]
    if not interactions.get('predated_by') and species_id in predated_by_index:
        interactions['predated_by'] = predated_by_index[species_id]
    entry['interactions'] = interactions

    # Bump merged_at
    entry['merged_at'] = date.today().isoformat()
    return entry


def main():
    args = parse_args()
    catalog_path = Path(args.catalog)
    foodwebs_dir = Path(args.foodwebs_dir)

    if not catalog_path.exists():
        print(f'ERROR: catalog not found: {catalog_path}', file=sys.stderr)
        return 2

    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))

    predates_on_index, predated_by_index = load_foodweb_index(foodwebs_dir)
    print(f'[enrich] foodweb predates_on entries: {len(predates_on_index)}')
    print(f'[enrich] foodweb predated_by entries: {len(predated_by_index)}')

    enriched_count = 0
    interactions_filled = 0
    for entry in catalog.get('catalog', []):
        if entry.get('source') != 'legacy-yaml-merge':
            continue
        sid = entry['species_id']
        before_interactions = bool(
            entry.get('interactions', {}).get('predates_on') or entry.get('interactions', {}).get('predated_by')
        )
        enrich_entry(entry, predates_on_index, predated_by_index)
        after_interactions = bool(
            entry.get('interactions', {}).get('predates_on') or entry.get('interactions', {}).get('predated_by')
        )
        if not before_interactions and after_interactions:
            interactions_filled += 1
        enriched_count += 1

    print(f'[enrich] legacy-yaml-merge entries enriched: {enriched_count}')
    print(f'[enrich] interactions filled from foodweb: {interactions_filled}')

    # Bump version
    catalog['version'] = '0.3.1'
    catalog['merged_at'] = date.today().isoformat()
    if 'sentience_assignment_method' not in catalog:
        catalog['sentience_assignment_method'] = {}
    catalog['sentience_assignment_method']['phase_3_heuristic'] = (
        'ADR-2026-05-15 Phase 3 Path Quick: functional_signature + risk_profile '
        '+ interactions filled from clade_tag + trait_plan + foodweb cross-lookup. '
        'visual_description + symbiosis + constraints pending master-dd review.'
    )

    out_path = catalog_path if args.in_place else (Path(args.out) if args.out else catalog_path)
    out_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'[enrich] Output: {out_path} (version: {catalog["version"]})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
