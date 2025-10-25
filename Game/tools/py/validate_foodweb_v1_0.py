#!/usr/bin/env python3
import sys, yaml
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def run(foodweb_path, cfg_path):
    cfg=Y(cfg_path); ok=True
    fw=Y(foodweb_path)
    nodes=set([n['id'] if isinstance(n,dict) else n for n in fw.get('nodes',[])])
    allowed=set(cfg.get('foodweb',{}).get('allowed_edge_types',[]))
    specials=set(cfg.get('foodweb',{}).get('special_nodes',[]))
    for e in fw.get('edges',[]):
        if e.get('type') not in allowed:
            print(f"ERROR: edge type {e.get('type')} non ammesso"); ok=False
        if e.get('from') not in nodes or e.get('to') not in nodes:
            print(f"ERROR: edge {e.get('from')}->{e.get('to')} usa nodi non definiti"); ok=False
        if e.get('from') in specials or e.get('to') in specials:
            pass
    return 0 if ok else 2
if __name__=='__main__':
    sys.exit(run(sys.argv[1], sys.argv[2]))
