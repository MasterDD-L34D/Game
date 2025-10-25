#!/usr/bin/env python3
import sys, yaml, json
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def W(p, obj): Path(p).write_text(yaml.safe_dump(obj, sort_keys=False, allow_unicode=True), encoding='utf-8')
def run(net_path, outdir):
    N=Y(net_path); net=(N.get('ecosistema') or N.get('network') or {})
    nodes=net.get('biomi') or net.get('nodes') or []; edges=net.get('connessioni') or net.get('edges') or []
    species_dirs={n['id']: Y(n['path']).get('links',{}).get('species_dir') for n in nodes}
    # collect per-node hazards for derive context
    node_hazards={}
    for n in nodes:
        E=Y(n['path'])
        hz=(((E.get('ecosistema') or {}).get('clima') or {}).get('estremi_e_rischi') or {}).get('eventi', [])
        node_hazards[n['id']]=hz
    # bridge species map
    bridges = net.get('bridge_species_map') or []
    Path(outdir).mkdir(parents=True, exist_ok=True)
    patches=[]
    for b in bridges:
        sid=b['species_id']
        present=b.get('present_in_nodes') or []
        roles=b.get('roles') or []
        # merge of hazards across nodes
        hz=set()
        for nid in present:
            hz.update(node_hazards.get(nid,[]))
        # build patch
        patch={'id': sid,
               'environment_affinity': {
                   'multibiome': sorted(list(present)),
               },
               'derived_from_environment': {
                   'jobs_bias': sorted(list(set(['Warden' if 'sentinella' in roles else 'Skirmisher'])))
               },
               'network_bridge_roles': sorted(list(roles)),
               'biomes_add': []}
        # if species file lives in only a subset, suggest to add other biome ids
        # locate first directory containing the species
        found_dir=None; found_nodes=[]
        for nid, sdir in species_dirs.items():
            sp=Path(sdir)/f"{sid}.yaml"
            if sp.exists():
                found_dir=sdir; found_nodes.append(nid)
        missing=[n for n in present if n not in found_nodes]
        patch['biomes_add']=missing
        W(Path(outdir)/f"{sid}.network.patch.yaml", patch)
        patches.append(patch['id'])
    print(json.dumps({'patches': patches}, ensure_ascii=False))
    return 0
if __name__=='__main__':
    sys.exit(run(sys.argv[1], sys.argv[2]))
