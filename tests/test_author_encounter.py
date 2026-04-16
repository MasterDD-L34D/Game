"""Unit tests for tools/py/author_encounter.py.

Tests pure builder function + interactive loop via fake reader/writer.
CI runs full AJV validation separately via tests/scripts/encounterSchema.test.js.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools" / "py"))

from author_encounter import (  # noqa: E402
    AuthoringError,
    build_encounter,
    dump_encounter_yaml,
    run_interactive,
)


MIN_INPUTS = {
    "encounter_id": "enc_test_01",
    "name": "Test Encounter",
    "biome_id": "savana",
    "grid_size": [8, 8],
    "objective_type": "elimination",
    "player_spawn": [[0, 3], [0, 4]],
    "difficulty_rating": 2,
    "waves": [
        {
            "wave_id": 1,
            "turn_trigger": 0,
            "spawn_points": [[7, 3]],
            "units": [{"species": "predoni_nomadi", "count": 2}],
        }
    ],
}


# ── build_encounter: happy path ──


def test_build_minimal_valid_encounter():
    out = build_encounter(MIN_INPUTS)
    assert out["encounter_id"] == "enc_test_01"
    assert out["name"] == "Test Encounter"
    assert out["grid_size"] == [8, 8]
    assert out["objective"] == {"type": "elimination"}
    assert len(out["waves"]) == 1
    assert out["waves"][0]["units"][0]["species"] == "predoni_nomadi"


def test_build_with_optional_fields():
    inputs = dict(MIN_INPUTS)
    inputs["estimated_turns"] = 6
    inputs["tags"] = ["tutorial", "standard"]
    out = build_encounter(inputs)
    assert out["estimated_turns"] == 6
    assert out["tags"] == ["tutorial", "standard"]


def test_build_with_unit_tier_and_ai_profile():
    inputs = dict(MIN_INPUTS)
    inputs["waves"] = [
        {
            "wave_id": 1,
            "turn_trigger": 0,
            "spawn_points": [[7, 3]],
            "units": [
                {
                    "species": "sand_skitter",
                    "count": 3,
                    "tier": "elite",
                    "ai_profile": "aggressive",
                }
            ],
        }
    ]
    out = build_encounter(inputs)
    unit = out["waves"][0]["units"][0]
    assert unit["tier"] == "elite"
    assert unit["ai_profile"] == "aggressive"


def test_build_dedupes_tags():
    inputs = dict(MIN_INPUTS)
    inputs["tags"] = ["tutorial", "tutorial", "standard"]
    out = build_encounter(inputs)
    assert out["tags"] == ["tutorial", "standard"]


# ── build_encounter: validation errors ──


def test_reject_bad_encounter_id():
    bad = dict(MIN_INPUTS, encounter_id="tutorial_01")
    with pytest.raises(AuthoringError, match="encounter_id"):
        build_encounter(bad)


def test_reject_empty_name():
    bad = dict(MIN_INPUTS, name="")
    with pytest.raises(AuthoringError, match="name"):
        build_encounter(bad)


def test_reject_grid_size_too_small():
    bad = dict(MIN_INPUTS, grid_size=[3, 3])
    with pytest.raises(AuthoringError, match="grid_size"):
        build_encounter(bad)


def test_reject_grid_size_too_large():
    bad = dict(MIN_INPUTS, grid_size=[21, 21])
    with pytest.raises(AuthoringError, match="grid_size"):
        build_encounter(bad)


def test_reject_bad_objective_type():
    bad = dict(MIN_INPUTS, objective_type="conquest")
    with pytest.raises(AuthoringError, match="objective_type"):
        build_encounter(bad)


def test_reject_empty_player_spawn():
    bad = dict(MIN_INPUTS, player_spawn=[])
    with pytest.raises(AuthoringError, match="player_spawn"):
        build_encounter(bad)


def test_reject_difficulty_out_of_range():
    bad = dict(MIN_INPUTS, difficulty_rating=6)
    with pytest.raises(AuthoringError, match="difficulty_rating"):
        build_encounter(bad)


def test_reject_empty_waves():
    bad = dict(MIN_INPUTS, waves=[])
    with pytest.raises(AuthoringError, match="waves"):
        build_encounter(bad)


def test_reject_wave_with_no_units():
    bad = dict(MIN_INPUTS)
    bad["waves"] = [
        {"wave_id": 1, "turn_trigger": 0, "spawn_points": [[7, 3]], "units": []}
    ]
    with pytest.raises(AuthoringError, match="units"):
        build_encounter(bad)


def test_reject_bad_unit_tier():
    bad = dict(MIN_INPUTS)
    bad["waves"] = [
        {
            "wave_id": 1,
            "turn_trigger": 0,
            "spawn_points": [[7, 3]],
            "units": [{"species": "x", "count": 1, "tier": "legendary"}],
        }
    ]
    with pytest.raises(AuthoringError, match="tier"):
        build_encounter(bad)


def test_reject_bad_tag():
    bad = dict(MIN_INPUTS, tags=["not_a_valid_tag"])
    with pytest.raises(AuthoringError, match="tags"):
        build_encounter(bad)


# ── dump + interactive round-trip ──


def test_dump_encounter_yaml_roundtrip(tmp_path):
    enc = build_encounter(MIN_INPUTS)
    path = tmp_path / "enc_test_01.yaml"
    dump_encounter_yaml(enc, path)
    assert path.exists()
    reloaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert reloaded["encounter_id"] == enc["encounter_id"]
    assert reloaded["waves"] == enc["waves"]


def test_run_interactive_full_flow(tmp_path):
    """Simulate keystrokes for the whole interactive loop."""
    answers = iter([
        "enc_flow_01",       # encounter_id
        "Flow Test",         # name
        "savana",            # biome_id
        "8,8",               # grid_size
        "elimination",       # objective_type
        "0,3; 0,4",          # player_spawn
        "2",                 # difficulty_rating
        "1",                 # num waves
        "0",                 # wave 1 turn_trigger
        "7,3; 7,5",          # wave 1 spawn_points
        "1",                 # wave 1 num units
        "predoni_nomadi",    # unit species
        "2",                 # unit count
        "base",              # unit tier
        "tutorial",          # tags
    ])
    captured: list[str] = []

    def fake_reader() -> str:
        return next(answers)

    def fake_writer(s: str) -> int:
        captured.append(s)
        return len(s)

    path = run_interactive(output_dir=tmp_path, reader=fake_reader, writer=fake_writer)
    assert path.name == "enc_flow_01.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert data["encounter_id"] == "enc_flow_01"
    assert data["name"] == "Flow Test"
    assert data["grid_size"] == [8, 8]
    assert data["tags"] == ["tutorial"]
    joined = "".join(captured)
    assert "Encounter Authoring" in joined
    assert "wrote" in joined
