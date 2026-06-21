"""Tests for codex_draft_scaffold -- generalize the A.L.I.E.N.A. lore generator
to the catalog: build a full codex DRAFT (id + unlock + lore_vars + 6 dims with
data-derived key_facts + generated content) from a species master record.

Run: PYTHONPATH=tools/py python -m pytest tests/test_codex_draft_scaffold.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools" / "py"))

import codex_draft_scaffold as scaf  # noqa: E402


SPECIES = {
    "id": "guardiano_caverna",
    "display_name": "Guardiano della Caverna",
    "display_name_en": "Cave Guardian",
    "biomes": ["caverna_risonante"],  # NOTE: species slug != biomes.yaml key
    "role_trofico": "difensore_territoriale",
    "morphotype": "umanoide_lanciatore",
    "jobs_bias": ["vanguard"],
    "resistance_archetype": "adattivo",
    "flags": {"sentient": False},
    "balance": {"threat_tier": "T1", "rarity": "R1", "encounter_role": "threat"},
    "used_in_encounters": ["enc_tutorial_03"],
    "functional_tags": ["nemico_tutorial", "ranged_defender"],
    "combat_baseline": {"hp": 5, "ap": 2, "attack_range": 2},
}

BIOMES = {
    "biomes": {
        "caverna": {
            "display_name_it": "Caverna Risonante",
            "summary": "Gallerie cristalline dove eco e pressioni invertite modellano la fauna.",
            "biome_class": "cave",
            "affixes": ["eco", "cristallino"],
            "narrative": {
                "tone": "horror sotterraneo claustrofobico.",
                "hooks": ["Mappare le gallerie risonanti.", "Placare gli echi ostili."],
            },
            "npc_archetypes": {"primary": ["guardiano_caverna", "eco_predoni"], "secondary": ["cartografi"]},
        },
        "savana": {"display_name_it": "Savana Ionizzata", "summary": "Dune fotoniche."},
        "rovine_planari": {"display_name_it": "Rovine Planari", "summary": "Metropoli in rovina."},
        "caldera": {
            "display_name_it": "Caldera Glaciale",
            "summary": "Crateri di ghiaccio.",
            "npc_archetypes": {"primary": ["cryo_wardens", "glacial_sentinels", "resonance_mappers"]},
        },
    }
}

GRAMMAR = {
    "origin_A_ambiente": ["#biome_name#: #biome_trait#. Territorio del #subject#."],
    "origin_L_linee_evolutive": ["Il #subject# segue un archetipo #archetype#."],
    "origin_I_impianto": ["Morfologia #morphotype#, ruolo di #job#."],
    "origin_E_ecologia": ["Nicchia: #role# (#threat_tier#) in #biome_name#."],
    "origin_N_norme_socio": ["Socialita' #sentience#: #social#."],
    "origin_A_ancoraggio_narrativo": ["Gancio: #hook#."],
}


def test_resolve_biome_handles_display_alias():
    # species slug 'caverna_risonante' must resolve to biomes.yaml key 'caverna'
    # whose display_name_it IS "Caverna Risonante".
    index = scaf.build_biome_index(BIOMES)
    key, name, trait = scaf.resolve_biome(["caverna_risonante"], BIOMES, index)
    assert key == "caverna"
    assert name == "Caverna Risonante"
    assert "cristalline" in trait


def test_resolve_biome_skips_off_limits():
    # rovine_planari is off-limits -> pick the next resolvable biome (savana).
    index = scaf.build_biome_index(BIOMES)
    key, name, _ = scaf.resolve_biome(["rovine_planari", "savana"], BIOMES, index)
    assert key == "savana"
    assert name == "Savana Ionizzata"


def test_extract_lore_vars_maps_species_fields():
    lv = scaf.extract_lore_vars(SPECIES, BIOMES)
    assert lv["biome_name"] == "Caverna Risonante"
    assert lv["morphotype"] == "umanoide lanciatore"  # slug humanized
    assert lv["job"] == "vanguard"
    assert lv["threat_tier"] == "T1"
    assert lv["sentience"] == "istintiva"  # flags.sentient False
    assert "tutorial" not in lv["role"]  # role_trofico tutorial-token stripped
    # umanoide but NOT a raider (no predone tag) -> not "razziatori"
    assert "razziatori" not in lv["lineage"]
    assert lv["lineage"] == "stirpi umanoidi"
    assert not lv["biome_trait"].endswith(".")  # no double-period in template
    # AUTHORED biome narrative now captured (was ignored)
    assert lv["biome_tone"] == "horror sotterraneo claustrofobico"  # trailing period stripped
    assert "mappare le gallerie" in lv["biome_hook"]  # from narrative.hooks, first-letter lowered
    assert "guardiano caverna" not in lv["neighbors"]  # subject excluded from neighbors
    assert "eco predoni" in lv["neighbors"]
    assert "eco" in lv["affixes"]
    assert "senza contendere" in lv["eco_stance"]  # guardiano is not apex


def test_extract_lore_vars_apex_eco_stance():
    apex = dict(SPECIES, functional_tags=["nemico_tutorial", "apex_creature", "boss"])
    lv = scaf.extract_lore_vars(apex, BIOMES)
    assert "Domina la catena trofica" in lv["eco_stance"]


def test_scaffold_draft_full_shape():
    draft = scaf.scaffold_draft(SPECIES, BIOMES, GRAMMAR)
    ce = draft["codex_entry"]
    assert ce["id"] == "guardiano_caverna"
    assert ce["lore_review_status"] == "generated_pending_review"
    assert "encounter_completed" in ce["unlock"]["triggers"]
    assert ce["aliena_dimensions"]["A_ancoraggio_narrativo"]["story_hook_it"]  # hook seeded
    dims = ce["aliena_dimensions"]
    keys = ["A_ambiente", "L_linee_evolutive", "I_impianto", "E_ecologia",
            "N_norme_socio", "A_ancoraggio_narrativo"]
    assert set(dims.keys()) == set(keys)
    for k in keys:
        content = dims[k]["content"]
        assert content.strip(), f"empty content {k}"
        assert "#" not in content, f"unresolved symbol {k}"
        assert "TODO" not in content, f"TODO leaked {k}"
        assert dims[k]["key_facts"], f"no key_facts {k}"


def test_scaffold_draft_no_secret_score_fields():
    draft = scaf.scaffold_draft(SPECIES, BIOMES, GRAMMAR)
    forbidden = {"aggregate", "sub_scores", "coherence", "enforcement_factor"}
    ce = draft["codex_entry"]
    assert not (forbidden & set(ce.keys()))
    for dim in ce["aliena_dimensions"].values():
        assert not (forbidden & set(dim.keys()))


def test_catalog_to_species_and_rich_slots():
    entry = {
        "species_id": "cryo_lynx",
        "common_names": ["Lince Criogenica"],
        "role_tags": ["predatore_terziario_apex"],
        "biome_affinity": "savana",
        "trait_refs": ["artigli_sette_vie", "criostasi_adattiva"],
        "classification": {"macro_class": "Cursore quadrupede / predatore apex"},
        "sentience_index": "T1",
        "visual_description": "Felino compatto dal manto folto.",
    }
    sp = scaf.catalog_to_species(entry)
    assert sp["id"] == "cryo_lynx"
    assert sp["display_name"] == "Lince Criogenica"
    assert sp["trait_refs"] == ["artigli_sette_vie", "criostasi_adattiva"]
    assert sp["flags"]["sentient"] is False  # T1 -> not sentient
    lifecycle = {
        "phases": {"hatchling": {}, "mature": {}, "apex": {}},
        "mutation_morphology": {"artigli_grip_to_glass": {}},
    }
    lv = scaf.extract_lore_vars(sp, BIOMES, lifecycle)
    assert "artigli sette vie" in lv["traits"]
    assert "Felino compatto" in lv["visual"]
    # lifecycle phase keys translated EN -> IT (1b-i): hatchling -> cucciolo, etc.
    assert "cucciolo" in lv["lifecycle_arc"]
    assert "maturo" in lv["lifecycle_arc"]
    assert "hatchling" not in lv["lifecycle_arc"]
    assert "artigli grip to glass" in lv["mutations"]


def test_extract_lore_vars_rich_slots_fallback_for_stub():
    # a stub species (no trait_refs / no lifecycle) gets safe fallbacks, never #leaks#.
    lv = scaf.extract_lore_vars(SPECIES, BIOMES, None)
    assert lv["traits"]  # non-empty fallback
    assert lv["lifecycle_arc"]
    assert lv["mutations"]
    assert "#" not in lv["traits"] + lv["visual"] + lv["lifecycle_arc"] + lv["mutations"]


def test_scaffold_rich_weaves_traits_into_content():
    import json
    from pathlib import Path as _P

    grammar = json.load(
        open(_P(__file__).resolve().parents[1] / "data/codex/_grammar/aliena_lore.json", encoding="utf-8")
    )
    entry = {
        "species_id": "test_rich",
        "common_names": ["Bestia Test"],
        "role_tags": ["predatore"],
        "biome_affinity": "savana",
        "trait_refs": ["artigli_sette_vie"],
        "classification": {"macro_class": "quadrupede"},
        "sentience_index": "T1",
        "visual_description": "Una bestia di prova distintiva.",
    }
    draft = scaf.scaffold_rich_draft(entry, {"phases": {"mature": {}}}, BIOMES, grammar)
    dims = draft["codex_entry"]["aliena_dimensions"]
    assert "artigli sette vie" in dims["L_linee_evolutive"]["content"]  # rich origin used
    assert "bestia di prova" in dims["I_impianto"]["content"].lower()  # visual woven
    assert "#" not in dims["L_linee_evolutive"]["content"]


# --- 1a: taxonomic hook (catalog species with no trophic role_tags) ---

def _taxon_entry(macro, biome="caldera", role_tags=None):
    return {
        "species_id": "test_taxon",
        "common_names": ["Bestia Taxon"],
        "role_tags": role_tags or [],
        "biome_affinity": biome,
        "trait_refs": [],
        "classification": {"macro_class": macro},
        "sentience_index": "T1",
        "visual_description": "Una creatura di prova.",
    }


def test_taxonomic_hook_reads_natural():
    # empty role_tags + Linnaean macro -> hook phrases the taxon, not "un avversario mammalia".
    sp = scaf.catalog_to_species(_taxon_entry("Mammalia"))
    assert sp["_role_is_taxonomic"] is True
    lv = scaf.extract_lore_vars(sp, BIOMES, None)
    assert "creatura di tipo mammifero" in lv["hook"]
    assert "avversario mammalia" not in lv["hook"]
    assert lv["role"] == "mammifero"  # IT taxon, not raw "mammalia"


def test_taxonomic_hook_slash_taxon_first_token():
    # "Reptilia/Pisces" -> first slash token -> rettile.
    sp = scaf.catalog_to_species(_taxon_entry("Reptilia/Pisces"))
    lv = scaf.extract_lore_vars(sp, BIOMES, None)
    assert "creatura di tipo rettile" in lv["hook"]


def test_taxonomic_hook_unknown_macro_generic():
    # macro "unknown" + no role_tags -> generic "da classificare", never the word "unknown".
    sp = scaf.catalog_to_species(_taxon_entry("unknown"))
    lv = scaf.extract_lore_vars(sp, BIOMES, None)
    assert "da classificare" in lv["hook"]
    assert "unknown" not in lv["hook"].lower()
    assert "#" not in lv["hook"]


def test_unknown_macro_no_leak_in_morpho_slots():
    # macro "unknown" + empty visual_description must NOT leak "unknown" into the
    # morphotype / lineage / visual slots ("Morfologia: un unknown.").
    entry = _taxon_entry("unknown")
    entry["visual_description"] = ""  # the real frattura-abissale data gap
    sp = scaf.catalog_to_species(entry)
    lv = scaf.extract_lore_vars(sp, BIOMES, None)
    blob = (lv["morphotype"] + lv["lineage"] + lv["visual"]).lower()
    assert "unknown" not in blob
    assert lv["morphotype"] == "non catalogata"
    assert "non ancora catalogata" in lv["visual"]


def test_descriptive_macro_keeps_trophic_voice():
    # a non-Linnaean descriptive macro ("Mammalo-artropode") with no role_tags must NOT
    # become "una creatura di tipo Mammalo-artropode" -> keep the lowercase trophic voice.
    sp = scaf.catalog_to_species(_taxon_entry("Mammalo-artropode"))
    assert sp["_role_is_taxonomic"] is True
    lv = scaf.extract_lore_vars(sp, BIOMES, None)
    assert lv["hook"].startswith("un avversario mammalo-artropode")
    assert "creatura di tipo" not in lv["hook"]
    assert "Mammalo-artropode" not in lv["hook"]  # not capitalised mid-sentence


def test_trophic_role_tags_keep_combat_hook():
    # a species WITH role_tags is NOT taxonomic -> keeps the "un avversario ..." voice.
    sp = scaf.catalog_to_species(_taxon_entry("Mammalia", role_tags=["predatore_terziario_apex"]))
    assert sp["_role_is_taxonomic"] is False
    lv = scaf.extract_lore_vars(sp, BIOMES, None)
    assert lv["hook"].startswith("un avversario")
    # "predatore_terziario_apex" carries "apex" substring -> apex eco_stance.
    assert "Domina la catena trofica" in lv["eco_stance"]


# --- 1b-ii: biome npc_archetypes translated EN -> IT in the neighbors slot ---

def test_neighbors_translated_to_italian():
    sp = scaf.catalog_to_species(_taxon_entry("Mammalia", biome="caldera"))
    lv = scaf.extract_lore_vars(sp, BIOMES, None)
    assert "guardiani del gelo" in lv["neighbors"]  # cryo_wardens -> IT
    assert "sentinelle glaciali" in lv["neighbors"]  # glacial_sentinels -> IT
    assert "cryo" not in lv["neighbors"].lower()
    assert "wardens" not in lv["neighbors"].lower()
