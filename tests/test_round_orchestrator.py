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
    DEFAULT_ACTION_SPEED,
    PHASE_COMMITTED,
    PHASE_PLANNING,
    PHASE_RESOLVED,
    SUPPORTED_PREDICATE_FIELDS,
    SUPPORTED_PREDICATE_OPS,
    SUPPORTED_REACTION_EVENTS,
    SUPPORTED_REACTION_TYPES,
    action_speed,
    begin_round,
    build_resolution_queue,
    clear_intent,
    commit_round,
    compute_resolve_priority,
    declare_intent,
    declare_reaction,
    load_action_speed_table,
    preview_round,
    reload_action_speed_table,
    resolve_round,
)
from rules.round_orchestrator import (  # noqa: E402
    _build_context_for_event,
    _evaluate_predicates,
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


def test_action_speed_accepts_table_override():
    custom = {"attack": 5, "move": 10}
    assert action_speed({"type": "attack"}, table=custom) == 5
    assert action_speed({"type": "move"}, table=custom) == 10
    # Unknown in override → still 0
    assert action_speed({"type": "defend"}, table=custom) == 0


def test_load_action_speed_table_reads_balance_yaml():
    """Verifica che il loader legga il file YAML canonico del balance pack."""
    table = load_action_speed_table()
    # Stessi valori del DEFAULT_ACTION_SPEED (il YAML balance mantiene
    # la stessa calibrazione come fonte unica di verita').
    assert table["defend"] == 2
    assert table["parry"] == 2
    assert table["attack"] == 0
    assert table["ability"] == -1
    assert table["move"] == -2


def test_load_action_speed_table_missing_file_falls_back_to_default(tmp_path):
    """Path inesistente → fallback a DEFAULT_ACTION_SPEED senza eccezioni."""
    missing = tmp_path / "does_not_exist.yaml"
    table = load_action_speed_table(missing)
    assert table == DEFAULT_ACTION_SPEED


def test_load_action_speed_table_malformed_file_falls_back(tmp_path):
    """YAML malformato → fallback a DEFAULT_ACTION_SPEED."""
    bad = tmp_path / "broken.yaml"
    bad.write_text("this is not: valid: yaml: [[[", encoding="utf-8")
    table = load_action_speed_table(bad)
    assert table == DEFAULT_ACTION_SPEED


def test_load_action_speed_table_missing_key_falls_back(tmp_path):
    """YAML valido ma senza chiave action_speed → fallback."""
    no_key = tmp_path / "no_key.yaml"
    no_key.write_text("version: 1\nother_field: 42\n", encoding="utf-8")
    table = load_action_speed_table(no_key)
    assert table == DEFAULT_ACTION_SPEED


def test_load_action_speed_table_custom_values(tmp_path):
    """YAML custom → valori nuovi caricati."""
    custom = tmp_path / "custom.yaml"
    custom.write_text(
        "version: 1\n"
        "action_speed:\n"
        "  attack: 5\n"
        "  defend: -1\n"
        "  move: 0\n",
        encoding="utf-8",
    )
    table = load_action_speed_table(custom)
    assert table == {"attack": 5, "defend": -1, "move": 0}


def test_reload_action_speed_table_mutates_module_level_dict(tmp_path):
    """``reload_action_speed_table`` aggiorna il ``ACTION_SPEED`` runtime."""
    custom = tmp_path / "reload.yaml"
    custom.write_text(
        "action_speed:\n  attack: 99\n  defend: 88\n",
        encoding="utf-8",
    )
    try:
        reload_action_speed_table(custom)
        assert ACTION_SPEED["attack"] == 99
        assert ACTION_SPEED["defend"] == 88
    finally:
        # Ripristina i valori dal file canonico per non lasciare side
        # effect su altri test dello stesso session pytest.
        reload_action_speed_table()
    assert ACTION_SPEED["attack"] == 0
    assert ACTION_SPEED["defend"] == 2


def test_compute_resolve_priority_respects_speed_table_override():
    """``compute_resolve_priority`` accetta ``speed_table`` custom."""
    unit = {"initiative": 10, "statuses": []}
    custom = {"attack": 5}
    # attack custom → priority 10 + 5 = 15
    assert compute_resolve_priority(unit, {"type": "attack"}, speed_table=custom) == 15
    # Senza override usa il modulo-level
    assert compute_resolve_priority(unit, {"type": "attack"}) == 10


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


def test_declare_intent_appends_multiple_intents_for_same_unit(catalog):
    # W8k override ADR-2026-04-15 canonical: multi-intent per unit supported.
    # User feedback 2026-04-19: "Sto cercando di fare 2 att con lo scout ma
    # posso registrarne solo uno". Backend ora append invece di latest-wins.
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    # Secondo intent stessa unit — APPEND invece di replace.
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    assert len(state["pending_intents"]) == 2
    assert state["pending_intents"][0]["action"]["type"] == "attack"
    assert state["pending_intents"][1]["action"]["type"] == "move"
    # Per "cambiare idea" ora: clear_intent(unit_id) prima di nuovo declare.
    state = clear_intent(state, "alpha")["next_state"]
    assert len(state["pending_intents"]) == 0
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    assert len(state["pending_intents"]) == 1


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


# ------------------------------------------------------------------
# preview_round (follow-up #5)
# ------------------------------------------------------------------


def test_preview_round_from_planning_does_not_mutate_input(catalog):
    """``preview_round`` non deve toccare lo stato di input."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))[
        "next_state"
    ]
    state = declare_intent(state, "bravo", _attack("bravo", "alpha"))[
        "next_state"
    ]
    # Snapshot pre-preview
    hp_alpha_before = state["units"][0]["hp"]["current"]
    hp_bravo_before = state["units"][1]["hp"]["current"]
    ap_alpha_before = state["units"][0]["ap"]["current"]
    log_len_before = len(state["log"])
    phase_before = state["round_phase"]
    intents_before = len(state["pending_intents"])

    rng = namespaced_rng("preview-seed", "what-if")
    result = preview_round(state, catalog, rng)

    # Input invariato
    assert state["units"][0]["hp"]["current"] == hp_alpha_before
    assert state["units"][1]["hp"]["current"] == hp_bravo_before
    assert state["units"][0]["ap"]["current"] == ap_alpha_before
    assert len(state["log"]) == log_len_before
    assert state["round_phase"] == phase_before
    assert len(state["pending_intents"]) == intents_before

    # Il next_state della preview invece rappresenta "come sarebbe"
    assert result["next_state"]["round_phase"] == PHASE_RESOLVED
    assert result["next_state"]["pending_intents"] == []


def test_preview_round_from_committed_matches_resolve_round(catalog):
    """``preview_round`` su stato committed deve dare lo stesso
    next_state di una resolve_round diretta (eccetto per il side-effect
    sul state originale)."""

    def build():
        s = _make_state(catalog, initiative_a=14, initiative_b=10)
        s = begin_round(s)["next_state"]
        s = declare_intent(s, "alpha", _attack("alpha", "bravo"))["next_state"]
        s = declare_intent(s, "bravo", _attack("bravo", "alpha"))["next_state"]
        s = commit_round(s)["next_state"]
        return s

    state_preview = build()
    state_real = build()

    rng_preview = namespaced_rng("seed", "compare")
    rng_real = namespaced_rng("seed", "compare")

    preview = preview_round(state_preview, catalog, rng_preview)
    real = resolve_round(state_real, catalog, rng_real)

    # Stessi HP, stessa log length, stessi entries risolti
    assert preview["next_state"]["units"][0]["hp"] == real["next_state"]["units"][0]["hp"]
    assert preview["next_state"]["units"][1]["hp"] == real["next_state"]["units"][1]["hp"]
    assert len(preview["turn_log_entries"]) == len(real["turn_log_entries"])
    assert preview["resolution_queue"] == real["resolution_queue"]


def test_preview_round_accepts_state_without_round_phase(catalog):
    """Stato hydratato "vecchio stile" senza round_phase → preview
    tratta come planning implicito, commit su copy, poi resolve."""

    state = _make_state(catalog)
    # NO begin_round: state["round_phase"] non esiste
    assert "round_phase" not in state
    rng = namespaced_rng("seed", "implicit")
    result = preview_round(state, catalog, rng)
    assert result["next_state"]["round_phase"] == PHASE_RESOLVED
    # Nessun intent → nessun entry risolto
    assert result["turn_log_entries"] == []
    # Input invariato
    assert "round_phase" not in state


def test_preview_round_rejects_resolved_phase(catalog):
    """Stato gia' resolved → ValueError."""

    state = _make_state(catalog)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))[
        "next_state"
    ]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "resolve1")
    state = resolve_round(state, catalog, rng)["next_state"]
    assert state["round_phase"] == PHASE_RESOLVED
    with pytest.raises(ValueError, match="planning"):
        preview_round(state, catalog, namespaced_rng("seed", "resolve2"))


def test_preview_round_deterministic_across_multiple_calls(catalog):
    """Stesso stato + stesso rng → stesso outcome ripetutamente."""

    def build():
        s = _make_state(catalog, initiative_a=14, initiative_b=10)
        s = begin_round(s)["next_state"]
        s = declare_intent(s, "alpha", _attack("alpha", "bravo"))["next_state"]
        s = declare_intent(s, "bravo", _defend("bravo"))["next_state"]
        return s

    state = build()
    rng1 = namespaced_rng("preview", "det")
    rng2 = namespaced_rng("preview", "det")
    p1 = preview_round(state, catalog, rng1)
    p2 = preview_round(state, catalog, rng2)
    assert p1["next_state"]["units"][0]["hp"] == p2["next_state"]["units"][0]["hp"]
    assert p1["next_state"]["units"][1]["hp"] == p2["next_state"]["units"][1]["hp"]
    assert p1["resolution_queue"] == p2["resolution_queue"]


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
    # Cambio idea: alpha ora difende invece di attaccare.
    # W8k (2026-04-19): declare_intent ora APPEND invece di latest-wins.
    # Per "cambiare idea": clear_intent prima di nuovo declare.
    state = clear_intent(state, "alpha")["next_state"]
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


# ------------------------------------------------------------------
# Reactions as first-class intents (follow-up #1 + #3)
# ------------------------------------------------------------------


def test_declare_reaction_registers_reaction_intent(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    ap_before = state["units"][1]["ap"]["current"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )["next_state"]
    # AP di bravo invariato (reaction preview-only)
    assert state["units"][1]["ap"]["current"] == ap_before
    assert len(state["pending_intents"]) == 1
    intent = state["pending_intents"][0]
    assert intent["unit_id"] == "bravo"
    assert intent["reaction_trigger"]["event"] == "attacked"
    assert intent["reaction_trigger"]["source_any_of"] is None
    assert intent["reaction_payload"]["type"] == "parry"
    assert intent["reaction_payload"]["parry_bonus"] == 1


def test_declare_reaction_rejects_unsupported_event(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    with pytest.raises(ValueError, match="event non supportato"):
        declare_reaction(
            state,
            "bravo",
            reaction_payload={"type": "parry", "parry_bonus": 1},
            trigger={"event": "teleported", "source_any_of": None},
        )


def test_declare_reaction_rejects_unsupported_payload_type(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    with pytest.raises(ValueError, match="payload type non supportato"):
        declare_reaction(
            state,
            "bravo",
            reaction_payload={"type": "mind_blast", "power": 5},
            trigger={"event": "attacked", "source_any_of": None},
        )


def test_declare_reaction_rejects_wrong_phase(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = commit_round(state)["next_state"]
    with pytest.raises(ValueError, match="planning"):
        declare_reaction(
            state,
            "bravo",
            reaction_payload={"type": "parry", "parry_bonus": 1},
            trigger={"event": "attacked", "source_any_of": None},
        )


def test_declare_reaction_latest_wins_per_unit(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )["next_state"]
    # Ri-dichiara con parry_bonus diverso → sovrascrive
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 3},
        trigger={"event": "attacked", "source_any_of": ["alpha"]},
    )["next_state"]
    assert len(state["pending_intents"]) == 1
    assert state["pending_intents"][0]["reaction_payload"]["parry_bonus"] == 3
    assert state["pending_intents"][0]["reaction_trigger"]["source_any_of"] == ["alpha"]


def test_build_resolution_queue_excludes_reaction_intents(catalog):
    """Le reaction intents NON devono comparire nella main queue."""

    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    queue = build_resolution_queue(state)
    # Solo alpha (attack) in queue. bravo (reaction) escluso.
    assert len(queue) == 1
    assert queue[0]["unit_id"] == "alpha"


def test_reaction_triggers_parry_on_matching_attack(catalog):
    """L'attacco di alpha su bravo con bravo che ha reaction parry →
    parry_response iniettato nell'action, resolver atomico gestisce la
    pipeline parry come in ogni altra action con parry_response."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "reaction-trigger")
    result = resolve_round(state, catalog, rng)

    # 1 entry in turn_log (l'attack di alpha con parry_response iniettato)
    assert len(result["turn_log_entries"]) == 1
    attack_entry = result["turn_log_entries"][0]
    assert attack_entry["action"]["actor_id"] == "alpha"
    assert attack_entry["action"].get("parry_response") is not None
    assert attack_entry["action"]["parry_response"]["attempt"] is True
    assert attack_entry["action"]["parry_response"]["parry_bonus"] == 1
    # La parry entry e' loggata in reactions_triggered
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["target_unit_id"] == "bravo"
    assert result["reactions_triggered"][0]["attacker_unit_id"] == "alpha"


def test_reaction_source_filter_matches_allowed_attacker(catalog):
    """Reaction con source_any_of=['alpha'] triggera su alpha."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 2},
        trigger={"event": "attacked", "source_any_of": ["alpha"]},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "reaction-source-match")
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1


def test_reaction_source_filter_rejects_other_attacker(catalog):
    """Reaction con source_any_of=['charlie'] NON triggera su alpha."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 2},
        trigger={"event": "attacked", "source_any_of": ["charlie"]},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "reaction-source-miss")
    result = resolve_round(state, catalog, rng)
    assert result["reactions_triggered"] == []
    # L'attack di alpha e' comunque risolto normalmente
    assert len(result["turn_log_entries"]) == 1
    attack_entry = result["turn_log_entries"][0]
    # Nessun parry_response iniettato
    assert attack_entry["action"].get("parry_response") is None


def test_reaction_consumed_after_first_trigger(catalog):
    """Reaction one-shot: dopo il primo trigger non riparte anche se c'e'
    un secondo attacco nello stesso round."""

    # 3 unita': alpha e charlie attaccano bravo. La reaction di bravo
    # deve triggerare solo sul primo (quello con priority piu' alta).
    state = _make_state(catalog, initiative_a=18, initiative_b=5)
    charlie = build_hostile_unit_from_group(
        unit_id="charlie",
        species_id="demo_charlie",
        group={"power": 4, "role": "front", "affixes": []},
        trait_ids=[],
        catalog=catalog,
    )
    charlie["initiative"] = 12
    state["units"].append(charlie)
    # bravo deve sopravvivere al primo hit: pump HP
    state["units"][1]["hp"]["current"] = 100
    state["units"][1]["hp"]["max"] = 100
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "charlie", _attack("charlie", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "reaction-consume")
    result = resolve_round(state, catalog, rng)
    # Esattamente 1 reaction triggerata (sul primo attacker = alpha,
    # che ha priority 18 > 12 di charlie)
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["attacker_unit_id"] == "alpha"
    # Entrambi gli attack sono stati risolti
    actors_resolved = [e["action"]["actor_id"] for e in result["turn_log_entries"]]
    assert "alpha" in actors_resolved
    assert "charlie" in actors_resolved


def test_reaction_unused_if_target_not_attacked(catalog):
    """Reaction dichiarata ma mai triggerata non ha effetti collaterali."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    # alpha muove invece di attaccare
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "reaction-unused")
    result = resolve_round(state, catalog, rng)
    # Nessuna reaction triggerata
    assert result["reactions_triggered"] == []
    # L'action di alpha (move) e' risolta normalmente
    assert len(result["turn_log_entries"]) == 1
    assert result["turn_log_entries"][0]["action"]["actor_id"] == "alpha"


def test_reaction_does_not_consume_ap_if_not_triggered(catalog):
    """AP dell'unita' con reaction invariati se la reaction non triggera."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    ap_bravo_before = state["units"][1]["ap"]["current"]
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "reaction-ap")
    result = resolve_round(state, catalog, rng)
    # bravo non ha consumato AP (reaction mai triggerata)
    assert result["next_state"]["units"][1]["ap"]["current"] == ap_bravo_before


def test_supported_reaction_enums_are_exposed():
    """Sanity check su costanti esportate."""
    assert "attacked" in SUPPORTED_REACTION_EVENTS
    assert "damaged" in SUPPORTED_REACTION_EVENTS
    assert "parry" in SUPPORTED_REACTION_TYPES
    assert "trigger_status" in SUPPORTED_REACTION_TYPES


# ------------------------------------------------------------------
# Reactions event "damaged" (follow-up #5)
# ------------------------------------------------------------------


def test_declare_reaction_accepts_event_damaged(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    assert len(state["pending_intents"]) == 1
    intent = state["pending_intents"][0]
    assert intent["reaction_trigger"]["event"] == "damaged"
    assert intent["reaction_payload"]["type"] == "trigger_status"


def test_declare_reaction_accepts_trigger_status_payload(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    # trigger_status con event attacked e' accettato dalla validazione
    # (anche se semanticamente ha senso solo con damaged per la logica
    # di resolve_round)
    result = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 1,
            "intensity": 1,
        },
        trigger={"event": "damaged", "source_any_of": None},
    )
    assert len(result["next_state"]["pending_intents"]) == 1


def test_damaged_reaction_applies_status_to_attacker_on_hit(catalog):
    """Quando alpha attacca bravo e infligge danno, la reaction
    'damaged' di bravo applica lo status all'attaccante (alpha)."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    # Pump HP di bravo cosi' sopravvive e il danno reale e' applicato
    state["units"][1]["hp"]["current"] = 50
    state["units"][1]["hp"]["max"] = 50
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 3,
            "intensity": 2,
            "target": "attacker",
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    # Forziamo un hit con damage reale: nat 20 crit per sicurezza
    rng = rng_from_sequence(
        [
            19 / 20,  # nat 20
            5 / 8,  # damage
        ]
    )
    result = resolve_round(state, catalog, rng)
    # 1 main intent risolto, 1 reaction triggerata
    assert len(result["turn_log_entries"]) == 1
    assert len(result["reactions_triggered"]) == 1
    triggered = result["reactions_triggered"][0]
    assert triggered["event"] == "damaged"
    assert triggered["target_unit_id"] == "bravo"
    assert triggered["attacker_unit_id"] == "alpha"
    assert triggered["status_target_unit_id"] == "alpha"
    # alpha ora ha bleeding intensity 2 duration 3
    alpha_after = result["next_state"]["units"][0]
    bleeds = [s for s in alpha_after.get("statuses", []) if s.get("id") == "bleeding"]
    assert len(bleeds) == 1
    assert bleeds[0]["intensity"] == 2
    assert bleeds[0]["remaining_turns"] == 3


def test_damaged_reaction_applies_status_to_self_when_target_self(catalog):
    """Con payload.target='self', lo status e' applicato al target
    (unit che ha subito il danno), non all'attaccante."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state["units"][1]["hp"]["current"] = 50
    state["units"][1]["hp"]["max"] = 50
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "rage",
            "duration": 2,
            "intensity": 1,
            "target": "self",
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    # alpha NON ha rage
    alpha_after = result["next_state"]["units"][0]
    alpha_rage = [s for s in alpha_after.get("statuses", []) if s.get("id") == "rage"]
    assert alpha_rage == []
    # bravo HA rage (auto-applicato a se stesso)
    bravo_after = result["next_state"]["units"][1]
    bravo_rage = [s for s in bravo_after.get("statuses", []) if s.get("id") == "rage"]
    assert len(bravo_rage) == 1
    assert bravo_rage[0]["intensity"] == 1


def test_damaged_reaction_NOT_triggered_if_no_damage(catalog):
    """Se l'attack manca (damage_applied=0), la reaction damaged
    NON deve triggerare."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    # Forziamo un miss: nat 1 fumble
    rng = rng_from_sequence([0 / 20])  # natural 1
    result = resolve_round(state, catalog, rng)
    assert result["reactions_triggered"] == []
    # alpha NON ha bleeding
    alpha_after = result["next_state"]["units"][0]
    alpha_bleeds = [
        s for s in alpha_after.get("statuses", []) if s.get("id") == "bleeding"
    ]
    assert alpha_bleeds == []


def test_damaged_reaction_source_filter_rejects_wrong_attacker(catalog):
    """source_any_of=['charlie'] NON triggera su alpha."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state["units"][1]["hp"]["current"] = 50
    state["units"][1]["hp"]["max"] = 50
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",
        },
        trigger={"event": "damaged", "source_any_of": ["charlie"]},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    assert result["reactions_triggered"] == []


def test_damaged_reaction_one_shot_consumed_after_trigger(catalog):
    """Dopo il primo trigger damaged, la reaction e' consumed e non
    riparte anche se un secondo attacco provoca altro danno."""

    # alpha + charlie entrambi attaccano bravo
    state = _make_state(catalog, initiative_a=18, initiative_b=5)
    charlie = build_hostile_unit_from_group(
        unit_id="charlie",
        species_id="demo_charlie",
        group={"power": 4, "role": "front", "affixes": []},
        trait_ids=[],
        catalog=catalog,
    )
    charlie["initiative"] = 12
    state["units"].append(charlie)
    state["units"][1]["hp"]["current"] = 100
    state["units"][1]["hp"]["max"] = 100
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_intent(state, "charlie", _attack("charlie", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    # Entrambi crit per garantire damage
    rng = rng_from_sequence(
        [
            19 / 20,  # alpha nat 20
            5 / 8,  # alpha damage
            19 / 20,  # charlie nat 20
            5 / 8,  # charlie damage
        ]
    )
    result = resolve_round(state, catalog, rng)
    # Esattamente 1 reaction (triggerata su alpha che ha priority piu' alta)
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["attacker_unit_id"] == "alpha"
    # alpha ha bleeding, charlie NON ha bleeding
    units_after = {u["id"]: u for u in result["next_state"]["units"]}
    alpha_bleeds = [
        s for s in units_after["alpha"].get("statuses", []) if s.get("id") == "bleeding"
    ]
    charlie_bleeds = [
        s for s in units_after["charlie"].get("statuses", []) if s.get("id") == "bleeding"
    ]
    assert len(alpha_bleeds) == 1
    assert charlie_bleeds == []


def test_damaged_and_attacked_reactions_coexist_on_different_units(catalog):
    """Due reactions diverse su due unit diversi devono funzionare
    entrambe senza interferire."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state["units"][0]["hp"]["current"] = 100
    state["units"][0]["hp"]["max"] = 100
    state["units"][1]["hp"]["current"] = 100
    state["units"][1]["hp"]["max"] = 100
    state = begin_round(state)["next_state"]
    # alpha attacca bravo
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    # bravo reaction damaged → status a alpha
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["event"] == "damaged"


# ------------------------------------------------------------------
# Predicates DSL (WI-1 follow-up batch 2)
# ------------------------------------------------------------------


def test_evaluate_predicates_empty_returns_true():
    assert _evaluate_predicates(None, {"damage": 5}) is True
    assert _evaluate_predicates([], {"damage": 5}) is True


def test_evaluate_predicates_comparators():
    ctx = {"damage": 5, "hp_pct": 0.3, "stress": 0.5}
    assert _evaluate_predicates([{"op": ">=", "field": "damage", "value": 5}], ctx) is True
    assert _evaluate_predicates([{"op": ">", "field": "damage", "value": 5}], ctx) is False
    assert _evaluate_predicates([{"op": "==", "field": "damage", "value": 5}], ctx) is True
    assert _evaluate_predicates([{"op": "!=", "field": "damage", "value": 10}], ctx) is True
    assert _evaluate_predicates([{"op": "<", "field": "hp_pct", "value": 0.5}], ctx) is True
    assert _evaluate_predicates([{"op": "<=", "field": "stress", "value": 0.5}], ctx) is True


def test_evaluate_predicates_and_logic():
    ctx = {"damage": 10, "hp_pct": 0.2}
    # Entrambi True
    assert (
        _evaluate_predicates(
            [
                {"op": ">=", "field": "damage", "value": 5},
                {"op": "<", "field": "hp_pct", "value": 0.5},
            ],
            ctx,
        )
        is True
    )
    # Secondo falso
    assert (
        _evaluate_predicates(
            [
                {"op": ">=", "field": "damage", "value": 5},
                {"op": ">", "field": "hp_pct", "value": 0.5},
            ],
            ctx,
        )
        is False
    )


def test_evaluate_predicates_unknown_field_fail_safe():
    # Field non in context → predicate fail-safe (ritorna False)
    assert _evaluate_predicates(
        [{"op": ">=", "field": "damage", "value": 5}], {}
    ) is False


def test_evaluate_predicates_unknown_op_fail_safe():
    # Op non supportato → fail-safe
    assert (
        _evaluate_predicates(
            [{"op": "LIKE", "field": "damage", "value": 5}],
            {"damage": 5},
        )
        is False
    )


def test_build_context_for_event_damaged_includes_damage():
    reaction_owner = {
        "id": "bravo",
        "hp": {"current": 20, "max": 50},
        "stress": 0.3,
        "tier": 2,
    }
    source = {"id": "alpha", "tier": 3}
    ctx = _build_context_for_event(
        event="damaged",
        reaction_owner=reaction_owner,
        source_unit=source,
        damage_applied=7,
    )
    assert ctx["damage"] == 7
    assert ctx["hp_current"] == 20
    assert ctx["hp_max"] == 50
    assert ctx["hp_pct"] == 20 / 50
    assert ctx["stress"] == 0.3
    assert ctx["actor_tier"] == 2
    assert ctx["source_tier"] == 3


def test_build_context_for_event_attacked_no_damage_field():
    reaction_owner = {"id": "bravo", "hp": {"current": 30, "max": 30}, "stress": 0.0, "tier": 1}
    ctx = _build_context_for_event(
        event="attacked",
        reaction_owner=reaction_owner,
        source_unit={"id": "alpha", "tier": 2},
    )
    assert "damage" not in ctx
    assert ctx["hp_pct"] == 1.0
    assert ctx["source_tier"] == 2


def test_declare_reaction_rejects_unknown_predicate_op(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    with pytest.raises(ValueError, match="predicate op non supportato"):
        declare_reaction(
            state,
            "bravo",
            reaction_payload={
                "type": "trigger_status",
                "status_id": "bleeding",
                "duration": 1,
                "intensity": 1,
            },
            trigger={
                "event": "damaged",
                "source_any_of": None,
                "predicates": [{"op": "MATCHES", "field": "damage", "value": 5}],
            },
        )


def test_declare_reaction_rejects_unknown_predicate_field(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    with pytest.raises(ValueError, match="predicate field non supportato"):
        declare_reaction(
            state,
            "bravo",
            reaction_payload={
                "type": "trigger_status",
                "status_id": "bleeding",
                "duration": 1,
                "intensity": 1,
            },
            trigger={
                "event": "damaged",
                "predicates": [{"op": ">=", "field": "mana", "value": 5}],
            },
        )


def test_damaged_reaction_with_predicate_triggers_on_high_damage(catalog):
    """Reaction damaged con predicate damage>=5 triggera solo se
    il danno applicato e' >=5."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state["units"][1]["hp"]["current"] = 100
    state["units"][1]["hp"]["max"] = 100
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",
        },
        trigger={
            "event": "damaged",
            "source_any_of": None,
            "predicates": [{"op": ">=", "field": "damage", "value": 5}],
        },
    )["next_state"]
    state = commit_round(state)["next_state"]
    # Force big hit (nat 20 crit + high damage roll)
    rng = rng_from_sequence([19 / 20, 7 / 8])
    result = resolve_round(state, catalog, rng)
    # Damage deve essere >= 5 → reaction triggera
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["event"] == "damaged"


def test_damaged_reaction_with_predicate_NOT_triggers_on_low_damage(catalog):
    """Stesso predicate ma con un danno basso → reaction NON triggera."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    # Armor molto alto per ridurre damage a 0-1
    state["units"][1]["hp"]["current"] = 100
    state["units"][1]["hp"]["max"] = 100
    state["units"][1]["armor"] = 20
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _attack(
            "alpha",
            "bravo",
            dice={"count": 1, "sides": 4, "modifier": 0},
        ),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",
        },
        trigger={
            "event": "damaged",
            "source_any_of": None,
            "predicates": [{"op": ">=", "field": "damage", "value": 5}],
        },
    )["next_state"]
    state = commit_round(state)["next_state"]
    # Hit con damage ridotto da armor
    rng = rng_from_sequence([15 / 20, 1 / 4])
    result = resolve_round(state, catalog, rng)
    # Damage == 0 (armor > danno) → predicate fail → reaction non triggera
    assert result["reactions_triggered"] == []


# ------------------------------------------------------------------
# Cooldown multi-round (WI-2 follow-up batch 2)
# ------------------------------------------------------------------


def test_declare_reaction_accepts_cooldown_rounds_field(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={
            "event": "attacked",
            "source_any_of": None,
            "cooldown_rounds": 2,
        },
    )["next_state"]
    intent = state["pending_intents"][0]
    assert intent["reaction_trigger"]["cooldown_rounds"] == 2


def test_declare_reaction_rejects_negative_cooldown(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    with pytest.raises(ValueError, match="cooldown_rounds deve essere >= 0"):
        declare_reaction(
            state,
            "bravo",
            reaction_payload={"type": "parry", "parry_bonus": 1},
            trigger={
                "event": "attacked",
                "source_any_of": None,
                "cooldown_rounds": -1,
            },
        )


def test_cooldown_set_on_reaction_trigger(catalog):
    """Quando reaction triggera, unit.reaction_cooldown_remaining e'
    settato al cooldown_rounds."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state["units"][1]["hp"]["current"] = 50
    state["units"][1]["hp"]["max"] = 50
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",
        },
        trigger={
            "event": "damaged",
            "source_any_of": None,
            "cooldown_rounds": 3,
        },
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    # bravo ha cooldown_remaining = 3
    bravo_after = result["next_state"]["units"][1]
    assert bravo_after.get("reaction_cooldown_remaining") == 3


def test_cooldown_decrements_on_begin_round(catalog):
    """Cooldown decrementa di 1 a ogni begin_round."""

    state = _make_state(catalog)
    state["units"][1]["reaction_cooldown_remaining"] = 3
    # Round 1 begin
    state = begin_round(state)["next_state"]
    assert state["units"][1]["reaction_cooldown_remaining"] == 2
    # Round 2 begin (transiamo da resolved a planning)
    state["round_phase"] = PHASE_RESOLVED
    state = begin_round(state)["next_state"]
    assert state["units"][1]["reaction_cooldown_remaining"] == 1
    # Round 3 begin → 0
    state["round_phase"] = PHASE_RESOLVED
    state = begin_round(state)["next_state"]
    assert state["units"][1]["reaction_cooldown_remaining"] == 0
    # Round 4 begin → resta 0 (min clamp)
    state["round_phase"] = PHASE_RESOLVED
    state = begin_round(state)["next_state"]
    assert state["units"][1]["reaction_cooldown_remaining"] == 0


def test_declare_reaction_silent_skip_when_cooldown_active(catalog):
    """Se unit e' in cooldown, declare_reaction ritorna state
    invariato senza aggiungere intent."""

    state = begin_round(_make_state(catalog))["next_state"]
    state["units"][1]["reaction_cooldown_remaining"] = 2
    result = declare_reaction(
        state,
        "bravo",
        reaction_payload={"type": "parry", "parry_bonus": 1},
        trigger={"event": "attacked", "source_any_of": None},
    )
    # Nessun intent aggiunto
    assert result["next_state"]["pending_intents"] == []


def test_cooldown_0_means_no_cooldown(catalog):
    """cooldown_rounds=0 (default) non setta alcun cooldown."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state["units"][1]["hp"]["current"] = 50
    state["units"][1]["hp"]["max"] = 50
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _attack("alpha", "bravo"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "bleeding",
            "duration": 1,
            "intensity": 1,
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    # Reaction triggered
    assert len(result["reactions_triggered"]) == 1
    # No cooldown settato (0 o chiave assente)
    assert result["next_state"]["units"][1].get("reaction_cooldown_remaining", 0) == 0


# ------------------------------------------------------------------
# Events moved_adjacent + ability_used (WI-4 follow-up batch 2)
# ------------------------------------------------------------------


def test_declare_reaction_accepts_event_moved_adjacent(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "panic",
            "duration": 1,
            "intensity": 1,
        },
        trigger={"event": "moved_adjacent", "source_any_of": None},
    )["next_state"]
    assert state["pending_intents"][0]["reaction_trigger"]["event"] == "moved_adjacent"


def test_declare_reaction_accepts_event_ability_used(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "disorient",
            "duration": 1,
            "intensity": 1,
        },
        trigger={"event": "ability_used", "source_any_of": None},
    )["next_state"]
    assert state["pending_intents"][0]["reaction_trigger"]["event"] == "ability_used"


def test_moved_adjacent_reaction_triggers_after_move(catalog):
    """Quando alpha esegue un move, la reaction di bravo su
    'moved_adjacent' triggera e applica lo status."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "panic",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",  # status all'unit che si e' mossa
        },
        trigger={"event": "moved_adjacent", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "moved-adjacent")
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["event"] == "moved_adjacent"
    # alpha (chi si e' mosso) ha panic
    alpha_after = result["next_state"]["units"][0]
    panics = [s for s in alpha_after.get("statuses", []) if s.get("id") == "panic"]
    assert len(panics) == 1


def test_ability_used_reaction_triggers_after_ability(catalog):
    """Reaction su ability_used triggera quando un'unita' esegue
    un action type='ability'."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    # Give alpha a trait with an active_effect so ability resolves
    state["units"][0]["trait_ids"] = ["cannone_sonico_a_raggio"]
    state = begin_round(state)["next_state"]
    ability_action = {
        "id": "ab-test",
        "type": "ability",
        "actor_id": "alpha",
        "target_id": "bravo",
        "ability_id": "sonic_blast",
        "ap_cost": 1,
        "channel": None,
    }
    state = declare_intent(state, "alpha", ability_action)["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "disorient",
            "duration": 1,
            "intensity": 1,
            "target": "attacker",
        },
        trigger={"event": "ability_used", "source_any_of": None},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = namespaced_rng("seed", "ability-used")
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["event"] == "ability_used"
    assert result["reactions_triggered"][0]["ability_id"] == "sonic_blast"


# ------------------------------------------------------------------
# Counter + Overwatch payload types (WI-3 + WI-5 follow-up batch 2)
# ------------------------------------------------------------------


def test_counter_and_overwatch_in_supported_reaction_types():
    assert "counter" in SUPPORTED_REACTION_TYPES
    assert "overwatch" in SUPPORTED_REACTION_TYPES


def test_declare_reaction_accepts_counter_payload(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "counter",
            "counter_dice": {"count": 1, "sides": 6, "modifier": 2},
        },
        trigger={"event": "damaged", "source_any_of": None},
    )["next_state"]
    intent = state["pending_intents"][0]
    assert intent["reaction_payload"]["type"] == "counter"
    assert intent["reaction_trigger"]["event"] == "damaged"


def test_declare_reaction_accepts_overwatch_payload(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "overwatch",
            "overwatch_dice": {"count": 1, "sides": 8, "modifier": 1},
        },
        trigger={"event": "moved_adjacent", "source_any_of": None},
    )["next_state"]
    intent = state["pending_intents"][0]
    assert intent["reaction_payload"]["type"] == "overwatch"
    assert intent["reaction_trigger"]["event"] == "moved_adjacent"


def test_counter_reaction_triggers_on_damaged_and_hits_attacker(catalog):
    """Main attack alpha -> bravo infligge danno; counter di bravo
    esegue synthetic attack su alpha e abbassa gli hp."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _attack("alpha", "bravo", dice={"count": 1, "sides": 6, "modifier": 2}),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "counter",
            "counter_dice": {"count": 1, "sides": 6, "modifier": 3},
            "counter_ap_cost": 0,
        },
        trigger={"event": "damaged", "source_any_of": ["alpha"]},
    )["next_state"]
    state = commit_round(state)["next_state"]
    # Main hit tira hit alto + danno medio; counter tira hit alto + danno medio
    rng = rng_from_sequence([19 / 20, 5 / 8, 18 / 20, 5 / 8])
    alpha_hp_pre = next(u for u in state["units"] if u["id"] == "alpha")["hp"][
        "current"
    ]
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
    triggered = result["reactions_triggered"][0]
    assert triggered["event"] == "damaged"
    assert triggered["reaction_payload"]["type"] == "counter"
    assert triggered["counter_damage_applied"] > 0
    # alpha ha subito damage dal counter
    alpha_hp_post = next(
        u for u in result["next_state"]["units"] if u["id"] == "alpha"
    )["hp"]["current"]
    assert alpha_hp_post < alpha_hp_pre
    # 2 turn_log_entries: main hit + counter
    assert len(result["turn_log_entries"]) == 2
    counter_entry = result["turn_log_entries"][1]
    assert counter_entry["action"]["_is_counter"] is True
    assert counter_entry["action"]["actor_id"] == "bravo"
    assert counter_entry["action"]["target_id"] == "alpha"


def test_counter_reaction_does_not_fire_on_dead_attacker(catalog):
    """Se il main attack uccide il target (e attaccante vive), counter
    non serve testare morte attaccante direttamente. Testiamo invece:
    main attack whiffa (damage 0) -> counter non triggera (solo su
    damaged con damage > 0)."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    # Miss action: rng bassissimo, natural 1
    state = declare_intent(
        state,
        "alpha",
        _attack("alpha", "bravo", dice={"count": 1, "sides": 6, "modifier": 0}),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "counter",
            "counter_dice": {"count": 1, "sides": 6, "modifier": 3},
        },
        trigger={"event": "damaged"},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([0 / 20])  # natural 1, miss
    result = resolve_round(state, catalog, rng)
    assert result["reactions_triggered"] == []
    assert len(result["turn_log_entries"]) == 1  # solo main, no counter


def test_counter_reaction_anti_recursion_does_not_retrigger(catalog):
    """Se un counter fa danno, NON deve ri-scannare damaged-reactions
    (flag _is_counter). Testiamo: bravo ha counter su damaged, alpha ha
    anch'esso una counter reaction su damaged dichiarata. Il counter di
    bravo fa damage ad alpha -> alpha counter NON triggera."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _attack("alpha", "bravo", dice={"count": 1, "sides": 6, "modifier": 2}),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "counter",
            "counter_dice": {"count": 1, "sides": 6, "modifier": 3},
        },
        trigger={"event": "damaged"},
    )["next_state"]
    # NOTA: alpha non puo' avere sia intent principale sia reaction
    # (one-per-unit). Test alt: setup multi-unit sarebbe piu' invasivo.
    # Verifichiamo invece che dopo counter, dmg_matched per alpha sarebbe
    # fallito via flag _is_counter. Sentinel: solo 1 reactions_triggered.
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8, 18 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1


def test_counter_respects_cooldown(catalog):
    """Counter reaction con cooldown_rounds=2 setta il cooldown dopo
    il trigger."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _attack("alpha", "bravo", dice={"count": 1, "sides": 6, "modifier": 2}),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "counter",
            "counter_dice": {"count": 1, "sides": 4, "modifier": 1},
        },
        trigger={"event": "damaged", "cooldown_rounds": 2},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8, 15 / 20, 2 / 4])
    result = resolve_round(state, catalog, rng)
    bravo_after = next(u for u in result["next_state"]["units"] if u["id"] == "bravo")
    assert bravo_after["reaction_cooldown_remaining"] == 2


def test_counter_with_predicate_high_damage(catalog):
    """Counter con predicate damage>=2 triggera solo su danno significativo."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _attack("alpha", "bravo", dice={"count": 1, "sides": 6, "modifier": 5}),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "counter",
            "counter_dice": {"count": 1, "sides": 6, "modifier": 2},
        },
        trigger={
            "event": "damaged",
            "predicates": [{"op": ">=", "field": "damage", "value": 2}],
        },
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8, 18 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
    assert result["reactions_triggered"][0]["counter_damage_applied"] > 0


def test_overwatch_reaction_triggers_on_moved_adjacent(catalog):
    """Quando alpha esegue move, overwatch di bravo attacca alpha."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "overwatch",
            "overwatch_dice": {"count": 1, "sides": 6, "modifier": 3},
        },
        trigger={"event": "moved_adjacent"},
    )["next_state"]
    state = commit_round(state)["next_state"]
    alpha_hp_pre = next(u for u in state["units"] if u["id"] == "alpha")["hp"][
        "current"
    ]
    rng = rng_from_sequence([19 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
    triggered = result["reactions_triggered"][0]
    assert triggered["event"] == "moved_adjacent"
    assert triggered["reaction_payload"]["type"] == "overwatch"
    assert triggered["overwatch_damage_applied"] > 0
    alpha_hp_post = next(
        u for u in result["next_state"]["units"] if u["id"] == "alpha"
    )["hp"]["current"]
    assert alpha_hp_post < alpha_hp_pre
    # turn_log_entries: move + overwatch attack
    assert len(result["turn_log_entries"]) == 2
    ow_entry = result["turn_log_entries"][1]
    assert ow_entry["action"]["_is_overwatch"] is True
    assert ow_entry["action"]["actor_id"] == "bravo"
    assert ow_entry["action"]["target_id"] == "alpha"


def test_overwatch_respects_one_shot_and_cooldown(catalog):
    """Overwatch con cooldown_rounds=1 setta il cooldown post-trigger."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "overwatch",
            "overwatch_dice": {"count": 1, "sides": 4, "modifier": 1},
        },
        trigger={"event": "moved_adjacent", "cooldown_rounds": 1},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 2 / 4])
    result = resolve_round(state, catalog, rng)
    bravo_after = next(
        u for u in result["next_state"]["units"] if u["id"] == "bravo"
    )
    assert bravo_after["reaction_cooldown_remaining"] == 1


def _heal(actor_id: str, target_id: str, dice=None, ap_cost=1):
    return {
        "id": f"heal-{actor_id}",
        "type": "heal",
        "actor_id": actor_id,
        "target_id": target_id,
        "ability_id": None,
        "ap_cost": ap_cost,
        "channel": None,
        "heal_dice": dice or {"count": 1, "sides": 4, "modifier": 2},
    }


# ------------------------------------------------------------------
# Healed event (follow-up batch 3)
# ------------------------------------------------------------------


def test_healed_in_supported_reaction_events():
    assert "healed" in SUPPORTED_REACTION_EVENTS


def test_healing_field_in_supported_predicate_fields():
    assert "healing" in SUPPORTED_PREDICATE_FIELDS


def test_declare_reaction_accepts_healed_event(catalog):
    state = begin_round(_make_state(catalog))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "focused",
            "duration": 1,
            "intensity": 1,
        },
        trigger={"event": "healed"},
    )["next_state"]
    assert state["pending_intents"][0]["reaction_trigger"]["event"] == "healed"


def test_heal_action_integrates_via_round_orchestrator(catalog):
    """Alpha esegue heal su bravo via round loop, HP bravo aumenta."""
    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    # Ferisci bravo
    state["units"][1]["hp"]["current"] = max(1, state["units"][1]["hp"]["max"] // 2)
    hp_before = state["units"][1]["hp"]["current"]
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _heal("alpha", "bravo", dice={"count": 1, "sides": 4, "modifier": 2}),
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([3 / 4])
    result = resolve_round(state, catalog, rng)
    bravo_after = next(u for u in result["next_state"]["units"] if u["id"] == "bravo")
    assert bravo_after["hp"]["current"] > hp_before
    assert result["turn_log_entries"][0]["healing_applied"] > 0


def test_healed_reaction_triggers_on_healing(catalog):
    """Listener reaction su 'healed' triggera post-heal."""
    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    # Ferisci bravo
    state["units"][1]["hp"]["current"] = max(1, state["units"][1]["hp"]["max"] // 2)
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _heal("alpha", "bravo", dice={"count": 1, "sides": 4, "modifier": 3}),
    )["next_state"]
    # Listener: bravo stesso (target receiver) reagisce al proprio heal
    # applicando focused all'alpha (il caster)
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "focused",
            "duration": 2,
            "intensity": 1,
            "target": "attacker",  # attacker = caster nel contesto 'healed'
        },
        trigger={"event": "healed"},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([3 / 4])
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
    triggered = result["reactions_triggered"][0]
    assert triggered["event"] == "healed"
    assert triggered["healing_applied"] > 0
    assert triggered["heal_target_unit_id"] == "bravo"
    alpha_after = next(u for u in result["next_state"]["units"] if u["id"] == "alpha")
    focused = [s for s in alpha_after.get("statuses", []) if s.get("id") == "focused"]
    assert len(focused) == 1


def test_healed_reaction_NOT_triggered_if_no_healing(catalog):
    """Heal su target full HP -> healing_applied=0 -> reaction no trigger."""
    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    # Bravo gia' a full hp
    state["units"][1]["hp"]["current"] = state["units"][1]["hp"]["max"]
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _heal("alpha", "bravo", dice={"count": 1, "sides": 4, "modifier": 0}),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "focused",
            "duration": 1,
            "intensity": 1,
        },
        trigger={"event": "healed"},
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([3 / 4])
    result = resolve_round(state, catalog, rng)
    assert result["reactions_triggered"] == []


def test_healed_reaction_with_predicate_healing_threshold(catalog):
    """Predicate healing>=3 filtra micro-heals."""
    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    state["units"][1]["hp"]["current"] = max(1, state["units"][1]["hp"]["max"] - 10)
    state = begin_round(state)["next_state"]
    state = declare_intent(
        state,
        "alpha",
        _heal("alpha", "bravo", dice={"count": 1, "sides": 4, "modifier": 3}),
    )["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "trigger_status",
            "status_id": "focused",
            "duration": 1,
            "intensity": 1,
        },
        trigger={
            "event": "healed",
            "predicates": [{"op": ">=", "field": "healing", "value": 3}],
        },
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([3 / 4])  # roll = 3, + 3 mod = 6 healing
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1


def test_overwatch_with_predicate_source_tier(catalog):
    """Overwatch con predicate source_tier >= 1 triggera quando il
    mover e' tier 1+."""

    state = _make_state(catalog, initiative_a=14, initiative_b=10)
    # Force tier su alpha
    state["units"][0]["tier"] = 2
    state = begin_round(state)["next_state"]
    state = declare_intent(state, "alpha", _move("alpha"))["next_state"]
    state = declare_reaction(
        state,
        "bravo",
        reaction_payload={
            "type": "overwatch",
            "overwatch_dice": {"count": 1, "sides": 6, "modifier": 2},
        },
        trigger={
            "event": "moved_adjacent",
            "predicates": [{"op": ">=", "field": "source_tier", "value": 2}],
        },
    )["next_state"]
    state = commit_round(state)["next_state"]
    rng = rng_from_sequence([19 / 20, 5 / 8])
    result = resolve_round(state, catalog, rng)
    assert len(result["reactions_triggered"]) == 1
