from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[3] / "tools" / "traits" / "evaluate_internal.py"


def _write_gap_report(path: Path) -> None:
    rows = [
        {
            "slug": "risonanza_astrale",
            "status": "missing_in_index",
            "external_code": "EVO-100",
            "external_label": "Risonanza Astrale",
            "legacy_label": "",
            "external_tier": "elite",
            "legacy_tier": "",
        },
        {
            "slug": "eco_plasmatico",
            "status": "",  # trattato come pass di default
            "external_code": "EVO-101",
            "external_label": "Eco Plasmatico",
            "legacy_label": "",
            "external_tier": "standard",
            "legacy_tier": "",
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


def _write_glossary(path: Path) -> None:
    payload = {
        "traits": {
            "eco_plasmatico": {
                "label_it": "Eco Plasmatico",
                "description_it": "Eco misterioso.",
            }
        }
    }
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _run_cli(*args: str, cwd: Path) -> None:
    command = [sys.executable, str(SCRIPT_PATH), *args]
    subprocess.run(command, check=True, cwd=cwd)


def test_cli_generates_reports_with_internal_rules(tmp_path: Path) -> None:
    gap_report = tmp_path / "traits_gap.csv"
    glossary = tmp_path / "glossary.json"
    output_base = tmp_path / "internal_evaluation"

    _write_gap_report(gap_report)
    _write_glossary(glossary)

    _run_cli(
        "--gap-report",
        str(gap_report),
        "--glossary",
        str(glossary),
        "--output",
        str(output_base),
        cwd=tmp_path,
    )

    json_report = output_base.with_suffix(".json")
    csv_report = output_base.with_suffix(".csv")

    assert json_report.exists()
    assert csv_report.exists()

    data = json.loads(json_report.read_text(encoding="utf-8"))
    by_slug = {item["slug"]: item for item in data}
    assert by_slug["risonanza_astrale"]["verdict"] == "fail"
    assert any("missing_in_index" in reason for reason in by_slug["risonanza_astrale"]["reasons"])
    assert by_slug["eco_plasmatico"]["verdict"] == "review"
    assert any("Descrizione troppo corta" in reason for reason in by_slug["eco_plasmatico"]["reasons"])

    with csv_report.open("r", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert {row["slug"] for row in rows} == {"risonanza_astrale", "eco_plasmatico"}


def test_cli_applies_incoming_moderation(tmp_path: Path) -> None:
    gap_report = tmp_path / "traits_gap.csv"
    glossary = tmp_path / "glossary.json"
    output_base = tmp_path / "evaluation"
    incoming = tmp_path / "manual_review.csv"

    _write_gap_report(gap_report)
    _write_glossary(glossary)

    with incoming.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["slug", "moderation", "notes", "penalty"])
        writer.writeheader()
        writer.writerow(
            {
                "slug": "eco_plasmatico",
                "moderation": "fail",
                "notes": "Flag manuale interno",
                "penalty": "30",
            }
        )

    _run_cli(
        "--gap-report",
        str(gap_report),
        "--glossary",
        str(glossary),
        "--incoming-matrix",
        str(incoming),
        "--output",
        str(output_base),
        cwd=tmp_path,
    )

    json_report = output_base.with_suffix(".json")
    data = json.loads(json_report.read_text(encoding="utf-8"))
    by_slug = {item["slug"]: item for item in data}
    assert by_slug["eco_plasmatico"]["verdict"] == "fail"
    assert any("Flag manuale" in reason for reason in by_slug["eco_plasmatico"]["reasons"])
