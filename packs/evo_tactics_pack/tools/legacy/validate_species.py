#!/usr/bin/env python3
import sys, json, yaml
from collections import defaultdict
spec = yaml.safe_load(open(sys.argv[1], 'r', encoding='utf-8'))
slots = spec['catalog']['slots']
by_slot = {s:set(slots[s].keys()) for s in slots}
res_cap = spec['global_rules']['stacking_caps']['res_cap_per_type']
dr_cap  = spec['global_rules']['stacking_caps']['dr_cap_per_type']
report = {"species":[], "errors":0, "warnings":0}
def chosen(dp):
    out=set()
    if dp.get('locomotion'): out.add('locomotion.'+dp['locomotion'])
    if dp.get('metabolism'): out.add('metabolism.'+dp['metabolism'])
    for sl in ['offense','defense','senses']:
        for pid in dp.get(sl,[]) or []: out.add(f"{sl}.{pid}")
    return out
for sp in spec.get('species', []):
    errs, warns = [], []
    dp = sp['default_parts']
    for sl in ['locomotion','metabolism']:
        pid = dp.get(sl)
        if pid and pid not in by_slot.get(sl,set()): errs.append(f"missing part: {sl}.{pid}")
    for sl in ['offense','defense','senses']:
        for pid in dp.get(sl,[]) or []:
            if pid not in by_slot.get(sl,set()): errs.append(f"missing part: {sl}.{pid}")
    if sp.get('estimated_weight',0) > sp.get('weight_budget', 12): warns.append("over_budget")
    report["species"].append({"id":sp["id"], "errors":errs, "warnings":warns})
    report["errors"] += len(errs); report["warnings"] += len(warns)
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(0 if report["errors"]==0 else 1)
