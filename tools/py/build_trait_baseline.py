#!/usr/bin/env python3
"""CLI per generare il set base dei tratti a partire dalle regole ambientali."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

from game_utils.trait_baseline import derive_trait_baseline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Deriva il set base dei tratti")
    parser.add_argument(
        "env_traits",
        type=Path,
        help="Percorso al file JSON delle regole ambiente → tratti",
    )
    parser.add_argument(
        "trait_reference",
        type=Path,
        help="Percorso al reference genetico dei tratti",
    )
    parser.add_argument(
        "--trait-glossary",
        type=Path,
        default=None,
        help="Percorso opzionale al glossario centrale dei tratti",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data/analysis/trait_baseline.yaml"),
        help="File YAML in cui salvare il set base",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    payload = derive_trait_baseline(
        args.env_traits,
        args.trait_reference,
        args.trait_glossary,
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        yaml.safe_dump(payload, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    print(f"Baseline salvata in {args.out}")
    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    sys.exit(main())

