#!/usr/bin/env python3
"""Audit trait glossary duplicates.

This utility loads the incoming trait payloads and reports duplicate labels
(based on a case-insensitive, whitespace-normalised comparison). The report is
written as CSV and printed to stdout to simplify manual reviews.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Iterator, Mapping, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = REPO_ROOT / "incoming" / "lavoro_da_classificare" / "traits" / "traits_aggregate.json"
DEFAULT_OUTPUT = REPO_ROOT / "reports" / "traits" / "duplicates.csv"


class DuplicateRecord(Mapping[str, object]):
    """Row payload describing duplicate trait labels."""

    def __init__(self, label_key: str, labels: Sequence[str], trait_codes: Sequence[str]) -> None:
        self.label_key = label_key
        self.labels = tuple(labels)
        self.trait_codes = tuple(trait_codes)

    def __iter__(self) -> Iterator[str]:
        yield from ("label_key", "labels", "trait_codes")

    def __len__(self) -> int:  # pragma: no cover - trivial container API
        return 3

    def __getitem__(self, key: str) -> object:  # pragma: no cover - trivial container API
        if key == "label_key":
            return self.label_key
        if key == "labels":
            return list(self.labels)
        if key == "trait_codes":
            return list(self.trait_codes)
        raise KeyError(key)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Path to a JSON file (or directory containing JSON files) with trait definitions.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Destination CSV file that will store duplicate label findings.",
    )
    parser.add_argument(
        "--min-size",
        type=int,
        default=2,
        help="Minimum number of traits that must share the same label to be reported.",
    )
    return parser.parse_args(argv)


def _normalise_label(raw_label: str) -> str:
    return " ".join(raw_label.split()).casefold()


def _iter_trait_payloads(source: Path) -> Iterable[Mapping[str, object]]:
    if source.is_dir():
        for candidate in sorted(source.glob("*.json")):
            if candidate.name == "traits_aggregate.json":
                continue
            data = json.loads(candidate.read_text(encoding="utf-8"))
            if isinstance(data, Mapping):
                yield data
            else:
                raise ValueError(f"Unexpected payload in {candidate}: expected an object")
        return

    if not source.exists():
        raise FileNotFoundError(source)

    payload = json.loads(source.read_text(encoding="utf-8"))
    if isinstance(payload, Mapping):
        entries = payload.get("traits")
        if isinstance(entries, Sequence):
            for entry in entries:
                if isinstance(entry, Mapping):
                    yield entry
            return
        if isinstance(entries, Mapping):
            yield entries
            return
        raise ValueError(f"Unsupported structure in {source}: missing 'traits' list")

    if isinstance(payload, Sequence):
        for entry in payload:
            if isinstance(entry, Mapping):
                yield entry
        return

    raise ValueError(f"Unsupported payload type in {source}: {type(payload)!r}")


def _extract_identity(entry: Mapping[str, object]) -> tuple[str | None, str | None]:
    trait_code = None
    for key in ("trait_code", "trait_id", "id", "code"):
        value = entry.get(key)
        if isinstance(value, str) and value.strip():
            trait_code = value.strip()
            break

    label = entry.get("label")
    if not isinstance(label, str) or not label.strip():
        # try alternative localisation keys
        for key in ("label_it", "label_en", "nome", "name"):
            alt = entry.get(key)
            if isinstance(alt, str) and alt.strip():
                label = alt
                break
        else:
            label = None
    return trait_code, label


def build_duplicate_index(entries: Iterable[Mapping[str, object]], min_size: int = 2) -> list[DuplicateRecord]:
    buckets: dict[str, set[str]] = defaultdict(set)
    labels: dict[str, set[str]] = defaultdict(set)
    for entry in entries:
        trait_code, label = _extract_identity(entry)
        if not trait_code or not label:
            continue
        label_key = _normalise_label(label)
        buckets[label_key].add(trait_code)
        labels[label_key].add(label.strip())

    records: list[DuplicateRecord] = []
    for label_key, codes in sorted(buckets.items()):
        if len(codes) < min_size:
            continue
        label_variants = sorted(labels[label_key])
        records.append(DuplicateRecord(label_key=label_key, labels=label_variants, trait_codes=sorted(codes)))
    return records


def write_csv(records: Sequence[DuplicateRecord], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["label_key", "labels", "trait_codes"])
        for record in records:
            writer.writerow([
                record.label_key,
                " | ".join(record.labels),
                ", ".join(record.trait_codes),
            ])


def main(argv: Sequence[str] | None = None) -> int:
    try:
        args = parse_args(argv)
        entries = list(_iter_trait_payloads(args.source))
        records = build_duplicate_index(entries, min_size=max(args.min_size, 2))
        write_csv(records, args.output)
    except Exception as exc:  # pragma: no cover - CLI convenience
        print(f"[audit_duplicates] errore: {exc}", file=sys.stderr)
        return 1

    if not records:
        print("Nessun duplicato individuato.")
        return 0

    print(f"Trovati {len(records)} gruppi di etichette duplicate.")
    for record in records:
        print(f"- {record.label_key}: {', '.join(record.trait_codes)}")
    print(f"Report salvato in {args.output}")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    sys.exit(main())
