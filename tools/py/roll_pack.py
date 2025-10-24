import json
import os
import sys
from typing import Callable, Dict, List, Optional

import yaml


def in_range(val: int, r: str) -> bool:
    if '-' in r:
        a, b = map(int, r.split('-'))
        return a <= val <= b
    return val == int(r)


def hash_seed(seed: str) -> int:
    h = 1779033703 ^ len(seed)
    for ch in seed:
        h = (h ^ ord(ch)) * 3432918353 & 0xFFFFFFFF
        h = ((h << 13) | (h >> 19)) & 0xFFFFFFFF
    normalized = h & 0xFFFFFFFF
    return normalized or 0x6D2B79F5


def mulberry32(seed: int) -> Callable[[], float]:
    state = seed & 0xFFFFFFFF

    def rng() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF) + t
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rng


def create_rng(seed: Optional[str]) -> Callable[[int], int]:
    if seed:
        base = mulberry32(hash_seed(seed))
    else:
        import random

        base_random = random.random

        def base() -> float:
            return base_random()

    def roll(sides: int) -> int:
        return 1 + int(base() * sides)

    return roll


def cost_of(key: str, shop: Dict[str, int]) -> int:
    if key.startswith('trait_T1'):
        return shop['trait_T1']
    if key.startswith('job_ability'):
        return shop['job_ability']
    if key == 'cap_pt':
        return shop['cap_pt']
    if key == 'guardia_situazionale':
        return shop['guardia_situazionale']
    if key == 'starter_bioma':
        return shop['starter_bioma']
    if key == 'sigillo_forma':
        return shop['sigillo_forma']
    if key == 'PE':
        return 1
    raise KeyError(f"Chiave sconosciuta: {key}")


def roll_pack(form: str, job: str, data_path: str = '../../data/packs.yaml', seed: Optional[str] = None):
    resolved_seed = seed if seed is not None else os.getenv('ROLL_PACK_SEED')

    with open(data_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    roll_die = create_rng(resolved_seed)

    d20 = roll_die(20)
    general = next((x for x in data['random_general_d20'] if in_range(d20, x['range'])), None)
    if not general:
        raise ValueError(f'Tabella d20 non copre il lancio: {d20}')

    d12_roll: Optional[int] = None

    if general['pack'] == 'BIAS_FORMA':
        form_data = data['forms'].get(form)
        if not form_data:
            raise ValueError(f'Forma sconosciuta: {form}')
        d12_roll = roll_die(12)
        bias = form_data.get('bias_d12', {})
        pack_key = next((k for k, r in bias.items() if in_range(d12_roll, r)), None)
        if pack_key is None:
            raise ValueError(f'Bias d12 non copre il lancio: {d12_roll}')
        pack = pack_key
        combo = form_data[pack_key]
    elif general['pack'] == 'BIAS_JOB':
        job_bias: Dict[str, List[str]] = {
            'vanguard': ['B', 'D'],
            'skirmisher': ['C', 'E'],
            'warden': ['E', 'G'],
            'artificer': ['A', 'F'],
            'invoker': ['A', 'J'],
            'harvester': ['D', 'J'],
        }
        pref = job_bias.get(job.lower(), ['A', 'B'])
        first = next((x for x in data['random_general_d20'] if x['pack'] in pref and x.get('combo')), None)
        if not first:
            raise ValueError(f'Bias lavoro non ha trovato un pacchetto valido per: {job}')
        pack = first['pack']
        combo = first['combo']
    elif general['pack'] == 'SCELTA':
        first = next((x for x in data['random_general_d20'] if x['pack'] == 'A' and x.get('combo')), None)
        if not first:
            raise ValueError('Pacchetto A non trovato per scelta manuale')
        pack = 'A'
        combo = first['combo']
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
    if combo.count('cap_pt') > 1:
        raise ValueError('Cap PT > 1')
    if combo.count('starter_bioma') > 1:
        raise ValueError('Starter>1')

    rolls = {'d20': d20}
    if d12_roll is not None:
        rolls['d12'] = d12_roll

    return {
        'inputs': {'form': form, 'job': job},
        'pack': pack,
        'combo': combo,
        'total_cost': total,
        'cost_breakdown': breakdown,
        'rolls': rolls,
        'selection': {'table': general['pack'], 'notes': general.get('notes')},
    }


if __name__ == '__main__':
    args = sys.argv[1:]
    seed_arg: Optional[str] = None
    positional: List[str] = []

    i = 0
    while i < len(args):
        arg = args[i]
        if arg == '--seed':
            if i + 1 < len(args):
                seed_arg = args[i + 1]
                i += 1
        elif arg.startswith('--seed='):
            seed_arg = arg.split('=', 1)[1]
        else:
            positional.append(arg)
        i += 1

    form = positional[0] if len(positional) > 0 else 'ENTP'
    job = positional[1] if len(positional) > 1 else 'invoker'
    data_path = positional[2] if len(positional) > 2 else '../../data/packs.yaml'

    result = roll_pack(form, job, data_path, seed_arg)
    print(json.dumps(result, ensure_ascii=False, indent=2))
