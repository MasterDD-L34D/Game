#!/usr/bin/env python3
import sys, yaml
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def load_species(species_dirs):
    idx={}
    for d in species_dirs:
        for y in Path(d).glob('*.yaml'):
            sp = Y(y)
            if sp: idx[sp['id']]=sp
    return idx
def run(manifest_path, cfg_path):
    m = Y(manifest_path); cfg = Y(cfg_path)
    biome = m['biome']
    species_dirs = [Path(p) for p in m.get('species_dirs',[])]
    req = m.get('requirements',{})
    idx = load_species(species_dirs)
    flags = {k:0 for k in ['sentient','apex','keystone','bridge','threat','event']}
    for sp in idx.values():
        if biome not in sp.get('biomes',[]): continue
        f=sp.get('flags',{}) or {}
        for k in flags: flags[k]+= 1 if f.get(k) else 0
    ok=True
    for k,minv in req.get('at_least',{}).items():
        if flags.get(k,0) < int(minv):
            print(f"ERROR: biome {biome} needs at least {minv} '{k}', found {flags.get(k,0)}"); ok=False
    fw_path = Path(cfg['foodweb']['path'].format(biome=biome))
    if not fw_path.exists():
        print(f"ERROR: foodweb file missing: {fw_path}"); return 2
    fw = Y(fw_path)
    nodes = {n['id'] if isinstance(n,dict) else n for n in fw.get('nodes',[])}
    allowed = set(cfg['foodweb']['allowed_edge_types'])
    specials = set(cfg['foodweb']['special_nodes'])
    name_map = (fw.get('notes',{}) or {}).get('mapping',{})
    apex_ids = {sid for sid,sp in idx.items() if (sp.get('flags',{}) or {}).get('apex')}
    keystone_ids = {sid for sid,sp in idx.items() if (sp.get('flags',{}) or {}).get('keystone')}
    threat_ids = {sid for sid,sp in idx.items() if (sp.get('flags',{}) or {}).get('threat')}
    event_ids  = {sid for sid,sp in idx.items() if (sp.get('flags',{}) or {}).get('event')}
    role = {sid: (sp.get('role_trofico')) for sid,sp in idx.items()}
    preds_out = {sid:0 for sid in idx.keys()}
    preds_in  = {sid:0 for sid in idx.keys()}
    for e in fw.get('edges',[]):
        et = e['type']
        if et not in allowed: print(f"ERROR: edge type '{et}' non-ammesso"); ok=False
        src = e['from']; dst = e['to']
        src_sp = name_map.get(src, src); dst_sp = name_map.get(dst, dst)
        if src not in nodes or dst not in nodes:
            print(f"ERROR: edge {src}->{dst} usa nodi non elencati in 'nodes'"); ok=False; continue
        if src in specials or dst in specials: continue
        if src_sp in idx and dst_sp in idx:
            r_src = role[src_sp]
            if et in ('predation','grazing','herbivory'):
                preds_out[src_sp]+=1; preds_in[dst_sp]+=1
                if dst_sp in apex_ids and src_sp not in threat_ids and src_sp not in event_ids:
                    print(f"WARNING: apex '{dst_sp}' predato da '{src_sp}' (non threat/event)")
                if r_src in ('produttore','produttore_chemiotrofo','decompositore'):
                    print(f"ERROR: ruolo '{r_src}' non può avere edge di tipo '{et}'"); ok=False
            if et=='engineering':
                if src_sp not in keystone_ids and role[src_sp] != 'ingegnere_ecosistema':
                    print(f"WARNING: edge engineering da '{src_sp}' senza ruolo ingegnere/keystone")
    for a in apex_ids:
        if preds_out.get(a,0)==0:
            print(f"WARNING: apex '{a}' senza predation out")
    print(f"INFO: foodweb scan: apex={len(apex_ids)} keystone={len(keystone_ids)} threat={len(threat_ids)} event={len(event_ids)}")
    return 0 if ok else 2
if __name__=='__main__':
    sys.exit(run(sys.argv[1], sys.argv[2]))
