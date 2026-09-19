from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

pytest.importorskip("yaml")


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = PROJECT_ROOT / "tools" / "py" / "report_trait_coverage.py"


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_yaml(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def _prepare_dataset(
    tmp_path: Path, species_id: str, trait_overrides: dict | None = None
) -> tuple[Path, Path, Path]:
    env_path = tmp_path / "env_traits.json"
    trait_reference_path = tmp_path / "trait_reference.json"
    glossary_path = tmp_path / "trait_glossary.json"
    species_dir = tmp_path / "species"
    species_dir.mkdir()

    trait_payload = {
        "id": "valid_trait",
        "label": "Trait Valid",
        "famiglia_tipologia": "Supporto/Logistico",
        "fattore_mantenimento_energetico": "Costo",
        "tier": "T1",
        "slot": [],
        "sinergie": [],
        "conflitti": [],
        "mutazione_indotta": "Mutazione",
        "uso_funzione": "Uso",
        "spinta_selettiva": "Spinta",
        "species_affinity": [
            {"species_id": species_id, "roles": ["core"], "weight": 1}
        ],
    }

    if trait_overrides:
        trait_payload.update(trait_overrides)

    _write_json(
        trait_reference_path,
        {
            "trait_glossary": str(glossary_path),
            "traits": {"valid_trait": trait_payload},
        },
    )

    _write_json(glossary_path, {"traits": {"valid_trait": {"label_it": "Trait"}}})

    _write_json(
        env_path,
        {
            "trait_glossary": str(glossary_path),
            "rules": [
                {
                    "when": {"biome_class": "savanna"},
                    "suggest": {"traits": ["valid_trait"]},
                }
            ],
        },
    )

    _write_yaml(
        species_dir / "spec.yaml",
        """
id: spec-alpha
biomes: [savanna]
derived_from_environment:
  suggested_traits: [valid_trait]
playable_unit: true
        """.strip(),
    )

    return env_path, trait_reference_path, species_dir


def test_report_trait_coverage_valid_affinity(tmp_path: Path) -> None:
    env_path, trait_reference_path, species_dir = _prepare_dataset(tmp_path, "spec-alpha")
    output_path = tmp_path / "coverage.json"

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--env-traits",
            str(env_path),
            "--trait-reference",
            str(trait_reference_path),
            "--species-root",
            str(species_dir),
            "--out-json",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert output_path.exists()
    assert "Report coverage generato" in result.stdout


def test_report_trait_coverage_unknown_species(tmp_path: Path) -> None:
    env_path, trait_reference_path, species_dir = _prepare_dataset(tmp_path, "ghost-species")
    output_path = tmp_path / "coverage.json"

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--env-traits",
            str(env_path),
            "--trait-reference",
            str(trait_reference_path),
            "--species-root",
            str(species_dir),
            "--out-json",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 1
    assert "ghost-species" in result.stderr


@pytest.mark.skipif(not SCRIPT.exists(), reason="report_trait_coverage.py non disponibile")
def test_report_trait_coverage_invalid_ucum(tmp_path: Path) -> None:
    env_path, trait_reference_path, species_dir = _prepare_dataset(
        tmp_path,
        "spec-alpha",
        trait_overrides={
            "metrics": [
                {
                    "name": "Output",
                    "value": 1,
                    "unit": "m per s",
                }
            ]
        },
    )
    output_path = tmp_path / "coverage.json"

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--env-traits",
            str(env_path),
            "--trait-reference",
            str(trait_reference_path),
            "--species-root",
            str(species_dir),
            "--out-json",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 1
    assert "UCUM" in result.stderr


@pytest.mark.skipif(not SCRIPT.exists(), reason="report_trait_coverage.py non disponibile")
def test_report_trait_coverage_rejects_non_slug_species(tmp_path: Path) -> None:
    env_path, trait_reference_path, species_dir = _prepare_dataset(tmp_path, "Spec-Alpha")
    output_path = tmp_path / "coverage.json"

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--env-traits",
            str(env_path),
            "--trait-reference",
            str(trait_reference_path),
            "--species-root",
            str(species_dir),
            "--out-json",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 1
    assert "slug" in result.stderr
