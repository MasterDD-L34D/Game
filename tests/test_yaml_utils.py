"""Test di regressione per gli helper YAML condivisi."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

from game_utils.yaml_utils import load_yaml  # noqa: E402


def test_load_yaml_reads_existing_file(tmp_path: Path) -> None:
    sample = tmp_path / "example.yaml"
    sample.write_text("key: value\nitems:\n  - one\n  - two\n", encoding="utf-8")

    loaded = load_yaml(sample)

    assert loaded == {"key": "value", "items": ["one", "two"]}


def test_load_yaml_raises_for_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "missing.yaml"

    with pytest.raises(FileNotFoundError):
        load_yaml(missing)
