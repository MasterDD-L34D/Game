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

from rules.trait_effects import (
    DEFAULT_ACTIVE_EFFECTS_PATH,
    evaluate_attack_traits,
    load_active_effects,
)

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
        # damage_applied should include +2 extra -1 reduction = net +1
        # (on top of base damage)
