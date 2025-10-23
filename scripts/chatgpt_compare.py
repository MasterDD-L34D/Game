#!/usr/bin/env python3
"""Confronta uno snapshot ChatGPT con il precedente e genera un diff."""

from __future__ import annotations

import argparse
import difflib
import json
from pathlib import Path
from typing import Iterable, List, Optional

SNAPSHOT_ROOT = Path("data/chatgpt")


def collect_snapshots(root: Path = SNAPSHOT_ROOT) -> List[Path]:
    """Restituisce la lista ordinata di tutti gli snapshot disponibili."""

    if not root.exists():
        return []
    snapshots: List[Path] = []
    for path in root.rglob("snapshot-*"):
        if path.is_file():
            snapshots.append(path)
    return sorted(snapshots)


def find_previous_snapshot(new_snapshot: Path, *, root: Path = SNAPSHOT_ROOT) -> Optional[Path]:
    """Trova lo snapshot immediatamente precedente rispetto a ``new_snapshot``."""

    new_snapshot = new_snapshot.resolve()
    snapshots = collect_snapshots(root)
    previous: Optional[Path] = None
    for candidate in snapshots:
        resolved = candidate.resolve()
        if resolved == new_snapshot:
            return previous
        previous = resolved
    return None


def load_formatted_lines(path: Path) -> List[str]:
    """Carica il contenuto e lo restituisce come lista di linee formattate."""

    text = path.read_text(encoding="utf-8")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return text.splitlines()

    formatted = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True)
    return formatted.splitlines()


def build_diff(previous: Path, current: Path, *, context: int = 3) -> Iterable[str]:
    """Genera le linee di diff tra due snapshot."""

    prev_lines = load_formatted_lines(previous)
    curr_lines = load_formatted_lines(current)
    prev_label = _display_name(previous)
    curr_label = _display_name(current)
    return difflib.unified_diff(
        prev_lines,
        curr_lines,
        fromfile=prev_label,
        tofile=curr_label,
        n=context,
        lineterm="",
    )


def _display_name(path: Path) -> str:
    """Restituisce un nome leggibile (relativo alla cwd se possibile)."""

    try:
        return str(path.resolve().relative_to(Path.cwd()))
    except ValueError:
        return str(path)


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Confronta un nuovo snapshot con quello precedente salvato in data/chatgpt."
        )
    )
    parser.add_argument("new_snapshot", type=Path, help="Percorso del nuovo snapshot")
    parser.add_argument(
        "--previous",
        type=Path,
        help="Percorso dello snapshot precedente (facoltativo)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="File di destinazione per il diff (se assente, stampa su stdout)",
    )
    parser.add_argument(
        "--context",
        type=int,
        default=3,
        help="Numero di linee di contesto per il diff unificato (default: 3)",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)
    new_snapshot: Path = args.new_snapshot
    if not new_snapshot.exists():
        raise SystemExit(f"Snapshot non trovato: {new_snapshot}")

    if args.previous:
        previous_snapshot = args.previous
    else:
        previous_snapshot = find_previous_snapshot(new_snapshot)

    if previous_snapshot is None:
        raise SystemExit(
            "Impossibile determinare lo snapshot precedente."
            " Specificare --previous esplicitamente."
        )

    diff_lines = list(build_diff(previous_snapshot, new_snapshot, context=args.context))

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        output_text = "\n".join(diff_lines)
        if diff_lines:
            output_text += "\n"
        args.output.write_text(output_text, encoding="utf-8")
    else:
        for line in diff_lines:
            print(line)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
