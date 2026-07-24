#!/usr/bin/env python3
"""Promote gameplay pack-species YAML into the canonical species_catalog.json.

NOTE (reproducibility): additive-only (never prunes) + writes the catalog IN-PLACE
with no --out, and is skipped by lifecycle stubs -> a re-run does not reproduce the
committed catalog. Run tools/py/check_derived_reproducible.py first and read
docs/guide/derived-artifacts-reproducibility.md before regenerating + committing.

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

Idempotent: skips species_id already in catalog. Not a creature, excluded:
  - filename *-trait-keeper (biome trait carrier, not a species)
  - filename evento-* (ecological event stub)
  - role_trofico == evento_ecologico (ecological event regardless of filename;
    closes the CANON-RECONCILE #2490 gap where event-role files lacking the
    evento-* prefix, e.g. magneto-ridge-hunter, were wrongly promoted).

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

from interoception_field import filter_interoception

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CATALOG_PATH = os.path.join(REPO_ROOT, "data", "core", "species", "species_catalog.json")
SPECIES_DIR = os.path.join(REPO_ROOT, "packs", "evo_tactics_pack", "data", "species")
NEW_SOURCE = "gameplay-promote"

# Hand-maintained canonical creatures whose catalog entry is curated separately
# (e.g. Skiv = dune_stalker, with its own combat/synergy tests + lore). The generic
# stub-upgrade must NEVER overwrite them from a gameplay pack file -- doing so changed
# dune_stalker's trait_refs and broke the echo_backstab synergy tests (2026-06-28).
CURATED_CANON_SKIP = {"dune_stalker"}
EVENT_ROLE = "evento_ecologico"  # role_trofico marking an ecological event (not a species)

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


def is_event(pack):
    """True if the pack YAML is an ecological event (role_trofico=evento_ecologico),
    not a biological species. Catches event-role files whose filename lacks the
    evento-* prefix (CANON-RECONCILE #2490 gap)."""
    return str(pack.get("role_trofico", "")).strip() == EVENT_ROLE


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

    entry = {
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
    # D4 (OD-024) -- carry an authored interoception_traits set from the gameplay
    # YAML source->catalog (mirrors role_tags read-from-source). Omitted when
    # absent so the catalog stays diff-clean until a species authors the field.
    intero = filter_interoception(pack.get("interoception_traits"))
    if intero:
        entry["interoception_traits"] = intero
    return entry


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--biome", action="append", default=[], help="biome dir to promote (repeatable)")
    ap.add_argument("--all-gameplay", action="store_true",
                    help="promote the 6 gameplay-touched biomes (excludes rovine_planari = D6)")
    ap.add_argument("--catalog", default=CATALOG_PATH,
                    help="catalog JSON to read (and write unless --out); default = canonical")
    ap.add_argument("--out", help="write result here instead of in place (dry-test to a temp)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--prune-events", action="store_true",
                    help="remove gameplay-promote entries whose backing pack is now an "
                         "ecological event (role_trofico=evento_ecologico) -- idempotency "
                         "fix for entries promoted before the is_event filter (v0.4.3)")
    args = ap.parse_args(argv)
    catalog_path = args.catalog
    out_path = args.out or args.catalog

    # Multi-species gameplay biomes. EXCLUDES:
    #  - rovine_planari (D6 LOCKED = new content, separate decision)
    #  - tutorial (generic scenario role-placeholders, not designed species)
    #  - thin single-creature biomes (YAGNI: promote when that biome enters gameplay)
    # 2026-06-28 (salvage item 2b/B1, master-dd): the 9 biomes of the 13 ratified
    # retired creatures enter gameplay canon. Future pack species in these biomes
    # auto-promote too (the B1 "canon-wide" choice over scoped --biome).
    GAMEPLAY_BIOMES = [
        "badlands", "cryosteppe", "deserto_caldo", "foresta_temperata",
        "abisso_vulcanico", "canopia_ionica", "canyons_risonanti", "caverna",
        "foresta_miceliale", "palude", "reef_luminescente", "savana",
        "stratosfera_tempestosa",
    ]
    biomes = args.biome or (GAMEPLAY_BIOMES if args.all_gameplay else [])
    if not biomes:
        print("ERROR: pass --biome <name> or --all-gameplay", file=sys.stderr)
        return 2

    catalog = json.load(open(catalog_path, encoding="utf-8"))
    existing_by_id = {e["species_id"]: e for e in catalog["catalog"]}

    # Dedup guard: a gameplay species already in canon under an sp_-prefixed id OR
    # via a normalized legacy_slug must NOT be re-promoted as an unprefixed duplicate.
    # (Codex P1 #3045: arboryxis_lenis/ferrimordax_rutilus/ferriscroba_detrita/
    # nebulocornis_mollis/rubrospina_velox already exist as sp_<id> with legacy_slug
    # <id> -- a fresh promote would create the same creature under two ids.)
    already_canon = set()
    for e in catalog["catalog"]:
        sid_e = e.get("species_id", "")
        already_canon.add(sid_e)
        if sid_e.startswith("sp_"):
            already_canon.add(sid_e[3:])
        if e.get("legacy_slug"):
            already_canon.add(norm(e["legacy_slug"]))

    added, upgraded, skipped, excluded_events, deduped = [], [], [], [], []
    for biome in biomes:
        for p in sorted(glob.glob(os.path.join(SPECIES_DIR, biome, "*.yaml"))):
            fid = os.path.splitext(os.path.basename(p))[0]
            if norm(fid) in CURATED_CANON_SKIP:
                skipped.append(norm(fid))  # hand-maintained canon (e.g. Skiv) -> never auto-upgrade
                continue
            if not is_creature(fid):
                continue
            sid = norm(fid)
            existing_entry = existing_by_id.get(sid)
            if existing_entry is None and sid in already_canon:
                deduped.append(sid)  # already canon under sp_<id>/legacy_slug -> no duplicate
                continue
            # Skip only when a richer entry already exists. A bare game-canonical-stub
            # (a lifecycle species the merge stage stubbed) is UPGRADED with its
            # gameplay data instead of being skipped -- otherwise gaining a lifecycle
            # YAML would silently downgrade the species to a bare stub on every re-run.
            if existing_entry is not None and existing_entry.get("source") != "game-canonical-stub":
                skipped.append(sid)
                continue
            pack = load_yaml(p)
            if is_event(pack):
                excluded_events.append(sid)  # ecological event, not a species
                continue
            entry = derive_entry(pack, biome, fid)
            if existing_entry is not None:
                # Upgrade in place, preserving the lifecycle_yaml link from the stub.
                if existing_entry.get("lifecycle_yaml"):
                    entry["lifecycle_yaml"] = existing_entry["lifecycle_yaml"]
                catalog["catalog"][catalog["catalog"].index(existing_entry)] = entry
                existing_by_id[sid] = entry
                upgraded.append(sid)
            else:
                catalog["catalog"].append(entry)
                existing_by_id[sid] = entry
                added.append(sid)

    # Prune lingering ecological events (additive promote never removed them).
    pruned = []
    if args.prune_events:
        event_ids = set()
        for p in glob.glob(os.path.join(SPECIES_DIR, "**", "*.yaml"), recursive=True):
            fid = os.path.splitext(os.path.basename(p))[0]
            if is_event(load_yaml(p)):
                event_ids.add(norm(fid))
        # Only touch gameplay-promote entries; legacy/pack-v2 canon species untouched.
        pruned = [e["species_id"] for e in catalog["catalog"]
                  if e.get("source") == NEW_SOURCE and e["species_id"] in event_ids]
        if pruned:
            keep = set(pruned)
            catalog["catalog"] = [e for e in catalog["catalog"]
                                  if not (e.get("source") == NEW_SOURCE
                                          and e["species_id"] in keep)]
            existing_by_id = {e["species_id"]: e for e in catalog["catalog"]}

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
    catalog["version"] = "0.4.3"  # 0.4.3 adds is_event semantics (evento_ecologico filter)
    if isinstance(catalog.get("source_provenance"), dict):
        catalog["source_provenance"]["gameplay_promote"] = "packs/evo_tactics_pack/data/species"

    print(f"added {len(added)}: {added}")
    print(f"upgraded stubs {len(upgraded)}: {upgraded}")
    print(f"skipped (already canon) {len(skipped)}: {skipped}")
    print(f"excluded events (role={EVENT_ROLE}) {len(excluded_events)}: {excluded_events}")
    print(f"deduped (already canon as sp_/legacy_slug) {len(deduped)}: {deduped}")
    print(f"pruned lingering events {len(pruned)}: {pruned}")
    print(f"catalog now {len(cat)} species; by_source={by_source}")

    if args.dry_run:
        print("[dry-run] not written")
        return 0
    # newline="\n": deterministic LF on every OS (committed catalog is LF per
    # .gitattributes; default text-mode write emits CRLF on Windows -> spurious diff).
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"written {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
