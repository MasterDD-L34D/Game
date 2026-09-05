#!/usr/bin/env python3
"""Esegue la sincronizzazione dei trait Evo, la valutazione interna e (facoltativamente)
pubblica l'export su S3.

Questo script consolida i passaggi effettuati dal workflow GitHub `traits-sync` in
modo da poterli rieseguire manualmente quando GitHub Actions non è disponibile o
non risponde. Produce sempre l'export CSV locale, genera i report di valutazione
interna e può caricarli su S3 se sono presenti le credenziali partner.
"""
from __future__ import annotations

import argparse
import datetime
import shlex
import os
import sys
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Sequence, Tuple

import importlib.util

import boto3
from botocore.exceptions import BotoCoreError, ClientError

REPO_ROOT = Path(__file__).resolve().parents[2]
SYNC_MODULE_PATH = REPO_ROOT / "tools/traits/sync_missing_index.py"
EVALUATION_MODULE_PATH = REPO_ROOT / "tools/traits/evaluate_internal.py"

spec = importlib.util.spec_from_file_location("sync_missing_index", SYNC_MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Impossibile caricare il modulo sync_missing_index da {SYNC_MODULE_PATH}")
sync_missing_index = importlib.util.module_from_spec(spec)
sys.modules.setdefault("sync_missing_index", sync_missing_index)
sys.modules.setdefault("tools.traits.sync_missing_index", sync_missing_index)
spec.loader.exec_module(sync_missing_index)

evaluation_spec = importlib.util.spec_from_file_location("evaluate_internal", EVALUATION_MODULE_PATH)
if evaluation_spec is None or evaluation_spec.loader is None:
    raise RuntimeError(
        f"Impossibile caricare il modulo evaluate_internal da {EVALUATION_MODULE_PATH}"
    )
evaluate_internal = importlib.util.module_from_spec(evaluation_spec)
sys.modules.setdefault("evaluate_internal", evaluate_internal)
sys.modules.setdefault("tools.traits.evaluate_internal", evaluate_internal)
evaluation_spec.loader.exec_module(evaluate_internal)


DEFAULT_EXPORT_PATH = REPO_ROOT / "reports/evo/rollout/traits_external_sync.csv"
DEFAULT_INTERNAL_EVAL_ROOT = REPO_ROOT / "reports/evo/internal/traits_evaluation"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=sync_missing_index.DEFAULT_GAP_REPORT,
        help="Percorso del report traits_gap.csv da importare",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=sync_missing_index.DEFAULT_GLOSSARY,
        help="File glossary.json da aggiornare",
    )
    parser.add_argument(
        "--trait-dir",
        type=Path,
        default=sync_missing_index.DEFAULT_TRAIT_DIR,
        help="Directory con i trait Evo normalizzati",
    )
    parser.add_argument(
        "--export",
        type=Path,
        default=DEFAULT_EXPORT_PATH,
        help="Percorso del CSV da generare per i partner",
    )
    parser.add_argument(
        "--update-glossary",
        dest="update_glossary",
        action="store_true",
        help="Scrive le modifiche al glossary legacy (default)",
    )
    parser.add_argument(
        "--no-update-glossary",
        dest="update_glossary",
        action="store_false",
        help="Esegue solo un dry-run senza aggiornare il glossary",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Non scrive su disco ma produce l'export CSV",
    )
    parser.set_defaults(update_glossary=True)

    parser.add_argument(
        "--incoming-matrix",
        dest="incoming_matrices",
        action="append",
        type=Path,
        default=[],
        help="Percorsi CSV aggiuntivi con segnali di moderazione per la valutazione interna",
    )
    parser.add_argument(
        "--evaluation-output",
        type=Path,
        default=None,
        help=(
            "Percorso base per i report di valutazione interna. "
            "Default: reports/evo/internal/traits_evaluation/<timestamp>"
        ),
    )
    parser.add_argument(
        "--skip-evaluation",
        action="store_true",
        help="Non genera i report di valutazione interna",
    )

    default_upload = bool(os.getenv("PARTNERS_S3_BUCKET"))
    parser.add_argument(
        "--upload",
        dest="upload",
        action="store_true",
        default=default_upload,
        help="Carica l'export su S3 (richiede bucket e credenziali)",
    )
    parser.add_argument(
        "--no-upload",
        dest="upload",
        action="store_false",
        help="Disabilita il caricamento su S3",
    )
    parser.add_argument(
        "--s3-bucket",
        default=os.getenv("PARTNERS_S3_BUCKET"),
        help="Bucket S3 di destinazione",
    )
    parser.add_argument(
        "--s3-prefix",
        default=os.getenv("PARTNERS_S3_PREFIX", ""),
        help="Prefisso opzionale all'interno del bucket",
    )
    parser.add_argument(
        "--aws-access-key-id",
        default=os.getenv("PARTNERS_AWS_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID"),
        help="Access key AWS da usare per l'upload",
    )
    parser.add_argument(
        "--aws-secret-access-key",
        default=os.getenv("PARTNERS_AWS_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY"),
        help="Secret key AWS da usare per l'upload",
    )
    parser.add_argument(
        "--aws-session-token",
        default=os.getenv("PARTNERS_AWS_SESSION_TOKEN") or os.getenv("AWS_SESSION_TOKEN"),
        help="Session token AWS opzionale",
    )
    parser.add_argument(
        "--aws-region",
        default=os.getenv("PARTNERS_AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "eu-west-1",
        help="Regione AWS da utilizzare",
    )
    return parser.parse_args()


def run_sync(
    source: Path,
    dest: Path,
    trait_dir: Path,
    export_path: Path,
    update_glossary: bool,
    dry_run: bool,
) -> Tuple[Sequence[sync_missing_index.TraitRecord], Mapping[str, object]]:
    records = sync_missing_index.read_gap_report(source)
    glossary = sync_missing_index.update_glossary(
        dest,
        trait_dir,
        records,
        dry_run=dry_run or not update_glossary,
    )
    sync_missing_index.build_partner_export(export_path, records, glossary)
    return records, glossary


def run_internal_evaluation(
    records: Sequence[sync_missing_index.TraitRecord],
    glossary: Mapping[str, object],
    incoming_matrices: Sequence[Path],
    output_base: Path,
) -> Dict[str, Path]:
    incoming_signals = evaluate_internal.collect_incoming_signals(incoming_matrices)
    evaluations = evaluate_internal.evaluate_traits(records, glossary, incoming_signals)
    return evaluate_internal.write_reports(evaluations, output_base)


def format_command(parts: List[str]) -> str:
    return " ".join(shlex.quote(str(part)) for part in parts)


def build_manual_commands(
    args: argparse.Namespace,
    evaluation_output: Optional[Path],
) -> List[str]:
    commands: List[str] = []
    sync_parts: List[str] = [
        "python",
        "tools/traits/sync_missing_index.py",
        "--source",
        args.source,
        "--dest",
        args.dest,
        "--trait-dir",
        args.trait_dir,
        "--export",
        args.export,
    ]
    sync_parts.append("--update-glossary" if args.update_glossary else "--no-update-glossary")
    if args.dry_run:
        sync_parts.append("--dry-run")
    commands.append(format_command(sync_parts))

    if evaluation_output is not None and not args.skip_evaluation:
        eval_parts: List[str] = [
            "python",
            "tools/traits/evaluate_internal.py",
            "--gap-report",
            args.source,
            "--glossary",
            args.dest,
            "--output",
            evaluation_output,
        ]
        for matrix in args.incoming_matrices:
            eval_parts.extend(["--incoming-matrix", matrix])
        commands.append(format_command(eval_parts))

    if args.upload and args.s3_bucket:
        prefix = (args.s3_prefix or "").strip("/")
        if prefix:
            destination = f"s3://{args.s3_bucket}/{prefix}/traits_external_sync.csv"
        else:
            destination = f"s3://{args.s3_bucket}/traits_external_sync.csv"
        upload_parts: List[str] = [
            "aws",
            "s3",
            "cp",
            args.export,
            destination,
            "--acl",
            "bucket-owner-full-control",
            "--cache-control",
            "no-cache",
        ]
        commands.append(format_command(upload_parts))

    return commands


def upload_to_s3(
    export_path: Path,
    bucket: str,
    prefix: str,
    access_key: str,
    secret_key: str,
    session_token: Optional[str],
    region: str,
) -> None:
    if not export_path.exists():
        raise FileNotFoundError(f"File da caricare non trovato: {export_path}")

    key = "traits_external_sync.csv"
    if prefix:
        cleaned = prefix.strip("/")
        if cleaned:
            key = f"{cleaned}/{key}"

    session = boto3.session.Session(
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        aws_session_token=session_token,
        region_name=region,
    )
    s3_client = session.client("s3")
    try:
        s3_client.upload_file(
            str(export_path),
            bucket,
            key,
            ExtraArgs={
                "ACL": "bucket-owner-full-control",
                "CacheControl": "no-cache",
            },
        )
    except (BotoCoreError, ClientError) as error:
        raise RuntimeError(f"Caricamento su S3 fallito: {error}") from error
    print(f"Export caricato su s3://{bucket}/{key}")


def main() -> None:
    args = parse_args()

    records, glossary = run_sync(
        source=args.source,
        dest=args.dest,
        trait_dir=args.trait_dir,
        export_path=args.export,
        update_glossary=args.update_glossary,
        dry_run=args.dry_run,
    )

    evaluation_output: Optional[Path]
    if args.skip_evaluation:
        evaluation_output = None
        evaluation_paths: Optional[Dict[str, Path]] = None
    else:
        if args.evaluation_output is not None:
            evaluation_output = args.evaluation_output
        else:
            timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
            evaluation_output = DEFAULT_INTERNAL_EVAL_ROOT / f"manual_{timestamp}"
        evaluation_paths = run_internal_evaluation(
            records=records,
            glossary=glossary,
            incoming_matrices=args.incoming_matrices,
            output_base=evaluation_output,
        )
        print(f"Report valutazione JSON: {evaluation_paths['json']}")
        print(f"Report valutazione CSV: {evaluation_paths['csv']}")

    manual_commands = build_manual_commands(args, evaluation_output)
    if manual_commands:
        print("Comandi equivalenti eseguiti:")
        for command in manual_commands:
            print(f"  {command}")

    if not args.upload:
        print("Upload su S3 disabilitato o non richiesto. File pronto localmente.")
        return

    missing = []
    if not args.s3_bucket:
        missing.append("--s3-bucket")
    if not args.aws_access_key_id:
        missing.append("--aws-access-key-id")
    if not args.aws_secret_access_key:
        missing.append("--aws-secret-access-key")

    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(
            f"Impossibile eseguire l'upload su S3: parametri mancanti ({joined}). "
            "Specificare le opzioni o impostare le variabili d'ambiente PARTNERS_* corrispondenti."
        )

    upload_to_s3(
        export_path=args.export,
        bucket=args.s3_bucket,
        prefix=args.s3_prefix or "",
        access_key=args.aws_access_key_id,
        secret_key=args.aws_secret_access_key,
        session_token=args.aws_session_token,
        region=args.aws_region,
    )


if __name__ == "__main__":
    main()
