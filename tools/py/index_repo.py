"""Utility per indicizzare l'albero dei file del repository in JSON."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, Iterator, List, Optional

DEFAULT_IGNORED_DIRECTORIES = {".git", "__pycache__", ".mypy_cache", ".pytest_cache"}
DEFAULT_IGNORED_FILES = {".DS_Store"}


@dataclass
class FileEntry:
    """Metadati per un singolo file del repository."""

    path: str
    size: int
    sha256: Optional[str]


class RepositoryIndexer:
    """Crea un indice dei file presenti nel repository."""

    def __init__(
        self,
        root: Path,
        include_hidden: bool = False,
        compute_hash: bool = False,
        ignored_directories: Optional[Iterable[str]] = None,
        ignored_files: Optional[Iterable[str]] = None,
    ) -> None:
        self.root = root
        self.include_hidden = include_hidden
        self.compute_hash = compute_hash
        self.ignored_directories = set(DEFAULT_IGNORED_DIRECTORIES)
        self.ignored_files = set(DEFAULT_IGNORED_FILES)

        if ignored_directories:
            self.ignored_directories.update(ignored_directories)
        if ignored_files:
            self.ignored_files.update(ignored_files)

    def build_index(self) -> List[FileEntry]:
        entries: List[FileEntry] = []
        for path in sorted(self._iter_files()):
            entries.append(self._create_entry(path))
        return entries

    def _iter_files(self) -> Iterator[Path]:
        root = self.root
        for dirpath, dirnames, filenames in os.walk(root):
            dirpath = Path(dirpath)
            dirnames[:] = [
                d
                for d in dirnames
                if self._should_include_directory(Path(dirpath, d))
            ]

            for name in filenames:
                file_path = dirpath / name
                if self._should_include_file(file_path):
                    yield file_path

    def _should_include_directory(self, path: Path) -> bool:
        relative = path.relative_to(self.root)
        if not self.include_hidden and any(part.startswith(".") for part in relative.parts):
            return False
        if path.name in self.ignored_directories:
            return False
        return True

    def _should_include_file(self, path: Path) -> bool:
        if not self.include_hidden and any(part.startswith(".") for part in path.relative_to(self.root).parts):
            return False
        if path.name in self.ignored_files:
            return False
        return True

    def _create_entry(self, path: Path) -> FileEntry:
        relative_path = path.relative_to(self.root).as_posix()
        size = path.stat().st_size
        digest = self._compute_hash(path) if self.compute_hash else None
        return FileEntry(path=relative_path, size=size, sha256=digest)

    def _compute_hash(self, path: Path) -> str:
        hasher = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Indice JSON dei file del repository")
    parser.add_argument(
        "root",
        nargs="?",
        default=Path.cwd(),
        type=Path,
        help="Directory radice da indicizzare (default: directory corrente)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Percorso del file in cui salvare l'indice in formato JSON",
    )
    parser.add_argument(
        "--include-hidden",
        action="store_true",
        help="Includi file e directory nascoste nell'indice",
    )
    parser.add_argument(
        "--hash",
        action="store_true",
        help="Calcola anche l'hash SHA-256 di ciascun file",
    )
    parser.add_argument(
        "--ignore-dir",
        action="append",
        default=[],
        help="Directory aggiuntive da escludere (può essere usato più volte)",
    )
    parser.add_argument(
        "--ignore-file",
        action="append",
        default=[],
        help="File aggiuntivi da escludere (può essere usato più volte)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    root = args.root.resolve()
    if not root.is_dir():
        raise SystemExit(f"La directory {root} non esiste o non è una cartella valida")
    indexer = RepositoryIndexer(
        root=root,
        include_hidden=args.include_hidden,
        compute_hash=args.hash,
        ignored_directories=args.ignore_dir,
        ignored_files=args.ignore_file,
    )
    entries = [asdict(entry) for entry in indexer.build_index()]

    if args.output:
        output_path = args.output
        if not output_path.is_absolute():
            output_path = Path.cwd() / output_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(entries, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    else:
        json.dump(entries, fp=sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
