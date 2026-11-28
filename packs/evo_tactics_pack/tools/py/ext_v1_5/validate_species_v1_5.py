#!/usr/bin/env python3
import sys, argparse, yaml, re, json
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def sev(msg, level='ERROR'): print(f'{level}: {msg}')
def catalog_index(catalog_path):
    doc = Y(catalog_path)
    slots = {}
    for slot, parts in (doc.get('catalog',{}).get('slots',{}) or {}).items():
        for pid, pdata in parts.items():
            cost = (pdata or {}).get('morph_cost', 0)
            slots[pid] = {'slot':slot, 'cost': cost}
    gr = doc.get('global_rules',{})
    vc_idx = gr.get('vc_indices') or ['aggro','risk','cohesion','setup','explore','tilt']
    synergies = {s['id'] for s in (doc.get('catalog',{}).get('synergies',[]) or []) if 'id' in s}
    return slots, gr, vc_idx, synergies
def normalize_legacy(sp):
    if sp.get('playable_unit') and not sp.get('pi_loadout'):
        wb = sp.get('weight_budget'); dp = sp.get('default_parts')
        if wb is not None and dp:
            sp['pi_loadout'] = {'weight_budget': wb, 'default_parts': dp}
            sev(f"{sp['id']}: legacy weight_budget/default_parts normalizzati in pi_loadout",'INFO')
    return sp
def check_required(sp):
    ok=True
    MUST = ['schema_version','receipt','id','display_name','biomes','role_trofico','functional_tags','vc','playable_unit','spawn_rules','balance']
    for k in MUST:
        if k not in sp: sev(f"{sp.get('id','<no-id>')}: missing '{k}'"); ok=False
    rc = sp.get('receipt',{})
    for k in ['source','author','date','trace_hash']:
        if not rc.get(k): sev(f"{sp['id']}: receipt.{k} missing"); ok=False
    if str(sp.get('schema_version')) != '1.5':
        sev(f"{sp['id']}: schema_version != 1.5",'WARNING')
    if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', sp.get('id','')):
        sev(f"{sp.get('id')}: id kebab-case richiesto"); ok=False
    if not sp.get('display_name'): sev(f"{sp.get('id')}: display_name vuoto"); ok=False
    if 'densita' not in (sp.get('spawn_rules') or {}): sev(f"{sp['id']}: spawn_rules.densita missing"); ok=False
    if not (sp.get('balance') or {}).get('encounter_role'): sev(f"{sp['id']}: balance.encounter_role missing"); ok=False
    return ok
def check_vc(sp, vc_idx):
    ok=True; vc=sp.get('vc',{})
    for k in vc_idx:
        v=vc.get(k)
        if v is None: sev(f"{sp['id']}: vc.{k} missing"); ok=False
        else:
            try:
                f=float(v); 
                if not (0.0<=f<=1.0): sev(f"{sp['id']}: vc.{k} out of range"); ok=False
            except: sev(f"{sp['id']}: vc.{k} not numeric"); ok=False
    for k in vc.keys():
        if k not in vc_idx: sev(f"{sp['id']}: vc extra key '{k}' (non in vc_indices)",'WARNING')
    return ok
def collect_parts(sp):
    parts=[]; pl=(sp.get('pi_loadout') or {}).get('default_parts') or {}
    for v in pl.values():
        if isinstance(v,list): parts+=v
        elif isinstance(v,str): parts.append(v)
    return parts
def check_playable_and_budget(sp, catalog_slots, gr, cfg):
    role = sp.get('role_trofico')
    if not sp.get('playable_unit'):
        if role in {'produttore','produttore_chemiotrofo','decompositore','ingegnere_ecosistema'}:
            if not sp.get('services_links'):
                sev(f"{sp['id']}: services_links richieste per ruolo {role}"); return False
        return True
    ok=True
    pl = sp.get('pi_loadout')
    if not pl: sev(f"{sp['id']}: playable ma pi_loadout mancante"); return False
    budget = pl.get('weight_budget')
    if budget is None: sev(f"{sp['id']}: weight_budget mancante"); ok=False
    maxb = (gr.get('morph_budget') or {}).get('default_weight_budget',12)
    flags = sp.get('flags',{}) or {}
    if flags.get('apex') or flags.get('keystone'): maxb = max(cfg['budget_tiers']['apex_or_keystone_max'], maxb)
    if sp.get('sapience_tier') in ('S2','S3'):     maxb = max(cfg['budget_tiers']['sentient_S2_plus_max'], maxb)
    if budget and budget>maxb:
        mode=cfg['budget_tiers'].get('enforce_mode','warn')
        sev(f"{sp['id']}: weight_budget {budget}>{maxb} (tier policy)", 'ERROR' if mode=='error' else 'WARNING')
    parts = collect_parts(sp)
    if not parts: sev(f"{sp['id']}: default_parts empty"); ok=False
    sum_cost=0
    for p in parts:
        if p not in catalog_slots:
            sev(f"{sp['id']}: part '{p}' non definita nel catalogo"); ok=False
        else:
            sum_cost += int(catalog_slots[p].get('cost',0))
    if cfg.get('morph_cost_check',{}).get('enabled'):
        if budget is not None and sum_cost>budget:
            sev(f"{sp['id']}: somma morph_cost ({sum_cost}) > weight_budget ({budget})",
                'ERROR' if cfg['morph_cost_check'].get('mode','warn')=='error' else 'WARNING')
    return ok
def check_flags(sp):
    ok=True; f=sp.get('flags',{}) or {}
    if f.get('sentient') and not sp.get('sapience_tier'):
        sev(f"{sp['id']}: sentient senza sapience_tier"); ok=False
    if f.get('event') and sp.get('role_trofico')!='evento_ecologico':
        sev(f"{sp['id']}: event flag ma role_trofico != evento_ecologico"); ok=False
    if f.get('threat'):
        eco=sp.get('ecology',{}) or {}
        if not eco.get('trigger') or not eco.get('contromisure'):
            sev(f"{sp['id']}: threat senza ecology.trigger/contromisure"); ok=False
    return ok
def effect_caps(sp, cfg):
    caps=set()
    for p in collect_parts(sp):
        caps.update((cfg.get('parts_capabilities') or {}).get(p,[]))
    for tr in sp.get('genome_traits',[]) or []:
        for k in (tr.get('effects') or {}).keys(): caps.add(k)
    return caps
def check_hazards(sp, cfg, biome):
    if not sp.get('playable_unit'): return True
    hz={h['id']:h for h in (cfg.get('biome_hazards',{}) or {}).get(biome,[])}
    caps = effect_caps(sp, cfg)
    for hid,H in hz.items():
        need=set(H.get('requires_any_of',[]) or [])
        if need and caps.isdisjoint(need):
            sev(f"{sp['id']}: nessuna capability per hazard '{hid}' (richiesti uno tra {sorted(need)})",'WARNING')
    return True
def check_jobs_mapping(sp, cfg):
    if not sp.get('playable_unit'): return True
    jobs = sp.get('jobs_synergy',[]) or []
    if not jobs: return True
    dp = (sp.get('pi_loadout') or {}).get('default_parts') or {}
    present_slots = {k for k,v in dp.items() if v}
    caps = effect_caps(sp, cfg)
    rules = cfg.get('jobs_pi_requirements',{}) or {}
    for j in jobs:
        r = rules.get(j)
        if not r: sev(f"{sp['id']}: jobs_synergy '{j}' non registrato in config",'WARNING'); continue
        need_slots=set(r.get('require_any_slots',[]) or [])
        need_caps =set(r.get('require_any_capabilities',[]) or [])
        if need_slots and present_slots.isdisjoint(need_slots):
            sev(f"{sp['id']}: job '{j}' richiede slot {sorted(need_slots)} (non presenti)",'WARNING')
        if need_caps and caps.isdisjoint(need_caps):
            sev(f"{sp['id']}: job '{j}' richiede capability {sorted(need_caps)} (non trovate)",'WARNING')
    return True
def check_telemetry(sp, cfg):
    t=sp.get('telemetry') or {}
    role = (sp.get('balance') or {}).get('encounter_role')
    rar  = (sp.get('balance') or {}).get('rarity')
    if 'expected_pick_rate' not in t: sev(f"{sp['id']}: telemetry.expected_pick_rate missing",'WARNING'); return True
    if 'spawn_weight' not in t:      sev(f"{sp['id']}: telemetry.spawn_weight missing",'WARNING'); return True
    try: pr=float(t['expected_pick_rate']); sw=float(t['spawn_weight'])
    except: sev(f"{sp['id']}: telemetry values non numerici",'WARNING'); return True
    if not (0<=pr<=1): sev(f"{sp['id']}: expected_pick_rate fuori [0..1]",'WARNING')
    if not (0<=sw<=1): sev(f"{sp['id']}: spawn_weight fuori [0..1]",'WARNING')
    TR = (cfg.get('telemetry_targets',{}).get('pick_rate_by_role',{}) or {}).get(role)
    TS = (cfg.get('telemetry_targets',{}).get('spawn_weight_by_rarity',{}) or {}).get(rar)
    if TR and not (TR[0]<=pr<=TR[1]): sev(f"{sp['id']}: pick_rate {pr} fuori target {TR} per role={role}",'WARNING')
    if TS and not (TS[0]<=sw<=TS[1]): sev(f"{sp['id']}: spawn_weight {sw} fuori target {TS} per rarity={rar}",'WARNING')
    return True
def load_prefs(p): 
    if not p: return {}
    try: 
        d=Y(p); return d.get('preferences',{})
    except Exception: return {}
def load_nest_req(p):
    if not p: return {}
    try: 
        d=Y(p); return d.get('requirements',{})
    except Exception: return {}
def check_preferences(sp, prefs_registry):
    sid=sp.get('id')
    if sp.get('mating',{}).get('enabled') or (sp.get('flags',{}) or {}).get('sentient'):
        local = sp.get('preferences')
        reg   = prefs_registry.get(sid)
        if not local and not reg:
            sev(f'{sid}: preferences (likes/dislikes) mancanti (specie senziente/mating)','WARNING')
        if local and reg:
            if set(local.get('likes',[])) and not set(local['likes']).issuperset(set(reg.get('likes',[]))):
                sev(f'{sid}: preferences.likes non includono registry base','WARNING')
    return True
def check_social(sp, cfg):
    soc = sp.get('social') or {}
    if 'affinity_base' in soc:
        if not (-2 <= float(soc['affinity_base']) <= 2): sev(f"{sp['id']}: social.affinity_base fuori range -2..2",'WARNING')
    if 'trust_base' in soc:
        if not (0 <= float(soc['trust_base']) <= 5): sev(f"{sp['id']}: social.trust_base fuori range 0..5",'WARNING')
    return True
def check_mating(sp, cfg, nest_req):
    m = sp.get('mating') or {}
    if not m.get('enabled'): return True
    rt = cfg.get('social',{})
    minA = m.get('rules',{}).get('recruit_min_affinity', rt.get('recruit_min_affinity', 0))
    minR = m.get('rules',{}).get('recruit_min_trust',   rt.get('recruit_min_trust',   2))
    minT = m.get('rules',{}).get('mating_min_trust',    rt.get('mating_min_trust',    3))
    if not (-2 <= minA <= 2): sev(f"{sp['id']}: mating.rules.recruit_min_affinity fuori -2..2",'WARNING')
    for k,v in [('recruit_min_trust',minR),('mating_min_trust',minT)]:
        if not (0 <= v <= 5): sev(f"{sp['id']}: mating.rules.{k} fuori 0..5",'WARNING')
    no = m.get('nest_overrides') or {}
    valid_keys = set(nest_req.keys())
    for k in no.keys():
        if k not in valid_keys:
            sev(f"{sp['id']}: mating.nest_overrides chiave '{k}' non presente in requirements.yaml",'WARNING')
    return True
def check_synergy_hints(stub, known_synergies, sid):
    for h in (stub.get('synergy_hints') or []):
        if h not in known_synergies: sev(f"{sid}: synergy_hint '{h}' non nel catalogo",'WARNING')
    return True
def run(species_root, catalog_path, cfg_path, biome, nest_req_path=None, species_prefs_path=None, npg_pack=None, legacy_pack=None):
    cfg = Y(cfg_path)
    catalog_slots, gr, vc_idx, known_syn = catalog_index(catalog_path)
    nest_req = load_nest_req(nest_req_path)
    prefs_registry = load_prefs(species_prefs_path)
    stubs = {}
    if legacy_pack:
        try:
            pack = Y(legacy_pack)
            for s in pack.get('species',[]) or []:
                stubs[s['id']] = s
        except Exception:
            pass
    ok_all=True
    for y in sorted(Path(species_root).glob('*.yaml')):
        sp = Y(y); 
        if not sp: ok_all=False; continue
        sp = normalize_legacy(sp)
        ok  = check_required(sp)
        ok &= check_vc(sp, vc_idx)
        ok &= check_playable_and_budget(sp, catalog_slots, gr, cfg)
        ok &= check_flags(sp)
        ok &= check_hazards(sp, cfg, biome)
        ok &= check_jobs_mapping(sp, cfg)
        ok &= check_telemetry(sp, cfg)
        ok &= check_preferences(sp, prefs_registry)
        ok &= check_social(sp, cfg)
        ok &= check_mating(sp, cfg, nest_req)
        ok &= check_synergy_hints(stubs.get(sp['id'],{}), known_syn, sp['id'])
        ew = sp.get('estimated_weight'); wb = (sp.get('pi_loadout') or {}).get('weight_budget')
        if ew is not None and wb is not None and abs(int(ew)-int(wb))>2:
            sev(f"{sp['id']}: estimated_weight({ew}) distante da weight_budget({wb})",'WARNING')
        if not ok: ok_all=False
    return 0 if ok_all else 2
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser()
    p.add_argument('--species-root', required=True)
    p.add_argument('--catalog', required=True)
    p.add_argument('--config', required=True)
    p.add_argument('--biome', required=True)
    p.add_argument('--nest-req', required=False)
    p.add_argument('--species-prefs', required=False)
    p.add_argument('--npg-pack', required=False)
    p.add_argument('--pack', required=False)
    a=p.parse_args()
    sys.exit(run(a.species_root, a.catalog, a.config, a.biome, a.nest_req, a.species_prefs, a.npg_pack, a.pack))
