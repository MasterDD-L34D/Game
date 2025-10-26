#!/usr/bin/env python3
import yaml, sys
from pathlib import Path
LINKS = Path('data/evo-tactics/param-synergy/rules/mating_biome_links.md')
REW   = Path('data/evo-tactics/param-synergy/director/regista_rewards.yaml')
OUT   = Path('data/mating.yaml')

if not LINKS.exists() or not REW.exists():
    sys.exit('Missing inputs: '+str(LINKS)+' or '+str(REW))

# Very lightweight merger: embed markdown as string + rewards table
rew_doc = {}
try:
    with open(REW, 'r', encoding='utf-8') as f:
        rew_doc = yaml.safe_load(f) or {}
except Exception as e:
    sys.exit('YAML error on rewards: '+str(e))

with open(LINKS, 'r', encoding='utf-8') as f:
    links_md = f.read()

out = {
  'version': 'generated',
  'mating_biome_links_md': links_md,
  'reward_tiers': rew_doc.get('reward_tiers'),
  'biome_modifiers': rew_doc.get('biome_modifiers')
}
OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    yaml.safe_dump(out, f, allow_unicode=True, sort_keys=False)
print('Wrote', OUT)
