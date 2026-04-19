"""Test di regressione per ``services/rules/hydration``.

Copre:

- lo snapshot end-to-end su ``docs/examples/encounter_caverna.txt`` +
  una party di 3 unita' con trait_ids misti,
- l'aggregazione di ``resistances`` per canale con clamp ``[-100, 100]``,
- la gestione di trait sconosciuti (silenziosamente ignorati),
- le derivazioni numeriche per unita' ostili (hp/armor/initiative da power),
- le proprieta' strutturali del CombatState (side, counts, initiative_order,
  active_unit_id).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SERVICES = PROJECT_ROOT / "services"
if str(SERVICES) not in sys.path:
    sys.path.insert(0, str(SERVICES))

from rules.hydration import (  # noqa: E402
    DEFAULT_AP_MAX,
    DEFAULT_PARTY_HP,
    DEFAULT_PARTY_TIER,
    DEFAULT_PT_POOL,
    DEFAULT_REACTIONS_MAX,
    RESISTANCE_MAX,
    TIER_MAX,
    TIER_MIN,
    aggregate_resistances,
    build_hostile_unit_from_group,
    build_party_unit,
    derive_tier_from_power,
    get_archetype_resistances,
    hydrate_encounter,
    load_species_resistances,
    load_trait_mechanics,
)

MECHANICS_PATH = (
    PROJECT_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "trait_mechanics.yaml"
)
SPECIES_RESISTANCES_PATH = (
    PROJECT_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "species_resistances.yaml"
)
ENCOUNTER_PATH = PROJECT_ROOT / "docs" / "examples" / "encounter_caverna.txt"
SNAPSHOT_PATH = PROJECT_ROOT / "tests" / "snapshots" / "hydration_caverna.json"


@pytest.fixture(scope="module")
def catalog():
    return load_trait_mechanics(MECHANICS_PATH)


def test_hydrate_caverna_matches_snapshot(catalog):
    with open(ENCOUNTER_PATH, encoding="utf-8") as fh:
        encounter = json.load(fh)
    party = [
        {
            "id": "party-01",
            "species_id": "anguis_magnetica",
            "trait_ids": ["artigli_sette_vie", "coda_frusta_cinetica"],
        },
        {
            "id": "party-02",
            "species_id": "aetherloom_stalker",
            "trait_ids": ["mantello_meteoritico", "sangue_piroforico"],
        },
        {
            "id": "party-03",
            "species_id": "crysalis_ember",
            "trait_ids": ["cute_resistente_sali", "criostasi_adattiva"],
        },
    ]
    state = hydrate_encounter(
        encounter=encounter,
        party=party,
        catalog=catalog,
        seed="demo-caverna-v1",
        session_id="demo-caverna-session",
        encounter_id="caverna-ref-001",
        hostile_species_ids=[
            "umbroid_lurker",
            "mud_sentinel",
            "echo_seer",
            "crystal_ward",
        ],
        hostile_trait_ids=[[], [], ["spore_psichiche_silenziate"], []],
    )
    with open(SNAPSHOT_PATH, encoding="utf-8") as fh:
        expected = json.load(fh)
    # A1: _active_effects_registry is environment-dependent (path resolution);
    # compare structural state without it.
    state_cmp = {k: v for k, v in state.items() if k != "_active_effects_registry"}
    expected_cmp = {k: v for k, v in expected.items() if k != "_active_effects_registry"}
    assert state_cmp == expected_cmp
    # Registry should load when active_effects.yaml is accessible
    assert isinstance(state.get("_active_effects_registry"), dict)


def test_aggregate_resistances_sums_by_channel(catalog):
    # mantello_meteoritico: fisico +20, fuoco +20
    # sangue_piroforico: fuoco +20
    # Atteso: fisico 20, fuoco 40
    result = aggregate_resistances(
        ["mantello_meteoritico", "sangue_piroforico"],
        catalog,
    )
    by_channel = {r["channel"]: r["modifier_pct"] for r in result}
    assert by_channel == {"fisico": 20, "fuoco": 40}


def test_aggregate_resistances_sorts_alphabetically(catalog):
    result = aggregate_resistances(
        ["cute_resistente_sali", "criostasi_adattiva"],
        catalog,
    )
    channels = [r["channel"] for r in result]
    assert channels == sorted(channels)
    assert channels == ["fuoco", "gelo", "taglio"]


def test_aggregate_resistances_clamps_to_range():
    fake = {
        "t1": {"resistances": [{"channel": "fuoco", "modifier_pct": 60}]},
        "t2": {"resistances": [{"channel": "fuoco", "modifier_pct": 60}]},
        "t3": {"resistances": [{"channel": "fuoco", "modifier_pct": 60}]},
    }
    result = aggregate_resistances(["t1", "t2", "t3"], fake)
    assert result == [{"channel": "fuoco", "modifier_pct": RESISTANCE_MAX}]


def test_aggregate_resistances_skips_zero_sum():
    fake = {
        "t1": {"resistances": [{"channel": "fuoco", "modifier_pct": 20}]},
        "t2": {"resistances": [{"channel": "fuoco", "modifier_pct": -20}]},
    }
    assert aggregate_resistances(["t1", "t2"], fake) == []


def test_aggregate_resistances_ignores_unknown_traits(catalog):
    assert aggregate_resistances(["unknown_trait_xyz"], catalog) == []


def test_build_party_unit_uses_baseline_defaults(catalog):
    unit = build_party_unit(
        unit_id="p1",
        species_id="test_species",
        trait_ids=[],
        catalog=catalog,
    )
    assert unit["side"] == "party"
    assert unit["tier"] == DEFAULT_PARTY_TIER
    assert unit["hp"] == {"current": DEFAULT_PARTY_HP, "max": DEFAULT_PARTY_HP}
    assert unit["ap"]["max"] == DEFAULT_AP_MAX
    assert unit["stress"] == 0.0
    assert unit["resistances"] == []


def test_build_party_unit_accepts_tier_override(catalog):
    unit = build_party_unit(
        unit_id="p1",
        species_id="test_species",
        trait_ids=[],
        catalog=catalog,
        tier=5,
    )
    assert unit["tier"] == 5


def test_build_party_unit_clamps_tier_to_schema_range(catalog):
    lo = build_party_unit("p1", "sp1", [], catalog, tier=0)
    hi = build_party_unit("p2", "sp2", [], catalog, tier=99)
    assert lo["tier"] == TIER_MIN
    assert hi["tier"] == TIER_MAX


def test_derive_tier_from_power_matches_mapping():
    # power 0-2 -> 1; 3-5 -> 2; 6-8 -> 3; 9-11 -> 4; 12+ -> 5
    assert derive_tier_from_power(0) == 1
    assert derive_tier_from_power(2) == 1
    assert derive_tier_from_power(3) == 2
    assert derive_tier_from_power(5) == 2
    assert derive_tier_from_power(6) == 3
    assert derive_tier_from_power(7) == 3
    assert derive_tier_from_power(8) == 3
    assert derive_tier_from_power(9) == 4
    assert derive_tier_from_power(11) == 4
    assert derive_tier_from_power(12) == 5
    assert derive_tier_from_power(100) == 5  # clamp apex


def test_build_hostile_unit_sets_tier_derived_from_power(catalog):
    g3 = {"power": 3, "role": "front", "affixes": []}
    g7 = {"power": 7, "role": "front", "affixes": []}
    u3 = build_hostile_unit_from_group("h1", "sp", g3, [], catalog)
    u7 = build_hostile_unit_from_group("h2", "sp", g7, [], catalog)
    assert u3["tier"] == 2
    assert u7["tier"] == 3


def test_party_unit_initializes_pt_and_reactions(catalog):
    unit = build_party_unit("p1", "sp1", [], catalog)
    assert unit["pt"] == DEFAULT_PT_POOL
    assert unit["reactions"] == {
        "current": DEFAULT_REACTIONS_MAX,
        "max": DEFAULT_REACTIONS_MAX,
    }


def test_hostile_unit_initializes_pt_and_reactions(catalog):
    group = {"power": 5, "role": "front", "affixes": []}
    unit = build_hostile_unit_from_group("h1", "sp1", group, [], catalog)
    assert unit["pt"] == 0
    assert unit["reactions"]["current"] == 1
    assert unit["reactions"]["max"] == 1


def test_build_hostile_unit_derives_from_power(catalog):
    group = {"power": 7, "role": "front", "affixes": []}
    unit = build_hostile_unit_from_group(
        unit_id="h1",
        species_id="test_enemy",
        group=group,
        trait_ids=[],
        catalog=catalog,
    )
    assert unit["side"] == "hostile"
    # power 7: hp = 40 + 70 = 110, armor = clamp(2 + 3) = 5, init = 8 + 7 = 15
    assert unit["hp"] == {"current": 110, "max": 110}
    assert unit["armor"] == 5
    assert unit["initiative"] == 15


def test_build_hostile_unit_clamps_armor_on_high_power(catalog):
    # power 40: armor naive 22 -> clamped a 12
    group = {"power": 40, "role": "apex", "affixes": []}
    unit = build_hostile_unit_from_group("h1", "apex_boss", group, [], catalog)
    assert unit["armor"] == 12


def test_hydrate_encounter_counts_and_sides(catalog):
    encounter = {
        "biome": "test",
        "tb": 10,
        "groups": [
            {"power": 5, "role": "front", "affixes": []},
            {"power": 3, "role": "support", "affixes": []},
        ],
        "party_vc": {
            "aggro": "mid",
            "cohesion": "mid",
            "setup": "mid",
            "explore": "mid",
            "risk": "mid",
        },
    }
    party = [
        {"id": "p1", "species_id": "sp1", "trait_ids": []},
    ]
    state = hydrate_encounter(
        encounter=encounter,
        party=party,
        catalog=catalog,
        seed="test-seed",
        session_id="test-session",
    )
    assert len(state["units"]) == 3
    sides = [u["side"] for u in state["units"]]
    assert sides.count("party") == 1
    assert sides.count("hostile") == 2
    assert state["turn"] == 1
    assert state["active_unit_id"] == state["initiative_order"][0]
    assert state["seed"] == "test-seed"
    assert state["encounter_id"] is None


def test_hydrate_encounter_initiative_order_is_desc_with_id_tiebreak(catalog):
    encounter = {
        "biome": "test",
        "tb": 5,
        "groups": [
            {"power": 5, "role": "front", "affixes": []},
            {"power": 5, "role": "back", "affixes": []},
        ],
        "party_vc": {
            "aggro": "mid",
            "cohesion": "mid",
            "setup": "mid",
            "explore": "mid",
            "risk": "mid",
        },
    }
    party = [{"id": "p1", "species_id": "sp1", "trait_ids": []}]
    state = hydrate_encounter(
        encounter=encounter,
        party=party,
        catalog=catalog,
        seed="s",
        session_id="ss",
    )
    # hostile init = 13 (8+5) both, party init = 12 -> order: h01, h02, p1
    assert state["initiative_order"] == ["hostile-01", "hostile-02", "p1"]


def test_hydrate_encounter_without_explicit_hostile_species(catalog):
    encounter = {
        "biome": "test",
        "tb": 5,
        "groups": [{"power": 3, "role": "control", "affixes": []}],
        "party_vc": None,
    }
    party = [{"id": "p1", "species_id": "sp1", "trait_ids": []}]
    state = hydrate_encounter(encounter, party, catalog, "s", "ss")
    hostile = [u for u in state["units"] if u["side"] == "hostile"][0]
    assert hostile["species_id"] == "hostile_control"
    assert state["vc"] is None


# --- ADR-2026-04-19 M5-#1b wire: species_resistances.yaml + build_*_unit
# Test la pipeline completa species archetype (100-neutral) -> merge_resistances
# -> delta -> resistances field della unit. Verifica backward compat (param
# species_archetype opzionale = fallback ad aggregate_resistances trait-only).


def test_load_species_resistances_reads_yaml():
    data = load_species_resistances(SPECIES_RESISTANCES_PATH)
    assert "species_archetypes" in data
    archetypes = data["species_archetypes"]
    for required_id in ("corazzato", "psionico", "adattivo"):
        assert required_id in archetypes
    corazzato = archetypes["corazzato"]["resistances"]
    assert corazzato["fisico"] == 80  # 20% resist
    assert corazzato["psionico"] == 120  # 20% vuln
    assert data.get("default_archetype") == "adattivo"


def test_get_archetype_resistances_returns_dict_for_valid_id():
    data = load_species_resistances(SPECIES_RESISTANCES_PATH)
    result = get_archetype_resistances("psionico", data)
    assert result is not None
    assert result["fisico"] == 120  # vuln in 100-neutral scale
    assert result["psionico"] == 70  # resist


def test_get_archetype_resistances_falls_back_to_default():
    data = load_species_resistances(SPECIES_RESISTANCES_PATH)
    result = get_archetype_resistances("unknown_archetype_xyz", data)
    # fallback su default_archetype "adattivo" -> tutti canali 100 (neutro)
    assert result is not None
    assert all(pct == 100 for pct in result.values())


def test_get_archetype_resistances_returns_none_if_no_data():
    assert get_archetype_resistances("corazzato", None) is None


def test_build_party_unit_with_species_archetype_applies_baseline(catalog):
    """ADR-2026-04-19 smoking gun: psionico vulnerability + trait stack."""
    species_data = load_species_resistances(SPECIES_RESISTANCES_PATH)
    archetype_dict = get_archetype_resistances("psionico", species_data)
    unit = build_party_unit(
        unit_id="p1",
        species_id="test_psionico",
        trait_ids=[],
        catalog=catalog,
        species_archetype=archetype_dict,
    )
    # Atteso format delta dopo merge_resistances:
    # psionico.fisico: 120 (vuln) -> {channel: fisico, modifier_pct: -20}
    by_channel = {r["channel"]: r["modifier_pct"] for r in unit["resistances"]}
    assert by_channel["fisico"] == -20
    assert by_channel["taglio"] == -20
    assert by_channel["psionico"] == 30  # 100-70


def test_build_party_unit_backward_compat_without_archetype(catalog):
    """Senza species_archetype: fallback trait-only (pre-ADR behavior)."""
    unit_baseline = build_party_unit("p1", "sp", [], catalog)
    assert unit_baseline["resistances"] == []  # trait-only, vuoto

    unit_with_trait = build_party_unit(
        "p2", "sp", ["mantello_meteoritico"], catalog
    )
    by_channel = {r["channel"]: r["modifier_pct"] for r in unit_with_trait["resistances"]}
    # mantello_meteoritico ha resistances, trait-only passa invariato
    assert len(by_channel) > 0


def test_build_party_unit_species_plus_trait_stack_additive(catalog):
    """species corazzato + trait additivo: somma algebrica delta format."""
    species_data = load_species_resistances(SPECIES_RESISTANCES_PATH)
    archetype_dict = get_archetype_resistances("corazzato", species_data)
    # mantello_meteoritico aggiunge fisico+20 (resist)
    unit = build_party_unit(
        "p1",
        "sp",
        ["mantello_meteoritico"],
        catalog,
        species_archetype=archetype_dict,
    )
    by_channel = {r["channel"]: r["modifier_pct"] for r in unit["resistances"]}
    # corazzato.fisico: 80 -> +20 baseline; trait mantello_meteoritico fisico+20
    # somma atteso: +40 (resist 40%)
    assert by_channel["fisico"] == 40


def test_build_hostile_unit_with_species_archetype(catalog):
    species_data = load_species_resistances(SPECIES_RESISTANCES_PATH)
    archetype_dict = get_archetype_resistances("bioelettrico", species_data)
    group = {"power": 5, "role": "threat", "affixes": []}
    unit = build_hostile_unit_from_group(
        "h1", "bioelettrico_drone", group, [], catalog,
        species_archetype=archetype_dict,
    )
    # bioelettrico.elettrico: 70 -> +30 resist; .fisico: 120 -> -20 vuln
    by_channel = {r["channel"]: r["modifier_pct"] for r in unit["resistances"]}
    assert by_channel["elettrico"] == 30
    assert by_channel["fisico"] == -20


def test_hydrate_encounter_with_species_resistances_end_to_end(catalog):
    """Integration test: YAML load -> hydrate_encounter -> unit.resistances."""
    species_data = load_species_resistances(SPECIES_RESISTANCES_PATH)
    encounter = {
        "biome": "test",
        "tb": 5,
        "groups": [
            {"power": 4, "role": "threat"},
            {"power": 6, "role": "keystone"},
        ],
        "party_vc": None,
    }
    party = [{"id": "p1", "species_id": "sp", "trait_ids": []}]
    state = hydrate_encounter(
        encounter,
        party,
        catalog,
        "seed",
        "sid",
        species_resistances_data=species_data,
        party_archetypes=["psionico"],
        hostile_archetypes=["corazzato", "bioelettrico"],
    )
    party_unit = state["units"][0]
    # psionico: fisico=120 -> -20 vuln
    assert any(
        r["channel"] == "fisico" and r["modifier_pct"] == -20
        for r in party_unit["resistances"]
    )
    hostile_0 = state["units"][1]  # corazzato
    assert any(
        r["channel"] == "fisico" and r["modifier_pct"] == 20
        for r in hostile_0["resistances"]
    )
    hostile_1 = state["units"][2]  # bioelettrico
    assert any(
        r["channel"] == "fisico" and r["modifier_pct"] == -20
        for r in hostile_1["resistances"]
    )


def test_hydrate_encounter_no_species_data_backward_compat(catalog):
    """Senza species_resistances_data: comportamento pre-ADR invariato."""
    encounter = {
        "biome": "test",
        "tb": 5,
        "groups": [{"power": 3, "role": "control"}],
        "party_vc": None,
    }
    party = [{"id": "p1", "species_id": "sp", "trait_ids": []}]
    # Non passare species_resistances_data + archetypes: deve usare
    # aggregate_resistances (trait-only).
    state = hydrate_encounter(encounter, party, catalog, "s", "ss")
    assert state["units"][0]["resistances"] == []
    assert state["units"][1]["resistances"] == []
