#!/usr/bin/env python3
import yaml, json, sys
from pathlib import Path
BASE = Path('data/evo-tactics/param-synergy/exports/spawn_packs')
OUT  = Path('data/packs.yaml')
if not BASE.exists():
    sys.exit('Missing packs dir: '+str(BASE))

packs = {}
for p in sorted(BASE.glob('*.json')):
    with open(p, 'r', encoding='utf-8') as f:
        doc = json.load(f)
        packs[p.stem] = doc

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    yaml.safe_dump({'version':'generated','packs': packs}, f, allow_unicode=True, sort_keys=False)
print('Wrote', OUT)
