"""Interfaccia unica per gli script CLI Python del progetto."""
from __future__ import annotations

import argparse
import io
import importlib.util
import json
import os
import sys
from html import escape
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from generate_encounter import generate as generate_encounter
from investigate_sources import (
    InvestigationResult,
    collect_investigation,
    render_report,
)
from roll_pack import roll_pack
from validate_datasets import pack_validator_path, main as validate_datasets_main
import yaml

CLI_PROFILES_ENV_VAR = "GAME_CLI_PROFILES_DIR"
CLI_PROFILES_DIR = Path(__file__).resolve().parents[2] / "config" / "cli"
INCOMING_REPORTS_DIR = Path(__file__).resolve().parents[2] / "reports" / "incoming"


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
        expanded = os.path.expanduser(os.path.expandvars(value))
        os.environ[key] = expanded


def _load_pack_validator():
    validator_path = pack_validator_path()
    if not validator_path.exists():
        return None

    module_name = "evo_tactics_pack.run_all_validators"
    spec = importlib.util.spec_from_file_location(module_name, validator_path)
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
        "--html",
        action="store_true",
        help="Salva anche un report HTML nella destinazione configurata",
    )
    investigate_parser.add_argument(
        "--destination",
        default="latest",
        metavar="NAME",
        help=(
            "Sottocartella in reports/incoming dove salvare i file generati. "
            "Usare '-' per evitare la creazione di report su disco."
        ),
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


def _incoming_reports_root() -> Path:
    base = INCOMING_REPORTS_DIR
    base.mkdir(parents=True, exist_ok=True)
    return base.resolve()


def _resolve_incoming_destination(destination: Optional[str]) -> Path:
    base = _incoming_reports_root()
    if destination is None:
        target = base
    else:
        normalized = destination.strip()
        if not normalized:
            target = base
        else:
            candidate = Path(normalized)
            if candidate.is_absolute():
                raise ValueError(
                    "La destinazione non può essere un percorso assoluto.",
                )
            if any(part == ".." for part in candidate.parts):
                raise ValueError(
                    "La destinazione non può uscire da reports/incoming.",
                )
            candidate_path = (base / candidate).resolve()
            if candidate_path != base and base not in candidate_path.parents:
                raise ValueError(
                    "La destinazione deve rimanere sotto reports/incoming.",
                )
            target = candidate_path
    target.mkdir(parents=True, exist_ok=True)
    return target


def _render_investigation_result_html(result: InvestigationResult) -> str:
    keywords = escape(
        ", ".join(result.keywords)
    ) if result.keywords else "—"
    notes_block = (
        f"<p class=\"notes\"><strong>Note:</strong> {escape(result.notes)}</p>"
        if result.notes
        else ""
    )
    if result.preview:
        preview_block = (
            f"<pre class=\"preview\">{escape(result.preview)}</pre>"
        )
    else:
        preview_block = (
            "<p class=\"preview empty\"><em>(nessuna preview disponibile)</em></p>"
        )
    children_block = ""
    if result.children:
        children_items = "".join(
            _render_investigation_result_html(child) for child in result.children
        )
        children_block = f"<ul class=\"children\">{children_items}</ul>"
    return (
        "<li class=\"entry\">"
        "<article>"
        f"<header><h2>{escape(result.path)}</h2>"
        f"<p class=\"meta\">Tipo: <strong>{escape(result.type)}</strong> · "
        f"Dimensione: {result.size_bytes} B</p></header>"
        f"<p class=\"summary\">{escape(result.summary)}</p>"
        f"<p class=\"keywords\"><strong>Parole chiave:</strong> {keywords}</p>"
        f"{notes_block}"
        f"{preview_block}"
        f"{children_block}"
        "</article>"
        "</li>"
    )


def _build_investigation_html(results: Sequence[InvestigationResult]) -> str:
    items = "".join(_render_investigation_result_html(result) for result in results)
    if items:
        body = f"<ul class=\"results\">{items}</ul>"
    else:
        body = "<p class=\"empty\">Nessun file analizzato.</p>"
    return (
        "<!DOCTYPE html>\n"
        "<html lang=\"it\">\n"
        "<head>\n"
        "  <meta charset=\"utf-8\" />\n"
        "  <title>Report indagine incoming</title>\n"
        "  <style>\n"
        "    body {font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
        " margin: 0; padding: 2rem; background: #f5f5f5;}\n"
        "    main {max-width: 960px; margin: 0 auto; background: #fff; padding: 2rem;"
        " border-radius: 16px; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.12);}\n"
        "    h1 {margin-top: 0;}\n"
        "    ul.results {list-style: none; padding: 0; margin: 2rem 0 0;}\n"
        "    ul.results > li.entry {padding: 1.5rem 0; border-bottom: 1px solid #e2e8f0;}\n"
        "    ul.results > li.entry:last-child {border-bottom: none;}\n"
        "    p.meta {color: #475569; margin: 0.25rem 0 1rem;}\n"
        "    p.summary {font-weight: 500;}\n"
        "    p.keywords {color: #334155;}\n"
        "    p.notes {background: #fef08a; padding: 0.75rem; border-radius: 12px;}\n"
        "    pre.preview {background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 12px;"
        " white-space: pre-wrap;}\n"
        "    p.preview.empty {color: #64748b; font-style: italic;}\n"
        "    ul.children {list-style: none; padding-left: 1.5rem; margin: 1rem 0 0;"
        " border-left: 3px solid #cbd5f5;}\n"
        "    ul.children > li.entry {border-bottom: none; padding: 1rem 0;}\n"
        "  </style>\n"
        "</head>\n"
        "<body>\n"
        "  <main>\n"
        "    <h1>Report indagine incoming</h1>\n"
        f"    {body}\n"
        "  </main>\n"
        "</body>\n"
        "</html>\n"
    )


def command_investigate(args: argparse.Namespace) -> int:
    paths = [Path(path) for path in args.paths]
    results = collect_investigation(
        paths,
        recursive=args.recursive,
        max_preview=max(100, args.max_preview),
    )
    destination_arg = getattr(args, "destination", None)
    html_requested = getattr(args, "html", False)
    destination_disabled = (
        destination_arg is not None and destination_arg.strip() == "-"
    )
    if html_requested and destination_disabled:
        sys.stderr.write(
            "Impossibile generare il report HTML senza una destinazione valida.\n"
        )
        return 2

    need_destination = (args.json and not destination_disabled) or html_requested
    destination_dir: Optional[Path] = None
    if need_destination:
        try:
            destination_dir = _resolve_incoming_destination(destination_arg)
        except ValueError as error:
            sys.stderr.write(f"{error}\n")
            return 2

    if args.json:
        if destination_dir is None:
            render_report(results, json_output=True, stream=sys.stdout)
        else:
            json_buffer = io.StringIO()
            render_report(results, json_output=True, stream=json_buffer)
            json_payload = json_buffer.getvalue()
            json_path = destination_dir / "report.json"
            json_path.write_text(json_payload, encoding="utf-8")
    else:
        render_report(results, json_output=False, stream=sys.stdout)

    if html_requested:
        if destination_dir is None:
            destination_dir = _resolve_incoming_destination(destination_arg)
        html_payload = _build_investigation_html(results)
        html_path = destination_dir / "report.html"
        html_path.write_text(html_payload, encoding="utf-8")
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
