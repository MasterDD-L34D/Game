#!/usr/bin/env python3
"""Esporta l'elenco trait e genera statistiche di tassonomia."""

from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = REPO_ROOT / "data" / "traits" / "index.json"
OUTPUT_CSV = REPO_ROOT / "reports" / "trait_index_export.csv"
OUTPUT_JSON = REPO_ROOT / "reports" / "trait_index_summary.json"


def _safe_split(value: str, sep: str = "/") -> Tuple[str, str]:
    if not value:
        return "", ""
    if sep not in value:
        return value.strip(), ""
    head, tail = value.split(sep, 1)
    return head.strip(), tail.strip()


def main() -> None:
    data = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    traits: Dict[str, Dict[str, object]] = data.get("traits", {})

    fieldnames = [
        "id",
        "label",
        "famiglia_macro",
        "famiglia_micro",
        "tier",
        "slot_core",
        "slot_complementare",
        "slot_codes",
        "biomi",
        "fonti_ambientali",
        "expansion",
    ]

    macro_counter: Counter[str] = Counter()
    micro_counter: Counter[str] = Counter()
    core_counter: Counter[str] = Counter()
    complement_counter: Counter[str] = Counter()
    biome_counter: Counter[str] = Counter()
    expansion_counter: Counter[str] = Counter()
    expansion_by_trait: Dict[str, List[str]] = {}
    biome_by_trait: Dict[str, List[str]] = {}

    sorted_items = sorted(traits.items(), key=lambda item: item[1].get("label", ""))

    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for trait_id, trait_data in sorted_items:
            label = str(trait_data.get("label", "")).strip()
            famiglia = str(trait_data.get("famiglia_tipologia", ""))
            famiglia_macro, famiglia_micro = _safe_split(famiglia)
            tier = str(trait_data.get("tier", "")).strip()
            slot_profile = trait_data.get("slot_profile", {}) or {}
            slot_core = str(slot_profile.get("core", "")).strip()
            slot_complementare = str(slot_profile.get("complementare", "")).strip()
            slot_codes = trait_data.get("slot", []) or []

            macro_counter[famiglia_macro] += 1
            if famiglia_micro:
                micro_counter[famiglia_micro] += 1
            if slot_core:
                core_counter[slot_core] += 1
            if slot_complementare:
                complement_counter[slot_complementare] += 1

            biomes: Counter[str] = Counter()
            expansions: Counter[str] = Counter()
            sources: Counter[str] = Counter()

            for requisito in trait_data.get("requisiti_ambientali", []) or []:
                cond = requisito.get("condizioni", {}) or {}
                biome = cond.get("biome_class")
                if biome:
                    biome_counter[str(biome)] += 1
                    biomes[str(biome)] += 1
                fonte = requisito.get("fonte")
                if fonte:
                    sources[str(fonte)] += 1
                meta = requisito.get("meta", {}) or {}
                expansion = meta.get("expansion")
                if expansion:
                    expansion_counter[str(expansion)] += 1
                    expansions[str(expansion)] += 1

            biome_by_trait[trait_id] = sorted(biomes)
            expansion_by_trait[trait_id] = sorted(expansions)

            writer.writerow(
                {
                    "id": trait_id,
                    "label": label,
                    "famiglia_macro": famiglia_macro,
                    "famiglia_micro": famiglia_micro,
                    "tier": tier,
                    "slot_core": slot_core,
                    "slot_complementare": slot_complementare,
                    "slot_codes": " ".join(slot_codes),
                    "biomi": ";".join(sorted(biomes)),
                    "fonti_ambientali": ";".join(sorted(sources)),
                    "expansion": ";".join(sorted(expansions)),
                }
            )

    summary = {
        "total_traits": len(traits),
        "famiglia_macro": macro_counter.most_common(),
        "famiglia_micro": micro_counter.most_common(),
        "slot_core": core_counter.most_common(),
        "slot_complementare": complement_counter.most_common(),
        "biomi": biome_counter.most_common(),
        "expansion": expansion_counter.most_common(),
        "traits_senza_biomi": sorted(
            trait_id for trait_id, biomes in biome_by_trait.items() if not biomes
        ),
        "traits_senza_expansion": sorted(
            trait_id for trait_id, expansions in expansion_by_trait.items() if not expansions
        ),
    }

    OUTPUT_JSON.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
