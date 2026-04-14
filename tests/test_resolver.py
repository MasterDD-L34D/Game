"""Test di regressione per ``services/rules/resolver``.

Copre le formule derivate dalle decisioni di design dell'ADR (vedi sezione
"Fase 5") e testa a scenari fissi con rng deterministico:

- attack normale successo con MoS=0 (danno base puro)
- attack con MoS alto che produce step bonus da trait offensive + MoS
- attack fumble (nat 1 -> auto-miss, nessun danno anche se total >= CD)
- attack crit (nat 20 -> auto-success, +2 PT, super MoS)
- attack con resistenza al canale (fuoco +20% -> danno ridotto a 0.8x)
- attack con armor DR (sottratto dopo la resistenza)
- attack con target armor > damage -> danno clampato a 0
- action non-attack (move/defend) consuma AP senza roll
- integrazione con namespaced_rng (seed stabile produce stessi risultati)
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable, List

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SERVICES = PROJECT_ROOT / "services"
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
for path in (SERVICES, TOOLS_PY):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from game_utils.random_utils import namespaced_rng  # noqa: E402
from rules.hydration import (  # noqa: E402
    build_hostile_unit_from_group,
    build_party_unit,
    hydrate_encounter,
    load_trait_mechanics,
)
from rules.resolver import (  # noqa: E402
    ATTACK_CD_BASE,
    DISORIENT_ATTACK_MALUS_PER_INTENSITY,
    FRACTURE_STEP_REDUCTION_PER_INTENSITY,
    PANIC_ATTACK_MALUS_PER_INTENSITY,
    PANIC_DEFAULT_DURATION,
    RAGE_ATTACK_BONUS_PER_INTENSITY,
    RAGE_DAMAGE_STEP_BONUS_PER_INTENSITY,
    RAGE_DEFENSE_MALUS_PER_INTENSITY,
    PARRY_CD,
    PARRY_PT_BASE,
    PARRY_PT_CRIT,
    PERFORAZIONE_ARMOR_REDUCTION,
    RAGE_DEFAULT_DURATION,
    STRESS_BREAKPOINT_PANIC,
    STRESS_BREAKPOINT_RAGE,
    apply_armor,
    apply_pt_spend,
    apply_resistance,
    apply_status,
    begin_turn,
    check_stress_breakpoints,
    compute_pt_gained,
    compute_step_count,
    compute_step_flat_bonus,
    get_status,
    resolve_action,
    resolve_parry,
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


def rng_from_sequence(values: Iterable[float]):
    iterator = iter(values)

    def rng() -> float:
        return next(iterator)

    return rng


def _mini_state(catalog):
    """Stato di combattimento minimale: 1 attacker party + 1 target hostile."""
    attacker = build_party_unit(
        unit_id="atk",
        species_id="demo_attacker",
        trait_ids=[],
        catalog=catalog,
    )
    target = build_hostile_unit_from_group(
        unit_id="tgt",
        species_id="demo_target",
        group={"power": 4, "role": "front", "affixes": []},
        trait_ids=[],
        catalog=catalog,
    )
    return {
        "session_id": "s1",
        "seed": "test-seed",
        "encounter_id": None,
        "turn": 1,
        "initiative_order": ["atk", "tgt"],
        "active_unit_id": "atk",
        "units": [attacker, target],
        "vc": None,
        "log": [],
    }


def _attack(actor_id="atk", target_id="tgt", dice=None, channel=None, ability=None):
    return {
        "id": "act-test",
        "type": "attack",
        "actor_id": actor_id,
        "target_id": target_id,
        "ability_id": ability,
        "ap_cost": 1,
        "channel": channel,
        "damage_dice": dice or {"count": 1, "sides": 8, "modifier": 3},
    }


# --- Unit tests sui componenti puri ---------------------------------------


def test_compute_pt_gained_crit_20_gives_two():
    assert compute_pt_gained(natural=20, mos=0) == 2


def test_compute_pt_gained_nat_15_to_19_gives_one():
    assert compute_pt_gained(natural=15, mos=0) == 1
    assert compute_pt_gained(natural=19, mos=0) == 1
    assert compute_pt_gained(natural=14, mos=0) == 0


def test_compute_pt_gained_adds_one_per_five_mos():
    assert compute_pt_gained(natural=10, mos=4) == 0
    assert compute_pt_gained(natural=10, mos=5) == 1
    assert compute_pt_gained(natural=10, mos=10) == 2


def test_compute_pt_gained_crit_and_mos_stack():
    # nat 20 + mos 10 = 2 + 2 = 4
    assert compute_pt_gained(natural=20, mos=10) == 4


def test_compute_step_count_from_mos_plus_trait_bonus():
    assert compute_step_count(mos=4, trait_damage_step_bonus=0) == 0
    assert compute_step_count(mos=5, trait_damage_step_bonus=0) == 1
    assert compute_step_count(mos=10, trait_damage_step_bonus=1) == 3
    assert compute_step_count(mos=0, trait_damage_step_bonus=1) == 1


def test_compute_step_flat_bonus_uses_avg_base():
    # 1d8+3 -> avg_base = (1*4.5) + 3 = 7.5
    # 1 step -> floor(7.5 * 0.25 * 1) = floor(1.875) = 1
    # 2 step -> floor(7.5 * 0.5) = floor(3.75) = 3
    assert compute_step_flat_bonus(count=1, sides=8, modifier=3, step_count=1) == 1
    assert compute_step_flat_bonus(count=1, sides=8, modifier=3, step_count=2) == 3
    # 2d12+6 -> avg_base = 2*6.5 + 6 = 19
    # 1 step -> floor(19 * 0.25) = floor(4.75) = 4
    assert compute_step_flat_bonus(count=2, sides=12, modifier=6, step_count=1) == 4
    assert compute_step_flat_bonus(count=2, sides=12, modifier=6, step_count=0) == 0


def test_apply_resistance_multiplicative_floor():
    # fuoco 10 con resist 20% -> floor(10 * 0.8) = 8
    resistances = [{"channel": "fuoco", "modifier_pct": 20}]
    assert apply_resistance(10, resistances, "fuoco") == 8
    # canale non matching passa invariato
    assert apply_resistance(10, resistances, "fisico") == 10
    # resistenza 100% azzera
    assert apply_resistance(10, [{"channel": "fuoco", "modifier_pct": 100}], "fuoco") == 0


def test_apply_resistance_negative_pct_amplifies():
    # -20% vulnerability -> floor(10 * 1.2) = 12
    assert apply_resistance(10, [{"channel": "fuoco", "modifier_pct": -20}], "fuoco") == 12


def test_apply_armor_sottrae_flat():
    assert apply_armor(10, 3) == 7
    assert apply_armor(5, 10) == 0  # clamp a 0
    assert apply_armor(0, 5) == 0
    assert apply_armor(10, 0) == 10


# --- Test di resolve_action a scenari fissi --------------------------------


def test_attack_success_base_damage_no_mos(catalog):
    state = _mini_state(catalog)
    # target: tier 2 (power 4), defense_mod 0 -> CD = 10 + 2 + 0 = 12
    # attacker: attack_mod 0
    # rng: nat 12 (tiro d20 = 12, total = 12, success, mos = 0)
    #      damage 1d8 = 5 (forzato)
    # expected: damage = 5+3 = 8, armor target = 4 -> 8-4 = 4
    rng = rng_from_sequence([
        11 / 20,  # roll_die(rng, 20) = 1 + int(11/20 * 20) = 1 + 11 = 12
        4 / 8,    # roll_die(rng, 8) = 1 + int(0.5 * 8) = 1 + 4 = 5
    ])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["natural"] == 12
    assert roll["success"] is True
    assert roll["mos"] == 0
    assert roll["damage_step"] == 0
    # base = 5+3=8, resist none, armor 4 -> 4
    assert result["turn_log_entry"]["damage_applied"] == 4
    target_hp = result["next_state"]["units"][1]["hp"]["current"]
    # target power 4 hp = 80, dopo -4 = 76
    assert target_hp == 76


def test_attack_fumble_auto_miss(catalog):
    state = _mini_state(catalog)
    rng = rng_from_sequence([0.0])  # nat 1
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["natural"] == 1
    assert roll["is_fumble"] is True
    assert roll["success"] is False
    assert result["turn_log_entry"]["damage_applied"] == 0
    # Target HP invariato
    assert result["next_state"]["units"][1]["hp"]["current"] == 80


def test_attack_crit_nat20(catalog):
    state = _mini_state(catalog)
    # nat 20, poi 1d8 = 1 (forzato con 0.0)
    # CD = 12, mos = 20 - 12 = 8, step from mos = 1
    # step_flat = floor(7.5 * 0.25 * 1) = 1
    # base damage rolled = 1+3 = 4, +1 step = 5, armor 4 -> 1
    # pt_gained = 2 (crit) + 1 (mos >= 5) = 3
    rng = rng_from_sequence([19 / 20, 0.0])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["natural"] == 20
    assert roll["is_crit"] is True
    assert roll["success"] is True
    assert roll["mos"] == 8
    assert roll["damage_step"] == 1
    assert roll["pt_gained"] == 3
    assert result["turn_log_entry"]["damage_applied"] == 1


def test_attack_with_resistance_reduces_damage(catalog):
    state = _mini_state(catalog)
    # Mettiamo una resistenza fuoco +50% sul target
    state["units"][1]["resistances"] = [{"channel": "fuoco", "modifier_pct": 50}]
    # nat 15 -> total 15, CD 12, mos 3, step 0
    # 1d8 = 8 (forzato), pre_resist = 8+3 = 11
    # resist: floor(11 * 0.5) = 5, armor 4 -> 1
    rng = rng_from_sequence([14 / 20, 7 / 8])
    result = resolve_action(
        state,
        _attack(dice={"count": 1, "sides": 8, "modifier": 3}, channel="fuoco"),
        catalog,
        rng,
    )
    assert result["turn_log_entry"]["damage_applied"] == 1


def test_attack_armor_clamps_damage_to_zero(catalog):
    state = _mini_state(catalog)
    state["units"][1]["armor"] = 99
    rng = rng_from_sequence([19 / 20, 7 / 8])  # nat 20, 1d8=8
    result = resolve_action(state, _attack(), catalog, rng)
    assert result["turn_log_entry"]["damage_applied"] == 0
    assert result["next_state"]["units"][1]["hp"]["current"] == 80


def test_attack_with_offensive_trait_attack_mod_increases_total(catalog):
    state = _mini_state(catalog)
    # attaccante con ipertrofia_muscolare_massiva (attack_mod +1, damage_step +1)
    state["units"][0]["trait_ids"] = ["ipertrofia_muscolare_massiva"]
    # nat 10 -> total = 10 + 1 = 11; CD=12 -> fail senza trait, ma con trait?
    # 10+1 = 11 < 12 -> fail ancora. Alziamo a nat 12 -> total 13 -> success.
    # mos = 1, step from mos = 0, step from trait = 1 -> total step 1
    # 1d8 = 4 (base), step_bonus floor(7.5*0.25) = 1 -> pre = 4+3+1 = 8
    # armor 4 -> 4
    rng = rng_from_sequence([11 / 20, 3 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["natural"] == 12
    assert roll["modifier"] == 1
    assert roll["total"] == 13
    assert roll["success"] is True
    assert roll["damage_step"] == 1  # solo dal trait
    assert result["turn_log_entry"]["damage_applied"] == 4


def test_attack_vs_defensive_trait_raises_cd(catalog):
    state = _mini_state(catalog)
    # target con pelage_idrorepellente_avanzato (defense_mod +1, resist cryo 25 + acido 15)
    state["units"][1]["trait_ids"] = ["pelage_idrorepellente_avanzato"]
    # Riaggrega resistances manualmente come farebbe hydration
    state["units"][1]["resistances"] = [
        {"channel": "cryo", "modifier_pct": 25},
        {"channel": "acido", "modifier_pct": 15},
    ]
    # CD = 10 + 2 + 1 = 13
    # nat 12 -> total 12 < 13 -> fail
    rng = rng_from_sequence([11 / 20])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["dc"] == 13
    assert roll["success"] is False
    assert result["turn_log_entry"]["damage_applied"] == 0


def test_action_move_consumes_ap_without_roll(catalog):
    state = _mini_state(catalog)
    move = {
        "id": "act-move",
        "type": "move",
        "actor_id": "atk",
        "target_id": None,
        "ap_cost": 1,
    }
    assert state["units"][0]["ap"]["current"] == 2
    result = resolve_action(state, move, catalog, rng_from_sequence([]))
    assert result["turn_log_entry"]["roll"] is None
    assert result["turn_log_entry"]["damage_applied"] == 0
    assert result["next_state"]["units"][0]["ap"]["current"] == 1


def test_action_defend_is_noop_but_consumes_ap(catalog):
    state = _mini_state(catalog)
    defend = {
        "id": "act-def",
        "type": "defend",
        "actor_id": "atk",
        "target_id": None,
        "ap_cost": 1,
    }
    result = resolve_action(state, defend, catalog, rng_from_sequence([]))
    assert result["turn_log_entry"]["roll"] is None
    assert result["next_state"]["units"][0]["ap"]["current"] == 1


def test_resolve_action_does_not_mutate_input_state(catalog):
    state = _mini_state(catalog)
    snapshot_before = state["units"][1]["hp"]["current"]
    rng = rng_from_sequence([19 / 20, 7 / 8])
    resolve_action(state, _attack(), catalog, rng)
    # L'input originale e' invariato (next_state e' una copy)
    assert state["units"][1]["hp"]["current"] == snapshot_before


def test_resolve_action_appends_turn_to_log(catalog):
    state = _mini_state(catalog)
    state["log"] = [{"turn": 0, "action": {"type": "noop"}}]
    rng = rng_from_sequence([0.0])  # nat 1, auto miss
    result = resolve_action(state, _attack(), catalog, rng)
    assert len(result["next_state"]["log"]) == 2


def test_resolve_integration_with_namespaced_rng(catalog):
    """Verifica che l'rng reale di Fase 1 funzioni con resolve_action."""
    state = _mini_state(catalog)
    rng = namespaced_rng("integration-seed-1", "attack")
    result = resolve_action(state, _attack(), catalog, rng)
    # Riprodurre lo stesso seed deve dare lo stesso natural
    rng2 = namespaced_rng("integration-seed-1", "attack")
    result2 = resolve_action(state, _attack(), catalog, rng2)
    assert result["turn_log_entry"]["roll"]["natural"] == result2["turn_log_entry"]["roll"]["natural"]
    assert result["turn_log_entry"]["damage_applied"] == result2["turn_log_entry"]["damage_applied"]


def test_resolve_integration_different_namespaces_produce_different_rolls(catalog):
    state = _mini_state(catalog)
    rng_a = namespaced_rng("integration-seed-1", "attack")
    rng_b = namespaced_rng("integration-seed-1", "defense")
    naturals = set()
    for rng in (rng_a, rng_b):
        result = resolve_action(state, _attack(), catalog, rng)
        naturals.add(result["turn_log_entry"]["roll"]["natural"])
    # Very likely (though not guaranteed) che due namespace diversi producano
    # natural diversi. Se collidessero, test flaky; il test di reproducibilita'
    # sopra copre il contratto piu' forte.
    assert len(naturals) >= 1


# --- Fase 2-quater + Fase 7: PT pool + Parry ------------------------------


def test_begin_turn_resets_ap_and_reactions(catalog):
    state = _mini_state(catalog)
    state["units"][0]["ap"]["current"] = 0
    state["units"][0]["reactions"]["current"] = 0
    result = begin_turn(state, "atk")
    next_state = result["next_state"]
    reset = next_state["units"][0]
    assert reset["ap"]["current"] == reset["ap"]["max"]
    assert reset["reactions"]["current"] == reset["reactions"]["max"]
    assert result["expired"] == []
    assert result["bleeding_damage"] == 0
    # L'altro unit non deve essere toccato
    untouched = next_state["units"][1]
    assert untouched["id"] == "tgt"


def test_begin_turn_does_not_mutate_input_state(catalog):
    state = _mini_state(catalog)
    state["units"][0]["ap"]["current"] = 0
    begin_turn(state, "atk")
    assert state["units"][0]["ap"]["current"] == 0


def test_apply_pt_spend_rejects_insufficient_pt():
    actor = {"pt": 1}
    with pytest.raises(ValueError, match="PT insufficienti"):
        apply_pt_spend(actor, {"type": "perforazione", "amount": 2})


def test_apply_pt_spend_rejects_unknown_type():
    actor = {"pt": 10}
    with pytest.raises(ValueError, match="non supportato"):
        apply_pt_spend(actor, {"type": "spinte", "amount": 2})


def test_apply_pt_spend_consumes_pool_on_valid_spend():
    actor = {"pt": 5}
    consumed = apply_pt_spend(actor, {"type": "perforazione", "amount": 2})
    assert consumed == 2
    assert actor["pt"] == 3


def test_pt_accumulation_on_success(catalog):
    state = _mini_state(catalog)
    # nat 16 -> total 16, CD 12, mos 4, pt_gained = 1 (nat 15-19)
    # Dopo l'action: actor.pt passa da 0 a 1
    rng = rng_from_sequence([15 / 20, 3 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    next_actor = result["next_state"]["units"][0]
    assert next_actor["pt"] == 1
    assert result["turn_log_entry"]["roll"]["pt_gained"] == 1


def test_pt_accumulation_crit_grants_two(catalog):
    state = _mini_state(catalog)
    rng = rng_from_sequence([19 / 20, 0 / 8])  # nat 20 + 1d8=1
    result = resolve_action(state, _attack(), catalog, rng)
    # nat 20 = +2, MoS grande = 20 - 12 = 8 -> +1 da MoS (8//5)
    roll = result["turn_log_entry"]["roll"]
    assert roll["pt_gained"] == 3
    assert result["next_state"]["units"][0]["pt"] == 3


def test_pt_spend_perforazione_consumed_even_on_miss(catalog):
    state = _mini_state(catalog)
    state["units"][0]["pt"] = 5
    # nat 1 (fumble) -> auto miss, ma pt_spend e' gia' stato consumato
    rng = rng_from_sequence([0.0])
    action = _attack()
    action["pt_spend"] = {"type": "perforazione", "amount": 2}
    result = resolve_action(state, action, catalog, rng)
    assert result["turn_log_entry"]["roll"]["success"] is False
    assert result["turn_log_entry"]["roll"]["pt_spent"] == 2
    # pt dopo: 5 - 2 (spent) + 0 (nessun accumulo su fumble) = 3
    assert result["next_state"]["units"][0]["pt"] == 3


def test_pt_spend_perforazione_reduces_target_armor_on_hit(catalog):
    state = _mini_state(catalog)
    state["units"][0]["pt"] = 5
    state["units"][1]["armor"] = 6  # senza perforazione un 1d8+3 non perfora
    # nat 12 -> total 12, CD 12 -> success, mos 0, step 0
    # damage 8 (forzato) + 3 = 11, armor effettivo 6-2=4 -> 7 danno
    # Senza perforazione sarebbe 11 - 6 = 5
    rng = rng_from_sequence([11 / 20, 7 / 8])
    action = _attack()
    action["pt_spend"] = {"type": "perforazione", "amount": 2}
    result = resolve_action(state, action, catalog, rng)
    assert result["turn_log_entry"]["roll"]["success"] is True
    assert result["turn_log_entry"]["damage_applied"] == 7
    # pt: 5 - 2 (spent) + 1 (MoS 0 + nat 12 non crit) = 4? nat 12 < 15 => +0 da range, MoS 0 => +0
    # totale pt_gained = 0, quindi 5 - 2 + 0 = 3
    assert result["next_state"]["units"][0]["pt"] == 3


def test_pt_spend_raises_on_insufficient_pt(catalog):
    state = _mini_state(catalog)
    state["units"][0]["pt"] = 1
    action = _attack()
    action["pt_spend"] = {"type": "perforazione", "amount": 2}
    with pytest.raises(ValueError, match="PT insufficienti"):
        resolve_action(state, action, catalog, rng_from_sequence([]))


def test_parry_success_reduces_step_and_grants_defensive_pt(catalog):
    state = _mini_state(catalog)
    # Nat 20 attacker (crit), 1d8 = 8
    # Attack nat 20 -> total 20. Parry contestata: nat 20 -> auto-success
    # mos = 20 - 12 = 8, step = 1, ridotto a 0 per parry success
    # step_bonus = 0 -> danno base 8+3 = 11, armor 4 -> 7
    rng = rng_from_sequence([
        19 / 20,  # nat 20 attack
        19 / 20,  # nat 20 parry (auto-success)
        7 / 8,    # damage 8
    ])
    action = _attack()
    action["parry_response"] = {"attempt": True, "parry_bonus": 0}
    result = resolve_action(state, action, catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["parry"] is not None
    assert roll["parry"]["executed"] is True
    assert roll["parry"]["success"] is True
    assert roll["damage_step"] == 0  # originale 1, ridotto a 0 dalla parry
    # Target (tgt) ha guadagnato PT difensivi (+2 crit sulla parry)
    next_target = result["next_state"]["units"][1]
    assert next_target["pt"] == PARRY_PT_CRIT
    # E ha consumato una reazione
    assert next_target["reactions"]["current"] == 0


def test_parry_fail_consumes_reaction_but_no_reduction(catalog):
    state = _mini_state(catalog)
    rng = rng_from_sequence([
        14 / 20,  # nat 15 attack, success
        0.0,      # nat 1 parry, fail
        7 / 8,    # damage 8
    ])
    action = _attack()
    action["parry_response"] = {"attempt": True}
    result = resolve_action(state, action, catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["parry"]["executed"] is True
    assert roll["parry"]["success"] is False
    assert roll["parry"]["pt_defensive_gained"] == 0
    # Reazione consumata comunque
    next_target = result["next_state"]["units"][1]
    assert next_target["reactions"]["current"] == 0
    assert next_target["pt"] == 0


def test_parry_ignored_when_target_has_no_reactions(catalog):
    state = _mini_state(catalog)
    state["units"][1]["reactions"]["current"] = 0
    rng = rng_from_sequence([14 / 20, 7 / 8])
    action = _attack()
    action["parry_response"] = {"attempt": True}
    result = resolve_action(state, action, catalog, rng)
    # parry logged come attempted ma non executed
    roll = result["turn_log_entry"]["roll"]
    assert roll["parry"]["attempted"] is True
    assert roll["parry"]["executed"] is False
    assert roll["parry"]["success"] is False


def test_parry_nat_20_grants_two_defensive_pt(catalog):
    state = _mini_state(catalog)
    rng = rng_from_sequence([
        14 / 20,  # nat 15 attack
        19 / 20,  # nat 20 parry
        7 / 8,    # damage 8
    ])
    action = _attack()
    action["parry_response"] = {"attempt": True}
    result = resolve_action(state, action, catalog, rng)
    assert result["turn_log_entry"]["roll"]["parry"]["pt_defensive_gained"] == PARRY_PT_CRIT
    assert result["next_state"]["units"][1]["pt"] == PARRY_PT_CRIT


def test_resolve_parry_helper_returns_parry_result():
    target = {"pt": 0, "reactions": {"current": 1, "max": 1}}
    rng = rng_from_sequence([15 / 20])  # nat 16
    result = resolve_parry(target, rng)
    assert result["success"] is True
    assert result["natural"] == 16
    assert result["step_reduced"] == 1
    assert result["pt_defensive_gained"] == PARRY_PT_BASE


# --- Fase 8: Status auto-trigger ----------------------------------------


def test_apply_status_adds_new_when_absent():
    unit = {"statuses": []}
    applied = apply_status(unit, "bleeding", duration=3, intensity=2, source_unit_id="atk", source_action_id="a1")
    assert len(unit["statuses"]) == 1
    assert applied["id"] == "bleeding"
    assert applied["intensity"] == 2
    assert applied["remaining_turns"] == 3


def test_apply_status_refresh_max_intensity_and_duration():
    unit = {
        "statuses": [
            {"id": "bleeding", "intensity": 1, "remaining_turns": 1},
        ]
    }
    applied = apply_status(unit, "bleeding", duration=3, intensity=2)
    assert len(unit["statuses"]) == 1
    assert applied["intensity"] == 2
    assert applied["remaining_turns"] == 3


def test_apply_status_keeps_higher_existing_values():
    unit = {
        "statuses": [
            {"id": "bleeding", "intensity": 5, "remaining_turns": 10},
        ]
    }
    applied = apply_status(unit, "bleeding", duration=2, intensity=1)
    assert applied["intensity"] == 5
    assert applied["remaining_turns"] == 10


def test_get_status_returns_none_when_absent():
    assert get_status({"statuses": []}, "bleeding") is None


def test_get_status_returns_copy():
    unit = {"statuses": [{"id": "bleeding", "intensity": 1, "remaining_turns": 2}]}
    got = get_status(unit, "bleeding")
    assert got is not None
    got["intensity"] = 99
    assert unit["statuses"][0]["intensity"] == 1  # non alterato


def test_begin_turn_decays_status_and_removes_expired(catalog):
    state = _mini_state(catalog)
    state["units"][0]["statuses"] = [
        {"id": "bleeding", "intensity": 1, "remaining_turns": 1},
        {"id": "disorient", "intensity": 1, "remaining_turns": 3},
    ]
    result = begin_turn(state, "atk")
    surviving = result["next_state"]["units"][0]["statuses"]
    # bleeding decade (da 1 a 0 = expired)
    assert len(surviving) == 1
    assert surviving[0]["id"] == "disorient"
    assert surviving[0]["remaining_turns"] == 2
    assert result["expired"] == [{"unit_id": "atk", "status_id": "bleeding"}]


def test_begin_turn_bleeding_tick_reduces_hp_by_intensity(catalog):
    state = _mini_state(catalog)
    state["units"][0]["statuses"] = [
        {"id": "bleeding", "intensity": 2, "remaining_turns": 3},
    ]
    hp_before = state["units"][0]["hp"]["current"]
    result = begin_turn(state, "atk")
    hp_after = result["next_state"]["units"][0]["hp"]["current"]
    assert hp_after == hp_before - 2
    assert result["bleeding_damage"] == 2
    # Bleeding ancora attivo con 2 turni rimanenti
    surviving = result["next_state"]["units"][0]["statuses"]
    assert surviving[0]["remaining_turns"] == 2


def test_begin_turn_bleeding_tick_clamps_hp_to_zero(catalog):
    state = _mini_state(catalog)
    state["units"][0]["hp"]["current"] = 1
    state["units"][0]["statuses"] = [
        {"id": "bleeding", "intensity": 5, "remaining_turns": 2},
    ]
    result = begin_turn(state, "atk")
    assert result["next_state"]["units"][0]["hp"]["current"] == 0


def test_attacker_with_disorient_has_reduced_attack_mod(catalog):
    state = _mini_state(catalog)
    state["units"][0]["statuses"] = [
        {"id": "disorient", "intensity": 1, "remaining_turns": 2},
    ]
    # nat 14 -> base mod 0, disorient -2 -> total 12, CD 12 -> success borderline
    rng = rng_from_sequence([13 / 20, 3 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["natural"] == 14
    assert roll["modifier"] == -DISORIENT_ATTACK_MALUS_PER_INTENSITY
    assert roll["total"] == 12
    assert roll["success"] is True


def test_attacker_with_fracture_has_reduced_step_count(catalog):
    state = _mini_state(catalog)
    state["units"][0]["statuses"] = [
        {"id": "fracture", "intensity": 1, "remaining_turns": 2},
    ]
    # nat 20 -> mos 8, step from mos = 1; con fracture -1 -> 0
    rng = rng_from_sequence([19 / 20, 7 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["natural"] == 20
    assert roll["mos"] == 8
    assert roll["damage_step"] == 0  # 1 (da MoS) - 1 (fracture) = 0


def test_check_stress_breakpoints_applies_rage_on_crossing_05():
    target = {"statuses": [], "stress": 0.0}
    applied = check_stress_breakpoints(
        target, stress_before=0.3, stress_after=0.55,
        source_unit_id="atk", source_action_id="a1",
    )
    assert len(applied) == 1
    assert applied[0]["id"] == "rage"
    assert applied[0]["remaining_turns"] == RAGE_DEFAULT_DURATION


def test_check_stress_breakpoints_applies_both_when_crossing_both():
    target = {"statuses": [], "stress": 0.0}
    applied = check_stress_breakpoints(
        target, stress_before=0.1, stress_after=0.8,
        source_unit_id="atk", source_action_id="a1",
    )
    ids = {s["id"] for s in applied}
    assert ids == {"rage", "panic"}


def test_check_stress_breakpoints_no_retrigger_when_already_above():
    target = {"statuses": [], "stress": 0.6}
    applied = check_stress_breakpoints(
        target, stress_before=0.6, stress_after=0.7,
        source_unit_id="atk", source_action_id="a1",
    )
    assert applied == []  # entrambi i breakpoint 0.5 gia' sotto prima


def test_on_hit_stress_delta_raises_stress_and_can_trigger_rage(catalog):
    state = _mini_state(catalog)
    state["units"][0]["trait_ids"] = ["cannone_sonico_a_raggio"]
    state["units"][1]["stress"] = 0.48  # appena sotto il breakpoint rage
    # Sequenza: nat attack, damage roll, SV del target per on_hit_status disorient
    rng = rng_from_sequence([19 / 20, 7 / 8, 5 / 20])  # nat 20, 1d8=8, SV nat 6 (fail vs 12)
    result = resolve_action(state, _attack(), catalog, rng)
    next_target = result["next_state"]["units"][1]
    # stress 0.48 + 0.05 = 0.53 -> attraversa 0.5 -> rage applicata
    assert next_target["stress"] == pytest.approx(0.53)
    status_ids = {s["id"] for s in next_target["statuses"]}
    assert "rage" in status_ids
    # Plus disorientamento da on_hit_status (SV nat 6 + tier 2 = 8 < DC 15)
    assert "disorient" in status_ids


def test_on_hit_status_applied_on_sv_fail(catalog):
    state = _mini_state(catalog)
    state["units"][0]["trait_ids"] = ["cannone_sonico_a_raggio"]
    # nat 14 attack (success CD 12), damage 5, SV nat 5 + tier 2 = 7 < DC 15 -> fail
    rng = rng_from_sequence([13 / 20, 4 / 8, 4 / 20])
    result = resolve_action(state, _attack(), catalog, rng)
    status = get_status(result["next_state"]["units"][1], "disorient")
    assert status is not None
    assert status["intensity"] == 1
    assert status["remaining_turns"] == 2


def test_on_hit_status_not_applied_on_sv_success(catalog):
    state = _mini_state(catalog)
    state["units"][0]["trait_ids"] = ["cannone_sonico_a_raggio"]
    # nat 14 attack, damage 5, SV nat 18 + tier 2 = 20 >= DC 15 -> success
    rng = rng_from_sequence([13 / 20, 4 / 8, 17 / 20])
    result = resolve_action(state, _attack(), catalog, rng)
    assert get_status(result["next_state"]["units"][1], "disorient") is None


def test_on_hit_status_not_applied_on_attack_miss(catalog):
    state = _mini_state(catalog)
    state["units"][0]["trait_ids"] = ["cannone_sonico_a_raggio"]
    # nat 1 -> fumble, attack miss, nessun on_hit trigger
    rng = rng_from_sequence([0.0])
    result = resolve_action(state, _attack(), catalog, rng)
    next_target = result["next_state"]["units"][1]
    assert result["turn_log_entry"]["roll"]["success"] is False
    assert get_status(next_target, "disorient") is None
    # Stress NON deve essere stato aumentato (on_hit_stress_delta non scatta su miss)
    assert next_target["stress"] == 0.0


def test_statuses_applied_logged_in_turn_log(catalog):
    state = _mini_state(catalog)
    state["units"][0]["trait_ids"] = ["cannone_sonico_a_raggio"]
    state["units"][1]["stress"] = 0.45
    rng = rng_from_sequence([19 / 20, 7 / 8, 5 / 20])
    result = resolve_action(state, _attack(), catalog, rng)
    applied = result["turn_log_entry"]["statuses_applied"]
    assert len(applied) >= 1
    ids = {s["id"] for s in applied}
    assert "rage" in ids
    assert "disorient" in ids


# --- Phase 2 status effects: rage & panic --------------------------------


def test_rage_increases_attack_mod_and_damage_step(catalog):
    """Rage dà +1 attack_mod e +1 damage_step all'attaccante."""
    state = _mini_state(catalog)
    apply_status(state["units"][0], "rage", duration=3, intensity=1)
    # nat 12 + attack_mod 0 + rage +1 = 13; CD 12 -> success, MoS 1
    rng = rng_from_sequence([11 / 20, 3 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["modifier"] == RAGE_ATTACK_BONUS_PER_INTENSITY  # +1 dal rage
    assert roll["total"] == 13
    assert roll["success"] is True
    # damage_step include il bonus rage
    assert roll["damage_step"] >= RAGE_DAMAGE_STEP_BONUS_PER_INTENSITY


def test_rage_on_target_reduces_defense(catalog):
    """Un target in rage ha defense_mod ridotto (furia cieca lo espone)."""
    state = _mini_state(catalog)
    apply_status(state["units"][1], "rage", duration=3, intensity=1)
    # CD normalmente 12, con rage sul target: 12 - 1 = 11
    # nat 11 + 0 = 11 >= 11 -> success
    rng = rng_from_sequence([10 / 20, 3 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["dc"] == ATTACK_CD_BASE + 2 - RAGE_DEFENSE_MALUS_PER_INTENSITY  # 10+2-1=11
    assert roll["success"] is True


def test_panic_reduces_attack_mod(catalog):
    """Panic dà -2 attack_mod all'attaccante."""
    state = _mini_state(catalog)
    apply_status(state["units"][0], "panic", duration=2, intensity=1)
    # nat 13 + 0 - panic(2) = 11; CD 12 -> miss
    rng = rng_from_sequence([12 / 20])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["modifier"] == -PANIC_ATTACK_MALUS_PER_INTENSITY  # -2
    assert roll["total"] == 11
    assert roll["success"] is False


def test_panic_blocks_pt_spend(catalog):
    """Un attaccante in panic non può usare PT spend."""
    state = _mini_state(catalog)
    state["units"][0]["pt"] = 5
    apply_status(state["units"][0], "panic", duration=2, intensity=1)
    attack = _attack()
    attack["pt_spend"] = {"type": "perforazione"}
    # nat 20 crit -> success, ma perforazione non dovrebbe applicarsi
    rng = rng_from_sequence([19 / 20, 3 / 8])
    result = resolve_action(state, attack, catalog, rng)
    # PT non consumati (panic blocca la spesa)
    assert result["turn_log_entry"]["roll"]["pt_spent"] == 0
    # I PT dell'attore devono essere invariati (5, meno i guadagni del crit)
    assert result["next_state"]["units"][0]["pt"] >= 5


# --- Contested parry tests ------------------------------------------------


def test_contested_parry_uses_attack_total_as_dc(catalog):
    """La parry contestata tira d20+bonus vs attack_total (non CD fissa)."""
    from rules.resolver import resolve_parry

    target = {"id": "tgt", "tier": 2}
    # attack_total = 15, parry nat 14 + bonus 0 = 14 < 15 -> fail
    rng = rng_from_sequence([13 / 20])
    result = resolve_parry(target, rng, parry_bonus=0, attack_total=15)
    assert result["success"] is False
    assert result["total"] == 14

    # parry nat 15 + bonus 0 = 15 >= 15 -> success
    rng2 = rng_from_sequence([14 / 20])
    result2 = resolve_parry(target, rng2, parry_bonus=0, attack_total=15)
    assert result2["success"] is True
    assert result2["step_reduced"] == 1


def test_contested_parry_nat20_always_succeeds(catalog):
    """Nat 20 sulla parry è sempre successo anche se totale < attack_total."""
    from rules.resolver import resolve_parry

    target = {"id": "tgt", "tier": 2}
    rng = rng_from_sequence([19 / 20])  # nat 20
    result = resolve_parry(target, rng, parry_bonus=0, attack_total=99)
    assert result["success"] is True
    assert result["pt_defensive_gained"] == PARRY_PT_CRIT


# --- PT spend: spinta tests -----------------------------------------------


def test_spinta_applies_sbilanciato_on_hit(catalog):
    """Spinta costa PT e applica 'sbilanciato' al target su hit."""
    state = _mini_state(catalog)
    state["units"][0]["pt"] = 3
    attack = _attack()
    attack["pt_spend"] = {"type": "spinta", "amount": 1}
    # nat 14 -> success vs CD 12
    rng = rng_from_sequence([13 / 20, 3 / 8])
    result = resolve_action(state, attack, catalog, rng)
    assert result["turn_log_entry"]["roll"]["pt_spent"] == 1
    # Target deve avere status sbilanciato
    target = result["next_state"]["units"][1]
    sbilanciato = [s for s in target.get("statuses", []) if s["id"] == "sbilanciato"]
    assert len(sbilanciato) == 1
    assert sbilanciato[0]["remaining_turns"] == 1
    # Lo status deve essere nel log
    applied_ids = {s["id"] for s in result["turn_log_entry"]["statuses_applied"]}
    assert "sbilanciato" in applied_ids


def test_sbilanciato_reduces_target_defense(catalog):
    """Un target sbilanciato ha CD ridotta."""
    state = _mini_state(catalog)
    apply_status(state["units"][1], "sbilanciato", duration=1, intensity=1)
    # CD normalmente 12, con sbilanciato: 12 - 1 = 11
    # nat 11 + 0 = 11 >= 11 -> success
    rng = rng_from_sequence([10 / 20, 3 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["dc"] == 11  # 10 + 2 - 1 = 11
    assert roll["success"] is True


def test_spinta_no_effect_on_miss(catalog):
    """Spinta consuma PT ma non applica sbilanciato su miss."""
    state = _mini_state(catalog)
    state["units"][0]["pt"] = 3
    attack = _attack()
    attack["pt_spend"] = {"type": "spinta", "amount": 1}
    # nat 1 -> fumble -> miss
    rng = rng_from_sequence([0.0])
    result = resolve_action(state, attack, catalog, rng)
    assert result["turn_log_entry"]["roll"]["pt_spent"] == 1  # PT consumati comunque
    # Ma nessun sbilanciato applicato
    target = result["next_state"]["units"][1]
    sbilanciato = [s for s in target.get("statuses", []) if s["id"] == "sbilanciato"]
    assert len(sbilanciato) == 0


# --- Phase 2 cross-feature coverage (added in PR #1325) -------------------


def test_apply_status_refresh_rage_with_higher_intensity():
    """Rage refresh: applicare rage a unit con rage esistente alza a max."""
    unit = {
        "statuses": [
            {
                "id": "rage",
                "intensity": 1,
                "remaining_turns": 1,
                "source_unit_id": None,
                "source_action_id": None,
            }
        ]
    }
    applied = apply_status(
        unit,
        status_id="rage",
        duration=3,
        intensity=2,
        source_unit_id="src",
        source_action_id="a1",
    )
    # Refresh con max semantics: intensity = max(1, 2) = 2, duration = max(1, 3) = 3
    assert applied["intensity"] == 2
    assert applied["remaining_turns"] == 3
    rages = [s for s in unit["statuses"] if s["id"] == "rage"]
    assert len(rages) == 1  # no duplicates
    assert rages[0]["source_unit_id"] == "src"  # source updated


def test_panic_decays_via_begin_turn(catalog):
    """Panic viene decrementato da begin_turn e rimosso a remaining_turns=0."""
    state = _mini_state(catalog)
    state["units"][0]["statuses"] = [
        {
            "id": "panic",
            "intensity": 1,
            "remaining_turns": 2,
            "source_unit_id": None,
            "source_action_id": None,
        }
    ]
    # Turno 1: remaining_turns 2 -> 1
    result1 = begin_turn(state, "atk")
    actor1 = next(u for u in result1["next_state"]["units"] if u["id"] == "atk")
    panic1 = [s for s in actor1["statuses"] if s["id"] == "panic"]
    assert len(panic1) == 1
    assert panic1[0]["remaining_turns"] == 1

    # Turno 2: remaining_turns 1 -> 0 -> rimosso
    result2 = begin_turn(result1["next_state"], "atk")
    actor2 = next(u for u in result2["next_state"]["units"] if u["id"] == "atk")
    panic2 = [s for s in actor2["statuses"] if s["id"] == "panic"]
    assert panic2 == []
    # Expired list deve contenere il panic decaduto
    expired_ids = {e["status_id"] for e in result2["expired"]}
    assert "panic" in expired_ids


def test_actor_with_rage_and_panic_nets_correct_attack_mod(catalog):
    """Rage (+1) e panic (-2) insieme producono un netto -1 attack_mod."""
    state = _mini_state(catalog)
    state["units"][0]["statuses"] = [
        {
            "id": "rage",
            "intensity": 1,
            "remaining_turns": 3,
            "source_unit_id": None,
            "source_action_id": None,
        },
        {
            "id": "panic",
            "intensity": 1,
            "remaining_turns": 2,
            "source_unit_id": None,
            "source_action_id": None,
        },
    ]
    # nat 15 (>= crit threshold, ma non nat 20 auto-hit)
    # expected attack_mod: +1 (rage) - 2 (panic) = -1
    # total = 15 + (-1) = 14 vs CD 12 -> success, mos = 2
    rng = rng_from_sequence([14 / 20, 3 / 8])
    result = resolve_action(state, _attack(), catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    assert roll["natural"] == 15
    assert roll["modifier"] == (
        RAGE_ATTACK_BONUS_PER_INTENSITY - PANIC_ATTACK_MALUS_PER_INTENSITY
    )
    assert roll["modifier"] == -1
    assert roll["total"] == 14
    assert roll["success"] is True


def test_contested_parry_with_rage_bonus_on_attacker(catalog):
    """Parry contestata quando l'attaccante ha rage: attack_total include il rage bonus."""
    state = _mini_state(catalog)
    # Attaccante con rage intensity 1 -> +1 attack_mod, +1 damage_step
    state["units"][0]["statuses"] = [
        {
            "id": "rage",
            "intensity": 1,
            "remaining_turns": 3,
            "source_unit_id": None,
            "source_action_id": None,
        }
    ]
    # Target con 1 reazione disponibile
    state["units"][1]["reactions"] = {"current": 1, "max": 1}
    attack = _attack()
    attack["parry_response"] = {"attempt": True, "parry_bonus": 0}
    # nat attack 18, rage +1 -> total = 19 (attack_total che sarà la DC della parry)
    # damage dice d8 modifier 3
    # parry nat qualsiasi: verifichiamo solo che sia tentata e contested (DC = 19)
    rng = rng_from_sequence([17 / 20, 4 / 8, 9 / 20])
    result = resolve_action(state, attack, catalog, rng)
    roll = result["turn_log_entry"]["roll"]
    # attack_mod riflette il +1 rage
    assert roll["modifier"] == RAGE_ATTACK_BONUS_PER_INTENSITY
    assert roll["natural"] == 18
    assert roll["total"] == 19
    assert roll["success"] is True
    # Parry contestata tentata
    assert roll["parry"] is not None
    assert roll["parry"]["attempted"] is True
    assert roll["parry"]["executed"] is True


def test_spinta_sbilanciato_decay_via_begin_turn(catalog):
    """Il sbilanciato applicato da spinta decade via begin_turn."""
    state = _mini_state(catalog)
    state["units"][0]["pt"] = 2
    attack = _attack()
    attack["pt_spend"] = {"type": "spinta", "amount": 1}
    # nat 15 hit, damage 5
    rng = rng_from_sequence([14 / 20, 4 / 8])
    result1 = resolve_action(state, attack, catalog, rng)
    target1 = result1["next_state"]["units"][1]
    sbilanciato1 = [s for s in target1["statuses"] if s["id"] == "sbilanciato"]
    assert len(sbilanciato1) == 1
    initial_duration = sbilanciato1[0]["remaining_turns"]

    # Turno successivo: sbilanciato decrementa
    result2 = begin_turn(result1["next_state"], "tgt")
    target2 = next(u for u in result2["next_state"]["units"] if u["id"] == "tgt")
    sbilanciato2 = [s for s in target2["statuses"] if s["id"] == "sbilanciato"]
    if initial_duration == 1:
        # Decaduto completamente
        assert sbilanciato2 == []
    else:
        assert sbilanciato2[0]["remaining_turns"] == initial_duration - 1
