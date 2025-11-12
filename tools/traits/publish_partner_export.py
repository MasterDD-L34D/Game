#!/usr/bin/env python3
"""Esegue la sincronizzazione dei trait Evo e (facoltativamente) pubblica l'export su S3.

Questo script consolida i passaggi effettuati dal workflow GitHub `traits-sync` in
modo da poterli rieseguire manualmente quando GitHub Actions non è disponibile o
non risponde. Produce sempre l'export CSV locale e può caricarlo su S3 se sono
presenti le credenziali partner.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Optional

import importlib.util

import boto3
from botocore.exceptions import BotoCoreError, ClientError

REPO_ROOT = Path(__file__).resolve().parents[2]
SYNC_MODULE_PATH = REPO_ROOT / "tools/traits/sync_missing_index.py"

spec = importlib.util.spec_from_file_location("sync_missing_index", SYNC_MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Impossibile caricare il modulo sync_missing_index da {SYNC_MODULE_PATH}")
sync_missing_index = importlib.util.module_from_spec(spec)
sys.modules.setdefault("sync_missing_index", sync_missing_index)
sys.modules.setdefault("tools.traits.sync_missing_index", sync_missing_index)
spec.loader.exec_module(sync_missing_index)


DEFAULT_EXPORT_PATH = REPO_ROOT / "reports/evo/rollout/traits_external_sync.csv"


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
) -> None:
    records = sync_missing_index.read_gap_report(source)
    glossary = sync_missing_index.update_glossary(
        dest,
        trait_dir,
        records,
        dry_run=dry_run or not update_glossary,
    )
    sync_missing_index.build_partner_export(export_path, records, glossary)


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

    run_sync(
        source=args.source,
        dest=args.dest,
        trait_dir=args.trait_dir,
        export_path=args.export,
        update_glossary=args.update_glossary,
        dry_run=args.dry_run,
    )

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
