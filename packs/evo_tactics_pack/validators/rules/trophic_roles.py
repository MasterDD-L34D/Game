from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, MutableMapping, Sequence

from .base import ValidationMessage

REQUIRED_FIELDS = (
    "schema_version",
    "receipt",
    "id",
    "display_name",
    "biomes",
    "role_trofico",
    "functional_tags",
    "vc",
    "playable_unit",
    "spawn_rules",
    "balance",
)

ROLE_ALIASES = {
    "predatore_apice": "predatore_terziario_apex",
    "specie_chiave": "ingegneri_ecosistema",
    "specie_ponte": "dispersore_ponte",
    "minaccia_dinamica": "minaccia_microbica",
    "evento_dinamico": "evento_ecologico",
}

DEFAULT_ROLE = "evento_ecologico"
DEFAULT_ENCOUNTER_ROLE = "minion"
DEFAULT_DENSITY = "moderata"


@dataclass(frozen=True)
class SpeciesRegistry:
    allowed_roles: frozenset[str]
    known_morphotypes: frozenset[str]
    default_role: str = DEFAULT_ROLE


def load_species_registry(registries: Mapping[str, Any]) -> SpeciesRegistry:
    roles = registries.get("trophic_roles") or registries.get("roles")
    morphotypes = registries.get("morphotypes") or {}
    if isinstance(roles, Mapping):
        allowed_roles = roles.get("roles_enum", [])
    elif isinstance(roles, Sequence):
        allowed_roles = roles
    else:
        allowed_roles = []
    morphotype_keys: Iterable[str]
    if isinstance(morphotypes, Mapping):
        morphotype_keys = morphotypes.get("types", {}).keys()
    else:
        morphotype_keys = []
    return SpeciesRegistry(
        allowed_roles=frozenset(str(item) for item in allowed_roles if item),
        known_morphotypes=frozenset(str(item) for item in morphotype_keys if item),
    )


def normalise_role(value: str | None, registry: SpeciesRegistry) -> str:
    if not value:
        return registry.default_role
    if value in registry.allowed_roles:
        return value
    base = str(value)
    if "_" in base:
        candidate = base.split("_")[0]
        if candidate in registry.allowed_roles:
            return candidate
    alias = ROLE_ALIASES.get(base)
    if alias and alias in registry.allowed_roles:
        return alias
    for alias_key, canonical in ROLE_ALIASES.items():
        if base.startswith(alias_key) and canonical in registry.allowed_roles:
            return canonical
    if base.endswith("_apex") and "predatore_terziario_apex" in registry.allowed_roles:
        return "predatore_terziario_apex"
    return registry.default_role if registry.default_role in registry.allowed_roles else (
        next(iter(registry.allowed_roles), DEFAULT_ROLE)
    )


def _require_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]


def ensure_species_defaults(
    species: Mapping[str, Any],
    registry: SpeciesRegistry,
    *,
    biome_id: str | None = None,
) -> tuple[dict[str, Any], list[ValidationMessage]]:
    payload: dict[str, Any] = {**species}
    messages: list[ValidationMessage] = []

    if not payload.get("schema_version"):
        payload["schema_version"] = "1.7"
        messages.append(
            ValidationMessage(
                level="info",
                code="species.schema_version.defaulted",
                message="schema_version mancante: impostato a 1.7",
                subject=str(payload.get("id") or "unknown"),
            )
        )

    if "receipt" not in payload or not isinstance(payload["receipt"], Mapping):
        payload["receipt"] = {"source": "runtime-generator"}
        messages.append(
            ValidationMessage(
                level="info",
                code="species.receipt.defaulted",
                message="receipt mancante: impostato a sorgente runtime-generator",
                subject=str(payload.get("id") or "unknown"),
            )
        )

    biomes = _require_list(payload.get("biomes"))
    if biome_id and biome_id not in biomes:
        biomes.append(biome_id)
    payload["biomes"] = biomes

    payload["functional_tags"] = list(dict.fromkeys(_require_list(payload.get("functional_tags"))))

    role = normalise_role(payload.get("role_trofico"), registry)
    if role != payload.get("role_trofico"):
        messages.append(
            ValidationMessage(
                level="info",
                code="species.role.normalized",
                message=f"role_trofico normalizzato a '{role}'",
                subject=str(payload.get("id") or "unknown"),
                context={"previous": payload.get("role_trofico")},
            )
        )
        payload["role_trofico"] = role

    morphotype = payload.get("morphotype")
    if morphotype and morphotype not in registry.known_morphotypes:
        messages.append(
            ValidationMessage(
                level="warning",
                code="species.morphotype.unknown",
                message=f"morphotype '{morphotype}' non presente nelle registry",
                subject=str(payload.get("id") or "unknown"),
            )
        )

    spawn_rules = payload.get("spawn_rules")
    if not isinstance(spawn_rules, MutableMapping):
        spawn_rules = {}
    if not spawn_rules.get("densita"):
        spawn_rules["densita"] = DEFAULT_DENSITY
        messages.append(
            ValidationMessage(
                level="info",
                code="species.spawn_rules.density",
                message=f"densita default impostata a {DEFAULT_DENSITY}",
                subject=str(payload.get("id") or "unknown"),
            )
        )
    payload["spawn_rules"] = dict(spawn_rules)

    balance = payload.get("balance")
    if not isinstance(balance, MutableMapping):
        balance = {}
    if not balance.get("encounter_role"):
        balance["encounter_role"] = DEFAULT_ENCOUNTER_ROLE
        messages.append(
            ValidationMessage(
                level="info",
                code="species.balance.encounter_role",
                message=f"encounter_role default impostato a {DEFAULT_ENCOUNTER_ROLE}",
                subject=str(payload.get("id") or "unknown"),
            )
        )
    payload["balance"] = dict(balance)

    if "vc" not in payload or not isinstance(payload["vc"], Mapping):
        payload["vc"] = {}

    if "playable_unit" not in payload:
        payload["playable_unit"] = False

    return payload, messages


def validate_species_document(
    species: Mapping[str, Any],
    registry: SpeciesRegistry,
) -> list[ValidationMessage]:
    messages: list[ValidationMessage] = []
    sid = str(species.get("id") or "unknown")

    for field in REQUIRED_FIELDS:
        if field not in species:
            messages.append(
                ValidationMessage(
                    level="error",
                    code=f"species.missing.{field}",
                    message=f"Campo obbligatorio '{field}' mancante",
                    subject=sid,
                )
            )

    role = species.get("role_trofico")
    if role and role not in registry.allowed_roles:
        messages.append(
            ValidationMessage(
                level="warning",
                code="species.role.unknown",
                message=f"role_trofico '{role}' non è nella registry",
                subject=sid,
            )
        )

    morphotype = species.get("morphotype")
    if morphotype and morphotype not in registry.known_morphotypes:
        messages.append(
            ValidationMessage(
                level="warning",
                code="species.morphotype.unknown",
                message=f"morphotype '{morphotype}' non è definito nelle registry",
                subject=sid,
            )
        )

    spawn_rules = species.get("spawn_rules")
    densita = spawn_rules.get("densita") if isinstance(spawn_rules, Mapping) else None
    if not densita:
        messages.append(
            ValidationMessage(
                level="error",
                code="species.spawn_rules.densita",
                message="spawn_rules.densita mancante",
                subject=sid,
            )
        )

    balance = species.get("balance")
    encounter_role = balance.get("encounter_role") if isinstance(balance, Mapping) else None
    if not encounter_role:
        messages.append(
            ValidationMessage(
                level="error",
                code="species.balance.encounter_role",
                message="balance.encounter_role mancante",
                subject=sid,
            )
        )

    if "environment_affinity" not in species:
        messages.append(
            ValidationMessage(
                level="warning",
                code="species.environment_affinity.missing",
                message="environment_affinity non presente",
                subject=sid,
            )
        )
    if "derived_from_environment" not in species:
        messages.append(
            ValidationMessage(
                level="warning",
                code="species.derived_from_environment.missing",
                message="derived_from_environment non presente",
                subject=sid,
            )
        )

    return messages
