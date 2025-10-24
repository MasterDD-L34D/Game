"""Verifiche di wiring per gli script Python sotto ``tools/py``."""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))


def _import(name: str) -> Any:
    module = importlib.import_module(name)
    return module


def test_game_cli_exports_commands() -> None:
    module = _import("game_cli")
    parser = module.build_parser()
    subparsers_action = parser._subparsers._group_actions[0]  # type: ignore[attr-defined]
    assert subparsers_action.dest == "command"
    assert set(subparsers_action.choices.keys()) == {
        "roll-pack",
        "generate-encounter",
        "validate-datasets",
        "investigate",
    }


def test_roll_pack_module_has_entrypoints() -> None:
    module = _import("roll_pack")
    for attr in ["roll_pack", "cost_of", "pick_combo_from_table"]:
        assert hasattr(module, attr)


def test_generate_encounter_module_has_generate() -> None:
    module = _import("generate_encounter")
    assert hasattr(module, "generate")
    assert module.DEFAULT_BIOMES_PATH.name == "biomes.yaml"


def test_validate_datasets_module_imports() -> None:
    module = _import("validate_datasets")
    for attr in [
        "main",
        "validate_biomes",
        "validate_mating",
        "validate_packs",
        "validate_telemetry",
    ]:
        assert hasattr(module, attr)


def test_validate_species_module_imports() -> None:
    module = _import("validate_species")
    for attr in [
        "validate",
        "collect_catalog",
        "compute_active_synergies",
        "compute_known_counters",
    ]:
        assert hasattr(module, attr)


def test_index_repo_exports_types() -> None:
    module = _import("index_repo")
    assert hasattr(module, "RepositoryIndexer")
    assert hasattr(module, "FileEntry")

