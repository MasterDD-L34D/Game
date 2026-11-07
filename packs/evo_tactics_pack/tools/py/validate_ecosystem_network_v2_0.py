#!/usr/bin/env python3
import sys, yaml
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def run(net_path):
    ok=True; N=Y(net_path)
    for k in ['schema_version','receipt','network','links']:
        if k not in N: print(f'ERROR: missing {k}'); ok=False
    if str(N.get('schema_version'))!='2.0':
        print('WARNING: schema_version != 2.0')
    net=N.get('network') or {}
    nodes=net.get('nodes') or []; edges=net.get('edges') or []
    node_ids={n.get('id') for n in nodes}
    if len(node_ids)!=len(nodes): print('ERROR: duplicate node ids'); ok=False
    # check paths
    for n in nodes:
        p=n.get('path')
        if not (p and Path(p).exists()): print(f'ERROR: ecosystem path not found: {p}'); ok=False
    # edges must link known nodes
    for e in edges:
        if e.get('from') not in node_ids or e.get('to') not in node_ids:
            print(f"ERROR: edge with unknown node {e.get('from')}->{e.get('to')}"); ok=False
    # bridge species presence is informational here
    return 0 if ok else 2
if __name__=='__main__':
    sys.exit(run(sys.argv[1]))
