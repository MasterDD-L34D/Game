"""Funzioni per derivare un set base di tratti dalle regole ambientali."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping, MutableMapping

import json
import unicodedata


def _load_json(path: Path) -> Mapping:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _ensure_list(value: Iterable | None) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return stripped


def _resolve_archetype(famiglia_tipologia: str | None) -> str:
    if not famiglia_tipologia:
        return "non_classificato"

    primary = famiglia_tipologia.split("/")[0].strip()
    primary_norm = _normalize_text(primary).lower()

    archetype_map = {
        "circolatorio": "sopravvivenza",
        "digestivo": "metabolismo",
        "escretorio": "metabolismo",
        "esplorazione": "esplorazione",
        "flessibile": "adattivo",
        "idrostatico": "locomozione",
        "locomotorio": "locomozione",
        "metabolico": "metabolismo",
        "mobilita": "locomozione",
        "nervoso": "sensoriale",
        "offensivo": "offensiva",
        "respiratorio": "sopravvivenza",
        "riproduttivo": "supporto",
        "sensoriale": "sensoriale",
        "strategico": "strategia",
        "strutturale": "struttura",
        "supporto": "supporto",
        "tattico": "controllo",
        "tegumentario": "difesa",
    }

    return archetype_map.get(primary_norm, primary_norm)


@dataclass(frozen=True)
class TraitEntry:
    """Rappresenta una singola riga del set base di tratti."""

    id: str
    occurrences: int
    archetype: str
    label: str | None
    tier: str | None
    famiglia_tipologia: str | None
    fattore_mantenimento: str | None
    sinergie: tuple[str, ...]
    conflitti: tuple[str, ...]
    biomes: Mapping[str, int]
    missing_metadata: bool

    def to_payload(self) -> dict:
        return {
            "label": self.label,
            "tier": self.tier,
            "archetype": self.archetype,
            "occurrences": self.occurrences,
            "famiglia_tipologia": self.famiglia_tipologia,
            "fattore_mantenimento_energetico": self.fattore_mantenimento,
            "sinergie": list(self.sinergie),
            "conflitti": list(self.conflitti),
            "biomi": dict(sorted(self.biomes.items())),
            "missing_metadata": self.missing_metadata,
        }


def derive_trait_baseline(
    env_traits_path: Path,
    trait_reference_path: Path,
) -> dict:
    """Costruisce il dataset base dei tratti a partire dalle regole ambientali."""

    env_rules = _load_json(env_traits_path).get("rules", [])
    trait_reference = _load_json(trait_reference_path).get("traits", {})

    occurrences: Counter[str] = Counter()
    biome_counts: MutableMapping[str, Counter[str]] = defaultdict(Counter)

    for rule in env_rules:
        suggested = _ensure_list((rule.get("suggest") or {}).get("traits"))
        biome = (rule.get("when") or {}).get("biome_class")
        for trait in suggested:
            occurrences[trait] += 1
            if biome:
                biome_counts[trait][biome] += 1

    entries: dict[str, TraitEntry] = {}
    missing_metadata: list[str] = []

    known_ids = set(occurrences.keys()) | set(trait_reference.keys())

    for trait_id in sorted(known_ids):
        count = occurrences.get(trait_id, 0)
        reference = trait_reference.get(trait_id) or {}
        label = reference.get("label") if isinstance(reference, dict) else None
        famiglia_tipologia = reference.get("famiglia_tipologia") if isinstance(reference, dict) else None
        archetype = _resolve_archetype(famiglia_tipologia)
        tier = reference.get("tier") if isinstance(reference, dict) else None
        fattore_mantenimento = (
            reference.get("fattore_mantenimento_energetico") if isinstance(reference, dict) else None
        )
        sinergie = tuple(sorted(_ensure_list(reference.get("sinergie") if isinstance(reference, dict) else [])))
        conflitti = tuple(sorted(_ensure_list(reference.get("conflitti") if isinstance(reference, dict) else [])))
        biomes = dict(biome_counts.get(trait_id, Counter()))
        entry = TraitEntry(
            id=trait_id,
            occurrences=count,
            archetype=archetype,
            label=label,
            tier=tier,
            famiglia_tipologia=famiglia_tipologia,
            fattore_mantenimento=fattore_mantenimento,
            sinergie=sinergie,
            conflitti=conflitti,
            biomes=biomes,
            missing_metadata=not bool(reference),
        )
        entries[trait_id] = entry
        if entry.missing_metadata:
            missing_metadata.append(trait_id)

    archetypes: MutableMapping[str, list[str]] = defaultdict(list)
    for trait_id, entry in entries.items():
        archetypes[entry.archetype].append(trait_id)

    for trait_ids in archetypes.values():
        trait_ids.sort()

    payload = {
        "schema_version": "1.0",
        "source": {
            "env_traits": str(env_traits_path),
            "trait_reference": str(trait_reference_path),
        },
        "summary": {
            "total_traits": len(entries),
            "missing_metadata": len(missing_metadata),
        },
        "traits": {trait_id: entry.to_payload() for trait_id, entry in entries.items()},
        "archetypes": {
            archetype: {
                "total": len(trait_ids),
                "traits": trait_ids,
            }
            for archetype, trait_ids in sorted(archetypes.items())
        },
        "missing_metadata": sorted(missing_metadata),
    }
    return payload

