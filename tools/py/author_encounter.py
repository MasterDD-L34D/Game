"""Interactive encounter authoring CLI.

Pattern: Fallout Tactics postmortem (Micro Forte, 2001) — tool investment
early pays off. Evo-Tactics gap: schema exists at schemas/evo/encounter.schema.json
but no authoring UI. This module provides a guided CLI that:

  1. Walks the user through schema-required fields with validation.
  2. Produces encounter YAML in docs/planning/encounters/ (matches CI test path).
  3. Runs basic structural validation (full AJV validation is in CI via
     tests/scripts/encounterSchema.test.js).

The module is split in two layers:

  - build_encounter(inputs): pure function, dict -> dict. Testable without I/O.
  - run_interactive(...): stdin/stdout loop calling build_encounter.

Source: memory/reference_tactical_postmortems.md §B.2
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs" / "planning" / "encounters"
SCHEMA_PATH = REPO_ROOT / "schemas" / "evo" / "encounter.schema.json"

ENCOUNTER_ID_PATTERN = re.compile(r"^enc_[a-z0-9_]+$")
OBJECTIVE_TYPES = [
    "elimination", "capture_point", "escort", "sabotage", "survival", "escape",
]
UNIT_TIERS = ["base", "elite", "apex"]
TAG_ENUM = [
    "tutorial", "standard", "boss", "survival", "escort",
    "puzzle", "timed", "night", "storm",
]


class AuthoringError(ValueError):
    """Raised when inputs fail structural validation."""


def build_encounter(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Pure function: input dict -> encounter dict ready for YAML dump.

    Validates required fields + field shapes. Raises AuthoringError on bad
    input. Does NOT run full AJV validation (that's CI's job).
    """
    encounter_id = str(inputs.get("encounter_id", "")).strip()
    if not ENCOUNTER_ID_PATTERN.match(encounter_id):
        raise AuthoringError(
            f"encounter_id must match ^enc_[a-z0-9_]+$, got {encounter_id!r}"
        )

    name = str(inputs.get("name", "")).strip()
    if not name:
        raise AuthoringError("name is required and non-empty")

    biome_id = str(inputs.get("biome_id", "")).strip()
    if not biome_id:
        raise AuthoringError("biome_id is required")

    grid_size = inputs.get("grid_size")
    if not (isinstance(grid_size, list) and len(grid_size) == 2
            and all(isinstance(n, int) and 4 <= n <= 20 for n in grid_size)):
        raise AuthoringError("grid_size must be [width, height] with 4 <= n <= 20")

    objective_type = inputs.get("objective_type")
    if objective_type not in OBJECTIVE_TYPES:
        raise AuthoringError(
            f"objective_type must be one of {OBJECTIVE_TYPES}, got {objective_type!r}"
        )

    player_spawn = inputs.get("player_spawn")
    if not (isinstance(player_spawn, list) and len(player_spawn) >= 1
            and all(isinstance(p, list) and len(p) == 2
                    and all(isinstance(c, int) and c >= 0 for c in p)
                    for p in player_spawn)):
        raise AuthoringError("player_spawn must be list of [x, y] integer pairs, min 1")

    waves_in = inputs.get("waves", [])
    if not (isinstance(waves_in, list) and len(waves_in) >= 1):
        raise AuthoringError("waves must be a non-empty list")

    waves_out: List[Dict[str, Any]] = []
    for idx, w in enumerate(waves_in):
        if not isinstance(w, dict):
            raise AuthoringError(f"wave #{idx} must be a dict")
        wave_id = w.get("wave_id", idx + 1)
        turn_trigger = w.get("turn_trigger", 0)
        spawn_points = w.get("spawn_points", [])
        units = w.get("units", [])
        if not (isinstance(turn_trigger, int) and turn_trigger >= 0):
            raise AuthoringError(f"wave #{idx} turn_trigger must be int >= 0")
        if not (isinstance(spawn_points, list) and len(spawn_points) >= 1):
            raise AuthoringError(f"wave #{idx} spawn_points must be non-empty list")
        if not (isinstance(units, list) and len(units) >= 1):
            raise AuthoringError(f"wave #{idx} units must be non-empty list")
        wave_units_out: List[Dict[str, Any]] = []
        for uidx, u in enumerate(units):
            if not isinstance(u, dict):
                raise AuthoringError(f"wave #{idx} unit #{uidx} must be dict")
            species = str(u.get("species", "")).strip()
            count = u.get("count", 0)
            if not species:
                raise AuthoringError(f"wave #{idx} unit #{uidx} species required")
            if not (isinstance(count, int) and count >= 1):
                raise AuthoringError(
                    f"wave #{idx} unit #{uidx} count must be int >= 1"
                )
            unit_out: Dict[str, Any] = {"species": species, "count": count}
            tier = u.get("tier")
            if tier:
                if tier not in UNIT_TIERS:
                    raise AuthoringError(
                        f"unit tier must be one of {UNIT_TIERS}, got {tier!r}"
                    )
                unit_out["tier"] = tier
            if u.get("ai_profile"):
                unit_out["ai_profile"] = str(u["ai_profile"]).strip()
            wave_units_out.append(unit_out)
        waves_out.append({
            "wave_id": wave_id,
            "turn_trigger": turn_trigger,
            "spawn_points": spawn_points,
            "units": wave_units_out,
        })

    difficulty_rating = inputs.get("difficulty_rating")
    if not (isinstance(difficulty_rating, int) and 1 <= difficulty_rating <= 5):
        raise AuthoringError("difficulty_rating must be int 1..5")

    encounter: Dict[str, Any] = {
        "encounter_id": encounter_id,
        "name": name,
        "biome_id": biome_id,
        "grid_size": grid_size,
        "difficulty_rating": difficulty_rating,
        "objective": {"type": objective_type},
        "player_spawn": player_spawn,
        "waves": waves_out,
    }

    estimated_turns = inputs.get("estimated_turns")
    if estimated_turns is not None:
        if not (isinstance(estimated_turns, int) and estimated_turns >= 1):
            raise AuthoringError("estimated_turns must be int >= 1")
        encounter["estimated_turns"] = estimated_turns

    tags = inputs.get("tags")
    if tags:
        if not (isinstance(tags, list)
                and all(isinstance(t, str) and t in TAG_ENUM for t in tags)):
            raise AuthoringError(f"tags must be list of values in {TAG_ENUM}")
        encounter["tags"] = list(dict.fromkeys(tags))  # dedupe preserving order

    return encounter


def dump_encounter_yaml(encounter: Dict[str, Any], path: Path) -> None:
    """Write encounter dict to YAML file (no I/O in build step)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(encounter, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )


def _prompt(
    question: str,
    default: Optional[str] = None,
    reader: Callable[[], str] = input,
    writer: Callable[[str], int] = sys.stdout.write,
) -> str:
    hint = f" [{default}]" if default else ""
    writer(f"{question}{hint}: ")
    if writer is sys.stdout.write:
        sys.stdout.flush()
    raw = reader().strip()
    return raw if raw else (default or "")


def _prompt_int(question: str, default: int, reader, writer) -> int:
    while True:
        raw = _prompt(question, str(default), reader, writer)
        try:
            return int(raw)
        except ValueError:
            writer(f"  ! Not an integer: {raw!r}\n")


def _prompt_list_ints(question: str, default: str, reader, writer) -> List[int]:
    raw = _prompt(question, default, reader, writer)
    return [int(p.strip()) for p in raw.split(",") if p.strip()]


def _prompt_xy_list(question: str, default: str, reader, writer) -> List[List[int]]:
    """Parse 'x1,y1; x2,y2' -> [[x1,y1],[x2,y2]]."""
    raw = _prompt(question, default, reader, writer)
    pairs = []
    for chunk in raw.split(";"):
        chunk = chunk.strip()
        if not chunk:
            continue
        parts = [p.strip() for p in chunk.split(",") if p.strip()]
        if len(parts) != 2:
            raise AuthoringError(f"invalid xy pair {chunk!r}; expected 'x,y'")
        pairs.append([int(parts[0]), int(parts[1])])
    return pairs


def run_interactive(
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    reader: Callable[[], str] = input,
    writer: Callable[[str], int] = sys.stdout.write,
) -> Path:
    """Interactive loop. Returns path to written YAML."""
    writer("=== Evo-Tactics Encounter Authoring ===\n")
    writer(f"Output dir: {output_dir}\n")
    writer(f"Schema:     {SCHEMA_PATH}\n\n")

    inputs: Dict[str, Any] = {}
    inputs["encounter_id"] = _prompt(
        "encounter_id (enc_<slug>)", "enc_new_01", reader, writer
    )
    inputs["name"] = _prompt("name (Italian display)", "Nuovo Incontro", reader, writer)
    inputs["biome_id"] = _prompt("biome_id", "savana", reader, writer)
    inputs["grid_size"] = _prompt_list_ints(
        "grid_size (w,h)", "8,8", reader, writer
    )
    writer(f"objective_type options: {', '.join(OBJECTIVE_TYPES)}\n")
    inputs["objective_type"] = _prompt(
        "objective_type", "elimination", reader, writer
    )
    inputs["player_spawn"] = _prompt_xy_list(
        "player_spawn ('x1,y1; x2,y2')", "0,3; 0,4", reader, writer
    )
    inputs["difficulty_rating"] = _prompt_int(
        "difficulty_rating (1-5)", 1, reader, writer
    )

    num_waves = _prompt_int("how many waves?", 1, reader, writer)
    waves: List[Dict[str, Any]] = []
    for w_idx in range(num_waves):
        writer(f"\n-- Wave {w_idx + 1} --\n")
        turn_trigger = _prompt_int(
            f"  wave {w_idx + 1} turn_trigger", 0 if w_idx == 0 else 3,
            reader, writer,
        )
        spawn_points = _prompt_xy_list(
            f"  wave {w_idx + 1} spawn_points ('x1,y1; ...')",
            "7,3; 7,5", reader, writer,
        )
        num_units = _prompt_int(
            f"  wave {w_idx + 1} how many unit entries?", 1, reader, writer,
        )
        units = []
        for u_idx in range(num_units):
            species = _prompt(
                f"    unit {u_idx + 1} species", "predoni_nomadi", reader, writer,
            )
            count = _prompt_int(
                f"    unit {u_idx + 1} count", 2, reader, writer,
            )
            tier = _prompt(
                f"    unit {u_idx + 1} tier (base/elite/apex, optional)",
                "base", reader, writer,
            )
            unit: Dict[str, Any] = {"species": species, "count": count}
            if tier:
                unit["tier"] = tier
            units.append(unit)
        waves.append({
            "wave_id": w_idx + 1,
            "turn_trigger": turn_trigger,
            "spawn_points": spawn_points,
            "units": units,
        })
    inputs["waves"] = waves

    tags_raw = _prompt(
        f"tags (comma-separated, from {TAG_ENUM})", "", reader, writer,
    )
    if tags_raw:
        inputs["tags"] = [t.strip() for t in tags_raw.split(",") if t.strip()]

    encounter = build_encounter(inputs)
    path = output_dir / f"{encounter['encounter_id']}.yaml"
    dump_encounter_yaml(encounter, path)
    writer(f"\n[ok] wrote {path}\n")
    writer("[info] run 'node --test tests/scripts/encounterSchema.test.js' "
           "to validate against AJV schema.\n")
    return path
