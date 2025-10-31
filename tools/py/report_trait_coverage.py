#!/usr/bin/env python3
"""CLI per generare il report diff/coverage dei tratti."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

from game_utils.trait_coverage import generate_trait_coverage, iter_matrix_rows


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


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    report = generate_trait_coverage(
        args.env_traits,
        args.trait_reference,
        args.species_root,
        args.trait_glossary,
    )

    write_json(args.out_json, report)

    if args.out_csv:
        rows = iter_matrix_rows(report)
        write_csv(args.out_csv, rows)

    print(f"Report coverage generato in {args.out_json}")
    if args.out_csv:
        print(f"Matrice esportata in {args.out_csv}")
    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    sys.exit(main())

