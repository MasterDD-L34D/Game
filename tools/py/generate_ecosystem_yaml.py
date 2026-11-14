"""generate_ecosystem_yaml.py — ECO-YAML-GEN (D4 item 2, spec
docs/superpowers/specs/2026-05-30-d4-biome-affinity-ecoyaml-design.md §5).

Groups catalog species by approved `biome_affinity` into trophic tiers and emits
a DRAFT `<biome>.ecosystem.yaml` per target biome — the exact shape consumed by
apps/backend/services/worldgen/ecosystemResolver.js
(`ecosistema.trofico` -> flat `species_all` -> foodwebFilter whitelist => GAP-A).

SAFETY
- DRAFT-ONLY: writes to docs/planning/ecosystems-draft/ by default. It NEVER
  writes the canonical packs/evo_tactics_pack/data/ecosystems/ that the resolver
  reads — promoting a draft there is a separate master-dd step and (spec §5)
  requires an N=40 band re-verify if the biome touches a reinforcement scenario.
- Refuses `rovine_planari` (D6: hardcore_06/07 band-locked).
- Emits nothing for a biome with 0 assigned species (i.e. before apply has run).

TIER INFERENCE (heuristic — master-dd reviews the draft)
  1. photosynthetic trait marker -> produttori (override)
  2. else ecology.trophic_tier (apex->terziari, secondary_consumer->secondari,
     primary_consumer->primari, scavenger/decomposer/detritivore->decompositori,
     producer->produttori)
  3. else clade_tag (Apex/Threat->terziari, Bridge->secondari, Support->
     decompositori, Keystone->primari), default mid-tier secondari.
"""

import argparse
import json
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "data/core/species/species_catalog.json"
BIOMES_PATH = REPO_ROOT / "data/core/biomes.yaml"
DEFAULT_DRAFT_DIR = REPO_ROOT / "docs/planning/ecosystems-draft"

ROVINE_BLOCK = {"rovine_planari"}  # D6: hardcore_06/07 off-limits

TROPHIC_TIER_MAP = {
    "apex": "terziari",
    "tertiary_consumer": "terziari",
    "secondary_consumer": "secondari",
    "primary_consumer": "primari",
    "herbivore": "primari",
    "scavenger": "decompositori",
    "decomposer": "decompositori",
    "detritivore": "decompositori",
    "producer": "produttori",
    "photosynthetic": "produttori",
}
CLADE_MAP = {
    "apex": "terziari",
    "threat": "terziari",
    "bridge": "secondari",
    "support": "decompositori",
    "keystone": "primari",
}
PRODUCER_TRAITS = {"membrane_eliofiltranti", "fotosintesi", "cloroplasti_simbiotici"}


def load_valid_biomes(path: Path = BIOMES_PATH) -> set:
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return set(data["biomes"].keys())


def infer_tier(sp: dict) -> str:
    traits = set(sp.get("trait_refs") or [])
    if traits & PRODUCER_TRAITS:
        return "produttori"
    tt = str((sp.get("ecology") or {}).get("trophic_tier") or "").strip().lower()
    if tt in TROPHIC_TIER_MAP:
        return TROPHIC_TIER_MAP[tt]
    clade = str(sp.get("clade_tag") or "").strip().lower()
    if clade in CLADE_MAP:
        return CLADE_MAP[clade]
    return "secondari"


def _unit_slug(sp: dict, id_field: str = "slug") -> str:
    """Emit the id namespace foodwebFilter compares against `reinforcement_pool`
    entry.unit_id. The existing consumed ecosystems (e.g. badlands.ecosystem.yaml)
    use hyphenated runtime slugs (`dune-stalker`, `rust-scavenger`), NOT catalog
    `species_id` (`sp_arenavolux_sagittalis`). Default `slug` normalizes to that
    runtime form; `--id-field` overrides if a given pool uses another namespace.
    """
    if id_field == "species_id":
        return str(sp.get("species_id") or sp.get("legacy_slug") or "").strip()
    if id_field == "legacy_slug":
        return str(sp.get("legacy_slug") or sp.get("species_id") or "").strip()
    # "slug": runtime hyphenated form (strip sp_ prefix, _ -> -)
    base = str(sp.get("legacy_slug") or sp.get("species_id") or "").strip()
    if base.startswith("sp_"):
        base = base[3:]
    return base.replace("_", "-")


def group_biome(catalog: list, biome: str, id_field: str = "slug") -> dict:
    grouped = {
        "produttori": [],
        "consumatori": {"primari": [], "secondari": [], "terziari": []},
        "decompositori": [],
    }
    for sp in catalog:
        if str(sp.get("biome_affinity") or "") != biome:
            continue
        sid = _unit_slug(sp, id_field)
        if not sid:
            continue
        tier = infer_tier(sp)
        if tier == "produttori":
            grouped["produttori"].append(sid)
        elif tier == "decompositori":
            grouped["decompositori"].append(sid)
        else:
            grouped["consumatori"][tier].append(sid)
    return grouped


def _flatten(grouped: dict) -> list:
    c = grouped["consumatori"]
    return [grouped["produttori"], c["primari"], c["secondari"], c["terziari"], grouped["decompositori"]]


def build_ecosystem_doc(biome: str, grouped: dict) -> dict:
    return {
        "schema_version": 1.0,
        "ecosistema": {
            "id": biome.upper(),
            "label": biome.replace("_", " ").title(),
            "biome_id": biome,
            "trofico": {
                "produttori": grouped["produttori"],
                "consumatori": grouped["consumatori"],
                "decompositori": grouped["decompositori"],
            },
        },
        "_provenance": {"trofico": "d4-ecoyaml-gen-heuristic-DRAFT"},
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="ECO-YAML-GEN: draft ecosystem.yaml from approved biome_affinity")
    ap.add_argument("--biomes", nargs="+", required=True, help="target biome id(s)")
    ap.add_argument("--catalog", default=str(CATALOG_PATH))
    ap.add_argument("--out-dir", default=str(DEFAULT_DRAFT_DIR))
    ap.add_argument(
        "--id-field",
        choices=["slug", "legacy_slug", "species_id"],
        default="slug",
        help="id namespace for species_all (default slug = runtime hyphenated form foodwebFilter expects)",
    )
    args = ap.parse_args(argv)

    valid = load_valid_biomes()
    with open(args.catalog, encoding="utf-8") as f:
        catalog = json.load(f)["catalog"]

    out_dir = Path(args.out_dir)
    written = []
    for biome in args.biomes:
        if biome in ROVINE_BLOCK:
            print(f"[REFUSED] {biome} is band-locked (D6 hardcore_06/07) -- skipped")
            continue
        if biome not in valid:
            print(f"[skip] {biome} not in biomes.yaml")
            continue
        grouped = group_biome(catalog, biome, id_field=args.id_field)
        n = sum(len(t) for t in _flatten(grouped))
        if n == 0:
            print(f"[skip] {biome}: 0 species with biome_affinity={biome} (has apply run yet?)")
            continue
        doc = build_ecosystem_doc(biome, grouped)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{biome}.ecosystem.yaml"
        with open(out_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(doc, f, allow_unicode=True, sort_keys=False)
        written.append(out_path)
        print(f"[DRAFT] {biome}: {n} species -> {out_path}")

    if not written:
        print("[no-op] nothing written.")
        return 2
    print(f"[done] {len(written)} draft ecosystem.yaml written under {out_dir}")
    print("       NEXT: master-dd review + N=40 band re-verify if scenario-touched,")
    print("       then promote to packs/evo_tactics_pack/data/ecosystems/ (manual, gated).")
    return 0


if __name__ == "__main__":
    import sys

    sys.exit(main())
