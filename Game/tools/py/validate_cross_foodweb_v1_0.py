#!/usr/bin/env python3
import sys, yaml
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def load_foodweb(path):
    try:
        F=Y(path) or {}
        return set([ (e.get('from'), e.get('to'), e.get('type')) for e in (F.get('edges') or []) ]), set([n.get('id') if isinstance(n,dict) else n for n in (F.get('nodes') or [])])
    except Exception:
        return set(), set()
def run(net_path):
    ok=True; warns=0
    N=Y(net_path); root=N.get('ecosistema') or N.get('network') or {}; net=root
    # map node -> ecosystem & species_dir
    node_ecos={ n['id']: Y(n['path']) for n in (net.get('nodes') or []) }
    node_species_dir={ nid: (E.get('links',{}).get('species_dir')) for nid,E in node_ecos.items() }
    node_foodweb_path={ nid: (E.get('links',{}).get('foodweb')) for nid,E in node_ecos.items() }
    # load local foodweb edges/nodes
    node_fw={ nid: load_foodweb(p) for nid,p in node_foodweb_path.items() if p }
    # quick helpers
    def has_detritus_sink(nid):
        edges, nodes = node_fw.get(nid, (set(),set()))
        if 'detrito' not in nodes: return False
        for (f,t,tpe) in edges:
            if f=='detrito' and tpe in ('detritus','scavenging'):
                return True
        return False
    # 1) trophic_spillover -> destination needs detritus sink or detritivores
    for e in (net.get('edges') or []):
        if e.get('type')=='trophic_spillover':
            dest=e.get('to')
            if not has_detritus_sink(dest):
                print(f"WARNING: {dest} non mostra sink di detrito per spillover {e.get('from')}→{dest}"); warns+=1
    # 2) corridors/seasonal_bridge need at least one bridge species present in both nodes
    bridges = net.get('bridge_species_map') or []
    for e in (net.get('edges') or []):
        if e.get('type') in ('corridor','seasonal_bridge'):
            a,b = e.get('from'), e.get('to')
            if not any( (a in (bsp.get('present_in_nodes') or [])) and (b in (bsp.get('present_in_nodes') or [])) for bsp in bridges ):
                print(f"WARNING: nessuna bridge species dichiarata per edge {a}→{b} ({e.get('type')})"); warns+=1
    # 3) event propagation suggestion
    for nid, E in node_ecos.items():
        # naive: search species_dir for files with flags.event==True
        sdir = node_species_dir.get(nid)
        has_event=False
        try:
            from glob import glob
            for spath in glob(f"{sdir}/*.yaml"):
                S=Y(spath)
                if (S.get('flags') or {}).get('event'):
                    has_event=True; break
        except Exception:
            pass
        if has_event:
            for e in (net.get('edges') or []):
                if e.get('from')==nid and e.get('type') in ('corridor','seasonal_bridge'):
                    print(f"INFO: evento in {nid} può propagare verso {e.get('to')} tramite {e.get('type')} ({e.get('seasonality')})")
    return 0 if ok else 2
if __name__=='__main__':
    sys.exit(run(sys.argv[1]))

# CROSS_EVENTS
def check_cross_events(net_path):
    from pathlib import Path
    import yaml
    N=Y(net_path); root=N.get('ecosistema') or N.get('network') or {}; net=root
    ce_path = Path(net_path).parent / 'cross_events.yaml'
    if not ce_path.exists():
        return
    CE = Y(str(ce_path)) or {}
    events = CE.get('events') or []
    edges = net.get('edges') or []
    for ev in events:
        froms = ev.get('from_nodes') or []
        tos = ev.get('to_nodes') or []
        modes = set(ev.get('propagate_via') or [])
        for a in froms:
            for b in tos:
                # at least one matching edge a->b with type in modes
                if not any( (e.get('from')==a and e.get('to')==b and e.get('type') in modes) for e in edges ):
                    print(f"WARNING: cross_event {ev.get('species_id')} non trova edge {a}→{b} con type in {sorted(list(modes))}")
    return
if __name__=='__main__':
    # if called as script, run previous run() and then cross-events
    import sys
    code = run(sys.argv[1])
    check_cross_events(sys.argv[1])
