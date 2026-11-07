import sys, os
import yaml

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "py"))

import generate_ecosystem_yaml as gey

CATALOG = [
    {"species_id": "apex1", "biome_affinity": "savana", "clade_tag": "Apex",
     "ecology": {"trophic_tier": "apex"}},
    {"species_id": "bridge1", "biome_affinity": "savana", "clade_tag": "Bridge"},
    {"species_id": "keystone1", "biome_affinity": "savana", "clade_tag": "Keystone"},
    {"species_id": "producer1", "biome_affinity": "savana", "clade_tag": "Keystone",
     "trait_refs": ["membrane_eliofiltranti"]},
    {"species_id": "scav1", "biome_affinity": "savana", "clade_tag": "Support",
     "ecology": {"trophic_tier": "scavenger"}},
    {"species_id": "other", "biome_affinity": "palude", "clade_tag": "Threat"},
]


def test_infer_tier_uses_trophic_tier_first():
    assert gey.infer_tier(CATALOG[0]) == "terziari"   # apex
    assert gey.infer_tier(CATALOG[4]) == "decompositori"  # scavenger


def test_infer_tier_falls_back_to_clade():
    assert gey.infer_tier(CATALOG[1]) == "secondari"  # Bridge, no trophic_tier
    assert gey.infer_tier(CATALOG[2]) == "primari"    # Keystone


def test_infer_tier_producer_override():
    # producer1 is Keystone but has a photosynthetic trait -> produttori
    assert gey.infer_tier(CATALOG[3]) == "produttori"


def test_group_biome_only_matching_species():
    grouped = gey.group_biome(CATALOG, "savana")
    flat = [s for tier in gey._flatten(grouped) for s in tier]
    assert "other" not in flat  # palude species excluded
    assert "apex1" in grouped["consumatori"]["terziari"]
    assert "bridge1" in grouped["consumatori"]["secondari"]
    assert "keystone1" in grouped["consumatori"]["primari"]
    assert "producer1" in grouped["produttori"]
    assert "scav1" in grouped["decompositori"]


def test_build_doc_shape_matches_resolver():
    grouped = gey.group_biome(CATALOG, "savana")
    doc = gey.build_ecosystem_doc("savana", grouped)
    eco = doc["ecosistema"]
    assert eco["biome_id"] == "savana"
    assert "trofico" in eco
    # resolver reads produttori + consumatori.{primari,secondari,terziari} + decompositori
    trof = eco["trofico"]
    assert isinstance(trof["produttori"], list)
    assert set(trof["consumatori"].keys()) == {"primari", "secondari", "terziari"}
    assert isinstance(trof["decompositori"], list)


def test_species_all_union_matches_resolver_semantics():
    grouped = gey.group_biome(CATALOG, "savana")
    doc = gey.build_ecosystem_doc("savana", grouped)
    # mirror ecosystemResolver._collectSpecies: flat union of all tiers
    trof = doc["ecosistema"]["trofico"]
    species_all = (
        list(trof["produttori"])
        + list(trof["consumatori"]["primari"])
        + list(trof["consumatori"]["secondari"])
        + list(trof["consumatori"]["terziari"])
        + list(trof["decompositori"])
    )
    assert set(species_all) == {"apex1", "bridge1", "keystone1", "producer1", "scav1"}


def test_main_refuses_rovine_planari(tmp_path):
    rc = gey.main(["--biomes", "rovine_planari", "--catalog", _write_cat(tmp_path),
                   "--out-dir", str(tmp_path)])
    assert rc != 0
    assert not list(tmp_path.glob("*.ecosystem.yaml"))  # nothing written


def test_main_writes_draft_yaml(tmp_path):
    rc = gey.main(["--biomes", "savana", "--catalog", _write_cat(tmp_path),
                   "--out-dir", str(tmp_path)])
    assert rc == 0
    out = tmp_path / "savana.ecosystem.yaml"
    assert out.exists()
    parsed = yaml.safe_load(out.read_text(encoding="utf-8"))
    assert parsed["ecosistema"]["biome_id"] == "savana"
    assert "apex1" in parsed["ecosistema"]["trofico"]["consumatori"]["terziari"]


def test_unit_slug_normalizes_to_runtime_hyphenated_slug():
    # foodwebFilter matches reinforcement unit_id (hyphenated runtime slug),
    # not catalog species_id (sp_*). Default id_field='slug' must produce that.
    assert gey._unit_slug({"species_id": "sp_arenavolux_sagittalis"}) == "arenavolux-sagittalis"
    assert gey._unit_slug({"species_id": "dune_stalker", "legacy_slug": "dune_stalker"}) == "dune-stalker"
    assert gey._unit_slug({"species_id": "x", "legacy_slug": "leviatano_risonante"}) == "leviatano-risonante"


def test_unit_slug_id_field_override():
    sp = {"species_id": "sp_x_y", "legacy_slug": "x_y"}
    assert gey._unit_slug(sp, "species_id") == "sp_x_y"
    assert gey._unit_slug(sp, "legacy_slug") == "x_y"
    assert gey._unit_slug(sp, "slug") == "x-y"


def test_group_biome_emits_slug_namespace():
    cat = [{"species_id": "sp_foo_bar", "biome_affinity": "savana", "clade_tag": "Apex"}]
    grouped = gey.group_biome(cat, "savana")  # default slug
    assert grouped["consumatori"]["terziari"] == ["foo-bar"]


def _write_cat(tmp_path):
    import json
    p = tmp_path / "cat.json"
    p.write_text(json.dumps({"catalog": CATALOG}), encoding="utf-8")
    return str(p)
