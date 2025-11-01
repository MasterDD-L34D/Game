from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "build_trait_index.js"


def _write_trait(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _base_trait_payload() -> dict:
    return {
        "id": "valid_trait",
        "label": "i18n:traits.valid_trait.label",
        "famiglia_tipologia": "Supporto/Logistico",
        "fattore_mantenimento_energetico": "i18n:traits.valid_trait.fattore",
        "tier": "T1",
        "slot": [],
        "sinergie": [],
        "conflitti": [],
        "mutazione_indotta": "i18n:traits.valid_trait.mutazione",
        "uso_funzione": "i18n:traits.valid_trait.uso",
        "spinta_selettiva": "i18n:traits.valid_trait.spinta",
        "metrics": [
            {
                "name": "Output",
                "value": 1,
                "unit": "1",
            }
        ],
        "species_affinity": [
            {
                "species_id": "spec-alpha",
                "roles": ["core"],
                "weight": 1,
            }
        ],
        "applicability": {
            "envo_terms": ["http://purl.obolibrary.org/obo/ENVO_01000000"],
        },
        "data_origin": "pack",
        "usage_tags": ["core"],
        "biome_tags": ["savanna"],
        "completion_flags": {"has_biome": True},
    }


@pytest.mark.skipif(not SCRIPT.exists(), reason="build_trait_index.js non disponibile")
def test_build_trait_index_valid_dataset(tmp_path: Path) -> None:
    traits_dir = tmp_path / "traits"
    traits_dir.mkdir()
    trait_path = traits_dir / "valid_trait.json"
    _write_trait(trait_path, _base_trait_payload())

    output_path = tmp_path / "index.json"
    result = subprocess.run(
        [
            "node",
            str(SCRIPT),
            "--traits-dir",
            str(traits_dir),
            "--output",
            str(output_path),
            "--format",
            "json",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    payload = json.loads(output_path.read_text(encoding="utf-8"))
    assert payload["total"] == 1
    assert payload["traits"][0]["id"] == "valid_trait"


@pytest.mark.skipif(not SCRIPT.exists(), reason="build_trait_index.js non disponibile")
def test_build_trait_index_reports_invalid_label(tmp_path: Path) -> None:
    traits_dir = tmp_path / "traits"
    traits_dir.mkdir()
    trait_path = traits_dir / "invalid_trait.json"
    payload = _base_trait_payload()
    payload["id"] = "invalid_trait"
    payload["label"] = " invalid"
    _write_trait(trait_path, payload)

    output_path = tmp_path / "index.json"
    result = subprocess.run(
        [
            "node",
            str(SCRIPT),
            "--traits-dir",
            str(traits_dir),
            "--output",
            str(output_path),
            "--format",
            "json",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "label" in result.stderr
