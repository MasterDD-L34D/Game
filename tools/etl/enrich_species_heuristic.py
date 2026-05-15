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

# ADR-2026-05-15 Phase 3 Path D HYBRID — Pattern A (Caves of Qud tag-driven):
# default_parts slot.part → italian sensory phrase (template engine).
PART_PHRASE_MAP = {
    # locomotion
    'locomotion.burrower': 'movimento sotterraneo silenzioso, riemerge da terreni morbidi',
    'locomotion.glider_magnetic': 'planata sospesa su correnti magnetiche, virate fluide',
    'locomotion.swimmer': 'nuoto sinuoso, scia minima in acqua',
    'locomotion.climber': 'arrampicata agile su superfici verticali',
    'locomotion.legs': 'andatura quadrupede equilibrata',
    'locomotion.spring_legs': 'salti potenti improvvisi, accumulo tensione visibile',
    'locomotion.tentacle': 'avanzamento ondulato tentacolare',
    # metabolism
    'metabolism.bioelectric_field': 'campo bioelettrico permanente emanato dal corpo',
    'metabolism.sand_digest': 'metabolismo aridofilo, ingerisce sabbia mineralizzata',
    'metabolism.photosynth': 'fotosintesi cutanea, pelle traslucida',
    'metabolism.chemosynth': 'chemosintesi da composti solforosi',
    'metabolism.endotherm': 'regolazione termica interna costante',
    # offense
    'offense.electric_pulse': 'scariche elettriche concentriche dall’addome',
    'offense.sand_claws': 'artigli abrasivi induriti da silice',
    'offense.acid_spray': 'getto acido a parabola corta',
    'offense.venom_fangs': 'zanne canalizzate con sacche venefere',
    'offense.psionic_bolt': 'impulso psionico mirato',
    'offense.sonic_blast': 'colpo sonico modulato a bassa frequenza',
    # defense
    'defense.heat_scales': 'squame riflettenti il calore, dorso lucente',
    'defense.bipolar_skin': 'pelle bipolare che dissipa correnti',
    'defense.spines': 'spine ritrattili lungo il dorso',
    'defense.chitin_plate': 'placche chitinose modulari',
    'defense.regen_film': 'pellicola rigenerante visibile post-ferita',
    # senses
    'senses.echolocation': 'ecolocalizzazione attiva, click ritmici percepibili',
    'senses.thermo_vision': 'visione termica notturna',
    'senses.magnetic_olfaction': 'olfatto magnetico, sente correnti ferromagnetiche',
    'senses.tremor_sense': 'percezione vibrazionale del terreno',
    'senses.uv_sight': 'visione ultravioletta, riconosce fluorescenze',
}

# Clade tag → context fragment (combina con biome).
CLADE_PHRASE_MAP = {
    'Apex': 'Predatore apicale',
    'Threat': 'Specie minaccia',
    'Keystone': 'Specie chiave',
    'Bridge': 'Specie ponte',
    'Support': 'Specie di supporto',
    'predator': 'Predatore',
    'predator_apex': 'Predatore apicale',
    'predator_ambush': 'Cacciatore in agguato',
    'herbivore': 'Erbivoro',
    'omnivore': 'Onnivoro opportunista',
    'scavenger': 'Spazzino',
}

# Biome → ambient descriptor (template fragment).
BIOME_AMBIENT_MAP = {
    'savana': 'delle savane aperte e calde',
    'badlands': 'dei calanchi ferrosi',
    'cryosteppe': 'delle steppe glaciali',
    'foresta_temperata': 'delle foreste temperate',
    'deserto_caldo': 'del deserto torrido',
    'rovine_planari': 'delle rovine planari',
    'frattura_abissale_sinaptica': 'delle fratture abissali sinaptiche',
    'caverna': 'delle cavità sotterranee',
    'palude': 'delle paludi salmastre',
    'corallino': 'delle barriere coralline',
    'foresta_acida': 'delle foreste acide',
    'reef_luminescente': 'delle scogliere luminescenti',
    'steppe_algoritmiche': 'delle steppe algoritmiche',
    'foresta_miceliale': 'delle foreste miceliali',
    'canyons_risonanti': 'dei canyon risonanti',
    'atollo_obsidiana': "dell'atollo di obsidiana",
    'cattedrale_apex': "della cattedrale dell'Apex",
}

# ADR-2026-05-15 Phase 3 Path D — Pattern C (RimWorld mechanical constraints):
# Rule library: (predicate → constraint phrase italian).
# Each rule: (predicate_fn(entry) → bool, constraint_phrase).
CONSTRAINT_RULES = [
    # Sentience-based
    (
        lambda e: e.get('sentience_index') in ('T0', 'T1'),
        'Risponde a stimoli immediati senza tattiche multi-step',
    ),
    (
        lambda e: e.get('sentience_index') in ('T0',),
        'Comportamento riflesso, nessuna pianificazione',
    ),
    # Locomotion-based
    (
        lambda e: _get_locomotion(e) == 'burrower',
        'Inefficace su roccia compatta o pavimentazione',
    ),
    (
        lambda e: _get_locomotion(e) == 'swimmer',
        'Disidratazione fuori dall’acqua, ritirata forzata',
    ),
    (
        lambda e: _get_locomotion(e) == 'glider_magnetic',
        'Caduta brusca quando schermato da gabbie di Faraday o calanchi ferrosi neutralizzati',
    ),
    (
        lambda e: _get_locomotion(e) == 'spring_legs',
        'Salto telegrafato durante accumulo tensione visibile',
    ),
    # Offense-based vector vulnerabilities
    (
        lambda e: 'electric_pulse' in _get_offense(e),
        'Scarica inefficace in atmosfera secca priva di ionizzazione',
    ),
    (
        lambda e: 'acid_spray' in _get_offense(e),
        'Acido neutralizzato su basalto e ceramiche refrattarie',
    ),
    (
        lambda e: 'sonic_blast' in _get_offense(e),
        'Onda sonica dispersa in caverne troppo ampie',
    ),
    # Defense fragility
    (
        lambda e: 'regen_film' in _get_defense(e),
        'Pellicola rigenerante consumata da freddo intenso',
    ),
    (
        lambda e: 'heat_scales' in _get_defense(e),
        'Squame fragili su attacchi cinetici a impatto basso ma rapido',
    ),
    # Clade-based
    (
        lambda e: e.get('clade_tag') in ('Apex', 'predator_apex'),
        'Solitario territoriale, raramente in branco',
    ),
    (
        lambda e: e.get('clade_tag') in ('Keystone',),
        'Mantenere vivo: rimozione collassa intera rete trofica del bioma',
    ),
]


def _get_locomotion(entry: dict) -> str:
    dp = entry.get('default_parts') or {}
    val = dp.get('locomotion')
    if isinstance(val, str):
        return val
    if isinstance(val, list) and val:
        return str(val[0])
    return ''


def _get_offense(entry: dict) -> list:
    dp = entry.get('default_parts') or {}
    val = dp.get('offense', [])
    if isinstance(val, str):
        return [val]
    return list(val) if isinstance(val, list) else []


def _get_defense(entry: dict) -> list:
    dp = entry.get('default_parts') or {}
    val = dp.get('defense', [])
    if isinstance(val, str):
        return [val]
    return list(val) if isinstance(val, list) else []


def derive_predator_prey_heuristic(
    entry: dict,
    all_entries: list,
) -> tuple[list, list]:
    """ADR-2026-05-15 Phase 3 Path D extension — Pattern B heuristic for foodweb gap.

    When foodweb scope misses (legacy species not in 5 biome files), derive
    plausible predator-prey via clade_tag + biome_affinity heuristic:

    - Apex (clade) in biome X → predates Threat/Bridge/Support in same biome
    - Threat in biome X → predated_by Apex in biome X, predates lower-tier
    - Bridge in biome X → cross-biome predates/predated_by
    - Keystone → mutualism preferred over predation (return empty here)

    Returns (predates_on_list, predated_by_list).
    Conservative: only fill when biome_affinity present AND ≥2 same-biome species.
    """
    biome = entry.get('biome_affinity') or ''
    clade = entry.get('clade_tag') or ''
    if not biome:
        return ([], [])

    # Hierarchy: Apex > Threat > Bridge > Support (top eats lower)
    tier_rank = {'Apex': 4, 'Threat': 3, 'Bridge': 2, 'Support': 1}
    my_rank = tier_rank.get(clade, 0)

    same_biome = [
        c for c in all_entries
        if c.get('biome_affinity') == biome
        and c.get('species_id') != entry['species_id']
    ]
    if len(same_biome) < 2:
        return ([], [])

    predates_on = []
    predated_by = []
    for other in same_biome:
        other_rank = tier_rank.get(other.get('clade_tag', ''), 0)
        other_id = other.get('species_id')
        if not other_id:
            continue
        if my_rank > other_rank > 0:
            predates_on.append(other_id)
        elif other_rank > my_rank > 0:
            predated_by.append(other_id)

    # Cap 3 each per readability + signal-to-noise
    return (sorted(predates_on)[:3], sorted(predated_by)[:3])

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


def derive_visual_description(entry: dict) -> str:
    """ADR-2026-05-15 Phase 3 Path D — Pattern A (Caves of Qud tag-driven).

    Compose 2-3 sentence italian sensory description from:
    - clade_tag → opener ("Predatore apicale", "Specie ponte", etc.)
    - biome_affinity → ambient context ("delle savane aperte")
    - default_parts.{locomotion, metabolism, offense, defense, senses} →
      sensory phrases (PART_PHRASE_MAP)

    Empty string if insufficient data (master-dd polish needed).
    """
    clade = entry.get('clade_tag', '') or ''
    biome = entry.get('biome_affinity', '') or ''
    dp = entry.get('default_parts') or {}

    # Opener: clade phrase + biome ambient
    clade_phrase = CLADE_PHRASE_MAP.get(clade, '')
    biome_phrase = BIOME_AMBIENT_MAP.get(biome, '')

    parts_phrases = []
    if isinstance(dp, dict):
        for slot, val in dp.items():
            if isinstance(val, str) and val:
                key = f'{slot}.{val}'
                phrase = PART_PHRASE_MAP.get(key)
                if phrase:
                    parts_phrases.append(phrase)
            elif isinstance(val, list):
                for v in val:
                    if isinstance(v, str):
                        key = f'{slot}.{v}'
                        phrase = PART_PHRASE_MAP.get(key)
                        if phrase:
                            parts_phrases.append(phrase)

    # Compose. Insufficient data → empty (master-dd composes)
    if not clade_phrase and not biome_phrase and not parts_phrases:
        return ''

    sentences = []
    opener_bits = []
    if clade_phrase:
        opener_bits.append(clade_phrase)
    if biome_phrase:
        opener_bits.append(biome_phrase)
    if opener_bits:
        sentences.append(' '.join(opener_bits) + '.')

    if parts_phrases:
        # Cap 3 sensory phrases per readability
        capped = parts_phrases[:3]
        sentences.append(_capitalize(', '.join(capped)) + '.')

    return ' '.join(sentences)


def _capitalize(s: str) -> str:
    return s[0].upper() + s[1:] if s else s


def derive_constraints(entry: dict) -> list:
    """ADR-2026-05-15 Phase 3 Path D — Pattern C (RimWorld mechanical constraints).

    Evaluate CONSTRAINT_RULES against entry. Return constraint phrases for
    matching predicates. Idempotent (deterministic per entry data).
    """
    constraints = []
    for predicate, phrase in CONSTRAINT_RULES:
        try:
            if predicate(entry):
                constraints.append(phrase)
        except Exception:
            continue
    return constraints


def enrich_entry(
    entry: dict,
    predates_on_index: dict,
    predated_by_index: dict,
    all_entries: list | None = None,
) -> dict:
    """Apply Path D HYBRID heuristic fills to a legacy-yaml-merge entry (idempotent).

    ADR-2026-05-15 Phase 3 Path D — Pattern A+B+C unified enrichment.
    Tracks _provenance per field for master-dd review queue filter.
    """
    if entry.get('source') != 'legacy-yaml-merge':
        return entry  # Skip non-legacy entries

    species_id = entry['species_id']
    # _provenance dict tracks per-field origin ("heuristic-pattern-A|B|C" |
    # "master-dd" | "needs-review"). Anti-fabrication audit trail (museum
    # card pattern 2026-05-08 canonical).
    provenance = entry.setdefault('_provenance', {})

    # 1. functional_signature (existing heuristic)
    if not entry.get('functional_signature'):
        entry['functional_signature'] = derive_functional_signature(entry)
        provenance['functional_signature'] = 'heuristic-clade-trait'

    # 2 + 3. risk_profile
    risk = entry.get('risk_profile', {})
    if risk.get('danger_level', 1) == 1 and not risk.get('vectors'):
        new_level = derive_danger_level(entry)
        new_vectors = derive_vectors(entry)
        entry['risk_profile'] = {
            'danger_level': new_level,
            'vectors': new_vectors,
        }
        provenance['risk_profile.danger_level'] = 'heuristic-sentience-trait'
        provenance['risk_profile.vectors'] = 'heuristic-trait-vector-map'

    # 4. interactions.predates_on + predated_by (Pattern B — Dwarf Fortress foodweb projection)
    # Phase 3 Path D extension 2026-05-15: foodweb primary, clade+biome heuristic fallback.
    interactions = entry.get('interactions', {})
    if not interactions.get('predates_on') and species_id in predates_on_index:
        interactions['predates_on'] = predates_on_index[species_id]
        provenance['interactions.predates_on'] = 'heuristic-pattern-B-foodweb'
    if not interactions.get('predated_by') and species_id in predated_by_index:
        interactions['predated_by'] = predated_by_index[species_id]
        provenance['interactions.predated_by'] = 'heuristic-pattern-B-foodweb'

    # Pattern B heuristic fallback (clade+biome derivation per species fuori foodweb scope)
    if all_entries and (
        not interactions.get('predates_on') or not interactions.get('predated_by')
    ):
        h_preds_on, h_preds_by = derive_predator_prey_heuristic(entry, all_entries)
        if not interactions.get('predates_on') and h_preds_on:
            interactions['predates_on'] = h_preds_on
            provenance['interactions.predates_on'] = 'heuristic-pattern-B-clade-biome'
        if not interactions.get('predated_by') and h_preds_by:
            interactions['predated_by'] = h_preds_by
            provenance['interactions.predated_by'] = 'heuristic-pattern-B-clade-biome'

    # Final fallback: needs-master-dd se ancora vuoto
    if not interactions.get('predates_on'):
        interactions.setdefault('predates_on', [])
        provenance['interactions.predates_on'] = 'needs-master-dd'
    if not interactions.get('predated_by'):
        interactions.setdefault('predated_by', [])
        provenance['interactions.predated_by'] = 'needs-master-dd'

    # symbiosis default "nessuna" if not overridden — Pattern B inference deferred
    if not interactions.get('symbiosis') or interactions.get('symbiosis') == 'nessuna':
        # Heuristic: Keystone clade often has mutualistic relationships
        clade = entry.get('clade_tag', '')
        if clade in ('Keystone', 'Bridge'):
            interactions['symbiosis'] = 'possibili mutualismi cross-bioma (master-dd review)'
            provenance['interactions.symbiosis'] = 'heuristic-clade-keystone'
        else:
            interactions['symbiosis'] = 'nessuna'
            provenance['interactions.symbiosis'] = 'default-clade-nonkeystone'
    entry['interactions'] = interactions

    # 5. visual_description (Pattern A — Caves of Qud tag-driven)
    if not entry.get('visual_description'):
        composed = derive_visual_description(entry)
        if composed:
            entry['visual_description'] = composed
            provenance['visual_description'] = 'heuristic-pattern-A-tag-driven'
        else:
            provenance['visual_description'] = 'needs-master-dd'

    # 6. constraints (Pattern C — RimWorld mechanical rules)
    if not entry.get('constraints'):
        derived = derive_constraints(entry)
        if derived:
            entry['constraints'] = derived
            provenance['constraints'] = 'heuristic-pattern-C-mechanical'
        else:
            provenance['constraints'] = 'needs-master-dd'

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
        enrich_entry(entry, predates_on_index, predated_by_index, all_entries=catalog.get('catalog', []))
        after_interactions = bool(
            entry.get('interactions', {}).get('predates_on') or entry.get('interactions', {}).get('predated_by')
        )
        if not before_interactions and after_interactions:
            interactions_filled += 1
        enriched_count += 1

    print(f'[enrich] legacy-yaml-merge entries enriched: {enriched_count}')
    print(f'[enrich] interactions filled from foodweb: {interactions_filled}')

    # Bump version
    catalog['version'] = '0.4.1'
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
