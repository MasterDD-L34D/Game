#!/usr/bin/env python3
import sys, yaml
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def ok_range(v,lo,hi):
    try: f=float(v); return lo<=f<=hi
    except: return False
def run(ecosystem_path, cfg_path, registries_dir):
    ok=True
    E=Y(ecosystem_path); C=Y(cfg_path)
    # required
    for k in ['schema_version','receipt','ecosistema','links','registries']:
        if k not in E: print(f"ERROR: missing '{k}'"); ok=False
    if str(E.get('schema_version'))!='1.1':
        print('WARNING: schema_version != 1.1')
    # registry links presence
    R=E.get('registries') or {}
    needed=['functional_groups','trophic_roles','biome_classes','climate_profiles','morphotypes','hazards','env_to_traits']
    for n in needed:
        if n not in R: print(f"ERROR: registries.{n} missing"); ok=False
        else:
            if not Path(R[n]).exists(): print(f"ERROR: registry path not found -> {R[n]}"); ok=False
    # salinity enum check
    sal=(((E.get('ecosistema') or {}).get('abiotico') or {}).get('salinita'))
    if sal and sal not in ['dolce','brackish','marina','salina interna']:
        print('ERROR: abiotico.salinita non valida'); ok=False
    # temperature plausibility
    t=((E.get('ecosistema') or {}).get('clima') or {}).get('temperatura_C') or {}
    for k in ['media_annua','min_mese_piu_freddo','max_mese_piu_caldo']:
        if k in t and t[k] is not None and not ok_range(t[k], -90, 70):
            print(f'WARNING: clima.temperatura_C.{k} fuori range plausibile')
    return 0 if ok else 2
if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument('ecosystem')
    ap.add_argument('config')
    ap.add_argument('registries')
    a=ap.parse_args()
    sys.exit(run(a.ecosystem, a.config, a.registries))
