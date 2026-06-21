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
