"""Test suite per ``services/rules/round_orchestrator``.

Copre il nuovo loop shared-planning → commit → ordered-resolution:

- transizioni di fase (planning / committed / resolving / resolved)
- intent declaration preview-only (no AP/HP mutati)
- ordinamento deterministico della resolution queue
- integrazione con ``resolve_action`` atomico
- determinismo end-to-end con stesso seed/rng
- skip di actor morti / target morti
- modificatori di priorita' da status mentali (panic/disorient)
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable

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
    load_trait_mechanics,
)
from rules.round_orchestrator import (  # noqa: E402
    ACTION_SPEED,
    PHASE_COMMITTED,
    PHASE_PLANNING,
    PHASE_RESOLVED,
    action_speed,
    begin_round,
    build_resolution_queue,
    clear_intent,
    commit_round,
    compute_resolve_priority,
    declare_intent,
    resolve_round,
)

MECHANICS_PATH = (
    PROJECT_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "trait_mechanics.yaml"
)


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture(scope="module")
def catalog():
    return load_trait_mechanics(MECHANICS_PATH)


def rng_from_sequence(values: Iterable[float]):
    """Costruisce un rng che ritorna i valori della sequenza in ordine.

    I valori devono essere float in ``[0, 1)`` come richiesto da
    ``roll_die``. Stessa helper di test_resolver.py.
    """

    iterator = iter(values)

    def rng() -> float:
        return next(iterator)

    return rng


def _make_state(catalog, initiative_a=14, initiative_b=10):
    """Stato minimale con 2 unita': 'alpha' (party) e 'bravo' (hostile).

    Initiative di default: alpha 14, bravo 10 → alpha risolve per prima
    se nessuno dei due ha modificatori di status.
    """

    attacker = build_party_unit(
        unit_id="alpha",
        species_id="demo_attacker",
        trait_ids=[],
        catalog=catalog,
        initiative=initiative_a,
    )
    target = build_hostile_unit_from_group(
        unit_id="bravo",
        species_id="demo_target",
        group={"power": 4, "role": "front", "affixes": []},
        trait_ids=[],
        catalog=catalog,
    )
    # Forziamo l'initiative del target per determinismo del test
    target["initiative"] = initiative_b
    return {
        "session_id": "s1",
        "seed": "round-test-seed",
        "encounter_id": None,
        "turn": 1,
        "initiative_order": ["alpha", "bravo"],
        "active_unit_id": "alpha",
        "units": [attacker, target],
        "vc": None,
        "log": [],
    }


def _attack(actor_id: str, target_id: str, dice=None, ap_cost=1):
    return {
        "id": f"act-{actor_id}",
        "type": "attack",
        "actor_id": actor_id,
        "target_id": target_id,
        "ability_id": None,
        "ap_cost": ap_cost,
        "channel": None,
        "damage_dice": dice or {"count": 1, "sides": 6, "modifier": 2},
    }


def _move(actor_id: str):
    return {
        "id": f"move-{actor_id}",
        "type": "move",
        "actor_id": actor_id,
        "target_id": None,
        "ability_id": None,
        "ap_cost": 1,
        "channel": None,
    }


def _defend(actor_id: str):
    return {
        "id": f"defend-{actor_id}",
        "type": "defend",
        "actor_id": actor_id,
        "target_id": None,
        "ability_id": None,
        "ap_cost": 1,
        "channel": None,
    }


# ------------------------------------------------------------------
# action_speed + compute_resolve_priority
# ------------------------------------------------------------------


def test_action_speed_table_defaults_to_zero_on_unknown_type():
    assert action_speed({"type": "attack"}) == 0
    assert action_speed({"type": "defend"}) == 2
    assert action_speed({"type": "move"}) == -2
    assert action_speed({"type": "unknown_future_type"}) == 0
    assert action_speed({}) == 0


def test_compute_resolve_priority_base_sums_initiative_and_action_speed():
    unit = {"initiative": 12, "statuses": []}
    assert compute_resolve_priority(unit, {"type": "attack"}) == 12  # +0
    assert compute_resolve_priority(unit, {"type": "defend"}) == 14  # +2
    assert compute_resolve_priority(unit, {"type": "move"}) == 10  # -2


def test_compute_resolve_priority_panic_slows_down():
    unit = {"initiative": 12, "statuses": [{"id": "panic", "intensity": 1}]}
    # panic -2 per intensity: 12 + 0 - 2 = 10
    assert compute_resolve_priority(unit, {"type": "attack"}) == 10
    unit2 = {"initiative": 12, "statuses": [{"id": "panic", "intensity": 2}]}
    # panic -4: 12 - 4 = 8
    assert compute_resolve_priority(unit2, {"type": "attack"}) == 8


def test_compute_resolve_priority_disorient_slight_slowdown():
    unit = {"initiative": 12, "statuses": [{"id": "disorient", "intensity": 2}]}
    # disorient -1 per intensity: 12 - 2 = 10
    assert compute_resolve_priority(unit, {"type": "attack"}) == 10


def test_compute_resolve_priority_rage_not_affecting_speed():
    # rage aumenta attack_mod/damage_step nel resolver ma non la reaction
    # speed: la furia rende piu' forti, non piu' veloci a reagire.
    unit = {"initiative": 12, "statuses": [{"id": "rage", "intensity": 2}]}
    assert compute_resolve_priority(unit, {"type": "attack"}) == 12


# ------------------------------------------------------------------
# begin_round
# ------------------------------------------------------------------


def test_begin_round_sets_planning_phase_and_clears_intents(catalog):
    state = _make_state(catalog)
    state["pending_intents"] = [{"unit_id": "alpha", "action": {"type": "attack"}}]
    result = begin_round(state)
    next_state = result["next_state"]
    assert next_state["round_phase"] == PHASE_PLANNING
    assert next_state["pending_intents"] == []


def test_begin_round_refreshes_ap_for_all_units(catalog):
    state = _make_state(catalog)
    # Svuotiamo gli AP per simulare fine round precedente
    for unit in state["units"]:
        unit["ap"]["current"] = 0
    next_state = begin_round(state)["next_state"]
    for unit in next_state["units"]:
        assert unit["ap"]["current"] == unit["ap"]["max"]


def test_begin_round_ticks_bleeding_on_all_affected_units(catalog):
    state = _make_state(catalog)
    alpha = state["units"][0]
    alpha["statuses"] = [
        {
            "id": "bleeding",
            "intensity": 3,
            "remaining_turns": 2,
            "source_unit_id": "bravo",
            "source_action_id": None,
        }
    ]
    hp_before = alpha["hp"]["current"]
    result = begin_round(state)
    next_state = result["next_state"]
    alpha_after = next_state["units"][0]
    assert alpha_after["hp"]["current"] == hp_before - 3
    assert result["bleeding_total"] == 3


def test_begin_round_does_not_mutate_input(catalog):
    state = _make_state(catalog)
    snapshot = dict(state["units"][0]["ap"])
    begin_round(state)
    assert state["units"][0]["ap"] == snapshot
    assert "round_phase" not in state


# ------------------------------------------------------------------
# declare_intent
# ------------------------------------------------------------------


def test_declare_intent_records_action_without_consuming_ap(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    ap_before = state["units"][0]["ap"]["current"]
    result = declare_intent(state, "alpha", _attack("alpha", "bravo"))
    next_state = result["next_state"]
    # AP NON consumati in planning phase
    assert next_state["units"][0]["ap"]["current"] == ap_before
    assert len(next_state["pending_intents"]) == 1
    assert next_state["pending_intents"][0]["unit_id"] == "alpha"
    assert next_state["pending_intents"][0]["action"]["type"] == "attack"


def test_declare_intent_replaces_previous_intent_for_same_unit(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    # Cambia idea: ora muove invece di attaccare
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    assert len(state["pending_intents"]) == 1
    assert state["pending_intents"][0]["action"]["type"] == "move"


def test_declare_intent_accepts_multiple_units(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _defend("bravo"))["next_state"]
    assert len(state["pending_intents"]) == 2
    unit_ids = {i["unit_id"] for i in state["pending_intents"]}
    assert unit_ids == {"alpha", "bravo"}


def test_declare_intent_rejects_wrong_phase(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = commit_round(state)["next_state"]
    with pytest.raises(ValueError, match="planning"):
        declare_intent(state, "alpha", _attack("alpha", "bravo"))


def test_declare_intent_rejects_unknown_unit_id(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    with pytest.raises(KeyError, match="unit_id non trovato"):
        declare_intent(state, "unknown-unit", _attack("unknown-unit", "bravo"))


def test_clear_intent_removes_unit_intent(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _move("bravo"))["next_state"]
    state = clear_intent(state, "alpha")["next_state"]
    assert len(state["pending_intents"]) == 1
    assert state["pending_intents"][0]["unit_id"] == "bravo"


# ------------------------------------------------------------------
# commit_round
# ------------------------------------------------------------------


def test_commit_round_transitions_to_committed(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    committed = commit_round(state)["next_state"]
    assert committed["round_phase"] == PHASE_COMMITTED
    # pending_intents sono ancora presenti, resolve_round li consumera'
    assert len(committed["pending_intents"]) == 1


def test_commit_round_rejects_non_planning_phase(catalog):
    state = _make_state(catalog)
    state["round_phase"] = PHASE_COMMITTED
    with pytest.raises(ValueError, match="planning"):
        commit_round(state)


# ------------------------------------------------------------------
# build_resolution_queue
# ------------------------------------------------------------------


def test_build_resolution_queue_sorted_by_priority_desc(catalog):
    # alpha init 14, bravo init 10 → alpha prima
    state = begin_round(_make_state(catalog, initiative_a=14, initiative_b=10))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))["next_state"]
    state = commit_round(state)["next_state"]
    queue = build_resolution_queue(state)
    assert [q["unit_id"] for q in queue] == ["alpha", "bravo"]
    assert queue[0]["priority"] == 14
    assert queue[1]["priority"] == 10


def test_build_resolution_queue_tiebreaks_alphabetically(catalog):
    # Stessa initiative → bravo viene dopo alpha per tiebreak alfabetico
    state = begin_round(_make_state(catalog, initiative_a=12, initiative_b=12))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))["next_state"]
    state = commit_round(state)["next_state"]
    queue = build_resolution_queue(state)
    assert [q["unit_id"] for q in queue] == ["alpha", "bravo"]


def test_build_resolution_queue_respects_action_speed(catalog):
    # alpha init 10 defend (+2) → priority 12
    # bravo init 11 attack (+0) → priority 11
    # alpha risolve prima nonostante init piu' bassa
    state = begin_round(_make_state(catalog, initiative_a=10, initiative_b=11))["next_state"]
    state = declare_intent(state, "alpha", _defend("alpha"))["next_state"]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))["next_state"]
    state = commit_round(state)["next_state"]
    queue = build_resolution_queue(state)
    assert queue[0]["unit_id"] == "alpha"
    assert queue[0]["priority"] == 12
    assert queue[1]["unit_id"] == "bravo"
    assert queue[1]["priority"] == 11


def test_build_resolution_queue_panic_inverts_order(catalog):
    # alpha init 13 in panic intensity 2 → priority 13 - 4 = 9
    # bravo init 11 attack normale → priority 11
    # bravo risolve prima
    state = _make_state(catalog, initiative_a=13, initiative_b=11)
    state["units"][0]["statuses"] = [
        {"id": "panic", "intensity": 2, "remaining_turns": 2}
    ]
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))["next_state"]
    state = commit_round(state)["next_state"]
    queue = build_resolution_queue(state)
    assert queue[0]["unit_id"] == "bravo"
    assert queue[1]["unit_id"] == "alpha"


# ------------------------------------------------------------------
# resolve_round
# ------------------------------------------------------------------


def test_resolve_round_requires_committed_phase(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    rng = rng_from_sequence([0.5, 0.5])
    with pytest.raises(ValueError, match="committed"):
        resolve_round(state, catalog, rng)


def test_resolve_round_processes_single_intent_and_appends_log(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = commit_round(state)["next_state"]
    log_before = len(state["log"])
    rng = namespaced_rng("seed", "round-test-single")
    result = resolve_round(state, catalog, rng)
    next_state = result["next_state"]
    assert next_state["round_phase"] == PHASE_RESOLVED
    assert next_state["pending_intents"] == []
    assert len(next_state["log"]) == log_before + 1
    assert len(result["turn_log_entries"]) == 1
    assert result["skipped"] == []


def test_resolve_round_processes_multiple_intents_in_priority_order(catalog):
    # alpha init 14 attacca bravo → alpha risolve prima
    # bravo init 10 attacca alpha → bravo risolve dopo
    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "round-test-multi")
    result = resolve_round(state, catalog, rng)
    entries = result["turn_log_entries"]
    assert len(entries) == 2
    # Prima entry e' di alpha (risolve prima), seconda di bravo
    assert entries[0]["action"]["actor_id"] == "alpha"
    assert entries[1]["action"]["actor_id"] == "bravo"


def test_resolve_round_skips_intent_if_actor_died_mid_round(catalog):
    # Scenario: alpha attacca bravo con initiative piu' alta,
    # una forzatura: settiamo hp di bravo a 1 e cambiamo init in modo che
    # alpha risolva prima e uccida bravo; poi l'intent di bravo viene
    # saltato con reason actor_dead.
    state = _make_state(catalog, initiative_a=18, initiative_b=5)
    state["units"][1]["hp"]["current"] = 1  # bravo e' a 1 HP
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))["next_state"]
    state = commit_round(state)["next_state"]
    # rng sequence: alpha attack nat 20 crit → kill
    rng = rng_from_sequence(
        [
            19 / 20,  # nat 20 (crit) → 1 + 19 = 20
            7 / 8,  # damage d8: 1 + 7 = 8 (+ modifier 2 = 10) → kill bravo
        ]
    )
    result = resolve_round(state, catalog, rng)
    assert len(result["turn_log_entries"]) == 1  # solo alpha ha risolto
    assert len(result["skipped"]) == 1
    assert result["skipped"][0]["unit_id"] == "bravo"
    assert result["skipped"][0]["reason"] == "actor_dead"


def test_resolve_round_skips_attack_intent_if_target_died(catalog):
    # 3 unita': alpha, bravo, charlie. alpha uccide bravo, charlie avrebbe
    # dovuto attaccare bravo, intent saltato con target_dead.
    state = _make_state(catalog, initiative_a=18, initiative_b=5)
    charlie = build_hostile_unit_from_group(
        unit_id="charlie",
        species_id="demo_target",
        group={"power": 4, "role": "front", "affixes": []},
        trait_ids=[],
        catalog=catalog,
    )
    charlie["initiative"] = 3
    state["units"].append(charlie)
    state["initiative_order"].append("charlie")
    state["units"][1]["hp"]["current"] = 1  # bravo a 1 HP
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "charlie", _attack("charlie", "bravo"))["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence(
        [
            19 / 20,  # alpha nat 20 crit
            7 / 8,  # damage 8+2=10 → kill bravo
        ]
    )
    result = resolve_round(state, catalog, rng)
    assert len(result["turn_log_entries"]) == 1
    assert len(result["skipped"]) == 1
    assert result["skipped"][0]["unit_id"] == "charlie"
    assert result["skipped"][0]["reason"] == "target_dead"


def test_resolve_round_consumes_ap_only_for_resolved_intents(catalog):
    # alpha prova ad attaccare, bravo dichiara move. Dopo resolve entrambi
    # hanno consumato 1 AP.
    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    ap_max = state["units"][0]["ap"]["max"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _move("bravo"))["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "round-test-ap")
    result = resolve_round(state, catalog, rng)
    alpha_ap = result["next_state"]["units"][0]["ap"]["current"]
    bravo_ap = result["next_state"]["units"][1]["ap"]["current"]
    assert alpha_ap == ap_max - 1
    assert bravo_ap == ap_max - 1


# ------------------------------------------------------------------
# Determinism end-to-end
# ------------------------------------------------------------------


def test_round_loop_deterministic_with_same_seed(catalog):
    """Stesso seed + stessi intents → stesso next_state finale."""

    def run_once():
        state = _make_state(catalog, initiative_a=14, initiative_b=10)
        state = begin_round(state)["next_state"]
        state = declare_intent(state, "alpha", _attack("alpha", "bravo"))[
            "next_state"
        ]
        state = declare_intent(state, "bravo", _attack("bravo", "alpha"))[
            "next_state"
        ]
        state = commit_round(state)["next_state"]
        rng = namespaced_rng("determinism-seed", "round-1")
        result = resolve_round(state, catalog, rng)
        return result["next_state"]

    first = run_once()
    second = run_once()
    # HP, PT, log lunghi identici
    assert first["units"][0]["hp"] == second["units"][0]["hp"]
    assert first["units"][1]["hp"] == second["units"][1]["hp"]
    assert first["log"] == second["log"]
    assert first["round_phase"] == second["round_phase"]


def test_full_round_end_to_end_preview_then_commit_then_resolve(catalog):
    """Smoke test del flusso completo: preview-only → commit → resolve."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)

    # FASE 1: begin_round
    state = begin_round(state)["next_state"]
    assert state["round_phase"] == PHASE_PLANNING

    # FASE 2: planning — preview-only, AP invariati
    ap_snapshot = state["units"][0]["ap"]["current"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))["next_state"]
    assert state["round_phase"] == PHASE_PLANNING
    assert state["units"][0]["ap"]["current"] == ap_snapshot
    # Cambio idea: alpha ora difende invece di attaccare
    state = declare_intent(state, "alpha", _defend("alpha"))["next_state"]
    assert len(state["pending_intents"]) == 2

    # FASE 3: commit
    state = commit_round(state)["next_state"]
    assert state["round_phase"] == PHASE_COMMITTED

    # FASE 4: resolve
    rng = namespaced_rng("seed", "e2e")
    result = resolve_round(state, catalog, rng)
    next_state = result["next_state"]
    assert next_state["round_phase"] == PHASE_RESOLVED
    assert next_state["pending_intents"] == []
    # alpha ha scelto defend (+2 speed → priority 16), bravo attack (10)
    # alpha risolve prima
    entries = result["turn_log_entries"]
    assert len(entries) == 2
    assert entries[0]["action"]["actor_id"] == "alpha"
    assert entries[0]["action"]["type"] == "defend"
    assert entries[1]["action"]["actor_id"] == "bravo"
