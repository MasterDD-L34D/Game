#!/usr/bin/env python3
"""Ancestor native-rename APPLY (Option C: dedup + rename) -- destructive, branch-only.

Self-contained: recomputes the old->new map directly from active_effects.yaml
(same grouping as the namedraft) so it does not depend on the CSV at runtime.

Per group (key = slug(label_it)):
  - singleton            -> AUTO  : new = slug(label_it)
  - identical mechanics  -> DEDUP : keep 1 (new = base), RETIRE the rest
  - differ by trig/eff   -> DISAMB: new = base + '_' + discriminator

Applies, across every surface (provenance discarded per master-dd 2026-06-23):
  - active_effects.yaml : rename kept keys + log_tag, REMOVE retired blocks, strip provenance:
  - glossary.json       : rename kept keys, drop retired keys (covers glossary-only ancestors too)
  - biome_pools.json    : kept ref -> new id; retired ref -> kept-sibling new id (fuse); dedupe arrays
  - enemyTagGate.test.js: rename kept refs / fuse retired refs

Writes manifest docs/planning/ancestor-rename-applied-manifest.csv.
DC-01 NOTE: ancestors are absent from index.json/per-trait files, so the schema
gate does NOT require a design-block here -- no backfill performed (that is a
separate decision, only relevant if ancestors get indexed later).

Usage: python tools/py/ancestors_native_rename_apply.py [--dry-run]
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import unicodedata
from collections import OrderedDict, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ACTIVE = os.path.join(ROOT, "data", "core", "traits", "active_effects.yaml")
GLOSSARY = os.path.join(ROOT, "data", "core", "traits", "glossary.json")
BIOME = os.path.join(ROOT, "data", "core", "traits", "biome_pools.json")
TEST = os.path.join(ROOT, "tests", "services", "enemyTagGate.test.js")
MANIFEST = os.path.join(ROOT, "docs", "planning", "ancestor-rename-applied-manifest.csv")


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").lower()
    return re.sub(r"_+", "_", s) or "x"


def signature(v: dict) -> tuple:
    eff = v.get("effect", {}) or {}
    trg = v.get("trigger", {}) or {}
    return (str(v.get("tier")),
            tuple(sorted((k, str(x)) for k, x in eff.items() if k != "log_tag")),
            tuple(sorted((k, str(x)) for k, x in trg.items())))


def build_map(traits: dict, gloss: dict):
    """Return (rename_map kept old->new, remove_set retired olds, fuse_map retired->keep new)."""
    groups = defaultdict(list)
    for k, v in traits.items():
        if k.startswith("ancestor_") and isinstance(v, dict):
            groups[slug(v.get("label_it", ""))].append((k, v))

    existing_native = {k for k in traits if not k.startswith("ancestor_")}
    existing_native |= {k for k in gloss if not k.startswith("ancestor_")}
    used = set(existing_native)

    def uniq(name):
        n = name
        i = 1
        while n in used:
            i += 1
            n = f"{name}_{i}"
        used.add(n)
        return n

    rename_map: dict[str, str] = {}
    remove_set: set[str] = set()
    fuse_map: dict[str, str] = {}
    disp: dict[str, str] = {}

    for base, members in groups.items():
        members.sort(key=lambda kv: (kv[1].get("provenance", {}) or {}).get("code", kv[0]))
        if len(members) == 1:
            k, _ = members[0]
            rename_map[k] = uniq(base)
            disp[k] = "AUTO"
            continue
        sigs = {signature(v) for _, v in members}
        if len(sigs) == 1:
            keep_id = uniq(base)
            rename_map[members[0][0]] = keep_id
            disp[members[0][0]] = "DEDUP_KEEP"
            for k, _ in members[1:]:
                remove_set.add(k)
                fuse_map[k] = keep_id
                disp[k] = "DEDUP_RETIRE"
            continue
        # disambiguate
        all_kv = defaultdict(set)
        for _, v in members:
            for src in (v.get("trigger", {}) or {}, v.get("effect", {}) or {}):
                for kk, vv in src.items():
                    if kk != "log_tag":
                        all_kv[kk].add(str(vv))
        varying = [kk for kk, vals in all_kv.items() if len(vals) > 1]
        for k, v in members:
            parts = []
            for kk in varying:
                val = (v.get("trigger", {}) or {}).get(kk, (v.get("effect", {}) or {}).get(kk, ""))
                if val != "":
                    parts.append(slug(str(val)))
            disc = "_".join(parts) or slug((v.get("provenance", {}) or {}).get("code", "x"))
            rename_map[k] = uniq(f"{base}_{disc}")
            disp[k] = "DISAMB"

    # glossary-only ancestors (not wired in active_effects) -> rename by their label too
    for k, v in gloss.items():
        if k.startswith("ancestor_") and k not in rename_map and k not in remove_set:
            label = v.get("label_it", "") if isinstance(v, dict) else ""
            rename_map[k] = uniq(slug(label) if label else k.replace("ancestor_", ""))
            disp[k] = "GLOSS_ONLY"
    return rename_map, remove_set, fuse_map, disp


def rewrite_active(lines, rename_map, remove_set):
    """Text rewrite: rename kept headers + log_tag, drop retired blocks + provenance: blocks."""
    out = []
    i = 0
    n = len(lines)
    header_re = re.compile(r"^  (ancestor_[a-z0-9_]+):\s*$")
    removed = renamed = prov_stripped = 0
    while i < n:
        m = header_re.match(lines[i])
        if not m:
            out.append(lines[i]); i += 1; continue
        old = m.group(1)
        # find block extent
        j = i + 1
        while j < n and not re.match(r"^  [a-z]", lines[j]):
            j += 1
        block = lines[i:j]
        if old in remove_set:
            removed += 1
            i = j; continue
        new = rename_map.get(old, old)
        if new != old:
            block[0] = f"  {new}:\n"
            renamed += 1
        # within block: fix log_tag + strip provenance:
        nb = []
        k = 0
        while k < len(block):
            ln = block[k]
            if re.match(r"^      log_tag:\s*" + re.escape(old) + r"\s*$", ln):
                nb.append(f"      log_tag: {new}\n"); k += 1; continue
            if re.match(r"^    provenance:\s*$", ln):
                prov_stripped += 1
                k += 1
                while k < len(block) and re.match(r"^      ", block[k]):
                    k += 1
                continue
            nb.append(ln); k += 1
        out.extend(nb)
        i = j
    return out, removed, renamed, prov_stripped


def map_biome(obj, rename_map, fuse_map):
    """Recursively map ancestor refs in arrays; dedupe lists of strings."""
    if isinstance(obj, list):
        new = [map_biome(x, rename_map, fuse_map) for x in obj]
        if new and all(isinstance(x, str) for x in new):
            seen = set(); dedup = []
            for x in new:
                if x not in seen:
                    seen.add(x); dedup.append(x)
            return dedup
        return new
    if isinstance(obj, dict):
        return {k: map_biome(v, rename_map, fuse_map) for k, v in obj.items()}
    if isinstance(obj, str) and obj.startswith("ancestor_"):
        return rename_map.get(obj) or fuse_map.get(obj) or obj
    return obj


def main() -> int:
    import yaml
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    traits = yaml.safe_load(open(ACTIVE, encoding="utf-8"))["traits"]
    gloss = json.load(open(GLOSSARY, encoding="utf-8", ), object_pairs_hook=OrderedDict)["traits"]
    rename_map, remove_set, fuse_map, disp = build_map(traits, gloss)

    from collections import Counter
    c = Counter(disp.values())
    print(f"AUTO={c['AUTO']} DEDUP_KEEP={c['DEDUP_KEEP']} DEDUP_RETIRE={c['DEDUP_RETIRE']} "
          f"DISAMB={c['DISAMB']} GLOSS_ONLY={c['GLOSS_ONLY']}")
    print(f"rename(kept)={len(rename_map)} remove(retired)={len(remove_set)}")

    # active_effects
    lines = open(ACTIVE, encoding="utf-8").readlines()
    new_lines, removed, renamed, prov = rewrite_active(lines, rename_map, remove_set)
    print(f"active_effects: renamed={renamed} removed_blocks={removed} provenance_stripped={prov}")

    # glossary
    full_gloss = json.load(open(GLOSSARY, encoding="utf-8"), object_pairs_hook=OrderedDict)
    g_renamed = g_removed = 0
    newtraits = OrderedDict()
    for k, v in full_gloss["traits"].items():
        if k in remove_set:
            g_removed += 1; continue
        nk = rename_map.get(k, k)
        if nk != k:
            g_renamed += 1
        newtraits[nk] = v
    full_gloss["traits"] = newtraits
    print(f"glossary: renamed={g_renamed} removed={g_removed} total_after={len(newtraits)}")

    # biome_pools
    biome = json.load(open(BIOME, encoding="utf-8"), object_pairs_hook=OrderedDict)
    biome_new = map_biome(biome, rename_map, fuse_map)
    import re as _re
    b_before = len(_re.findall(r"ancestor_", json.dumps(biome)))
    b_after = len(_re.findall(r"ancestor_", json.dumps(biome_new)))
    print(f"biome_pools: ancestor_ refs {b_before} -> {b_after} (target 0)")

    # test
    test_txt = open(TEST, encoding="utf-8").read() if os.path.exists(TEST) else ""
    t_before = test_txt.count("ancestor_")
    for old in list(rename_map) + list(fuse_map):
        new = rename_map.get(old) or fuse_map.get(old)
        test_txt = test_txt.replace(old, new)
    t_after = test_txt.count("ancestor_")
    print(f"test: ancestor_ refs {t_before} -> {t_after} (target 0)")

    if args.dry_run:
        print("[DRY RUN] no files written")
        return 0

    open(ACTIVE, "w", encoding="utf-8", newline="\n").writelines(new_lines)
    with open(GLOSSARY, "w", encoding="utf-8", newline="\n") as f:
        json.dump(full_gloss, f, ensure_ascii=False, indent=2); f.write("\n")
    with open(BIOME, "w", encoding="utf-8", newline="\n") as f:
        json.dump(biome_new, f, ensure_ascii=False, indent=2); f.write("\n")
    if test_txt:
        open(TEST, "w", encoding="utf-8", newline="\n").write(test_txt)

    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(["old_id", "disposition", "new_id_or_fuse_target"])
        for old in sorted(disp):
            tgt = rename_map.get(old) or fuse_map.get(old) or ""
            w.writerow([old, disp[old], tgt])
    print(f"WROTE files + manifest {MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
