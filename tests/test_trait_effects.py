"""Test suite per ``services/rules/trait_effects`` (Fase 3).

Copre:
- load_active_effects da YAML
- _check_trigger (AND logic, min_mos, on_kill, melee_only)
- evaluate_attack_traits (extra_damage, damage_reduction, apply_status)
- integration con resolver.py via _active_effects_registry action field
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SERVICES = PROJECT_ROOT / "services"
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
for path in (SERVICES, TOOLS_PY):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from rules.hydration import load_trait_mechanics
from rules.trait_effects import (
    DEFAULT_ACTIVE_EFFECTS_PATH,
    evaluate_attack_traits,
    load_active_effects,
)

MECHANICS_PATH = (
    PROJECT_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "trait_mechanics.yaml"
)


@pytest.fixture(scope="module")
def catalog():
    return load_trait_mechanics(MECHANICS_PATH)


# ------------------------------------------------------------------
# Loader
# ------------------------------------------------------------------


def test_load_active_effects_reads_yaml():
    registry = load_active_effects()
    assert len(registry) >= 7  # 9 traits in YAML
    assert "zampe_a_molla" in registry
    assert "pelle_elastomera" in registry
    assert registry["zampe_a_molla"]["tier"] == "T1"


def test_load_active_effects_missing_file(tmp_path):
    missing = tmp_path / "nope.yaml"
    assert load_active_effects(missing) == {}


def test_load_active_effects_malformed(tmp_path):
    bad = tmp_path / "bad.yaml"
    bad.write_text("not: valid: yaml: [[[", encoding="utf-8")
    assert load_active_effects(bad) == {}


# ------------------------------------------------------------------
# Trigger checks (via evaluate_attack_traits)
# ------------------------------------------------------------------


MOCK_REGISTRY = {
    "extra_dmg": {
        "applies_to": "actor",
        "trigger": {"action_type": "attack", "on_result": "hit"},
        "effect": {"kind": "extra_damage", "amount": 2, "log_tag": "extra"},
    },
    "dmg_reduce": {
        "applies_to": "target",
        "trigger": {"action_type": "attack", "on_result": "hit"},
        "effect": {"kind": "damage_reduction", "amount": 1, "log_tag": "reduce"},
    },
    "on_kill_rage": {
        "applies_to": "actor",
        "trigger": {"action_type": "attack", "on_result": "hit", "on_kill": True},
        "effect": {
            "kind": "apply_status",
            "target_side": "actor",
            "stato": "rage",
            "turns": 3,
            "log_tag": "rage",
        },
    },
    "min_mos_stun": {
        "applies_to": "actor",
        "trigger": {"action_type": "attack", "on_result": "hit", "min_mos": 8},
        "effect": {
            "kind": "apply_status",
            "target_side": "target",
            "stato": "stunned",
            "turns": 1,
            "log_tag": "stun",
        },
    },
    "melee_panic": {
        "applies_to": "actor",
        "trigger": {
            "action_type": "attack",
            "on_result": "hit",
            "melee_only": True,
        },
        "effect": {
            "kind": "apply_status",
            "target_side": "target",
            "stato": "panic",
            "turns": 2,
            "log_tag": "panic",
        },
    },
}


def test_extra_damage_on_hit():
    fx = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["extra_dmg"],
        target_trait_ids=[],
        hit=True,
        mos=3,
    )
    assert fx["damage_modifier"] == 2
    assert len(fx["trait_effects"]) == 1
    assert fx["trait_effects"][0]["triggered"] is True


def test_extra_damage_not_triggered_on_miss():
    fx = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["extra_dmg"],
        target_trait_ids=[],
        hit=False,
        mos=-1,
    )
    assert fx["damage_modifier"] == 0
    assert fx["trait_effects"][0]["triggered"] is False


def test_damage_reduction_on_hit():
    fx = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=[],
        target_trait_ids=["dmg_reduce"],
        hit=True,
        mos=3,
    )
    assert fx["damage_modifier"] == -1


def test_combined_extra_and_reduction():
    fx = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["extra_dmg"],
        target_trait_ids=["dmg_reduce"],
        hit=True,
        mos=5,
    )
    # +2 extra - 1 reduction = +1
    assert fx["damage_modifier"] == 1


def test_on_kill_status_triggers():
    fx = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["on_kill_rage"],
        target_trait_ids=[],
        hit=True,
        mos=3,
        kill=True,
    )
    assert len(fx["statuses_to_apply"]) == 1
    assert fx["statuses_to_apply"][0]["status_id"] == "rage"
    assert fx["statuses_to_apply"][0]["target_side"] == "actor"
    assert fx["statuses_to_apply"][0]["duration"] == 3


def test_on_kill_status_NOT_triggered_without_kill():
    fx = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["on_kill_rage"],
        target_trait_ids=[],
        hit=True,
        mos=3,
        kill=False,
    )
    assert len(fx["statuses_to_apply"]) == 0


def test_min_mos_trigger():
    fx_low = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["min_mos_stun"],
        target_trait_ids=[],
        hit=True,
        mos=5,
    )
    assert len(fx_low["statuses_to_apply"]) == 0  # mos 5 < 8

    fx_high = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["min_mos_stun"],
        target_trait_ids=[],
        hit=True,
        mos=10,
    )
    assert len(fx_high["statuses_to_apply"]) == 1
    assert fx_high["statuses_to_apply"][0]["status_id"] == "stunned"


def test_melee_only_trigger():
    fx_ranged = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["melee_panic"],
        target_trait_ids=[],
        hit=True,
        mos=3,
        melee=False,
    )
    assert len(fx_ranged["statuses_to_apply"]) == 0

    fx_melee = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["melee_panic"],
        target_trait_ids=[],
        hit=True,
        mos=3,
        melee=True,
    )
    assert len(fx_melee["statuses_to_apply"]) == 1
    assert fx_melee["statuses_to_apply"][0]["status_id"] == "panic"


def test_unknown_trait_id_ignored():
    fx = evaluate_attack_traits(
        registry=MOCK_REGISTRY,
        actor_trait_ids=["nonexistent_trait"],
        target_trait_ids=[],
        hit=True,
        mos=10,
    )
    assert fx["damage_modifier"] == 0
    assert fx["trait_effects"] == []


def test_empty_registry_no_effects():
    fx = evaluate_attack_traits(
        registry={},
        actor_trait_ids=["zampe_a_molla"],
        target_trait_ids=["pelle_elastomera"],
        hit=True,
        mos=10,
    )
    assert fx["damage_modifier"] == 0
    assert fx["trait_effects"] == []
    assert fx["statuses_to_apply"] == []


# ------------------------------------------------------------------
# Integration: resolver with _active_effects_registry
# ------------------------------------------------------------------


# ------------------------------------------------------------------
# Ability action type (Fase 3b)
# ------------------------------------------------------------------


def test_ability_damage_applies_to_target(catalog):
    """ability type=damage rolls dice and applies to target HP."""
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    attacker = build_party_unit("atk", "test", ["cannone_sonico_a_raggio"], catalog)
    target = build_party_unit("tgt", "test", [], catalog)
    state = {
        "session_id": "t",
        "seed": "ab",
        "turn": 1,
        "units": [attacker, target],
        "log": [],
    }
    action = {
        "id": "ab-dmg",
        "type": "ability",
        "actor_id": "atk",
        "target_id": "tgt",
        "ability_id": "sonic_blast",
        "ap_cost": 3,
    }
    hp_before = target["hp"]["current"]
    rng_iter = iter([5 / 6, 3 / 6])  # 2d6: ~6+4=10, +1 mod = 11
    result = resolve_action(state, action, catalog, lambda: next(rng_iter))
    entry = result["turn_log_entry"]
    assert entry["damage_applied"] > 0
    tgt_after = next(u for u in result["next_state"]["units"] if u["id"] == "tgt")
    assert tgt_after["hp"]["current"] < hp_before


def test_ability_heal_restores_hp(catalog):
    """ability type=heal restores HP on target."""
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    actor = build_party_unit("atk", "test", ["grassi_termici"], catalog)
    target = build_party_unit("tgt", "test", [], catalog)
    target["hp"]["current"] = max(1, target["hp"]["max"] // 2)
    hp_before = target["hp"]["current"]
    state = {
        "session_id": "t",
        "seed": "ab",
        "turn": 1,
        "units": [actor, target],
        "log": [],
    }
    action = {
        "id": "ab-heal",
        "type": "ability",
        "actor_id": "atk",
        "target_id": "tgt",
        "ability_id": "thermal_pulse",
        "ap_cost": 2,
    }
    rng_iter = iter([3 / 4])  # 1d4: ~3, +2 mod = 5
    result = resolve_action(state, action, catalog, lambda: next(rng_iter))
    entry = result["turn_log_entry"]
    assert entry["healing_applied"] > 0
    tgt_after = next(u for u in result["next_state"]["units"] if u["id"] == "tgt")
    assert tgt_after["hp"]["current"] > hp_before


def test_ability_apply_status_on_target(catalog):
    """ability type=apply_status applies status to target."""
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    actor = build_party_unit("atk", "test", ["spore_psichiche_silenziate"], catalog)
    target = build_party_unit("tgt", "test", [], catalog)
    state = {
        "session_id": "t",
        "seed": "ab",
        "turn": 1,
        "units": [actor, target],
        "log": [],
    }
    action = {
        "id": "ab-status",
        "type": "ability",
        "actor_id": "atk",
        "target_id": "tgt",
        "ability_id": "spore_burst",
        "ap_cost": 2,
    }
    result = resolve_action(state, action, catalog, lambda: 0.5)
    entry = result["turn_log_entry"]
    assert len(entry["statuses_applied"]) == 1
    tgt_after = next(u for u in result["next_state"]["units"] if u["id"] == "tgt")
    disorients = [s for s in tgt_after.get("statuses", []) if s.get("id") == "disorient"]
    assert len(disorients) == 1


def test_ability_buff_adds_to_unit_buffs(catalog):
    """ability type=buff adds buff to actor.buffs[]."""
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    actor = build_party_unit("atk", "test", ["sangue_piroforico"], catalog)
    target = build_party_unit("tgt", "test", [], catalog)
    state = {
        "session_id": "t",
        "seed": "ab",
        "turn": 1,
        "units": [actor, target],
        "log": [],
    }
    action = {
        "id": "ab-buff",
        "type": "ability",
        "actor_id": "atk",
        "target_id": "tgt",
        "ability_id": "ignition_surge",
        "ap_cost": 2,
    }
    result = resolve_action(state, action, catalog, lambda: 0.5)
    atk_after = next(u for u in result["next_state"]["units"] if u["id"] == "atk")
    buffs = atk_after.get("buffs", [])
    assert len(buffs) == 1
    assert buffs[0]["stat"] == "attack_mod"
    assert buffs[0]["amount"] == 2
    assert buffs[0]["remaining_turns"] == 2


def test_ability_unknown_ability_id_raises(catalog):
    """ability with unknown ability_id raises ValueError."""
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action
    import pytest as _pytest

    actor = build_party_unit("atk", "test", ["grassi_termici"], catalog)
    target = build_party_unit("tgt", "test", [], catalog)
    state = {
        "session_id": "t",
        "seed": "ab",
        "turn": 1,
        "units": [actor, target],
        "log": [],
    }
    action = {
        "id": "ab-bad",
        "type": "ability",
        "actor_id": "atk",
        "target_id": "tgt",
        "ability_id": "nonexistent_ability",
        "ap_cost": 1,
    }
    with _pytest.raises(ValueError, match="nonexistent_ability"):
        resolve_action(state, action, catalog, lambda: 0.5)


def test_buff_decays_in_begin_turn(catalog):
    """Buff remaining_turns decrements in begin_turn, removed when 0."""
    from rules.hydration import build_party_unit
    from rules.resolver import begin_turn

    actor = build_party_unit("atk", "test", [], catalog)
    actor["buffs"] = [
        {"stat": "attack_mod", "amount": 2, "remaining_turns": 2, "source_ability": "test"},
        {"stat": "defense_mod", "amount": 1, "remaining_turns": 1, "source_ability": "test"},
    ]
    state = {
        "session_id": "t",
        "seed": "ab",
        "turn": 1,
        "units": [actor],
        "log": [],
    }
    result = begin_turn(state, "atk")
    atk_after = next(u for u in result["next_state"]["units"] if u["id"] == "atk")
    buffs = atk_after.get("buffs", [])
    # attack_mod buff: 2-1=1 remaining, still alive
    # defense_mod buff: 1-1=0, removed
    assert len(buffs) == 1
    assert buffs[0]["stat"] == "attack_mod"
    assert buffs[0]["remaining_turns"] == 1


def test_resolver_uses_active_effects_registry():
    """Verifica che resolve_action applichi trait effects quando
    _active_effects_registry e' presente nell'action."""
    from rules.hydration import build_party_unit, load_trait_mechanics

    MECHANICS_PATH = (
        PROJECT_ROOT
        / "packs"
        / "evo_tactics_pack"
        / "data"
        / "balance"
        / "trait_mechanics.yaml"
    )
    catalog = load_trait_mechanics(MECHANICS_PATH)
    from rules.resolver import resolve_action

    attacker = build_party_unit(
        unit_id="atk",
        species_id="test",
        trait_ids=[],
        catalog=catalog,
    )
    target = build_party_unit(
        unit_id="tgt",
        species_id="test",
        trait_ids=[],
        catalog=catalog,
    )
    # Inject trait IDs that match our mock registry
    attacker["trait_ids"] = ["extra_dmg"]
    target["trait_ids"] = ["dmg_reduce"]

    state = {
        "session_id": "test",
        "seed": "fx-test",
        "turn": 1,
        "units": [attacker, target],
        "log": [],
    }
    action = {
        "id": "fx-attack",
        "type": "attack",
        "actor_id": "atk",
        "target_id": "tgt",
        "ap_cost": 1,
        "channel": None,
        "damage_dice": {"count": 1, "sides": 6, "modifier": 2},
        "_active_effects_registry": MOCK_REGISTRY,
    }

    # High rng → hit (nat 20)
    rng_iter = iter([19 / 20, 5 / 8])
    rng = lambda: next(rng_iter)
    result = resolve_action(state, action, catalog, rng)
    entry = result["turn_log_entry"]

    # Should have trait_effects in log
    if entry["roll"]["success"]:
        assert "trait_effects" in entry
        assert len(entry["trait_effects"]) >= 1


# ------------------------------------------------------------------
# PP combo meter + SG surge burst
# ------------------------------------------------------------------


def test_pp_accumulates_on_hit(catalog):
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    atk = build_party_unit("atk", "test", [], catalog)
    tgt = build_party_unit("tgt", "test", [], catalog)
    atk["pp"] = 0
    state = {"session_id": "t", "seed": "pp", "turn": 1, "units": [atk, tgt], "log": []}
    action = {"id": "a1", "type": "attack", "actor_id": "atk", "target_id": "tgt", "ap_cost": 1, "damage_dice": {"count": 1, "sides": 6, "modifier": 2}}
    rng = iter([19 / 20, 5 / 8])
    result = resolve_action(state, action, catalog, lambda: next(rng))
    atk_after = next(u for u in result["next_state"]["units"] if u["id"] == "atk")
    if result["turn_log_entry"]["roll"]["success"]:
        assert atk_after["pp"] >= 1
        assert result["turn_log_entry"]["roll"]["pp_gained"] >= 1


def test_pp_bonus_on_kill(catalog):
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    atk = build_party_unit("atk", "test", [], catalog)
    tgt = build_party_unit("tgt", "test", [], catalog)
    tgt["hp"]["current"] = 1
    atk["pp"] = 0
    state = {"session_id": "t", "seed": "pp", "turn": 1, "units": [atk, tgt], "log": []}
    action = {"id": "a1", "type": "attack", "actor_id": "atk", "target_id": "tgt", "ap_cost": 1, "damage_dice": {"count": 1, "sides": 6, "modifier": 5}}
    rng = iter([19 / 20, 5 / 8])
    result = resolve_action(state, action, catalog, lambda: next(rng))
    atk_after = next(u for u in result["next_state"]["units"] if u["id"] == "atk")
    if result["turn_log_entry"]["roll"]["success"]:
        assert atk_after["pp"] >= 3


def test_surge_burst_offensive(catalog):
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    atk = build_party_unit("atk", "test", [], catalog)
    atk["stress"] = 0.80
    state = {"session_id": "t", "seed": "sg", "turn": 1, "units": [atk], "log": []}
    action = {"id": "surge", "type": "ability", "actor_id": "atk", "ability_id": "surge_burst_offensive", "ap_cost": 0}
    result = resolve_action(state, action, catalog, lambda: 0.5)
    atk_after = next(u for u in result["next_state"]["units"] if u["id"] == "atk")
    assert atk_after["stress"] == 0.25
    assert any(b["source_ability"] == "surge_burst_offensive" for b in atk_after.get("buffs", []))


def test_surge_burst_recovery_heals(catalog):
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    atk = build_party_unit("atk", "test", [], catalog)
    atk["hp"]["current"] = 4
    atk["hp"]["max"] = 10
    atk["stress"] = 0.80
    atk["statuses"] = [{"id": "bleeding", "intensity": 1, "remaining_turns": 2}]
    state = {"session_id": "t", "seed": "sg", "turn": 1, "units": [atk], "log": []}
    action = {"id": "surge", "type": "ability", "actor_id": "atk", "ability_id": "surge_burst_recovery", "ap_cost": 0}
    result = resolve_action(state, action, catalog, lambda: 0.5)
    atk_after = next(u for u in result["next_state"]["units"] if u["id"] == "atk")
    assert atk_after["hp"]["current"] == 7
    assert atk_after["stress"] == 0.25
    assert len(atk_after["statuses"]) == 0


def test_surge_burst_requires_sg_75(catalog):
    from rules.hydration import build_party_unit
    from rules.resolver import resolve_action

    atk = build_party_unit("atk", "test", [], catalog)
    atk["stress"] = 0.50
    state = {"session_id": "t", "seed": "sg", "turn": 1, "units": [atk], "log": []}
    action = {"id": "surge", "type": "ability", "actor_id": "atk", "ability_id": "surge_burst_offensive", "ap_cost": 0}
    with pytest.raises(ValueError, match="SG >= 75"):
        resolve_action(state, action, catalog, lambda: 0.5)
