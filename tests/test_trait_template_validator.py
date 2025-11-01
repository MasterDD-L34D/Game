from __future__ import annotations

import json
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
    assert "[TRAIT] artigli_sette_vie: OK" in result.stdout
    assert "[TRAIT] propriocezione: OK" not in result.stdout  # legacy dataset non include il nuovo esempio


def test_validator_summary_lists_expected_keys() -> None:
    result = run_validator("--summary")
    assert result.returncode == 0, result.stderr
    assert "== Summary of fields" in result.stdout
    for expected in ("label", "sinergie", "sinergie_pi"):
        assert f" - {expected}" in result.stdout
    assert "Total traits: 174" in result.stdout


def _write_minimal_dataset(tmp_path: Path, trait_payload: dict) -> tuple[Path, Path]:
    traits_dir = tmp_path / "traits"
    traits_dir.mkdir()
    trait_path = traits_dir / f"{trait_payload['id']}.json"
    trait_path.write_text(json.dumps(trait_payload, indent=2), encoding="utf-8")

    index_payload = {"traits": {trait_payload["id"]: trait_payload}}
    index_path = tmp_path / "index.json"
    index_path.write_text(json.dumps(index_payload, indent=2), encoding="utf-8")
    return traits_dir, index_path


def test_validator_reports_invalid_ucum_unit(tmp_path: Path) -> None:
    trait_payload = {
        "id": "minimal_trait",
        "label": "i18n:traits.minimal_trait.label",
        "famiglia_tipologia": "Supporto/Logistico",
        "fattore_mantenimento_energetico": "i18n:traits.minimal_trait.fattore",
        "tier": "T1",
        "slot": [],
        "sinergie": [],
        "conflitti": [],
        "mutazione_indotta": "i18n:traits.minimal_trait.mutazione",
        "uso_funzione": "i18n:traits.minimal_trait.uso",
        "spinta_selettiva": "i18n:traits.minimal_trait.spinta",
        "metrics": [
            {
                "name": " Output ",
                "value": 1,
                "unit": "invalid$unit",
            }
        ],
    }
    traits_dir, index_path = _write_minimal_dataset(tmp_path, trait_payload)

    result = run_validator(
        "--traits-dir",
        str(traits_dir),
        "--index",
        str(index_path),
        "--schema",
        str(PROJECT_ROOT / "config" / "schemas" / "trait.schema.json"),
    )

    assert result.returncode != 0
    assert "metrics/0/name" in result.stderr or "metrics/0/unit" in result.stderr
