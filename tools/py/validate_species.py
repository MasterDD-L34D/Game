#!/usr/bin/env python3
import sys
import json
import yaml
import argparse
from collections import defaultdict
from pathlib import Path


def _maybe_load_yaml(path: Path | None):
    if path is None:
        return None
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _build_biome_resolver(biomes_data, aliases_data):
    canonical = set()
    if isinstance(biomes_data, dict):
        biomes_section = biomes_data.get("biomes") or {}
        if isinstance(biomes_section, dict):
            canonical = {str(key) for key in biomes_section.keys()}

    resolver: dict[str, str] = {}
    alias_tokens: set[str] = set()

    def _register(token: str, canonical_id: str, is_alias: bool = False) -> None:
        key = token.casefold()
        resolver[key] = canonical_id
        if is_alias:
            alias_tokens.add(key)

    def _variants(token: str) -> set[str]:
        variants = {
            token,
            token.replace("-", "_"),
            token.replace("_", "-"),
            token.replace(" ", "_"),
            token.replace(" ", "-"),
        }
        return {variant for variant in variants if variant}

    for canonical_id in canonical:
        for variant in _variants(canonical_id):
            _register(variant, canonical_id)

    alias_entries = {}
    if isinstance(aliases_data, dict):
        alias_entries = aliases_data.get("aliases") or {}

    for alias, payload in (alias_entries or {}).items():
        if isinstance(payload, dict):
            canonical_id = payload.get("canonical")
        else:
            canonical_id = payload
        if not canonical_id:
            continue
        canonical_id = str(canonical_id)
        if canonical and canonical_id not in canonical:
            continue
        alias_str = str(alias)
        for variant in _variants(alias_str):
            _register(variant, canonical_id, is_alias=True)

    return canonical, resolver, alias_tokens


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
    dr_cap = caps.get("dr_cap_per_type", 1) if "dr_cap_per_type" in caps else 1
    return res_cap, dr_cap


def gather_chosen_parts(dp):
    chosen = set()
    for slot in ["locomotion", "metabolism"]:
        if dp.get(slot):
            chosen.add(f"{slot}.{dp[slot]}")
    for slot in ["offense", "defense", "senses"]:
        for pid in dp.get(slot, []) or []:
            chosen.add(f"{slot}.{pid}")
    return chosen


def resolve_part(spec, slot, pid):
    return spec["catalog"]["slots"][slot].get(pid)


def accumulate_resistances(spec, dp):
    res_sum, vuln_sum, dr_sum = defaultdict(int), defaultdict(int), defaultdict(int)

    def acc(slot, pid):
        part = resolve_part(spec, slot, pid)
        if not part:
            return
        eff = part.get("effects", {})
        r = eff.get("resistances", {})
        for t, v in (r.get("res") or {}).items():
            res_sum[t] += int(v)
        for t, v in (r.get("vuln") or {}).items():
            vuln_sum[t] += int(v)
        for t, v in (r.get("dr") or {}).items():
            dr_sum[t] += int(v)

    for s in ["locomotion", "metabolism"]:
        if dp.get(s):
            acc(s, dp[s])
    for s in ["offense", "defense", "senses"]:
        for pid in dp.get(s, []) or []:
            acc(s, pid)
    return dict(res_sum), dict(vuln_sum), dict(dr_sum)


def compute_active_synergies(spec, chosen_set):
    active = []
    for syn in spec.get("catalog", {}).get("synergies", []):
        reqs = set(syn.get("when_all", []))
        if all(req in chosen_set for req in reqs):
            active.append(syn["id"])
    return active


def compute_known_counters(spec, chosen_set):
    out = []
    for item in spec.get("global_rules", {}).get("counters_reference", []):
        ctr_parts = item.get("counters", [])
        hit = any(
            any(k.endswith("." + c) or c in k for k in chosen_set) for c in ctr_parts
        )
        if hit:
            out.append(item["counter"])
    return out


def validate(
    path,
    baseline_path: Path | None = None,
    biomes_path: Path | None = None,
    biome_aliases_path: Path | None = None,
):
    spec = load_yaml(path)
    by_slot, synmap = collect_catalog(spec)
    res_cap, dr_cap = get_caps(spec)

    baseline_data = _maybe_load_yaml(baseline_path)
    biomes_data = _maybe_load_yaml(biomes_path)
    biome_aliases = _maybe_load_yaml(biome_aliases_path)

    canonical_biomes, biome_resolver, alias_tokens = _build_biome_resolver(
        biomes_data, biome_aliases
    )

    def _resolve_biome(token: str | None) -> tuple[str | None, bool]:
        if not isinstance(token, str):
            return None, False
        key = token.casefold()
        resolved = biome_resolver.get(key)
        return resolved, key in alias_tokens

    def _normalize_biome_set(values):
        normalized = set()
        for value in values:
            resolved, _ = _resolve_biome(value)
            if resolved:
                normalized.add(resolved)
            elif isinstance(value, str):
                normalized.add(value)
        return normalized

    baseline_traits = {}
    trait_biomes = {}
    if isinstance(baseline_data, dict):
        baseline_traits = baseline_data.get("traits", {})
        trait_biomes = {
            trait_id: _normalize_biome_set((entry.get("biomi") or {}).keys())
            for trait_id, entry in baseline_traits.items()
        }

    report = {"file": path, "species": [], "errors": 0, "warnings": 0}
    for sp in spec.get("species", []):
        sid = sp["id"]
        dp = sp.get("default_parts", {})
        errors, warnings = [], []

        biome_affinity = sp.get("biome_affinity")
        if biome_affinity and canonical_biomes:
            resolved, used_alias = _resolve_biome(biome_affinity)
            if not resolved:
                errors.append(
                    f"biome_affinity '{biome_affinity}' non definito in biomes dataset"
                )
            elif used_alias:
                warnings.append(
                    f"biome_affinity '{biome_affinity}' utilizza un alias, usare '{resolved}'"
                )

        trait_plan = sp.get("trait_plan") or {}
        if trait_plan:
            for key in ["core", "optional", "synergies"]:
                values = trait_plan.get(key) or []
                if not isinstance(values, list):
                    errors.append(f"trait_plan.{key} deve essere una lista")
                    continue
                if baseline_traits:
                    missing = [tid for tid in values if tid not in baseline_traits]
                    if missing:
                        errors.append(f"tratti {missing} non presenti nel trait baseline")
                if key == "core" and len(values) < 2:
                    warnings.append("trait_plan.core dovrebbe contenere almeno 2 tratti")
                if key == "optional" and len(values) < 2:
                    warnings.append("trait_plan.optional dovrebbe contenere almeno 2 tratti")
                if key == "synergies" and len(values) < 1:
                    warnings.append("trait_plan.synergies dovrebbe contenere almeno 1 tratto")

            env_focus = trait_plan.get("environment_focus") or {}
            biome_class = env_focus.get("biome_class")
            if biome_class and trait_biomes:
                resolved_biome, alias_used = _resolve_biome(biome_class)
                lookup_biome = resolved_biome or biome_class
                available_traits = [
                    tid
                    for tid in (trait_plan.get("core") or []) + (trait_plan.get("optional") or [])
                    if lookup_biome in trait_biomes.get(tid, set())
                ]
                if not available_traits:
                    warnings.append(
                        f"nessun tratto del piano supporta biome_class '{biome_class}'"
                    )
                if resolved_biome and alias_used:
                    warnings.append(
                        f"environment_focus.biome_class '{biome_class}' utilizza un alias, usare '{resolved_biome}'"
                    )
            elif biome_class and canonical_biomes and not _resolve_biome(biome_class)[0]:
                warnings.append(
                    f"environment_focus.biome_class '{biome_class}' non è un bioma noto"
                )

        est = sp.get("estimated_weight", 0)
        bud = sp.get("weight_budget", spec["global_rules"]["morph_budget"]["default_weight_budget"])
        over_budget = est > bud
        if over_budget:
            warnings.append(f"estimated_weight {est} exceeds budget {bud}")

        for slot in ["locomotion", "metabolism"]:
            pid = dp.get(slot)
            if pid and pid not in by_slot.get(slot, set()):
                errors.append(f"missing part: {slot}.{pid}")
        for slot in ["offense", "defense", "senses"]:
            for pid in dp.get(slot, []) or []:
                if pid not in by_slot.get(slot, set()):
                    errors.append(f"missing part: {slot}.{pid}")

        for syn in sp.get("synergy_hints", []) or []:
            if syn not in synmap:
                warnings.append(f"synergy hint '{syn}' not in catalog.synergies")

        res_sum, vuln_sum, dr_sum = accumulate_resistances(spec, dp)
        for t, v in res_sum.items():
            if v > res_cap:
                warnings.append(f"res cap exceeded: {t}={v} > {res_cap}")
        for t, v in dr_sum.items():
            if v > dr_cap:
                warnings.append(f"dr cap exceeded: {t}={v} > {dr_cap}")

        chosen_set = gather_chosen_parts(dp)
        active_syn = compute_active_synergies(spec, chosen_set)
        known_counters = compute_known_counters(spec, chosen_set)

        report["species"].append(
            {
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
                "trait_plan": trait_plan,
                "warnings": warnings,
                "errors": errors,
            }
        )
        report["errors"] += len(errors)
        report["warnings"] += len(warnings)

    report["ui_summary"] = [
        {
            "id": s["id"],
            "name": s["display_name"],
            "budget": f'{s["budget"]["used"]}/{s["budget"]["max"]}',
            "over_budget": s["budget"]["over_budget"],
            "active_synergies": s["active_synergies"],
            "known_counters": s["known_counters"],
            "warnings": s["warnings"],
        }
        for s in report["species"]
    ]

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["errors"] == 0 else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default="data/species.yaml")
    ap.add_argument(
        "--baseline",
        type=Path,
        default=Path("data/analysis/trait_baseline.yaml"),
        help="Percorso al dataset del trait baseline",
    )
    ap.add_argument(
        "--biomes",
        type=Path,
        default=Path("data/biomes.yaml"),
        help="Dataset biomi per validare le affinità specie",
    )
    ap.add_argument(
        "--biome-aliases",
        type=Path,
        default=Path("data/biome_aliases.yaml"),
        help="Mappa YAML degli alias dei biomi",
    )
    args = ap.parse_args()
    sys.exit(
        validate(
            args.path,
            baseline_path=args.baseline,
            biomes_path=args.biomes,
            biome_aliases_path=args.biome_aliases,
        )
    )
