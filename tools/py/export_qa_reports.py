#!/usr/bin/env python3
"""Genera i report QA richiesti dalla CI."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from game_utils.trait_baseline import derive_trait_baseline

ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = ROOT / "reports"
ENV_TRAITS = ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "env_traits.json"
TRAIT_REFERENCE = ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "trait_reference.json"
TRAIT_GLOSSARY = ROOT / "data" / "core" / "traits" / "glossary.json"


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _to_repo_relative(value: str | Path) -> str:
    path = Path(value)
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def export_trait_baseline() -> dict:
    payload = derive_trait_baseline(ENV_TRAITS, TRAIT_REFERENCE, TRAIT_GLOSSARY)
    source = payload.get("source")
    if isinstance(source, dict):
        payload["source"] = {
            key: _to_repo_relative(val)
            for key, val in source.items()
        }
    out_path = REPORTS_DIR / "trait_baseline.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return payload


def export_badges(baseline: dict) -> None:
    catalog = _load_json(TRAIT_REFERENCE)
    badges = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "trait_catalog": {
            "schema_version": catalog.get("schema_version"),
            "total_traits": len(catalog.get("traits", {})),
        },
        "baseline_summary": baseline.get("summary", {}),
    }
    out_path = REPORTS_DIR / "qa_badges.json"
    out_path.write_text(
        json.dumps(badges, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    baseline = export_trait_baseline()
    export_badges(baseline)
    print("QA reports aggiornati in reports/qa_badges.json e reports/trait_baseline.json")
    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    raise SystemExit(main())
