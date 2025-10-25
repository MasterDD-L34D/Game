#!/usr/bin/env python3
import sys, yaml, os
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))

def run(eco_path, cfg_path, reg_dir):
    ok=True
    E = Y(eco_path) or {}
    if str(E.get('schema_version'))!='1.1':
        print('WARNING:schema_version!=1.1')
    # required blocks
    for k in ['receipt','ecosistema','links','registries']:
        if k not in E:
            print(f'ERROR: missing {k}'); ok=False
    # manifest presence
    if 'manifest' not in E:
        print('WARNING: manifest missing')
    # hazard-per-bioma from config (optional)
    try:
        C = Y(cfg_path) or {}
        biome_id = (E.get('links') or {}).get('biome_id')
        wanted = ((C.get('biome_hazards') or {}).get(biome_id) or [])
        reg_hz = Y(os.path.join(reg_dir,'hazards.yaml')) or {}
        reg_ids = { (h.get('id') if isinstance(h,dict) else None) for h in (reg_hz.get('hazards') or []) }
        for w in wanted:
            if isinstance(w, dict): wid = w.get('id')
            else: wid = w
            if wid and wid not in reg_ids:
                print(f'WARNING: hazard {wid} for bioma {biome_id} not found in registries')
    except Exception as e:
        print('INFO: hazard mapping not checked:', e)
    return 0 if ok else 2

if __name__=='__main__':
    sys.exit(run(sys.argv[1], sys.argv[2], sys.argv[3]))
