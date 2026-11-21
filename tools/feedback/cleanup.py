"""Archivia submission di feedback oltre la soglia temporale configurata."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable, List, Tuple

DEFAULT_INTAKE_PATH = Path("data/feedback/intake.jsonl")
DEFAULT_ARCHIVE_DIR = Path("data/feedback/archive")
ISO_FORMATS = [
    "%Y-%m-%dT%H:%M:%S.%fZ",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%d %H:%M:%S",
]


def parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.utcnow()
    for fmt in ISO_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return datetime.utcnow()


def load_payloads(path: Path) -> List[dict]:
    if not path.exists():
        return []
    payloads: List[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            payloads.append(json.loads(line))
    return payloads


def split_payloads(payloads: Iterable[dict], threshold: datetime) -> Tuple[List[dict], List[dict]]:
    keep: List[dict] = []
    archive: List[dict] = []
    for payload in payloads:
        created_at = parse_timestamp(payload.get("created_at") or payload.get("timestamp"))
        if created_at < threshold:
            archive.append(payload)
        else:
            keep.append(payload)
    return keep, archive


def write_jsonl(path: Path, payloads: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for payload in payloads:
            handle.write(json.dumps(payload, ensure_ascii=False))
            handle.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Archivia feedback oltre la soglia di giorni indicata")
    parser.add_argument("--intake", type=Path, default=DEFAULT_INTAKE_PATH, help="Percorso file JSONL intake")
    parser.add_argument("--archive-dir", type=Path, default=DEFAULT_ARCHIVE_DIR, help="Directory archivio")
    parser.add_argument("--days", type=int, default=90, help="Numero di giorni da mantenere nell'intake")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payloads = load_payloads(args.intake)
    if not payloads:
        print(f"Nessuna submission trovata in {args.intake}.")
        return

    cutoff = datetime.utcnow() - timedelta(days=args.days)
    keep, archive = split_payloads(payloads, cutoff)
    if not archive:
        print("Nessuna submission da archiviare.")
        return

    archive_name = f"feedback_archive_{datetime.utcnow():%Y%m%d_%H%M%S}.jsonl"
    archive_path = args.archive_dir / archive_name
    write_jsonl(args.intake, keep)
    write_jsonl(archive_path, archive)
    print(f"Archiviati {len(archive)} feedback in {archive_path}. Rimangono {len(keep)} elementi attivi.")


if __name__ == "__main__":
    main()
