#!/usr/bin/env python3
import sys, yaml, json
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def run(species_dir, foodweb_path, out_report):
    roles=set(); func=set(); flags={'apex':0,'keystone':0,'sentient':0,'threat':0,'event':0,'bridge':0}
    for y in Path(species_dir).glob('*.yaml'):
        try:
            sp=Y(y)
            roles.add(sp.get('role_trofico'))
            for t in sp.get('functional_tags') or []: func.add(t)
            f=(sp.get('flags') or {})
            for k in flags: flags[k]+= 1 if f.get(k) else 0
        except Exception: pass
    fw=Y(foodweb_path) if Path(foodweb_path).exists() else {}
    node_ids=set([n['id'] if isinstance(n,dict) else n for n in fw.get('nodes',[])])
    used_roles=set()
    for e in fw.get('edges',[]):
        used_roles.add(e.get('type'))
    report={
        'discovered_roles': sorted([r for r in roles if r]),
        'discovered_functional_tags': sorted(list(func)),
        'flags_count': flags,
        'foodweb_edge_types_used': sorted(list(used_roles)),
        'nodes_count': len(node_ids)
    }
    Path(out_report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(out_report)
    return 0
if __name__=='__main__':
    sys.exit(run(sys.argv[1], sys.argv[2], sys.argv[3]))
