"""Generatore di pacchetti PI deterministici basato sui dataset YAML."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, List, Optional, Union

from game_utils import (
    RandomFloatGenerator,
    choice,
    create_rng,
    load_yaml,
    resolve_seed,
    roll_die,
)


def in_range(val: int, r: str) -> bool:
    if '-' in r:
        a, b = map(int, r.split('-'))
        return a <= val <= b
    return val == int(r)


def cost_of(key: str, shop: Dict[str, int]) -> int:
    base = key.split(':', 1)[0]
    if base == 'PE':
        return 1
    if base not in shop:
        raise KeyError(f"Chiave sconosciuta: {key}")
    return shop[base]


def pick_combo_from_table(
    table: List[Dict[str, object]], packs: List[str], rng: RandomFloatGenerator
) -> Dict[str, object]:
    candidates = [row for row in table if row.get('pack') in packs and row.get('combo')]
    if not candidates:
        raise ValueError(f"Nessun pacchetto valido per {packs}")
    return choice(candidates, rng)


DEFAULT_PACKS_PATH = Path(__file__).resolve().parents[2] / 'data' / 'packs.yaml'


def roll_pack(
    form: str,
    job: str,
    data_path: Optional[Union[str, Path]] = None,
    seed: Optional[str] = None,
):
    resolved_seed = resolve_seed(seed, env_var='ROLL_PACK_SEED')

    dataset_path = Path(data_path) if data_path is not None else DEFAULT_PACKS_PATH
    data = load_yaml(dataset_path)

    rng = create_rng(resolved_seed)

    normalized_form = form.upper()

    d20 = roll_die(rng, 20)
    general = next((x for x in data['random_general_d20'] if in_range(d20, x['range'])), None)
    if not general:
        raise ValueError(f'Tabella d20 non copre il lancio: {d20}')

    d12_roll: Optional[int] = None

    if general['pack'] == 'BIAS_FORMA':
        form_data = data['forms'].get(normalized_form)
        if not form_data:
            raise ValueError(f'Forma sconosciuta: {form}')
        d12_roll = roll_die(rng, 12)
        bias = form_data.get('bias_d12', {})
        pack_key = next((k for k, r in bias.items() if in_range(d12_roll, r)), None)
        if pack_key is None:
            raise ValueError(f'Bias d12 non copre il lancio: {d12_roll}')
        pack = pack_key
        combo = form_data[pack_key]
    elif general['pack'] == 'BIAS_JOB':
        job_bias_raw: Dict[str, List[str]] = data.get('job_bias', {})
        job_bias = {k.lower(): v for k, v in job_bias_raw.items()}
        pref = job_bias.get(job.lower()) or job_bias.get('default', ['A', 'B'])
        if not isinstance(pref, list) or not pref:
            raise ValueError(f'Bias lavoro non configurato correttamente per: {job}')
        picked = pick_combo_from_table(data['random_general_d20'], pref, rng)
        pack = picked['pack']  # type: ignore[assignment]
        combo = picked['combo']  # type: ignore[assignment]
    elif general['pack'] == 'SCELTA':
        picked = pick_combo_from_table(data['random_general_d20'], ['A'], rng)
        pack = picked['pack']  # type: ignore[assignment]
        combo = picked['combo']  # type: ignore[assignment]
    else:
        combo = general.get('combo')
        if combo is None:
            raise ValueError(f"Combinazione mancante per il pacchetto {general['pack']}")
        pack = general['pack']

    shop_costs: Dict[str, int] = data['pi_shop']['costs']
    breakdown = [{'item': item, 'cost': cost_of(item, shop_costs)} for item in combo]
    total = sum(entry['cost'] for entry in breakdown)
    if total != 7:
        raise ValueError(f'Pacchetto {pack} non somma a 7 (= {total})')
    caps: Dict[str, int] = data['pi_shop'].get('caps', {})
    for cap_key, limit in caps.items():
        item = cap_key.replace('_max', '')
        if combo.count(item) > limit:
            raise ValueError(f"{item} supera il limite consentito ({limit})")

    rolls = {'d20': d20}
    if d12_roll is not None:
        rolls['d12'] = d12_roll

    return {
        'inputs': {'form': normalized_form, 'job': job},
        'pack': pack,
        'combo': combo,
        'total_cost': total,
        'cost_breakdown': breakdown,
        'rolls': rolls,
        'selection': {'table': general['pack'], 'notes': general.get('notes')},
    }
if __name__ == '__main__':
    from game_cli import main as cli_main

    sys.exit(cli_main(['roll-pack', *sys.argv[1:]]))
