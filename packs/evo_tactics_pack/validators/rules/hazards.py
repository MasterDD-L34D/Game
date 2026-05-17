from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .base import ValidationMessage


@dataclass(frozen=True)
class HazardRegistry:
    entries: Mapping[str, Mapping[str, Any]]

    def has(self, hazard_id: str | None) -> bool:
        if not hazard_id:
            return False
        return hazard_id in self.entries


@dataclass(frozen=True)
class BiomeHazardRules:
    expected: Mapping[str, Sequence[Mapping[str, Any]]]


def build_hazard_registry(registry_payload: Mapping[str, Any]) -> HazardRegistry:
    entries: dict[str, Mapping[str, Any]] = {}
    hazards = registry_payload.get("hazards") if isinstance(registry_payload, Mapping) else None
    if isinstance(hazards, Sequence):
        for entry in hazards:
            if isinstance(entry, Mapping):
                hazard_id = entry.get("id")
                if isinstance(hazard_id, str):
                    entries[hazard_id] = entry
    return HazardRegistry(entries=entries)


def build_biome_hazard_rules(config_payload: Mapping[str, Any]) -> BiomeHazardRules:
    biome_hazards = config_payload.get("biome_hazards") if isinstance(config_payload, Mapping) else {}
    result: dict[str, Sequence[Mapping[str, Any]]] = {}
    if isinstance(biome_hazards, Mapping):
        for biome_id, items in biome_hazards.items():
            if isinstance(items, Sequence):
                filtered = [entry for entry in items if isinstance(entry, Mapping)]
                result[str(biome_id)] = filtered
    return BiomeHazardRules(expected=result)


def validate_biome_document(
    biome: Mapping[str, Any],
    *,
    hazard_registry: HazardRegistry,
    hazard_rules: BiomeHazardRules,
) -> list[ValidationMessage]:
    messages: list[ValidationMessage] = []
    biome_id = str((biome.get("links") or {}).get("biome_id") or biome.get("id") or "unknown")

    required_sections = ("receipt", "ecosistema", "links", "registries")
    for section in required_sections:
        if section not in biome:
            messages.append(
                ValidationMessage(
                    level="error",
                    code=f"biome.missing.{section}",
                    message=f"Sezione obbligatoria '{section}' mancante",
                    subject=biome_id,
                )
            )

    hazard_block = biome.get("hazard") or biome.get("hazards")
    if isinstance(hazard_block, Mapping):
        hazard_id = hazard_block.get("id")
        if hazard_id and not hazard_registry.has(str(hazard_id)):
            messages.append(
                ValidationMessage(
                    level="warning",
                    code="biome.hazard.unknown",
                    message=f"Hazard '{hazard_id}' non presente nelle registry",
                    subject=biome_id,
                )
            )

    expected = hazard_rules.expected.get(biome_id, ())
    if expected:
        registry_ids = {hazard_id for hazard_id in hazard_registry.entries.keys()}
        for entry in expected:
            hazard_id = entry.get("id") if isinstance(entry, Mapping) else None
            if hazard_id and hazard_id not in registry_ids:
                messages.append(
                    ValidationMessage(
                        level="warning",
                        code="biome.hazard.registry_missing",
                        message=f"Hazard '{hazard_id}' atteso da config ma non trovato nelle registry",
                        subject=biome_id,
                    )
                )
    return messages


def ensure_biome_defaults(
    biome: Mapping[str, Any],
    *,
    hazard_registry: HazardRegistry,
    default_hazard: str | None = None,
) -> tuple[dict[str, Any], list[ValidationMessage]]:
    payload: dict[str, Any] = {**biome}
    messages: list[ValidationMessage] = []

    if "manifest" not in payload:
        payload["manifest"] = {"generated": True}
        messages.append(
            ValidationMessage(
                level="info",
                code="biome.manifest.generated",
                message="manifest assente: creato blocco minimale",
                subject=str(payload.get("id") or "unknown"),
            )
        )

    hazard_block = payload.get("hazard")
    if not isinstance(hazard_block, Mapping):
        if default_hazard and hazard_registry.has(default_hazard):
            payload["hazard"] = {"id": default_hazard}
            messages.append(
                ValidationMessage(
                    level="info",
                    code="biome.hazard.defaulted",
                    message=f"hazard mancante: impostato '{default_hazard}'",
                    subject=str(payload.get("id") or "unknown"),
                )
            )
    else:
        hazard_id = hazard_block.get("id")
        if hazard_id and not hazard_registry.has(str(hazard_id)) and default_hazard and hazard_registry.has(default_hazard):
            payload["hazard"] = {"id": default_hazard}
            messages.append(
                ValidationMessage(
                    level="info",
                    code="biome.hazard.corrected",
                    message=f"hazard sconosciuto sostituito con '{default_hazard}'",
                    subject=str(payload.get("id") or "unknown"),
                )
            )

    return payload, messages
