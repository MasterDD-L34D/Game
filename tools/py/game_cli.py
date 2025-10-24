"""Interfaccia unica per gli script CLI Python del progetto."""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Optional

from generate_encounter import generate as generate_encounter
from roll_pack import roll_pack
from validate_datasets import main as validate_datasets_main


def _positive_int(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:  # pragma: no cover - parsing error handled here
        raise argparse.ArgumentTypeError(f"{value!r} non è un intero valido") from exc
    if parsed <= 0:
        raise argparse.ArgumentTypeError("il valore deve essere positivo")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Utility CLI per Evo-Tactics",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    roll_parser = subparsers.add_parser("roll-pack", help="Genera un pacchetto PI")
    roll_parser.add_argument("form", help="Forma MBTI di riferimento", nargs="?", default="ENTP")
    roll_parser.add_argument("job", help="Archetipo di lavoro", nargs="?", default="invoker")
    roll_parser.add_argument(
        "data_path",
        nargs="?",
        default=None,
        help="Percorso al dataset dei pacchetti",
    )
    roll_parser.add_argument("--seed", help="Seed deterministico per il generatore")

    encounter_parser = subparsers.add_parser("generate-encounter", help="Crea un incontro casuale")
    encounter_parser.add_argument(
        "biome",
        nargs="?",
        default="savana",
        help="Bioma di riferimento",
    )
    encounter_parser.add_argument(
        "data_path",
        nargs="?",
        default=None,
        help="Percorso al dataset dei biomi",
    )
    encounter_parser.add_argument(
        "--party-power",
        type=_positive_int,
        default=20,
        help="Budget di potenza della squadra",
    )
    encounter_parser.add_argument("--seed", help="Seed deterministico per la generazione")

    subparsers.add_parser("validate-datasets", help="Esegue i controlli sui dataset YAML")

    return parser


def command_roll_pack(args: argparse.Namespace) -> int:
    result = roll_pack(args.form, args.job, args.data_path, seed=args.seed)
    json.dump(result, fp=sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


def command_generate_encounter(args: argparse.Namespace) -> int:
    result = generate_encounter(
        args.biome,
        args.data_path,
        party_power=args.party_power,
        party_vc=None,
        seed=args.seed,
    )
    json.dump(result, fp=sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


def command_validate_datasets(args: argparse.Namespace) -> int:
    return validate_datasets_main()


def main(argv: Optional[Any] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    exit_code = 0
    if args.command == "roll-pack":
        exit_code = command_roll_pack(args)
    elif args.command == "generate-encounter":
        exit_code = command_generate_encounter(args)
    elif args.command == "validate-datasets":
        exit_code = command_validate_datasets(args)
    else:  # pragma: no cover - dovrebbe essere inaccessibile
        parser.error(f"Comando sconosciuto: {args.command}")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
