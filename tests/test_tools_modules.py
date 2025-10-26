"""Verifiche di wiring per gli script Python sotto ``tools/py``."""

from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path
from typing import Any

import pytest

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
        "validate-ecosystem-pack",
        "investigate",
    }


def test_game_cli_normalizes_shorthand_ecosystem_command() -> None:
    module = _import("game_cli")
    normalized = module._normalize_argv(["validate-ecosystem", "--json-out", "report.json"])
    assert normalized[0] == "validate-ecosystem-pack"
    assert normalized[1:] == ["--json-out", "report.json"]


def test_game_cli_parser_accepts_profile() -> None:
    module = _import("game_cli")
    parser = module.build_parser()
    args = parser.parse_args(["--profile", "playtest", "validate-datasets"])
    assert args.profile == "playtest"
    assert args.command == "validate-datasets"


def test_game_cli_load_profile_and_apply(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    module = _import("game_cli")
    profiles_dir = tmp_path / "cli"
    profiles_dir.mkdir()
    profile_path = profiles_dir / "demo.yaml"
    profile_path.write_text(
        """
name: demo
env:
  DEMO_FLAG: enabled
  DEMO_COUNT: 3
notes: valore di test
        """.strip()
    )
    monkeypatch.setenv(module.CLI_PROFILES_ENV_VAR, str(profiles_dir))
    monkeypatch.delenv("DEMO_FLAG", raising=False)
    monkeypatch.delenv("DEMO_COUNT", raising=False)

    profile = module.load_profile("demo")
    assert profile.name == "demo"
    assert profile.path == profile_path
    assert profile.env == {"DEMO_FLAG": "enabled", "DEMO_COUNT": "3"}
    assert profile.metadata["name"] == "demo"
    assert profile.metadata.get("notes") == "valore di test"

    module.apply_profile(profile)
    assert os.environ["DEMO_FLAG"] == "enabled"
    assert os.environ["DEMO_COUNT"] == "3"


def test_game_cli_missing_profile_raises(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    module = _import("game_cli")
    profiles_dir = tmp_path / "cli"
    profiles_dir.mkdir()
    monkeypatch.setenv(module.CLI_PROFILES_ENV_VAR, str(profiles_dir))

    with pytest.raises(module.ProfileError):
        module.load_profile("absent")


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

