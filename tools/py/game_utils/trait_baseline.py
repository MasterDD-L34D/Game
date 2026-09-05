"""Funzioni per derivare un set base di tratti dalle regole ambientali."""

from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, MutableMapping
from dataclasses import dataclass
from pathlib import Path

import json
import unicodedata

try:  # pragma: no cover - fallback se PyYAML non è disponibile
    import yaml
except ModuleNotFoundError:  # pragma: no cover - compatibilità ambienti minimi
    yaml = None


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _load_json(path: Path) -> Mapping:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _load_structured(path: Path) -> Mapping:
    """Carica file JSON o YAML restituendo un mapping."""

    suffix = path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        if yaml is None:
            raise RuntimeError(
                f"Impossibile caricare {path}: PyYAML non è disponibile nell'ambiente."
            )
        with path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
    else:
        data = _load_json(path)
    if not isinstance(data, Mapping):
        raise ValueError(f"Il file {path} non contiene un mapping JSON/YAML valido")
    return data


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
    label_en: str | None
    description_it: str | None
    description_en: str | None
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
            "label_en": self.label_en,
            "description_it": self.description_it,
            "description_en": self.description_en,
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


def _resolve_glossary_path(
    hint: str | Path | None,
    env_traits_path: Path,
    trait_reference_path: Path,
) -> Path | None:
    if not hint:
        return None

    candidate = Path(hint)
    if candidate.is_absolute() and candidate.exists():
        return candidate

    anchors = [
        env_traits_path.parent,
        trait_reference_path.parent,
        PROJECT_ROOT,
    ]
    for anchor in anchors:
        resolved = (anchor / candidate).resolve()
        if resolved.exists():
            return resolved

    return candidate.resolve()


def derive_trait_baseline(
    env_traits_path: Path,
    trait_reference_path: Path,
    trait_glossary_path: Path | None = None,
) -> dict:
    """Costruisce il dataset base dei tratti a partire dalle regole ambientali."""

    if trait_glossary_path and not isinstance(trait_glossary_path, Path):
        trait_glossary_path = Path(trait_glossary_path)

    env_data = _load_json(env_traits_path)
    trait_data = _load_json(trait_reference_path)

    if trait_glossary_path is None:
        trait_glossary_path = _resolve_glossary_path(
            env_data.get("trait_glossary")
            or trait_data.get("trait_glossary"),
            env_traits_path,
            trait_reference_path,
        )

    glossary: Mapping[str, Mapping] = {}
    if trait_glossary_path:
        resolved_glossary = trait_glossary_path if trait_glossary_path.exists() else None
        if resolved_glossary is None:
            candidate = _resolve_glossary_path(
                trait_glossary_path,
                env_traits_path,
                trait_reference_path,
            )
            if candidate and candidate.exists():
                resolved_glossary = candidate
        if resolved_glossary and resolved_glossary.exists():
            glossary = _load_structured(resolved_glossary).get("traits", {})
            trait_glossary_path = resolved_glossary
        else:
            trait_glossary_path = None

    env_rules = env_data.get("rules", [])
    trait_reference = trait_data.get("traits", {})

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
        glossary_entry = glossary.get(trait_id) or {}
        label_en = glossary_entry.get("label_en") if isinstance(glossary_entry, Mapping) else None
        label = label or (glossary_entry.get("label_it") if isinstance(glossary_entry, Mapping) else None)
        description_it = (
            glossary_entry.get("description_it") if isinstance(glossary_entry, Mapping) else None
        )
        description_en = (
            glossary_entry.get("description_en") if isinstance(glossary_entry, Mapping) else None
        )
        entry = TraitEntry(
            id=trait_id,
            occurrences=count,
            archetype=archetype,
            label=label,
            label_en=label_en,
            description_it=description_it,
            description_en=description_en,
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
            "trait_glossary": str(trait_glossary_path) if trait_glossary_path else None,
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

