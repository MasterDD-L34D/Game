#!/usr/bin/env python3
"""Ancestor native-rename NAME DRAFT (read-only) -- Option C fase-1 prep.

Builds a per-trait old_id -> proposed_native_id draft for the 290 ancestor_*
traits, reducing the ~215 colliding decisions to a reviewable table:

- AUTO_UNIQUE  : slugify(label_it) is already unique -> use as-is.
- DEDUP_*      : group members share an IDENTICAL mechanical signature
                 (tier + effect + trigger); branch/prov_code differences are
                 ignored (provenance is being discarded under Option C).
                 -> keep 1 (DEDUP_KEEP), flag the rest (DEDUP_RETIRE).
- DISAMBIGUATED: group members differ on a trigger/effect field -> distinct
                 names with a deterministic discriminator (e.g. the target tag);
                 needs_master_dd=True (the discriminator is a placeholder, swap
                 for a thematic name).

This is a DRAFT FOR RATIFY. It does NOT rename anything. master-dd ratifies the
dedups + replaces placeholder discriminators with thematic names. DC-01 backfill
(famiglia_tipologia/slot_profile) is handled in the execution PR, not here.

Usage: python tools/py/ancestors_native_rename_namedraft.py
Output: docs/planning/ancestor-trait-native-rename-namedraft.csv
"""
from __future__ import annotations

import csv
import json
import os
import re
import unicodedata
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ACTIVE = os.path.join(ROOT, "data", "core", "traits", "active_effects.yaml")
GLOSSARY = os.path.join(ROOT, "data", "core", "traits", "glossary.json")
BIOME_POOLS = os.path.join(ROOT, "data", "core", "traits", "biome_pools.json")
OUT_CSV = os.path.join(ROOT, "docs", "planning",
                       "ancestor-trait-native-rename-namedraft.csv")


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").lower()
    s = re.sub(r"_+", "_", s)
    return s or "x"


def signature(v: dict) -> tuple:
    """Mechanical identity: tier + effect + trigger (branch/code ignored)."""
    eff = v.get("effect", {}) or {}
    trg = v.get("trigger", {}) or {}
    eff_sig = tuple(sorted((k, str(x)) for k, x in eff.items() if k != "log_tag"))
    trg_sig = tuple(sorted((k, str(x)) for k, x in trg.items()))
    return (str(v.get("tier")), eff_sig, trg_sig)


def trigger_summary(v: dict) -> str:
    trg = v.get("trigger", {}) or {}
    return ";".join(f"{k}={trg[k]}" for k in sorted(trg))


def main() -> int:
    import yaml

    traits = yaml.safe_load(open(ACTIVE, encoding="utf-8"))["traits"]
    gloss = json.load(open(GLOSSARY, encoding="utf-8"))["traits"]
    biome_raw = open(BIOME_POOLS, encoding="utf-8").read()
    existing_native = {k for k in traits if not k.startswith("ancestor_")}
    existing_native |= {k for k in gloss if not k.startswith("ancestor_")}

    groups: dict[str, list] = defaultdict(list)
    for k, v in traits.items():
        if k.startswith("ancestor_") and isinstance(v, dict):
            groups[slug(v.get("label_it", ""))].append((k, v))

    rows = []
    for base, members in groups.items():
        members.sort(key=lambda kv: (kv[1].get("provenance", {}) or {}).get("code", kv[0]))
        if len(members) == 1:
            k, v = members[0]
            rows.append((k, v, base, "AUTO_UNIQUE", False, "candidato unico"))
            continue
        sigs = {signature(v) for _, v in members}
        if len(sigs) == 1:
            # identical mechanics -> dedup
            for i, (k, v) in enumerate(members):
                if i == 0:
                    rows.append((k, v, base, "DEDUP_KEEP", True,
                                 f"identico ad altri {len(members)-1} (mechanics uguali)"))
                else:
                    rows.append((k, v, f"{base}__retire{i}", "DEDUP_RETIRE", True,
                                 "duplicato meccanico: ritirare o fondere"))
            continue
        # differ -> find varying trigger/effect keys, build discriminator
        all_kv = defaultdict(set)
        for _, v in members:
            for src in (v.get("trigger", {}) or {}, v.get("effect", {}) or {}):
                for kk, vv in src.items():
                    if kk == "log_tag":
                        continue
                    all_kv[kk].add(str(vv))
        varying = [kk for kk, vals in all_kv.items() if len(vals) > 1]
        for k, v in members:
            disc_parts = []
            for kk in varying:
                src = (v.get("trigger", {}) or {})
                val = src.get(kk, (v.get("effect", {}) or {}).get(kk, ""))
                if val != "":
                    disc_parts.append(slug(str(val)))
            disc = "_".join(disc_parts) or slug((v.get("provenance", {}) or {}).get("code", "x"))
            rows.append((k, v, f"{base}_{disc}", "DISAMBIGUATED", True,
                         f"differisce per {','.join(varying)} -> discriminator placeholder"))

    # global uniqueness pass
    seen: dict[str, int] = {}
    final = []
    for k, v, prop, disp, needs, basis in rows:
        p = prop
        if disp == "DEDUP_RETIRE":
            p = prop  # retire rows keep marker, not a real id
        else:
            if p in existing_native:
                needs = True
                basis += " | COLLIDE id nativo esistente"
            seen[p] = seen.get(p, 0) + 1
            if seen[p] > 1:
                p = f"{p}_{seen[p]}"
                needs = True
        eff = v.get("effect", {}) or {}
        final.append({
            "old_id": k,
            "proposed_native": p,
            "disposition": disp,
            "needs_master_dd": needs,
            "basis": basis,
            "label_it": v.get("label_it", ""),
            "tier": v.get("tier", ""),
            "category": v.get("category", ""),
            "effect_kind": eff.get("kind", ""),
            "status": eff.get("stato", ""),
            "amount": eff.get("amount", ""),
            "trigger": trigger_summary(v),
            "prov_code": (v.get("provenance", {}) or {}).get("code", ""),
            "in_biome_pools": k in biome_raw,
        })

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    cols = ["old_id", "proposed_native", "disposition", "needs_master_dd", "basis",
            "label_it", "tier", "category", "effect_kind", "status", "amount",
            "trigger", "prov_code", "in_biome_pools"]
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in sorted(final, key=lambda x: x["old_id"]):
            w.writerow(r)

    from collections import Counter
    c = Counter(r["disposition"] for r in final)
    n_groups_dedup = sum(1 for b, m in groups.items()
                         if len(m) > 1 and len({signature(v) for _, v in m}) == 1)
    n_groups_disamb = sum(1 for b, m in groups.items()
                          if len(m) > 1 and len({signature(v) for _, v in m}) > 1)
    print(f"total ancestor traits     : {len(final)}")
    print(f"AUTO_UNIQUE (auto-rename) : {c['AUTO_UNIQUE']}")
    print(f"DEDUP_KEEP (keep 1)       : {c['DEDUP_KEEP']}   ({n_groups_dedup} pure-dup groups)")
    print(f"DEDUP_RETIRE (retire/fuse): {c['DEDUP_RETIRE']}")
    print(f"DISAMBIGUATED (placeholder): {c['DISAMBIGUATED']}  ({n_groups_disamb} groups)")
    print(f"needs_master_dd rows      : {sum(1 for r in final if r['needs_master_dd'])}")
    print(f"OUT: {OUT_CSV}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
