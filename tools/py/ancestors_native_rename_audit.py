#!/usr/bin/env python3
"""Ancestor-trait native-rename AUDIT (read-only) -- HITL istruttoria support.

Generates the audit + deterministic native-id candidate map for the 290
`ancestor_*` traits wired in active_effects.yaml. Does NOT modify any data
file -- output is a single CSV artifact + stdout summary for master-dd review.

The "native candidate" is a DETERMINISTIC mechanical floor = slugify(label_it)
(drop the `ancestor_<branch>_..._<code>` envelope). It is NOT a thematic name
(e.g. the seed `..._fr_06` -> `mente_focalizzata` is a creative rebrand off the
EFFECT, not derivable from label_it). Thematic polish stays a per-trait
master-dd design call; this tool quantifies collisions + ripple so the
blast-radius of any rename convention is visible.

Usage: python tools/py/ancestors_native_rename_audit.py
Output: docs/planning/ancestor-trait-native-rename-candidates.csv
"""
from __future__ import annotations

import csv
import json
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ACTIVE = os.path.join(ROOT, "data", "core", "traits", "active_effects.yaml")
GLOSSARY = os.path.join(ROOT, "data", "core", "traits", "glossary.json")
BIOME_POOLS = os.path.join(ROOT, "data", "core", "traits", "biome_pools.json")
TEST_FILE = os.path.join(ROOT, "tests", "services", "enemyTagGate.test.js")
OUT_CSV = os.path.join(ROOT, "docs", "planning",
                       "ancestor-trait-native-rename-candidates.csv")


def slugify(s: str) -> str:
    """ASCII snake_case slug (same normalization as ancestors_style_guide_proposal_v2)."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").lower()
    s = re.sub(r"_+", "_", s)
    if not s or not s[0].isalpha():
        s = "x_" + s
    return s


def main() -> int:
    import yaml  # pyyaml available per trait_schema_gate.py

    with open(ACTIVE, encoding="utf-8") as f:
        ae = yaml.safe_load(f)
    traits = ae["traits"]

    with open(GLOSSARY, encoding="utf-8") as f:
        gloss = json.load(f)["traits"]

    with open(BIOME_POOLS, encoding="utf-8") as f:
        biome_raw = f.read()

    test_raw = ""
    if os.path.exists(TEST_FILE):
        with open(TEST_FILE, encoding="utf-8") as f:
            test_raw = f.read()

    native_ids = {k for k in traits if not k.startswith("ancestor_")}
    native_ids |= {k for k in gloss if not k.startswith("ancestor_")}

    rows = []
    cand_count: dict[str, int] = {}
    for tid, entry in traits.items():
        if not tid.startswith("ancestor_"):
            continue
        if not isinstance(entry, dict):
            continue
        label_it = entry.get("label_it", "")
        cand = slugify(label_it) if label_it else "x_no_label"
        cand_count[cand] = cand_count.get(cand, 0) + 1
        eff = entry.get("effect", {}) or {}
        rows.append({
            "old_id": tid,
            "label_it": label_it,
            "label_en": entry.get("label_en", ""),
            "tier": entry.get("tier", ""),
            "category": entry.get("category", ""),
            "effect_kind": eff.get("kind", ""),
            "status": eff.get("stato", ""),
            "prov_code": (entry.get("provenance", {}) or {}).get("code", ""),
            "native_candidate": cand,
            "in_glossary": tid in gloss,
            "in_biome_pools": tid in biome_raw,
            "in_test": tid in test_raw,
            "logtag_selfref": eff.get("log_tag", "") == tid,
        })

    # collision flags
    intra = {c for c, n in cand_count.items() if n > 1}
    for r in rows:
        c = r["native_candidate"]
        flags = []
        if c in intra:
            flags.append(f"INTRA_COLLISION(x{cand_count[c]})")
        if c in native_ids:
            flags.append("COLLIDES_EXISTING_NATIVE")
        r["collision"] = ";".join(flags) if flags else ""

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    cols = ["old_id", "native_candidate", "collision", "label_it", "label_en",
            "tier", "category", "effect_kind", "status", "prov_code",
            "in_glossary", "in_biome_pools", "in_test", "logtag_selfref"]
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in sorted(rows, key=lambda x: x["old_id"]):
            w.writerow(r)

    # summary
    n = len(rows)
    n_intra = sum(1 for r in rows if "INTRA_COLLISION" in r["collision"])
    n_native = sum(1 for r in rows if "COLLIDES_EXISTING_NATIVE" in r["collision"])
    n_biome = sum(1 for r in rows if r["in_biome_pools"])
    n_test = sum(1 for r in rows if r["in_test"])
    n_logtag = sum(1 for r in rows if r["logtag_selfref"])
    n_gloss = sum(1 for r in rows if r["in_glossary"])
    uniq_cand = len(cand_count)
    print(f"ancestor traits audited        : {n}")
    print(f"unique native_candidate slugs  : {uniq_cand}  ({n - uniq_cand} would be lost to collision)")
    print(f"rows w/ INTRA collision        : {n_intra}")
    print(f"rows colliding existing native : {n_native}")
    print(f"colliding candidate groups     : {len(intra)}")
    print(f"-- ripple consumers --")
    print(f"in glossary.json (key)         : {n_gloss}")
    print(f"in biome_pools.json (PCG)      : {n_biome}")
    print(f"in enemyTagGate.test.js        : {n_test}")
    print(f"self-ref log_tag in active_eff : {n_logtag}")
    print(f"OUT: {OUT_CSV}")
    # show worst collision groups
    worst = sorted(((c, nn) for c, nn in cand_count.items() if nn > 1),
                   key=lambda x: -x[1])[:12]
    print("-- top collision groups (native_candidate -> count) --")
    for c, nn in worst:
        print(f"  {nn:>2}x  {c}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
