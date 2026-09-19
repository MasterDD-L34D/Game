from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path


def _write_gap_report(path: Path) -> None:
    rows = [
        {
            "slug": "respiro_cosmico",
            "status": "missing_in_index",
            "external_code": "EVO-9000",
            "external_label": "Respiro Cosmico",
            "legacy_label": "",
            "external_tier": "elite",
            "legacy_tier": "",
        },
        {
            "slug": "eco_spettrale",
            "status": "missing_in_external",
            "external_code": "EVO-9001",
            "external_label": "Eco Spettrale",
            "legacy_label": "Eco Spettrale",
            "external_tier": "standard",
            "legacy_tier": "legacy",
        },
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "slug",
                "status",
                "external_code",
                "external_label",
                "legacy_label",
                "external_tier",
                "legacy_tier",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def _write_trait_payload(directory: Path, code: str, *, label: str, description: str) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    payload = {
        "trait_code": code,
        "label": label,
        "uso_funzione": description,
    }
    (directory / f"{code}.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _run_cli(*args: str, cwd: Path) -> None:
    script = Path(__file__).resolve().parents[2] / "tools" / "traits" / "sync_missing_index.py"
    command = [sys.executable, str(script), *args]
    subprocess.run(command, check=True, cwd=cwd)


def test_cli_updates_glossary_and_generates_export(tmp_path: Path) -> None:
    gap_report = tmp_path / "traits_gap.csv"
    glossary = tmp_path / "glossary.json"
    trait_dir = tmp_path / "traits"
    export = tmp_path / "traits_external_sync.csv"

    _write_gap_report(gap_report)
    _write_trait_payload(
        trait_dir,
        "EVO-9000",
        label="Respiro Cosmico",
        description="Canalizza energia stellare.",
    )
    glossary.write_text(json.dumps({"traits": {}}), encoding="utf-8")

    _run_cli(
        "--source",
        str(gap_report),
        "--dest",
        str(glossary),
        "--trait-dir",
        str(trait_dir),
        "--update-glossary",
        "--export",
        str(export),
        cwd=tmp_path,
    )

    payload = _read_json(glossary)
    traits = payload["traits"]
    assert "respiro_cosmico" in traits
    assert traits["respiro_cosmico"]["label_it"] == "Respiro Cosmico"
    assert traits["respiro_cosmico"]["description_it"] == "Canalizza energia stellare."

    with export.open("r", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert any(row["slug"] == "respiro_cosmico" and row["status"] == "missing_in_index" for row in rows)


def test_cli_dry_run_when_glossary_update_disabled(tmp_path: Path) -> None:
    gap_report = tmp_path / "traits_gap.csv"
    glossary = tmp_path / "glossary.json"
    trait_dir = tmp_path / "traits"
    export = tmp_path / "traits_external_sync.csv"

    _write_gap_report(gap_report)
    _write_trait_payload(
        trait_dir,
        "EVO-9000",
        label="Respiro Cosmico",
        description="Canalizza energia stellare.",
    )
    initial_state = {"traits": {}, "updated_at": "2000-01-01T00:00:00Z"}
    glossary.write_text(json.dumps(initial_state), encoding="utf-8")

    _run_cli(
        "--source",
        str(gap_report),
        "--dest",
        str(glossary),
        "--trait-dir",
        str(trait_dir),
        "--no-update-glossary",
        "--export",
        str(export),
        cwd=tmp_path,
    )

    payload = _read_json(glossary)
    assert payload == initial_state
    assert export.exists()
