#!/usr/bin/env python3
"""Genera un export aggregato dei trait Evo a partire dall'indice legacy."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
LEGACY_INDEX = REPO_ROOT / "data" / "traits" / "index.json"
GLOSSARY_PATH = REPO_ROOT / "data" / "core" / "traits" / "glossary.json"
EXTERNAL_DIR = REPO_ROOT / "data" / "external" / "evo" / "traits"
OUTPUT_PATH = EXTERNAL_DIR / "traits_aggregate.json"
LEGACY_DATA_ORIGINS = {"pathfinder_dataset", "controllo_psionico"}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", ascii_value).strip("_")
    return cleaned.lower()


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_external_payloads(trait_dir: Path, aggregate_name: str) -> Dict[str, Mapping[str, object]]:
    payloads: Dict[str, Mapping[str, object]] = {}
    for path in sorted(trait_dir.glob("*.json")):
        if path.name == aggregate_name:
            continue
        data = load_json(path)
        if not isinstance(data, Mapping):
            continue
        label = (data.get("label") or "").strip()
        trait_code = (data.get("trait_code") or path.stem).strip()
        slug = slugify(label or trait_code)
        payloads[slug] = data
    return payloads


def resolve_label(slug: str, payload: Mapping[str, object], glossary: Mapping[str, Mapping[str, str]]) -> str:
    if slug in glossary and isinstance(glossary[slug], Mapping):
        label_it = glossary[slug].get("label_it")
        if isinstance(label_it, str) and label_it.strip():
            return label_it.strip()
    if isinstance(payload.get("label"), str) and payload.get("label"):
        return str(payload["label"]).strip()
    if isinstance(payload.get("label"), str):
        return str(payload["label"]).strip()
    return slug


def merge_field(source: Mapping[str, object], fallback: Mapping[str, object], key: str):
    primary = source.get(key)
    if primary not in (None, ""):
        return primary
    return fallback.get(key)


def build_records() -> dict:
    legacy_index = load_json(LEGACY_INDEX)
    glossary_payload = load_json(GLOSSARY_PATH)
    legacy_traits: Mapping[str, Mapping[str, object]] = legacy_index.get("traits", {})  # type: ignore[assignment]
    glossary_traits: Mapping[str, Mapping[str, str]] = glossary_payload.get("traits", {})  # type: ignore[assignment]
    external_payloads = load_external_payloads(EXTERNAL_DIR, OUTPUT_PATH.name)

    traits: list[dict[str, object]] = []
    for slug in sorted(legacy_traits):
        legacy_payload = legacy_traits.get(slug) or {}
        existing = external_payloads.get(slug, {})
        trait_code = str(existing.get("trait_code") or slug)
        label = resolve_label(slug, existing or legacy_payload, glossary_traits)
        tier = merge_field(existing, legacy_payload, "tier")
        sinergie = merge_field(existing, legacy_payload, "sinergie") or []
        requisiti = merge_field(existing, legacy_payload, "requisiti_ambientali") or []
        versioning = merge_field(existing, legacy_payload, "versioning") or {}
        data_origin = str(legacy_payload.get("data_origin") or "").strip().lower()
        if not versioning and data_origin in LEGACY_DATA_ORIGINS:
            versioning = {"status": "legacy"}

        traits.append(
            {
                "trait_code": trait_code,
                "id": slug,
                "label": label,
                "tier": tier,
                "sinergie": sinergie,
                "requisiti_ambientali": requisiti,
                "mutazione_indotta": merge_field(existing, legacy_payload, "mutazione_indotta"),
                "uso_funzione": merge_field(existing, legacy_payload, "uso_funzione"),
                "spinta_selettiva": merge_field(existing, legacy_payload, "spinta_selettiva"),
                "famiglia_tipologia": merge_field(existing, legacy_payload, "famiglia_tipologia"),
                "fattore_mantenimento_energetico": merge_field(
                    existing, legacy_payload, "fattore_mantenimento_energetico"
                ),
                "slot": merge_field(existing, legacy_payload, "slot") or [],
                "conflitti": merge_field(existing, legacy_payload, "conflitti") or [],
                "version": merge_field(existing, legacy_payload, "version"),
                "versioning": versioning,
            }
        )

    return {"traits": traits, "source": "legacy_index"}


def main() -> None:
    export_payload = build_records()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(export_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Export aggregato generato: {OUTPUT_PATH} ({len(export_payload['traits'])} trait)")


if __name__ == "__main__":
    main()
