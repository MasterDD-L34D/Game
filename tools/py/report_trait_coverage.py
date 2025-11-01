#!/usr/bin/env python3
"""CLI per generare il report diff/coverage dei tratti."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

from game_utils.trait_coverage import generate_trait_coverage, iter_matrix_rows

try:  # pragma: no cover - ambienti minimal
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    yaml = None


SPECIES_ID_PATTERN = re.compile(r"^[a-z0-9_-]+$")
SLUG_PATTERN = re.compile(r"^[a-z0-9_]+$")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--env-traits",
        type=Path,
        default=Path("packs/evo_tactics_pack/docs/catalog/env_traits.json"),
        help="File JSON env→traits da analizzare",
    )
    parser.add_argument(
        "--trait-reference",
        type=Path,
        default=Path("data/traits/index.json"),
        help="Reference JSON dei tratti",
    )
    parser.add_argument(
        "--species-root",
        type=Path,
        default=Path("packs/evo_tactics_pack/data/species"),
        help="Directory o file YAML da cui estrarre le specie",
    )
    parser.add_argument(
        "--species-affinity",
        type=Path,
        default=None,
        help="Mappa trait→specie pre-calcolata per verificare la coverage",
    )
    parser.add_argument(
        "--trait-glossary",
        type=Path,
        default=None,
        help="Glossario centrale dei tratti (default: autodetect)",
    )
    parser.add_argument(
        "--out-json",
        type=Path,
        default=Path("data/derived/analysis/trait_coverage_report.json"),
        help="Percorso del report JSON da generare",
    )
    parser.add_argument(
        "--out-csv",
        type=Path,
        default=None,
        help="Percorso opzionale per esportare la matrice trait↔bioma↔forma",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help=(
            "Abilita controlli di coerenza: fallisce se la copertura dei trait non "
            "raggiunge le soglie minime."
        ),
    )
    parser.add_argument(
        "--min-traits-with-species",
        type=int,
        default=27,
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--max-rules-missing-species",
        type=int,
        default=0,
        help=argparse.SUPPRESS,
    )
    return parser


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, str | int | None]]) -> None:
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "trait_id",
        "label_it",
        "label_en",
        "biome",
        "morphotype",
        "rules_count",
        "species_count",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def load_species_catalog(root: Path) -> tuple[set[str], list[str]]:
    warnings: list[str] = []
    if yaml is None:
        warnings.append(
            "Validazione species_affinity saltata: PyYAML non disponibile nell'ambiente."
        )
        return set(), warnings

    resolved = root
    if not resolved.exists():
        warnings.append(f"Directory/specie non trovata: {resolved}")
        return set(), warnings

    if resolved.is_file():
        candidate_paths = [resolved]
    else:
        candidate_paths = sorted(path for path in resolved.rglob("*.yaml") if path.is_file())

    species_ids: set[str] = set()
    for path in candidate_paths:
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as exc:  # pragma: no cover - errori IO rari
            warnings.append(f"Impossibile leggere {path}: {exc}")
            continue
        if isinstance(data, dict):
            species_id = data.get("id")
            if isinstance(species_id, str):
                species_ids.add(species_id)

    return species_ids, warnings


def validate_trait_affinity(
    trait_reference_path: Path, species_ids: set[str]
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    try:
        payload = json.loads(trait_reference_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"File trait reference non trovato: {trait_reference_path}")
        return errors, warnings
    except json.JSONDecodeError as exc:
        errors.append(f"{trait_reference_path}: JSON non valido ({exc})")
        return errors, warnings

    traits = payload.get("traits")
    if not isinstance(traits, dict):
        errors.append("Campo 'traits' mancante o non valido nel trait reference.")
        return errors, warnings

    known_species = set(species_ids)
    affinity_present = False

    for trait_id, trait_payload in sorted(traits.items()):
        entries = trait_payload.get("species_affinity") if isinstance(trait_payload, dict) else None
        if not isinstance(entries, list):
            continue
        affinity_present = affinity_present or bool(entries)
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict):
                errors.append(
                    f"traits/{trait_id}/species_affinity[{index}]: voce non è un oggetto valido"
                )
                continue
            species_id = entry.get("species_id")
            if not isinstance(species_id, str):
                errors.append(
                    f"traits/{trait_id}/species_affinity[{index}].species_id mancante o non è una stringa"
                )
            elif known_species and species_id not in known_species:
                errors.append(
                    f"traits/{trait_id}/species_affinity[{index}].species_id '{species_id}' non corrisponde a nessuna specie nota"
                )
            roles = entry.get("roles")
            if isinstance(roles, list):
                for role_index, role in enumerate(roles):
                    if isinstance(role, str) and not SLUG_PATTERN.fullmatch(role):
                        errors.append(
                            f"traits/{trait_id}/species_affinity[{index}].roles[{role_index}] deve essere uno slug (^[a-z0-9_]+$)"
                        )

    if affinity_present and not known_species:
        warnings.append(
            "Validazione species_affinity: impossibile verificare ID specie perché il catalogo non contiene elementi."
        )

    return errors, warnings


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    report = generate_trait_coverage(
        args.env_traits,
        args.trait_reference,
        args.species_root,
        args.species_affinity,
        args.trait_glossary,
    )

    write_json(args.out_json, report)

    if args.out_csv:
        rows = iter_matrix_rows(report)
        write_csv(args.out_csv, rows)

    species_ids, species_warnings = load_species_catalog(args.species_root)
    affinity_errors, affinity_warnings = validate_trait_affinity(
        args.trait_reference, species_ids
    )

    for message in species_warnings + affinity_warnings:
        print(message, file=sys.stderr)

    if args.strict:
        summary = report.get("summary", {}) if isinstance(report, dict) else {}
        errors: list[str] = []

        traits_with_species = summary.get("traits_with_species")
        if traits_with_species is None or traits_with_species < args.min_traits_with_species:
            errors.append(
                "traits_with_species="
                f"{traits_with_species!r} sotto la soglia {args.min_traits_with_species}"
            )

        rules_missing = summary.get("rules_missing_species_total")
        if rules_missing is None or rules_missing > args.max_rules_missing_species:
            errors.append(
                "rules_missing_species_total="
                f"{rules_missing!r} eccede il massimo consentito "
                f"{args.max_rules_missing_species}"
            )

        if errors:
            for message in errors:
                print(message, file=sys.stderr)
            return 1

    if affinity_errors:
        for message in affinity_errors:
            print(message, file=sys.stderr)
        return 1

    print(f"Report coverage generato in {args.out_json}")
    if args.out_csv:
        print(f"Matrice esportata in {args.out_csv}")
    if args.strict:
        print(
            "Controlli strict superati:"
            f" min_traits_with_species={args.min_traits_with_species}, "
            f"max_rules_missing_species={args.max_rules_missing_species}"
        )
    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    sys.exit(main())

