"""Funzioni condivise per derivare tratti ambientali suggeriti."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Mapping, Sequence

import yaml


@dataclass(frozen=True)
class EnvironmentContext:
    """Informazioni ambientali estratte da un ecosistema."""

    biome_class: str | None
    koppen: Sequence[str]
    salinity: str | None
    hazards: Sequence[str]


def load_yaml(path: Path) -> Mapping:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def ensure_sequence(value: Iterable | None) -> list:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return list(value)
    return [value]


def build_environment_context(ecosystem_path: Path) -> EnvironmentContext:
    data = load_yaml(ecosystem_path)
    ecosystem = data.get("ecosistema", {})
    biome = ecosystem.get("bioma", {})
    abiotic = ecosystem.get("abiotico", {})
    climate = ecosystem.get("clima", {})
    extremes = climate.get("estremi_e_rischi", {})
    return EnvironmentContext(
        biome_class=biome.get("classe_bioma"),
        koppen=ensure_sequence(biome.get("koppen_zone", [])),
        salinity=abiotic.get("salinita"),
        hazards=ensure_sequence(extremes.get("eventi", [])),
    )


def match_rule(context: Mapping, rule: Mapping) -> bool:
    conditions = rule.get("when") or {}
    for key, expected in conditions.items():
        if key == "biome_class":
            if expected != context.get("biome_class"):
                return False
        elif key == "koppen_in":
            current = set(ensure_sequence(context.get("koppen")))
            if not current.intersection(set(ensure_sequence(expected))):
                return False
        elif key == "koppen_any":
            current = set(ensure_sequence(context.get("koppen")))
            if not current.intersection(set(ensure_sequence(expected))):
                return False
        elif key == "hazard_any":
            hazards = set(ensure_sequence(context.get("hazards_expected")))
            if hazards.isdisjoint(set(ensure_sequence(expected))):
                return False
        elif key == "morphotype":
            if expected != context.get("morphotype"):
                return False
        elif key == "salinita_in":
            if context.get("salinita") not in set(ensure_sequence(expected)):
                return False
        else:
            # Condizione non riconosciuta: ignoro per compatibilità futura.
            continue
    return True


def build_species_context(base: EnvironmentContext, morphotype: str | None) -> dict:
    return {
        "biome_class": base.biome_class,
        "koppen": list(base.koppen),
        "salinita": base.salinity,
        "hazards_expected": list(base.hazards),
        "morphotype": morphotype,
    }


def accumulate_suggestions(rule: Mapping, payload: dict) -> None:
    suggestion = rule.get("suggest") or {}
    traits = ensure_sequence(suggestion.get("traits"))
    payload["traits"].update(traits)

    effects = suggestion.get("effects") or {}
    payload["effects"].update(effects)

    payload["services_links"].update(ensure_sequence(suggestion.get("services_links")))
    payload["jobs_bias"].update(ensure_sequence(suggestion.get("jobs_bias")))

    for capability in ensure_sequence(rule.get("require_capability_any")):
        payload["required_capabilities"].add(capability)


def load_rules(registries_dir: Path) -> Sequence[Mapping]:
    """Carica la lista di regole dal registro condiviso."""

    data = load_yaml(registries_dir / "env_to_traits.yaml")
    return ensure_sequence(data.get("rules"))


def iter_species_files(species_dir: Path) -> Iterator[Path]:
    """Restituisce i file delle specie in ordine deterministico."""

    yield from sorted(path for path in species_dir.glob("*.yaml") if path.is_file())


def build_patch(
    species_id: str,
    environment: EnvironmentContext,
    payload: Mapping[str, object],
) -> Mapping:
    """Costruisce la struttura del patch pronto per il salvataggio."""

    return {
        "id": species_id,
        "environment_affinity": {
            "biome_class": environment.biome_class,
            "koppen": list(environment.koppen),
            "climate_profile": None,
            "hazards_expected": list(environment.hazards),
        },
        "derived_from_environment": {
            "suggested_traits": sorted(payload["traits"]),
            "required_capabilities": sorted(payload["required_capabilities"]),
            "services_links": sorted(payload["services_links"]),
            "jobs_bias": sorted(payload["jobs_bias"]),
            "effects": payload["effects"],
        },
    }


def write_patch(outdir: Path, species_id: str, patch: Mapping) -> Path:
    """Scrive il patch YAML su disco e restituisce il percorso creato."""

    outdir.mkdir(parents=True, exist_ok=True)
    target = outdir / f"{species_id}.patch.yaml"
    target.write_text(
        yaml.safe_dump(patch, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    return target


def derive_patch_for_species(
    species_file: Path,
    base_environment: EnvironmentContext,
    rules: Sequence[Mapping],
) -> tuple[str, Mapping]:
    """Calcola i suggerimenti da allegare a una singola specie."""

    species_data = load_yaml(species_file)
    species_id = species_data.get("id", species_file.stem)
    context = build_species_context(base_environment, species_data.get("morphotype"))

    payload = {
        "traits": set(),
        "effects": {},
        "services_links": set(),
        "jobs_bias": set(),
        "required_capabilities": set(),
    }

    for rule in rules:
        if match_rule(context, rule):
            accumulate_suggestions(rule, payload)

    patch = build_patch(species_id, base_environment, payload)
    return species_id, patch


def derive_patches(
    ecosystem_path: Path,
    species_dir: Path,
    registries_dir: Path,
    outdir: Path,
) -> list[Path]:
    environment = build_environment_context(ecosystem_path)
    rules = load_rules(registries_dir)

    written: list[Path] = []
    for species_file in iter_species_files(species_dir):
        species_id, patch = derive_patch_for_species(species_file, environment, rules)
        written.append(write_patch(outdir, species_id, patch))
    return written


def run(ecosystem: Path, species_dir: Path, registries: Path, outdir: Path) -> int:
    paths = derive_patches(ecosystem, species_dir, registries, outdir)
    print(f"Patches written to {outdir} ({len(paths)} files)")
    return 0


def parse_arguments(argv: Sequence[str] | None = None):
    import argparse

    parser = argparse.ArgumentParser(
        description="Genera patch YAML di suggerimenti tratti basate sulle regole ambientali",
    )
    parser.add_argument("ecosystem", type=Path, help="Percorso al file ecosistema YAML")
    parser.add_argument(
        "species_dir", type=Path, help="Directory contenente le schede specie YAML"
    )
    parser.add_argument(
        "registries", type=Path, help="Directory dei registri (env_to_traits.yaml, ecc.)"
    )
    parser.add_argument(
        "outdir", type=Path, help="Directory in cui scrivere le patch generate"
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_arguments(argv)
    return run(args.ecosystem, args.species_dir, args.registries, args.outdir)


__all__ = [
    "EnvironmentContext",
    "accumulate_suggestions",
    "build_environment_context",
    "build_patch",
    "build_species_context",
    "derive_patches",
    "derive_patch_for_species",
    "ensure_sequence",
    "iter_species_files",
    "load_yaml",
    "load_rules",
    "main",
    "match_rule",
    "parse_arguments",
    "run",
    "write_patch",
]
