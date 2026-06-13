"""Tests for tools/py/encounter_xp_budget.py — Pathfinder-XP encounter audit."""

from __future__ import annotations

import pytest


pytest.importorskip("tools.py.encounter_xp_budget", reason="PYTHONPATH=tools/py required")

from tools.py.encounter_xp_budget import (  # noqa: E402
    DIFFICULTY_MULTIPLIER,
    EncounterAudit,
    KNOWN_SCENARIOS,
    TOO_EASY_MAX,
    TOO_HARD_MIN,
    UnitAudit,
    audit_encounter,
    audit_to_dict,
    format_markdown,
    split_units,
    unit_power,
)


def _player(uid="p1", hp=10, mod=2, dc=12, traits=None):
    return {
        "id": uid,
        "controlled_by": "player",
        "hp": hp,
        "mod": mod,
        "dc": dc,
        "traits": traits or [],
    }


def _enemy(uid="e1", hp=8, mod=1, dc=11, traits=None):
    return {
        "id": uid,
        "controlled_by": "sistema",
        "hp": hp,
        "mod": mod,
        "dc": dc,
        "traits": traits or [],
    }


def _scenario(difficulty=3, players=None, enemies=None, sid="enc_test"):
    return {
        "id": sid,
        "difficulty_rating": difficulty,
        "units": (players or [_player()]) + (enemies or [_enemy()]),
    }


# ─────────────────────────────────────────────────────────
# unit_power
# ─────────────────────────────────────────────────────────


def test_unit_power_basic():
    """hp=10, mod=2, dc=12, 0 traits → 10 + 10 + 6 + 0 = 26."""
    total, comps = unit_power({"hp": 10, "mod": 2, "dc": 12, "traits": []})
    assert total == pytest.approx(26.0)
    assert comps == {"hp": 10.0, "mod": 10.0, "dc": 6.0, "traits": 0.0}


def test_unit_power_dc_below_10_floors_to_zero():
    """DC < 10 → contribution clamped to 0 (no negative power)."""
    total, comps = unit_power({"hp": 5, "mod": 0, "dc": 5, "traits": []})
    assert total == 5.0
    assert comps["dc"] == 0.0


def test_unit_power_traits_add_2_each():
    total, comps = unit_power({"hp": 10, "mod": 0, "dc": 10, "traits": ["a", "b", "c"]})
    assert comps["traits"] == 6.0
    assert total == 16.0


def test_unit_power_missing_fields_default_safely():
    """Missing fields → defaults (hp=0, mod=0, dc=10, traits=[])."""
    total, _ = unit_power({})
    assert total == 0.0


def test_unit_power_string_values_coerced():
    """Strings from JSON are coerced to floats."""
    total, _ = unit_power({"hp": "10", "mod": "2", "dc": "12"})
    assert total == 26.0


def test_unit_power_attack_mod_alias():
    """Field 'attack_mod' is recognized as 'mod' fallback."""
    total, _ = unit_power({"hp": 5, "attack_mod": 3})
    assert total == pytest.approx(5 + 15)


# ─────────────────────────────────────────────────────────
# split_units
# ─────────────────────────────────────────────────────────


def test_split_units_partitions_by_controlled_by():
    sc = _scenario(players=[_player("p1"), _player("p2")], enemies=[_enemy("e1")])
    players, enemies = split_units(sc)
    assert len(players) == 2
    assert len(enemies) == 1


def test_split_units_handles_missing_units():
    players, enemies = split_units({})
    assert players == []
    assert enemies == []


def test_split_units_skips_unknown_controlled_by():
    sc = {"units": [{"id": "x", "controlled_by": "neutral"}]}
    players, enemies = split_units(sc)
    assert players == []
    assert enemies == []


# ─────────────────────────────────────────────────────────
# audit_encounter
# ─────────────────────────────────────────────────────────


def test_audit_balanced_scenario():
    """Designed-balanced: party 26, expected = 26 * 1.0 = 26, enemy = 26 → ratio 1.0."""
    sc = _scenario(
        difficulty=3,
        players=[_player(hp=10, mod=2, dc=12)],
        enemies=[_enemy(hp=10, mod=2, dc=12)],
    )
    a = audit_encounter(sc)
    assert a.party_power == 26.0
    assert a.expected_enemy_power == 26.0
    assert a.ratio == 1.0
    assert a.verdict == "balanced"


def test_audit_too_easy_when_enemies_underpower():
    """Half-power enemies → ratio < 0.7 → too_easy."""
    sc = _scenario(
        difficulty=3,
        players=[_player(hp=10, mod=2, dc=12)],
        enemies=[_enemy(hp=2, mod=0, dc=10)],
    )
    a = audit_encounter(sc)
    assert a.ratio < TOO_EASY_MAX
    assert a.verdict == "too_easy"


def test_audit_too_hard_when_enemies_overpower():
    """Boss with high stats → ratio > 1.3 → too_hard."""
    sc = _scenario(
        difficulty=3,
        players=[_player(hp=10, mod=2, dc=12)],
        enemies=[_enemy(hp=40, mod=4, dc=15)],
    )
    a = audit_encounter(sc)
    assert a.ratio > TOO_HARD_MIN
    assert a.verdict == "too_hard"


def test_audit_uses_difficulty_multiplier():
    """Difficulty 6 (hardcore) multiplier 2.2 → enemies need 2.2x party to balance."""
    sc = _scenario(
        difficulty=6,
        players=[_player(hp=10, mod=2, dc=12)],
        enemies=[_enemy(hp=10, mod=2, dc=12)],
    )
    a = audit_encounter(sc)
    # ratio = 26 / (26 * 2.2) = 0.4545 → too_easy for hardcore
    assert a.ratio < 0.5
    assert a.verdict == "too_easy"


def test_audit_raises_on_no_players():
    sc = {"id": "test", "difficulty_rating": 3, "units": [_enemy()]}
    with pytest.raises(ValueError, match="no player"):
        audit_encounter(sc)


def test_audit_raises_on_no_enemies():
    sc = {"id": "test", "difficulty_rating": 3, "units": [_player()]}
    with pytest.raises(ValueError, match="no enemy"):
        audit_encounter(sc)


def test_audit_returns_per_unit_breakdown():
    sc = _scenario(players=[_player(), _player("p2")], enemies=[_enemy()])
    a = audit_encounter(sc)
    assert len(a.units) == 3
    assert {u.side for u in a.units} == {"player", "sistema"}


def test_audit_unknown_difficulty_uses_default():
    """Unknown difficulty rating (e.g. 99) falls back to multiplier 1.0."""
    sc = _scenario(difficulty=99, players=[_player()], enemies=[_enemy()])
    a = audit_encounter(sc)
    assert a.expected_enemy_power == a.party_power  # multiplier defaulted to 1.0


# ─────────────────────────────────────────────────────────
# Realistic scenario shapes (mirror tutorialScenario.js)
# ─────────────────────────────────────────────────────────


def test_audit_tutorial_01_shape():
    """Mirrors enc_tutorial_01: 2 players (10 hp, mod 2-3, dc 12) vs 2 enemies."""
    sc = {
        "id": "enc_tutorial_01",
        "difficulty_rating": 1,
        "units": [
            {"id": "p1", "controlled_by": "player", "hp": 10, "mod": 3, "dc": 12},
            {"id": "p2", "controlled_by": "player", "hp": 12, "mod": 2, "dc": 13},
            {"id": "e1", "controlled_by": "sistema", "hp": 3, "mod": 1, "dc": 11},
            {"id": "e2", "controlled_by": "sistema", "hp": 5, "mod": 1, "dc": 11},
        ],
    }
    a = audit_encounter(sc)
    # Party = (10+15+6) + (12+10+9) = 31 + 31 = 62
    # Enemy = (3+5+3) + (5+5+3) = 11 + 13 = 24
    # Expected = 62 * 0.6 = 37.2 → ratio 24/37.2 ≈ 0.645 → too_easy
    assert a.party_power == 62.0
    assert a.enemy_power == 24.0
    assert a.expected_enemy_power == pytest.approx(37.2)
    assert a.verdict == "too_easy"


def test_audit_hardcore_06_shape():
    """Mirrors hardcore_06 boss: 8 players vs 1 BOSS hp=40 + 5 minions."""
    players = [
        {"id": f"p{i}", "controlled_by": "player", "hp": 10, "mod": 3, "dc": 12}
        for i in range(8)
    ]
    enemies = [
        {"id": "boss", "controlled_by": "sistema", "hp": 40, "mod": 5, "dc": 15},
        {"id": "e1", "controlled_by": "sistema", "hp": 9, "mod": 3, "dc": 13},
        {"id": "e2", "controlled_by": "sistema", "hp": 9, "mod": 3, "dc": 13},
        {"id": "e3", "controlled_by": "sistema", "hp": 5, "mod": 2, "dc": 12},
        {"id": "e4", "controlled_by": "sistema", "hp": 5, "mod": 2, "dc": 12},
        {"id": "e5", "controlled_by": "sistema", "hp": 5, "mod": 2, "dc": 12},
    ]
    sc = {
        "id": "enc_tutorial_06_hardcore",
        "difficulty_rating": 6,
        "units": players + enemies,
    }
    a = audit_encounter(sc)
    # Just sanity: enemies should be present, ratio computed.
    assert a.party_power > 0
    assert a.enemy_power > 0
    assert a.ratio > 0
    assert a.verdict in {"too_easy", "balanced", "too_hard"}


# ─────────────────────────────────────────────────────────
# Constants contract
# ─────────────────────────────────────────────────────────


def test_difficulty_multiplier_monotonic():
    """Higher difficulty must require more enemy power (monotonic)."""
    keys = sorted(DIFFICULTY_MULTIPLIER.keys())
    values = [DIFFICULTY_MULTIPLIER[k] for k in keys]
    assert values == sorted(values), f"Multipliers not monotonic: {values}"


def test_verdict_thresholds_sane():
    assert 0 < TOO_EASY_MAX < 1 < TOO_HARD_MIN


def test_known_scenarios_lists_real_ids():
    """All KNOWN_SCENARIOS follow the enc_* naming convention."""
    for sid in KNOWN_SCENARIOS:
        assert sid.startswith("enc_")
    assert "enc_tutorial_01" in KNOWN_SCENARIOS
    assert "enc_tutorial_06_hardcore" in KNOWN_SCENARIOS


# ─────────────────────────────────────────────────────────
# Output formatting
# ─────────────────────────────────────────────────────────


def test_audit_to_dict_shape():
    sc = _scenario()
    a = audit_encounter(sc)
    d = audit_to_dict(a)
    assert d["scenario_id"] == "enc_test"
    assert "party_power" in d
    assert "ratio" in d
    assert "verdict" in d
    assert isinstance(d["units"], list)


def test_format_markdown_smoke():
    sc1 = _scenario(sid="enc_a", difficulty=1)
    sc2 = _scenario(
        sid="enc_b",
        difficulty=6,
        enemies=[_enemy(hp=40, mod=5, dc=15)],
    )
    audits = [audit_encounter(sc1), audit_encounter(sc2)]
    md = format_markdown(audits)
    assert md.startswith("---\n")
    assert "doc_owner: claude-code" in md
    assert "Encounter XP Budget" in md
    assert "## Verdict per scenario" in md
    assert "| `enc_a` |" in md
    assert "| `enc_b` |" in md
    assert "## Per-unit power breakdown" in md
    assert "Pathfinder" in md
