"""Interfaccia unica per gli script CLI Python del progetto."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from generate_encounter import generate as generate_encounter
from investigate_sources import collect_investigation, render_report
from roll_pack import roll_pack
from validate_datasets import PACK_VALIDATOR, main as validate_datasets_main
import yaml

CLI_PROFILES_ENV_VAR = "GAME_CLI_PROFILES_DIR"
CLI_PROFILES_DIR = Path(__file__).resolve().parents[2] / "config" / "cli"


class ProfileError(RuntimeError):
    """Errore durante il caricamento di un profilo CLI."""


@dataclass(frozen=True)
class ProfileConfig:
    """Rappresenta un profilo CLI con variabili ambiente opzionali."""

    name: str
    path: Path
    env: Dict[str, str]
    metadata: Dict[str, Any]


def _profiles_dir() -> Path:
    override = os.environ.get(CLI_PROFILES_ENV_VAR)
    if override:
        return Path(override)
    return CLI_PROFILES_DIR


def load_profile(name: str) -> ProfileConfig:
    """Carica la configurazione di un profilo CLI dal filesystem."""

    profile_path = _profiles_dir() / f"{name}.yaml"
    if not profile_path.exists():
        raise ProfileError(f"Profilo CLI '{name}' non trovato ({profile_path})")

    with profile_path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}

    if not isinstance(payload, dict):
        raise ProfileError(
            f"Il profilo CLI '{name}' deve essere un oggetto YAML a livello radice",
        )

    raw_env = payload.get("env", {})
    if raw_env is None:
        raw_env = {}
    if not isinstance(raw_env, dict):
        raise ProfileError(
            f"La sezione 'env' del profilo '{name}' deve essere un mapping chiave/valore",
        )

    env: Dict[str, str] = {str(key): str(value) for key, value in raw_env.items()}

    metadata = {key: value for key, value in payload.items() if key != "env"}

    return ProfileConfig(name=name, path=profile_path, env=env, metadata=metadata)


def apply_profile(profile: ProfileConfig) -> None:
    """Applica le variabili ambiente di un profilo CLI."""

    for key, value in profile.env.items():
        os.environ[key] = value


def _load_pack_validator():
    if not PACK_VALIDATOR.exists():
        return None

    module_name = "evo_tactics_pack.run_all_validators"
    spec = importlib.util.spec_from_file_location(module_name, PACK_VALIDATOR)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)  # type: ignore[union-attr]
    except Exception:  # pragma: no cover - gli errori runtime verranno mostrati a video
        return None
    return module


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
    parser.add_argument(
        "--profile",
        help="Nome del profilo CLI definito in config/cli/<profilo>.yaml",
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

    pack_parser = subparsers.add_parser(
        "validate-ecosystem-pack",
        help="Esegue tutti i validator dedicati al pack ecosistemi",
    )
    pack_parser.add_argument(
        "--json-out",
        type=Path,
        help="Percorso opzionale per salvare il report JSON",
    )
    pack_parser.add_argument(
        "--html-out",
        type=Path,
        help="Percorso opzionale per salvare il report HTML",
    )

    investigate_parser = subparsers.add_parser(
        "investigate",
        help="Analizza file JSON/Markdown/PDF/DOC/ZIP per decidere cosa integrare",
    )
    investigate_parser.add_argument(
        "paths",
        nargs="+",
        help="File o directory da esaminare",
    )
    investigate_parser.add_argument(
        "--recursive",
        action="store_true",
        help="Analizza ricorsivamente le directory specificate",
    )
    investigate_parser.add_argument(
        "--json",
        action="store_true",
        help="Restituisce l'output in formato JSON",
    )
    investigate_parser.add_argument(
        "--max-preview",
        type=_positive_int,
        default=400,
        help="Numero massimo di caratteri mostrati nella preview",
    )

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


def command_validate_ecosystem_pack(args: argparse.Namespace) -> int:
    module = _load_pack_validator()
    if module is None or not hasattr(module, "run_validators"):
        sys.stderr.write("Validator del pack non trovato.\n")
        return 1

    payload, has_failures = module.run_validators(  # type: ignore[attr-defined]
        json_out=args.json_out,
        html_out=args.html_out,
        emit_stdout=True,
    )
    if not payload:
        return 1
    return 2 if has_failures else 0


def command_investigate(args: argparse.Namespace) -> int:
    paths = [Path(path) for path in args.paths]
    results = collect_investigation(
        paths,
        recursive=args.recursive,
        max_preview=max(100, args.max_preview),
    )
    render_report(results, json_output=args.json, stream=sys.stdout)
    return 0


LEGACY_VALIDATE_ECOSYSTEM_COMMAND = "validate-ecosystem"


def _normalize_argv(argv: Optional[Any]) -> List[str]:
    if argv is None:
        normalized = list(sys.argv[1:])
    elif isinstance(argv, str):
        normalized = [argv]
    elif isinstance(argv, Sequence):
        normalized = list(argv)
    else:
        normalized = list(argv)  # type: ignore[arg-type]

    if normalized and normalized[0] == LEGACY_VALIDATE_ECOSYSTEM_COMMAND:
        normalized[0] = "validate-ecosystem-pack"

    return normalized


def main(argv: Optional[Any] = None) -> int:
    parser = build_parser()
    normalized_argv = _normalize_argv(argv)
    args = parser.parse_args(normalized_argv)

    if args.profile:
        try:
            profile_config = load_profile(args.profile)
        except ProfileError as exc:
            parser.error(str(exc))
        apply_profile(profile_config)
        setattr(args, "profile_config", profile_config)

    exit_code = 0
    if args.command == "roll-pack":
        exit_code = command_roll_pack(args)
    elif args.command == "generate-encounter":
        exit_code = command_generate_encounter(args)
    elif args.command == "validate-datasets":
        exit_code = command_validate_datasets(args)
    elif args.command == "validate-ecosystem-pack":
        exit_code = command_validate_ecosystem_pack(args)
    elif args.command == "investigate":
        exit_code = command_investigate(args)
    else:  # pragma: no cover - dovrebbe essere inaccessibile
        parser.error(f"Comando sconosciuto: {args.command}")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
