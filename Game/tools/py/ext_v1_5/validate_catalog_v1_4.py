#!/usr/bin/env python3
import sys, yaml, re
from pathlib import Path
def Y(p): return yaml.safe_load(Path(p).read_text(encoding='utf-8'))
def E(m): print(f'ERROR: {m}'); return False
def W(m): print(f'WARNING: {m}'); return True
def run(pack_path: str):
    doc = Y(pack_path); ok = True
    meta = doc.get('meta',{})
    for k in ['file','version','last_updated']:
        if not meta.get(k): ok &= E(f'meta.{k} missing')
    gr = doc.get('global_rules',{}); mb = (gr.get('morph_budget') or {})
    if 'default_weight_budget' not in mb: ok &= E('global_rules.morph_budget.default_weight_budget missing')
    if 'ui_warn_threshold' not in mb:     ok &= W('global_rules.morph_budget.ui_warn_threshold missing')
    caps = gr.get('stacking_caps') or {}
    for k in ['guardia_base_cap','res_cap_per_type','dr_cap_per_type']:
        if k not in caps: ok &= W(f'global_rules.stacking_caps.{k} missing')
    vc_idx = gr.get('vc_indices') or []
    if not vc_idx: ok &= E('global_rules.vc_indices missing')
    else:
        if len(vc_idx)!=6: ok &= W(f'global_rules.vc_indices len={len(vc_idx)} (attesi 6)')
    slots = doc.get('catalog',{}).get('slots',{})
    if not slots: ok &= E('catalog.slots empty')
    flat_parts = set()
    for slot, parts in slots.items():
        if not isinstance(parts, dict): ok &= E(f'catalog.slots.{slot} non-dict'); continue
        for pid, pdata in parts.items():
            flat_parts.add(pid)
            if 'morph_cost' not in pdata: ok &= E(f'{slot}.{pid}: morph_cost missing')
            if 'effects' not in pdata:    ok &= W(f'{slot}.{pid}: effects missing')
    syns = doc.get('catalog',{}).get('synergies',[]) or []
    for s in syns:
        if 'id' not in s: ok &= E('catalog.synergies item without id')
        for cond in s.get('when_all',[]) or []:
            if '.' not in cond: ok &= E(f"synergy '{s.get('id')}': condition '{cond}' malformata")
            else:
                slot, part = cond.split('.',1)
                if part not in flat_parts:
                    ok &= E(f"synergy '{s.get('id')}': part '{part}' non esiste nel catalogo")
    for sp in doc.get('species',[]) or []:
        sid = sp.get('id')
        if not sid: ok &= E('species[] item without id'); continue
        if 'file' in sp:
            p = Path(pack_path).parent / sp['file']
            if not p.exists(): ok &= E(f"{sid}: file path non trovato -> {p}")
        dparts = sp.get('default_parts') or {}
        for k,v in dparts.items():
            if isinstance(v,list):
                for x in v:
                    if x not in flat_parts: ok &= E(f"{sid}: default_parts.{k} contiene '{x}' non definito")
            elif isinstance(v,str):
                if v not in flat_parts: ok &= E(f"{sid}: default_parts.{k} '{v}' non definito")
        hints = set(sp.get('synergy_hints') or [])
        known = {s['id'] for s in syns if 'id' in s}
        for h in hints:
            if h not in known: ok &= W(f"{sid}: synergy_hint '{h}' non trovato in catalog.synergies")
    return 0 if ok else 2
if __name__=='__main__':
    sys.exit(run(sys.argv[1]))
