#!/usr/bin/env python3
import sys, json, yaml, argparse
from collections import defaultdict

def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def collect_catalog(spec):
    slots = spec["catalog"]["slots"]
    by_slot = {slot: set(parts.keys()) for slot, parts in slots.items()}
    synmap = {s["id"]: s for s in spec.get("catalog", {}).get("synergies", [])}
    return by_slot, synmap

def get_caps(spec):
    caps = spec.get("global_rules", {}).get("stacking_caps", {})
    res_cap = caps.get("res_cap_per_type", 2)
    dr_cap = caps.get("dr_cap_per_type", 1)
    return res_cap, dr_cap

def get_globals(spec):
    gr = spec.get("global_rules", {})
    return {
        "biomes": set(gr.get("biomes", [])),
        "affixes": set(gr.get("biome_affixes", [])),
        "roles": set(gr.get("spawn_roles", [])),
        "vc_indices": set(gr.get("vc_indices", [])),
        "mating_keys": ["env","structure","security","resources","privacy"],
    }

def gather_chosen_parts(dp):
    chosen = set()
    for slot in ["locomotion","metabolism"]:
        if dp.get(slot):
            chosen.add(f"{slot}.{dp[slot]}")
    for slot in ["offense","defense","senses"]:
        for pid in dp.get(slot, []) or []:
            chosen.add(f"{slot}.{pid}")
    return chosen

def resolve_part(spec, slot, pid):
    return spec["catalog"]["slots"][slot].get(pid)

def accumulate_resistances(spec, dp):
    res_sum, vuln_sum, dr_sum = defaultdict(int), defaultdict(int), defaultdict(int)
    def acc(slot, pid):
        part = resolve_part(spec, slot, pid)
        if not part: return
        eff = part.get("effects", {})
        r = eff.get("resistances", {})
        for t,v in (r.get("res") or {}).items():   res_sum[t]  += int(v)
        for t,v in (r.get("vuln") or {}).items():  vuln_sum[t] += int(v)
        for t,v in (r.get("dr") or {}).items():    dr_sum[t]   += int(v)
    for s in ["locomotion","metabolism"]:
        if dp.get(s): acc(s, dp[s])
    for s in ["offense","defense","senses"]:
        for pid in dp.get(s, []) or []: acc(s, pid)
    return dict(res_sum), dict(vuln_sum), dict(dr_sum)

def compute_active_synergies(spec, chosen_set):
    active = []
    for syn in spec.get("catalog",{}).get("synergies",[]):
        reqs = set(syn.get("when_all", []))
        if all(req in chosen_set for req in reqs):
            active.append(syn["id"])
    return active

def compute_known_counters(spec, chosen_set):
    out = []
    for item in spec.get("global_rules",{}).get("counters_reference", []):
        ctr_parts = item.get("counters", [])
        hit = any(any(k.endswith("."+c) or c in k for k in chosen_set) for c in ctr_parts)
        if hit: out.append(item["counter"])
    return out

def validate_biomes_and_affixes(globals_, sp, warnings, errors):
    unknown_biomes = [b for b in sp.get("biomes", []) if b not in globals_["biomes"]]
    if unknown_biomes:
        errors.append(f"unknown biomes: {unknown_biomes}")
    bm = sp.get("biome_mods", {})
    for k in ("mood","diff_base_mod"):
        for b in (bm.get(k, {}) or {}).keys():
            if b not in globals_["biomes"]:
                errors.append(f"biome_mods.{k}: unknown biome '{b}'")
    for a in (bm.get("affix_bias", {}) or {}).keys():
        if a not in globals_["affixes"]:
            errors.append(f"biome_mods.affix_bias: unknown affix '{a}'")

def validate_spawn_roles(globals_, sp, warnings, errors):
    rp = sp.get("spawn_profile", {})
    rw = rp.get("role_weights", {}) or {}
    bad = [r for r in rw.keys() if r not in globals_["roles"]]
    if bad:
        errors.append(f"spawn_profile.role_weights: unknown roles {bad}")
    if any((not isinstance(v, int) or v < 0) for v in rw.values()):
        errors.append("spawn_profile.role_weights: values must be non-negative integers")

def validate_vc_signature(globals_, sp, warnings, errors):
    vc = sp.get("vc_signature")
    if not vc:
        warnings.append("vc_signature missing")
        return
    extra = set(vc.keys()) - globals_["vc_indices"]
    missing = globals_["vc_indices"] - set(vc.keys())
    if extra:
        errors.append(f"vc_signature: unknown indices {sorted(extra)}")
    if missing:
        warnings.append(f"vc_signature: missing indices {sorted(missing)}")
    if vc:
        for k,v in vc.items():
            try:
                f = float(v)
                if f < 0 or f > 1: warnings.append(f"vc_signature.{k} out of range [0,1]: {v}")
            except Exception:
                errors.append(f"vc_signature.{k} not numeric: {v}")

def validate_nest_profile(sp, warnings, errors):
    np = sp.get("nest_profile")
    if not np:
        warnings.append("nest_profile missing")
        return
    required = ["env","structure","security","resources","privacy"]
    missing = [k for k in required if k not in np]
    if missing:
        errors.append(f"nest_profile: missing keys {missing}")
        return
    env = np.get("env", {})
    if not isinstance(env, dict) or any(k not in env for k in ["temp","humidity","light"]):
        warnings.append("nest_profile.env should include temp/humidity/light")
    if not isinstance(np.get("structure"), list) or not all(isinstance(x,str) for x in np["structure"]):
        warnings.append("nest_profile.structure should be a list of strings")
    if not isinstance(np.get("security"), int):
        warnings.append("nest_profile.security should be an integer")
    if not isinstance(np.get("resources"), list) or not all(isinstance(x,str) for x in np["resources"]):
        warnings.append("nest_profile.resources should be a list of strings")
    if not isinstance(np.get("privacy"), bool):
        warnings.append("nest_profile.privacy should be boolean")

def validate(path):
    spec = load_yaml(path)
    by_slot, synmap = collect_catalog(spec)
    res_cap, dr_cap = get_caps(spec)
    globals_ = get_globals(spec)

    report = {"file": path, "species": [], "errors": 0, "warnings": 0}
    for sp in spec.get("species", []):
        sid = sp["id"]; dp = sp.get("default_parts", {})
        errors, warnings = [], []

        est = sp.get("estimated_weight", 0)
        bud = sp.get("weight_budget", spec["global_rules"]["morph_budget"]["default_weight_budget"])
        over_budget = est > bud
        if over_budget: warnings.append(f"estimated_weight {est} exceeds budget {bud}")

        for slot in ["locomotion","metabolism"]:
            pid = dp.get(slot)
            if pid and pid not in by_slot.get(slot, set()):
                errors.append(f"missing part: {slot}.{pid}")
        for slot in ["offense","defense","senses"]:
            for pid in dp.get(slot, []) or []:
                if pid not in by_slot.get(slot, set()):
                    errors.append(f"missing part: {slot}.{pid}")

        for syn in sp.get("synergy_hints", []) or []:
            if syn not in synmap:
                warnings.append(f"synergy hint '{syn}' not in catalog.synergies")

        res_sum, vuln_sum, dr_sum = accumulate_resistances(spec, dp)
        for t,v in res_sum.items():
            if v > res_cap: warnings.append(f"res cap exceeded: {t}={v} > {res_cap}")
        for t,v in dr_sum.items():
            if v > dr_cap: warnings.append(f"dr cap exceeded: {t}={v} > {dr_cap}")

        validate_biomes_and_affixes(globals_, sp, warnings, errors)
        validate_spawn_roles(globals_, sp, warnings, errors)
        validate_vc_signature(globals_, sp, warnings, errors)
        validate_nest_profile(sp, warnings, errors)

        chosen_set     = gather_chosen_parts(dp)
        active_syn     = compute_active_synergies(spec, chosen_set)
        known_counters = compute_known_counters(spec, chosen_set)

        report["species"].append({
            "id": sid,
            "display_name": sp.get("display_name", sid),
            "budget": {"used": est, "max": bud, "over_budget": over_budget},
            "parts_ok": len([e for e in errors if e.startswith("missing part")]) == 0,
            "active_synergies": active_syn,
            "synergy_hints": sp.get("synergy_hints", []),
            "known_counters": known_counters,
            "res_summary": res_sum,
            "vuln_summary": vuln_sum,
            "dr_summary": dr_sum,
            "warnings": warnings,
            "errors": errors
        })
        report["errors"]   += len(errors)
        report["warnings"] += len(warnings)

    report["ui_summary"] = [{
        "id": s["id"],
        "name": s["display_name"],
        "budget": f'{s["budget"]["used"]}/{s["budget"]["max"]}',
        "over_budget": s["budget"]["over_budget"],
        "active_synergies": s["active_synergies"],
        "known_counters": s["known_counters"],
        "warnings": s["warnings"]
    } for s in report["species"]]

    import json
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["errors"] == 0 else 1

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default="data/species.yaml")
    args = ap.parse_args()
    import sys
    sys.exit(validate(args.path))
