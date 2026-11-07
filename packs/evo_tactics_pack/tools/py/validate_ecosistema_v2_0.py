#!/usr/bin/env python3
import sys, yaml
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def run(path):
    N=Y(path) or {}
    ok=True
    root = N.get('ecosistema') or N.get('network') or {}
    nodes = root.get('biomi') or root.get('nodes') or []
    edges = root.get('connessioni') or root.get('edges') or []
    # paths
    node_ids=set()
    for n in nodes:
        nid=n.get('id'); node_ids.add(nid)
        p=n.get('path')
        if not (p and Path(p).exists()):
            print(f'ERROR: bioma path not found: {p}'); ok=False
    # edges must link known nodes
    for e in edges:
        if e.get('from') not in node_ids or e.get('to') not in node_ids:
            print(f"ERROR: edge with unknown biomi {e.get('from')}->{e.get('to')}"); ok=False
    return 0 if ok else 2
if __name__=='__main__':
    sys.exit(run(sys.argv[1]))
