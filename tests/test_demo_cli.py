"""Test di regressione per ``services/rules/demo_cli``.

Copre:

- helper puri: ``find_unit``, ``is_alive``, ``alive_units_by_side``,
  ``is_combat_over``, ``ai_pick_target``, ``build_attack_action``,
  ``build_defend_action``
- formattatori: ``format_unit_line``, ``format_state_board``,
  ``format_turn_log_entry``
- AI getter: ``ai_action_for_unit`` pick target e skip when no target
- end-to-end deterministico: ``run_combat`` in ``--auto`` con seed fisso
  produce winner e round deterministici
"""
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SERVICES = PROJECT_ROOT / "services"
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
for path in (SERVICES, TOOLS_PY):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from rules.demo_cli import (  # noqa: E402
    DEFAULT_HOSTILE_SPECIES,
    DEFAULT_HOSTILE_TRAITS,
    DEFAULT_PARTY,
    ai_action_for_unit,
    ai_pick_target,
    alive_units_by_side,
    build_attack_action,
    build_defend_action,
    find_unit,
    format_state_board,
    format_turn_log_entry,
    format_unit_line,
    is_alive,
    is_combat_over,
    run_combat,
)
from rules.hydration import hydrate_encounter, load_trait_mechanics  # noqa: E402

MECHANICS_PATH = (
    PROJECT_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "trait_mechanics.yaml"
)
ENCOUNTER_PATH = PROJECT_ROOT / "docs" / "examples" / "encounter_caverna.txt"


@pytest.fixture(scope="module")
def catalog():
    return load_trait_mechanics(MECHANICS_PATH)


@pytest.fixture()
def demo_state(catalog):
    with open(ENCOUNTER_PATH, encoding="utf-8") as fh:
        encounter = json.load(fh)
    return hydrate_encounter(
        encounter=encounter,
        party=DEFAULT_PARTY,
        catalog=catalog,
        seed="test-seed",
        session_id="test-session",
        hostile_species_ids=DEFAULT_HOSTILE_SPECIES,
        hostile_trait_ids=DEFAULT_HOSTILE_TRAITS,
    )


# --- Helper puri ----------------------------------------------------------


def test_find_unit_returns_copy(demo_state):
    unit = find_unit(demo_state, "party-01")
    assert unit is not None
    assert unit["id"] == "party-01"
    # Mutare il dict restituito non deve impattare lo state
    unit["hp"]["current"] = 0
    original = find_unit(demo_state, "party-01")
    assert original["hp"]["current"] != 0


def test_find_unit_returns_none_if_missing(demo_state):
    assert find_unit(demo_state, "nonexistent") is None


def test_is_alive_checks_current_hp():
    assert is_alive({"hp": {"current": 10, "max": 10}}) is True
    assert is_alive({"hp": {"current": 0, "max": 10}}) is False
    assert is_alive({"hp": {"current": -5, "max": 10}}) is False


def test_alive_units_by_side_filters(demo_state):
    party = alive_units_by_side(demo_state, "party")
    hostile = alive_units_by_side(demo_state, "hostile")
    assert len(party) == 3
    assert len(hostile) == 4


def test_alive_units_by_side_excludes_dead(demo_state):
    demo_state["units"][0]["hp"]["current"] = 0
    party = alive_units_by_side(demo_state, "party")
    assert len(party) == 2


def test_is_combat_over_ongoing_when_both_sides_alive(demo_state):
    over, winner = is_combat_over(demo_state)
    assert over is False
    assert winner is None


def test_is_combat_over_party_wins_when_hostile_dead(demo_state):
    for unit in demo_state["units"]:
        if unit["side"] == "hostile":
            unit["hp"]["current"] = 0
    over, winner = is_combat_over(demo_state)
    assert over is True
    assert winner == "party"


def test_is_combat_over_hostile_wins_when_party_dead(demo_state):
    for unit in demo_state["units"]:
        if unit["side"] == "party":
            unit["hp"]["current"] = 0
    over, winner = is_combat_over(demo_state)
    assert over is True
    assert winner == "hostile"


def test_ai_pick_target_returns_first_alive_opponent(demo_state):
    target = ai_pick_target(demo_state, "hostile")
    assert target == "party-01"
    # Kill party-01 e verifica che passi a party-02
    demo_state["units"][0]["hp"]["current"] = 0
    target = ai_pick_target(demo_state, "hostile")
    assert target == "party-02"


def test_ai_pick_target_returns_none_when_no_targets(demo_state):
    for unit in demo_state["units"]:
        if unit["side"] == "hostile":
            unit["hp"]["current"] = 0
    target = ai_pick_target(demo_state, "party")
    assert target is None


def test_build_attack_action_includes_damage_dice():
    action = build_attack_action("a1", "atk", "tgt")
    assert action["type"] == "attack"
    assert action["actor_id"] == "atk"
    assert action["target_id"] == "tgt"
    assert action["damage_dice"]["count"] == 1
    assert action["damage_dice"]["sides"] == 8


def test_build_defend_action():
    action = build_defend_action("d1", "atk")
    assert action["type"] == "defend"
    assert action["target_id"] is None


# --- Formattatori ---------------------------------------------------------


def test_format_unit_line_includes_tier_hp_ap_pt(demo_state):
    unit = demo_state["units"][0]
    line = format_unit_line(unit)
    assert "party-01" in line
    assert "T3" in line
    assert "HP  50/50" in line
    assert "AP 2/2" in line
    assert "pt 0" in line


def test_format_unit_line_marks_dead(demo_state):
    unit = demo_state["units"][0]
    unit["hp"]["current"] = 0
    line = format_unit_line(unit)
    assert "[X]" in line


def test_format_state_board_has_party_and_hostile_sections(demo_state):
    board = format_state_board(demo_state)
    assert "PARTY:" in board
    assert "HOSTILE:" in board
    assert "party-01" in board
    assert "hostile-01" in board


def test_format_turn_log_entry_hit():
    entry = {
        "turn": 1,
        "action": {"actor_id": "a", "type": "attack", "target_id": "b"},
        "roll": {
            "natural": 15,
            "total": 16,
            "dc": 12,
            "success": True,
            "mos": 4,
            "damage_step": 0,
            "pt_gained": 1,
            "is_crit": False,
            "is_fumble": False,
        },
        "damage_applied": 5,
    }
    line = format_turn_log_entry(entry)
    assert "HIT" in line
    assert "nat=15" in line
    assert "dmg 5" in line


def test_format_turn_log_entry_crit_with_status():
    entry = {
        "turn": 1,
        "action": {"actor_id": "a", "type": "attack", "target_id": "b"},
        "roll": {
            "natural": 20,
            "total": 20,
            "dc": 12,
            "success": True,
            "mos": 8,
            "damage_step": 2,
            "pt_gained": 3,
            "is_crit": True,
            "is_fumble": False,
        },
        "damage_applied": 10,
        "statuses_applied": [{"id": "disorient", "intensity": 1, "remaining_turns": 2}],
    }
    line = format_turn_log_entry(entry)
    assert "CRIT" in line
    assert "disorient" in line


# --- AI getter ------------------------------------------------------------


def test_ai_action_for_unit_attacks_first_opponent(demo_state):
    action = ai_action_for_unit(demo_state, "hostile-01", action_index=0)
    assert action is not None
    assert action["type"] == "attack"
    assert action["target_id"] == "party-01"


def test_ai_action_for_unit_returns_none_when_no_targets(demo_state):
    for unit in demo_state["units"]:
        if unit["side"] == "party":
            unit["hp"]["current"] = 0
    action = ai_action_for_unit(demo_state, "hostile-01", action_index=0)
    assert action is None


def test_ai_action_for_unit_returns_none_when_dead(demo_state):
    demo_state["units"][0]["hp"]["current"] = 0
    action = ai_action_for_unit(demo_state, "party-01", action_index=0)
    assert action is None


# --- Run loop end-to-end --------------------------------------------------


def test_run_combat_auto_mode_is_deterministic(catalog, demo_state):
    state_a = dict(demo_state)
    state_b = dict(demo_state)
    # Deep copy via json
    state_a = json.loads(json.dumps(demo_state))
    state_b = json.loads(json.dumps(demo_state))

    out_a = io.StringIO()
    out_b = io.StringIO()

    result_a = run_combat(
        state=state_a,
        catalog=catalog,
        seed="det-seed",
        get_party_action=ai_action_for_unit,
        get_hostile_action=ai_action_for_unit,
        max_rounds=10,
        out=out_a,
    )
    result_b = run_combat(
        state=state_b,
        catalog=catalog,
        seed="det-seed",
        get_party_action=ai_action_for_unit,
        get_hostile_action=ai_action_for_unit,
        max_rounds=10,
        out=out_b,
    )
    assert result_a["winner"] == result_b["winner"]
    assert result_a["rounds_played"] == result_b["rounds_played"]
    assert out_a.getvalue() == out_b.getvalue()


def test_run_combat_auto_mode_respects_max_rounds(catalog, demo_state):
    state = json.loads(json.dumps(demo_state))
    out = io.StringIO()
    result = run_combat(
        state=state,
        catalog=catalog,
        seed="max-rounds-seed",
        get_party_action=ai_action_for_unit,
        get_hostile_action=ai_action_for_unit,
        max_rounds=1,
        out=out,
    )
    # Con 1 solo round e 3 party vs 4 hostile, probabilmente nessun vincitore
    assert result["rounds_played"] == 1


def test_run_combat_writes_board_and_final_state(catalog, demo_state):
    state = json.loads(json.dumps(demo_state))
    out = io.StringIO()
    run_combat(
        state=state,
        catalog=catalog,
        seed="write-test",
        get_party_action=ai_action_for_unit,
        get_hostile_action=ai_action_for_unit,
        max_rounds=3,
        out=out,
    )
    output = out.getvalue()
    assert "ROUND 1" in output
    assert "Stato finale" in output
    assert "party-01" in output
    assert "hostile-01" in output


def test_run_combat_terminates_when_all_hostile_dead(catalog, demo_state):
    state = json.loads(json.dumps(demo_state))
    # Lascia vivo solo hostile-04 con 1 HP -> i party lo sgominano rapidamente
    for u in state["units"]:
        if u["side"] == "hostile" and u["id"] != "hostile-04":
            u["hp"]["current"] = 0
        elif u["id"] == "hostile-04":
            u["hp"]["current"] = 1
    out = io.StringIO()
    result = run_combat(
        state=state,
        catalog=catalog,
        seed="quick-win",
        get_party_action=ai_action_for_unit,
        get_hostile_action=ai_action_for_unit,
        max_rounds=10,
        out=out,
    )
    assert result["winner"] == "party"
    assert result["rounds_played"] >= 1
