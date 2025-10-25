#!/usr/bin/env python3
import sys, yaml, json
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def write_patch(outdir, sid, patch):
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir/f"{sid}.patch.yaml").write_text(yaml.safe_dump(patch, sort_keys=False, allow_unicode=True), encoding='utf-8')
def match_rule(ctx, rule):
    cond=rule.get('when') or {}
    # biome_class
    if 'biome_class' in cond and cond['biome_class'] != ctx.get('biome_class'): return False
    # koppen
    if 'koppen_in' in cond and not set(cond['koppen_in']).intersection(set(ctx.get('koppen',[]))): return False
    # hazard_any
    if 'hazard_any' in cond and set(cond['hazard_any']).isdisjoint(set(ctx.get('hazards_expected',[]))): return False
    # morphotype
    if 'morphotype' in cond and cond['morphotype'] != ctx.get('morphotype'): return False
    # salinita
    if 'salinita_in' in cond and ctx.get('salinita') not in set(cond['salinita_in']): return False
    return True
def run(ecosystem_path, species_dir, registries_dir, outdir):
    E=Y(ecosystem_path)
    env = {
      'biome_class': ((E.get('ecosistema') or {}).get('bioma') or {}).get('classe_bioma'),
      'koppen': ((E.get('ecosistema') or {}).get('bioma') or {}).get('koppen_zone', []),
      'salinita': ((E.get('ecosistema') or {}).get('abiotico') or {}).get('salinita'),
      'hazards_expected': (((E.get('ecosistema') or {}).get('clima') or {}).get('estremi_e_rischi') or {}).get('eventi', [])
    }
    rules = Y(Path(registries_dir)/'env_to_traits.yaml').get('rules',[])
    for y in sorted(Path(species_dir).glob('*.yaml')):
        sp=Y(y); sid=sp.get('id',y.stem)
        ctx = dict(env)
        ctx['morphotype']=sp.get('morphotype')
        suggest={'traits': set(), 'effects': {}, 'services_links': set(), 'jobs_bias': set()}
        require=set()
        for r in rules:
            if match_rule(ctx, r):
                s=(r.get('suggest') or {})
                for t in s.get('traits',[]) or []: suggest['traits'].add(t)
                for k,v in (s.get('effects') or {}).items(): suggest['effects'][k]=v
                for srl in (s.get('services_links') or []): suggest['services_links'].add(srl)
                for jb in (s.get('jobs_bias') or []): suggest['jobs_bias'].add(jb)
                for cap in (r.get('require_capability_any') or []): require.add(cap)
        patch={'id':sid,'environment_affinity':{
                  'biome_class':env['biome_class'],'koppen':env['koppen'],'climate_profile':None,
                  'hazards_expected':env['hazards_expected']
                },
               'derived_from_environment':{
                  'suggested_traits': sorted(list(suggest['traits'])),
                  'required_capabilities': sorted(list(require)),
                  'services_links': sorted(list(suggest['services_links'])),
                  'jobs_bias': sorted(list(suggest['jobs_bias']))
               }}
        write_patch(Path(outdir), sid, patch)
    print(f"Patches written to {outdir}")
    return 0
if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument('ecosystem')
    ap.add_argument('species_dir')
    ap.add_argument('registries')
    ap.add_argument('outdir')
    a=ap.parse_args()
    sys.exit(run(a.ecosystem, a.species_dir, a.registries, a.outdir))
