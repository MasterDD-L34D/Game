#!/usr/bin/env python3
import sys, yaml
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def run(foodweb_path, species_dir, cfg_path):
    ok=True
    cfg=Y(cfg_path); allowed=set(cfg.get('foodweb',{}).get('allowed_edge_types',[]))
    fw=Y(foodweb_path)
    nodes=[n['id'] if isinstance(n,dict) else n for n in fw.get('nodes',[])]
    nodes=set(nodes)
    edges=fw.get('edges',[])
    if not edges: print('WARNING: foodweb edges vuoto')
    # index species roles
    role_map={}
    for y in Path(species_dir).glob('*.yaml'):
        try:
            d=Y(y); role_map[d['id']]=d.get('role_trofico')
        except Exception: pass
    # check edges
    pred_out={k:0 for k in role_map}
    pred_in ={k:0 for k in role_map}
    for e in edges:
        et=e.get('type'); src=e.get('from'); dst=e.get('to')
        if et not in allowed: print(f"ERROR: edge type {et} non ammesso"); ok=False
        if src not in nodes or dst not in nodes: print(f"ERROR: edge usa nodi non presenti {src}->{dst}"); ok=False
        if src in role_map and dst in role_map:
            rsrc=role_map[src]; rdst=role_map[dst]
            if et in ('predation','grazing','herbivory'):
                pred_out[src]+=1; pred_in[dst]+=1
                # sanity: produttore non deve predare
                if rsrc in ('produttore','produttore_chemiotrofo','decompositore'):
                    print(f"ERROR: ruolo {rsrc} non può avere edge {et}"); ok=False
    for sid, r in role_map.items():
        if 'apex' in (Y(str(Path(species_dir)/f"{sid}.yaml")).get('flags') or {}):
            if pred_out.get(sid,0)==0:
                print(f"WARNING: apex {sid} senza predation out")
    return 0 if ok else 2
if __name__=='__main__':
    sys.exit(run(sys.argv[1], sys.argv[2], sys.argv[3]))
