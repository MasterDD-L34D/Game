from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from packs.evo_tactics_pack.validators.rules.base import ValidationMessage, has_errors
from packs.evo_tactics_pack.validators.rules import trophic_roles, hazards, foodweb

PACK_ROOT = Path(__file__).resolve().parents[1]
REGISTRY_DIR = PACK_ROOT / "tools" / "config" / "registries"
CONFIG_PATH = PACK_ROOT / "tools" / "config" / "validator_config.yaml"


@dataclass(slots=True)
class RuntimeResources:
    species_registry: trophic_roles.SpeciesRegistry
    hazard_registry: hazards.HazardRegistry
    hazard_rules: hazards.BiomeHazardRules
    foodweb_rules: foodweb.FoodwebRules


def _load_yaml(path: Path) -> Mapping[str, Any]:
    import yaml

    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def load_resources(
    *,
    registries_dir: Path = REGISTRY_DIR,
    config_path: Path = CONFIG_PATH,
) -> RuntimeResources:
    registries_payload: dict[str, Any] = {}
    for name in ("trophic_roles", "morphotypes", "env_to_traits", "hazards"):
        candidate = registries_dir / f"{name}.yaml"
        registries_payload[name] = _load_yaml(candidate)

    cfg_payload = _load_yaml(config_path)

    return RuntimeResources(
        species_registry=trophic_roles.load_species_registry(registries_payload),
        hazard_registry=hazards.build_hazard_registry(registries_payload.get("hazards", {})),
        hazard_rules=hazards.build_biome_hazard_rules(cfg_payload),
        foodweb_rules=foodweb.build_foodweb_rules(cfg_payload),
    )


def validate_species_entries(
    entries: Iterable[Mapping[str, Any]],
    *,
    resources: RuntimeResources,
    biome_id: str | None = None,
) -> dict[str, Any]:
    corrected: list[dict[str, Any]] = []
    messages: list[ValidationMessage] = []
    discarded: list[str] = []

    for entry in entries:
        normalized, corrections = trophic_roles.ensure_species_defaults(
            entry, resources.species_registry, biome_id=biome_id
        )
        messages.extend(corrections)
        validation = trophic_roles.validate_species_document(normalized, resources.species_registry)
        if has_errors(validation):
            discarded.append(str(normalized.get("id") or "unknown"))
            messages.extend(validation)
            continue
        messages.extend(validation)
        corrected.append(normalized)

    return {
        "corrected": corrected,
        "messages": [message.to_dict() for message in messages],
        "discarded": discarded,
    }


def validate_biome_payload(
    biome: Mapping[str, Any],
    *,
    resources: RuntimeResources,
    default_hazard: str | None = None,
) -> dict[str, Any]:
    normalized, corrections = hazards.ensure_biome_defaults(
        biome, hazard_registry=resources.hazard_registry, default_hazard=default_hazard
    )
    messages = list(corrections)
    messages.extend(
        hazards.validate_biome_document(
            normalized,
            hazard_registry=resources.hazard_registry,
            hazard_rules=resources.hazard_rules,
        )
    )
    return {
        "corrected": normalized,
        "messages": [message.to_dict() for message in messages],
    }


def validate_foodweb_payload(
    foodweb_doc: Mapping[str, Any],
    *,
    resources: RuntimeResources,
) -> dict[str, Any]:
    messages = foodweb.validate_foodweb_document(foodweb_doc, resources.foodweb_rules)
    return {
        "messages": [message.to_dict() for message in messages],
    }


def _load_input_payload(path: Path | None) -> Any:
    if path is None:
        raw = sys.stdin.read()
        if not raw.strip():
            return {}
        return json.loads(raw)
    return json.loads(path.read_text(encoding="utf-8"))


def _write_output_payload(path: Path | None, payload: Mapping[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if path is None:
        sys.stdout.write(text)
        sys.stdout.write("\n")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Runtime validator entry point")
    parser.add_argument("--kind", required=True, choices=["species", "biome", "foodweb"])
    parser.add_argument("--input", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--registries-dir", type=Path, default=REGISTRY_DIR)
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    parser.add_argument("--biome-id", default=None)
    parser.add_argument("--default-hazard", default=None)
    args = parser.parse_args(argv)

    payload = _load_input_payload(args.input)
    resources = load_resources(registries_dir=args.registries_dir, config_path=args.config)

    if args.kind == "species":
        entries = payload.get("entries") if isinstance(payload, Mapping) else []
        result = validate_species_entries(entries or [], resources=resources, biome_id=args.biome_id)
    elif args.kind == "biome":
        biome = payload.get("biome") if isinstance(payload, Mapping) else {}
        result = validate_biome_payload(
            biome,
            resources=resources,
            default_hazard=args.default_hazard,
        )
    else:
        foodweb_doc = payload.get("foodweb") if isinstance(payload, Mapping) else {}
        result = validate_foodweb_payload(foodweb_doc, resources=resources)

    _write_output_payload(args.output, result)
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry
    sys.exit(main())
