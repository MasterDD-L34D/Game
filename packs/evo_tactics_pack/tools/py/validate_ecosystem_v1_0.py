#!/usr/bin/env python3
import sys, yaml, json
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def ok_range(v,lo,hi):
    try: f=float(v); return lo<=f<=hi
    except: return False
def list_species(species_dir):
    res=[]
    for y in Path(species_dir).glob('*.yaml'):
        try:
            d=Y(y); 
            if d: res.append(d)
        except Exception:
            pass
    return res
def check_required(e):
    ok=True
    for k in ['schema_version','receipt','ecosistema','links']:
        if k not in e: print(f"ERROR: missing '{k}'"); ok=False
    rec = e.get('receipt',{})
    for k in ['source','author','date','trace_hash']:
        if not rec.get(k): print(f"ERROR: receipt.{k} missing"); ok=False
    if str(e.get('schema_version'))!='1.0':
        print("WARNING: schema_version != 1.0")
    return ok
def check_fields(e):
    ok=True
    eco=e.get('ecosistema',{})
    t=eco.get('clima',{}).get('temperatura_C',{})
    if t:
        for k in ['media_annua','min_mese_piu_freddo','max_mese_piu_caldo']:
            if k in t and t[k] is not None and not ok_range(t[k], -90, 70):
                print(f"WARNING: clima.temperatura_C.{k} fuori range plausibile")
    gas=eco.get('composizione_aria',{}).get('gas_maggiori_percento',{})
    if gas:
        s=sum([v for v in gas.values() if isinstance(v,(int,float))])
        if s>100.5 or s<98.0:
            print("WARNING: gas maggiori non sommano ~100% (plausibilità)")
    sal=eco.get('abiotico',{}).get('salinita')
    if sal and sal not in ['dolce','brackish','marina','salina interna']:
        print("ERROR: abiotico.salinita non valida"); ok=False
    return ok
def check_links(e, cfg_path):
    ok=True; cfg=Y(cfg_path)
    links=e.get('links',{})
    sdir=links.get('species_dir'); fw=links.get('foodweb')
    if not Path(fw).exists():
        print(f"ERROR: foodweb non trovato: {fw}"); ok=False
    else:
        from subprocess import run
        r=run(['python', str(Path(__file__).parent/'validate_foodweb_v1_0.py'), fw, cfg_path], capture_output=True, text=True)
        if r.stdout: print(r.stdout.strip())
        if r.returncode!=0: ok=False
    if not Path(sdir).exists():
        print(f"ERROR: species_dir non trovato: {sdir}"); ok=False
        return ok
    species=list_species(sdir)
    if not species:
        print("ERROR: species_dir non contiene specie v1.5"); ok=False; return ok
    rules=e.get('rules',{}).get('at_least',{})
    if rules:
        flags={'sentient':'sentient','apex':'apex','keystone':'keystone','bridge':'bridge','threat':'threat','event':'event'}
        tally={k:0 for k in flags}
        for sp in species:
            f=(sp.get('flags') or {})
            for k,kk in flags.items():
                if f.get(kk): tally[k]+=1
        for k,v in rules.items():
            if tally.get(k,0) < int(v):
                print(f"ERROR: requisito ecosistema at_least.{k}={v} non soddisfatto (found {tally.get(k,0)})"); ok=False
    return ok
def check_npg(e, cfg_path, npg_dir):
    if not npg_dir: return True
    ok=True; cfg=Y(cfg_path)
    allowed_biomes=set(cfg.get('npg',{}).get('biome_enum',[]))
    allowed_roles=set(cfg.get('npg',{}).get('roles',[]))
    for j in Path(npg_dir).glob('*.json'):
        try:
            arr=json.loads(j.read_text(encoding='utf-8'))
            if isinstance(arr, dict): arr=[arr]
        except Exception:
            print(f"WARNING: NPG file non json: {j.name}"); continue
        for i,entry in enumerate(arr):
            for req in ['id','biome','role','species','job','gear','tactics','rewards']:
                if req not in entry: print(f"ERROR: {j.name}[{i}] manca '{req}'"); ok=False
            if entry.get('biome') not in allowed_biomes:
                print(f"WARNING: {j.name}[{i}] biome '{entry.get('biome')}' fuori enum config")
            if entry.get('role') not in allowed_roles:
                print(f"WARNING: {j.name}[{i}] role '{entry.get('role')}' fuori enum config")
    return ok
def run(ecosystem_path, cfg_path):
    e=Y(ecosystem_path); ok=True
    ok &= check_required(e)
    ok &= check_fields(e)
    ok &= check_links(e, cfg_path)
    ok &= check_npg(e, cfg_path, e.get('links',{}).get('npg_dir'))
    return 0 if ok else 2
if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument('ecosystem')
    ap.add_argument('config')
    a=ap.parse_args()
    sys.exit(run(a.ecosystem, a.config))
