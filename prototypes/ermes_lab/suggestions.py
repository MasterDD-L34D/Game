#!/usr/bin/env python3
"""ERMES suggestions generator (ADR-2026-05-29 sezione E, TKT-BR-07).

Consumes:
- prototypes/ermes_lab/outputs/latest_eco_pressure_report.json (multi-biome v1.0.0)
- data/traits/index.json (trait metadata)

Emits:
- reports/traits/<YYYY-MM-DD>-ermes-suggestions.json (schema 1.0.0, JSON-Patch DISCRETI).

Schema output (audit sezione 5.3 B):
{
  "schema": "ermes_trait_suggestion",
  "schema_version": "1.0.0",
  "generated_at": "...",
  "suggestions": [
    {"trait_id", "biome_id", "kind", "rationale", "evidence", "proposed_patch", "confidence"}
  ]
}
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_REPORT = REPO / 'prototypes/ermes_lab/outputs/latest_eco_pressure_report.json'
DEFAULT_INDEX = REPO / 'data/traits/index.json'
DEFAULT_OUTPUT_DIR = REPO / 'reports/traits'

TIER_LADDER = {'T1': 'T2', 'T2': 'T3', 'T3': 'T4'}


def _load(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def _next_tier(current):
    return TIER_LADDER.get(current)


def _extract_extinction_warnings(report, index):
    """Suggest tier bump per trait linked a specie con extinction_risk > 0.6."""
    out = []
    for biome_id, bdata in report.get('biomes', {}).items():
        ext = bdata.get('extinction_risk', {})
        for species_id, risk in ext.items():
            if not isinstance(risk, (int, float)) or risk <= 0.6:
                continue
            for trait_id, entry in index.get('traits', {}).items():
                sa = entry.get('species_affinity', [])
                if not any(isinstance(s, dict) and s.get('species_id') == species_id for s in sa):
                    continue
                current_tier = entry.get('tier')
                next_t = _next_tier(current_tier)
                if not next_t:
                    continue
                out.append({
                    'trait_id': trait_id,
                    'biome_id': biome_id,
                    'kind': 'extinction_risk_warning',
                    'rationale': (
                        f'High extinction risk ({risk:.2f}) on linked species {species_id} '
                        f'in biome {biome_id} -- consider tier bump.'
                    ),
                    'evidence': {
                        'eco_pressure_score': bdata.get('eco_pressure_score'),
                        'extinction_risk': risk,
                        'species_id': species_id,
                    },
                    'proposed_patch': {
                        'op': 'replace',
                        'path': '/tier',
                        'value': next_t,
                    },
                    'confidence': min(0.85, risk),
                })
    return out


def _extract_mutation_bias_matches(report, index):
    """Suggest add biome_tag where mutation_bias.X >= 0.20 + trait con keyword in metadata."""
    out = []
    keyword_map = {
        'heat_resistance': 'heat',
        'burst_mobility': 'burst',
        'efficient_metabolism': 'metabolism',
        'sensory_alertness': 'sensory',
    }
    for biome_id, bdata in report.get('biomes', {}).items():
        mb = bdata.get('mutation_bias', {})
        for bias_key, keyword in keyword_map.items():
            value = mb.get(bias_key)
            if not isinstance(value, (int, float)) or value < 0.20:
                continue
            for trait_id, entry in index.get('traits', {}).items():
                text = ' '.join([
                    str(entry.get('famiglia_tipologia', '')),
                    str(entry.get('debolezza', '')),
                    str(entry.get('spinta_selettiva', '')),
                ]).lower()
                if keyword not in text:
                    continue
                tags = entry.get('biome_tags') or []
                if biome_id in tags:
                    continue
                out.append({
                    'trait_id': trait_id,
                    'biome_id': biome_id,
                    'kind': 'mutation_bias_match',
                    'rationale': (
                        f'Bioma {biome_id} ha mutation_bias.{bias_key}={value:.2f} (high) e '
                        f'trait {trait_id} contiene keyword "{keyword}". Suggerimento: '
                        f'aggiungere biome_tag "{biome_id}" a trait.biome_tags.'
                    ),
                    'evidence': {
                        'mutation_bias_key': bias_key,
                        'mutation_bias_value': value,
                        'tag_suggested': biome_id,
                    },
                    'proposed_patch': {
                        'op': 'add',
                        'path': '/biome_tags/-',
                        'value': biome_id,
                    },
                    'confidence': min(0.6, value * 2),
                })
    return out


def generate_suggestions(report_path, index_path):
    report = _load(report_path)
    index = _load(index_path)
    suggestions = []
    suggestions.extend(_extract_extinction_warnings(report, index))
    suggestions.extend(_extract_mutation_bias_matches(report, index))
    return {
        'schema': 'ermes_trait_suggestion',
        'schema_version': '1.0.0',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'source_report': str(report_path),
        'source_index': str(index_path),
        'suggestions': suggestions,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report', default=str(DEFAULT_REPORT))
    ap.add_argument('--index', default=str(DEFAULT_INDEX))
    today = datetime.now().strftime('%Y-%m-%d')
    ap.add_argument(
        '--output',
        default=str(DEFAULT_OUTPUT_DIR / f'{today}-ermes-suggestions.json'),
    )
    args = ap.parse_args(argv)

    if not Path(args.report).exists():
        print(f'ERROR report not found: {args.report}', file=sys.stderr)
        return 1

    out = generate_suggestions(Path(args.report), Path(args.index))
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Wrote {out_path} ({len(out["suggestions"])} suggestions)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
