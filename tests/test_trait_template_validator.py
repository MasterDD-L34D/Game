from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

pytest.importorskip("jsonschema")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = PROJECT_ROOT / "tools" / "py" / "trait_template_validator.py"


def run_validator(*args: str) -> subprocess.CompletedProcess[str]:
    cmd = [sys.executable, str(SCRIPT), *args]
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def test_validator_returns_success() -> None:
    result = run_validator()
    assert result.returncode == 0, result.stderr
    assert "[TRAIT] equilibrio_vestibolare: OK" in result.stdout
    assert "[TRAIT] propriocezione: OK" in result.stdout


def test_validator_summary_lists_expected_keys() -> None:
    result = run_validator("--summary")
    assert result.returncode == 0, result.stderr
    assert "== Summary of fields" in result.stdout
    for expected in ("trait_code", "metrics", "versioning"):
        assert f" - {expected}" in result.stdout
    assert "Total traits: 2" in result.stdout
