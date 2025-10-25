#!/usr/bin/env python3
import sys, argparse, yaml, re
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def warn(m): print(f'WARNING: {m}')
def err(m): print(f'ERROR: {m}')
def run(species_root, cfg_path, registries_dir):
    cfg = Y(cfg_path)
    roles_reg = Y(Path(registries_dir)/'trophic_roles.yaml')
    morph_reg = Y(Path(registries_dir)/'morphotypes.yaml')
    env_rules = Y(Path(registries_dir)/'env_to_traits.yaml')
    ok_all=True
    allowed_roles=set(roles_reg.get('roles_enum',[]))
    known_morph=set((morph_reg.get('types') or {}).keys())
    for y in sorted(Path(species_root).glob('*.yaml')):
        sp=Y(y); sid=sp.get('id',y.name)
        # core fields
        for k in ['schema_version','receipt','id','display_name','biomes','role_trofico','functional_tags','vc','playable_unit','spawn_rules','balance']:
            if k not in sp: err(f"{sid}: missing '{k}'"); ok_all=False
        # role enum
        rt=sp.get('role_trofico')
        if rt and rt not in allowed_roles: warn(f"{sid}: role_trofico '{rt}' non nella registry trophic_roles.yaml")
        # morphotype
        mt=sp.get('morphotype')
        if mt and mt not in known_morph: warn(f"{sid}: morphotype '{mt}' non definito in morphotypes.yaml")
        # spawn densita
        if 'densita' not in (sp.get('spawn_rules') or {}): err(f"{sid}: spawn_rules.densita missing"); ok_all=False
        if not (sp.get('balance') or {}).get('encounter_role'): err(f"{sid}: balance.encounter_role missing"); ok_all=False
        # environment-derived suggestions existence (non-blocking)
        if 'environment_affinity' not in sp: warn(f"{sid}: environment_affinity non presente (v1.7)")
        if 'derived_from_environment' not in sp: warn(f"{sid}: derived_from_environment non presente (v1.7)")
    return 0 if ok_all else 2
if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--species-root', required=True)
    ap.add_argument('--config', required=True)
    ap.add_argument('--registries', required=True)
    a=ap.parse_args()
    sys.exit(run(a.species_root, a.config, a.registries))
