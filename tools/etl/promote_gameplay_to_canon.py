#!/usr/bin/env python3
"""Promote gameplay pack-species YAML into the canonical species_catalog.json.

Wave 3 / CANON-RECONCILE (Option 1 "unify"): the canon SoT
(data/core/species/species_catalog.json, 53 species) and the gameplay creatures
(packs/evo_tactics_pack/data/species/<biome>/<id>.yaml) were near-disjoint naming
worlds. This promotes a gameplay creature into the canon catalog as a STRUCTURAL
entry (id/biome/role/threat/morphotype mapped) with the design-rich fields
(scientific_name, classification, functional_signature, visual_description,
interactions, constraints, trait_refs, lifecycle_yaml) left as flagged STUBS
(`_promote_stub: true`) for incremental authoring (Strato 2).

Contract enforced by tests/api/envelope-b-data-integrity.test.js:
  - 14 required keys present per entry
  - sentience_index in /^T[0-6]$/
  - source-count asserts (new source 'gameplay-promote')
  - lifecycle_yaml=null only allowed for whitelisted sources

Idempotent: skips species_id already in catalog. Not a creature: *-trait-keeper /
evento-* are excluded (they are not species).

Usage:
  python tools/etl/promote_gameplay_to_canon.py --biome badlands [--biome cryosteppe ...]
  python tools/etl/promote_gameplay_to_canon.py --all-gameplay   # the 6 gameplay-touched biomes
  python tools/etl/promote_gameplay_to_canon.py --biome badlands --dry-run
"""

import argparse
import glob
import json
import os
import re
import sys
from datetime import date

import yaml

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CATALOG_PATH = os.path.join(REPO_ROOT, "data", "core", "species", "species_catalog.json")
SPECIES_DIR = os.path.join(REPO_ROOT, "packs", "evo_tactics_pack", "data", "species")
NEW_SOURCE = "gameplay-promote"

# Design-rich fields left as stubs for Strato-2 incremental authoring.
TODO_FIELDS = [
    "scientific_name", "classification", "functional_signature",
    "visual_description", "interactions", "constraints", "trait_refs", "lifecycle_yaml",
]

# threat_tier -> risk_profile.danger_level (clamped 1..5)
TIER_DANGER = {"T0": 1, "T1": 1, "T2": 2, "T3": 3, "T4": 4, "T5": 5}


def norm(s):
    return re.sub(r"[^a-z0-9]+", "_", str(s).lower()).strip("_")


def is_creature(fid):
    return not (fid.endswith("-trait-keeper") or fid.endswith("_trait_keeper")
                or fid.startswith("evento-") or fid.startswith("evento_"))


def load_yaml(p):
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def derive_entry(pack, biome, fid):
    bal = pack.get("balance") if isinstance(pack.get("balance"), dict) else {}
    tier = bal.get("threat_tier") or pack.get("threat_tier")
    tier = str(tier).upper() if tier else None
    role = pack.get("role_trofico")
    flags = pack.get("flags") if isinstance(pack.get("flags"), dict) else {}
    sentient = bool(flags.get("sentient"))
    display = pack.get("display_name") or fid.replace("-", " ").title()
    morph = pack.get("morphotype")

    danger = TIER_DANGER.get(tier, 1)
    sentience = "T3" if sentient else "T1"  # RFC heuristic: sentient->T3, animal->T1

    return {
        "species_id": norm(fid),
        # --- STUB design fields (presence required by integrity test) ---
        "scientific_name": "",              # TODO author Latin binomial
        "common_names": [display],
        "classification": {"macro_class": morph or "unknown", "habitat": biome},
        "functional_signature": "",         # TODO author
        "visual_description": "",           # TODO author
        "risk_profile": {"danger_level": danger, "vectors": []},
        "interactions": {"predates_on": [], "predated_by": []},
        "constraints": [],
        "sentience_index": sentience,
        # ecotypes is a constrained vocab (enums.json ecotype_cluster), NOT a free biome
        # name -> empty for stubs; Strato 2 assigns valid ecotype clusters.
        "ecotypes": [],
        "trait_refs": [],                   # TODO map functional_tags -> TR-#### ids
        "lifecycle_yaml": None,             # TODO seed lifecycle stub
        # --- structural / provenance ---
        "source": NEW_SOURCE,
        "legacy_slug": norm(fid),
        "biome_affinity": biome,
        "role_tags": [role] if role else [],
        "clade_tag": None,
        "morphotype": morph,
        "threat_tier": tier,
        "encounter_role": bal.get("encounter_role"),
        "pack_path": os.path.relpath(
            os.path.join(SPECIES_DIR, biome, f"{fid}.yaml"), REPO_ROOT
        ).replace(os.sep, "/"),
        "merged_at": date.today().isoformat(),
        "_promote_stub": True,
        "_todo_fields": list(TODO_FIELDS),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--biome", action="append", default=[], help="biome dir to promote (repeatable)")
    ap.add_argument("--all-gameplay", action="store_true",
                    help="promote the 6 gameplay-touched biomes (excludes rovine_planari = D6)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    # Multi-species gameplay biomes. EXCLUDES:
    #  - rovine_planari (D6 LOCKED = new content, separate decision)
    #  - tutorial (generic scenario role-placeholders, not designed species)
    #  - thin single-creature biomes (YAGNI: promote when that biome enters gameplay)
    GAMEPLAY_BIOMES = ["badlands", "cryosteppe", "deserto_caldo", "foresta_temperata"]
    biomes = args.biome or (GAMEPLAY_BIOMES if args.all_gameplay else [])
    if not biomes:
        print("ERROR: pass --biome <name> or --all-gameplay", file=sys.stderr)
        return 2

    catalog = json.load(open(CATALOG_PATH, encoding="utf-8"))
    existing = {e["species_id"] for e in catalog["catalog"]}

    added, skipped = [], []
    for biome in biomes:
        for p in sorted(glob.glob(os.path.join(SPECIES_DIR, biome, "*.yaml"))):
            fid = os.path.splitext(os.path.basename(p))[0]
            if not is_creature(fid):
                continue
            sid = norm(fid)
            if sid in existing:
                skipped.append(sid)
                continue
            entry = derive_entry(load_yaml(p), biome, fid)
            catalog["catalog"].append(entry)
            existing.add(sid)
            added.append(sid)

    # Recompute stats.
    cat = catalog["catalog"]
    by_source, by_sent = {}, {}
    for e in cat:
        by_source[e["source"]] = by_source.get(e["source"], 0) + 1
        by_sent[e["sentience_index"]] = by_sent.get(e["sentience_index"], 0) + 1
    catalog.setdefault("stats", {})
    catalog["stats"]["total_species"] = len(cat)
    catalog["stats"]["by_source"] = by_source
    catalog["stats"]["by_sentience_tier"] = by_sent
    catalog["version"] = "0.4.2"
    if isinstance(catalog.get("source_provenance"), dict):
        catalog["source_provenance"]["gameplay_promote"] = "packs/evo_tactics_pack/data/species"

    print(f"added {len(added)}: {added}")
    print(f"skipped (already canon) {len(skipped)}: {skipped}")
    print(f"catalog now {len(cat)} species; by_source={by_source}")

    if args.dry_run:
        print("[dry-run] not written")
        return 0
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"written {CATALOG_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
