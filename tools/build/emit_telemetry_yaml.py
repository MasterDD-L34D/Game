#!/usr/bin/env python3
import yaml, sys
from pathlib import Path
SRC = Path('data/evo-tactics/param-synergy/telemetry/vc.yaml')
OUT = Path('data/telemetry.yaml')
if not SRC.exists():
    sys.exit('Missing telemetry source: '+str(SRC))

with open(SRC, 'r', encoding='utf-8') as f:
    doc = f.read()
OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(doc)
print('Wrote', OUT)
