#!/usr/bin/env python3
"""Utility per migrare la struttura dei dataset verso il layout core/derived/external.

Lo script applica le regole definite in ``config/data_path_redirects.json`` e
supporta due casi d'uso principali:

* migrazione fisica dei file (spostamento cartelle/file legacy);
* generazione di un manifest di redirect per servizi che non possono essere
  aggiornati immediatamente.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = REPO_ROOT / "config" / "data_path_redirects.json"


@dataclass(slots=True)
class MigrationAction:
    """Describe a migration operation applied to the dataset."""

    kind: str
    legacy: Path
    modern: Path
    message: str | None = None

    def to_log(self) -> str:
        note = f" ({self.message})" if self.message else ""
        return f"[{self.kind}] {self.legacy} -> {self.modern}{note}"


def _load_redirects(config_path: Path) -> Dict[str, str]:
    try:
        payload = json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:  # pragma: no cover - configurazioni scorrette
        raise SystemExit(f"Config di redirect non trovata: {config_path}") from exc
    if not isinstance(payload, dict):
        raise SystemExit("Il file di redirect deve contenere un mapping JSON")
    result: Dict[str, str] = {}
    for legacy, modern in payload.items():
        if not isinstance(legacy, str) or not isinstance(modern, str):
            raise SystemExit("Le chiavi e i valori della config di redirect devono essere stringhe")
        result[legacy] = modern
    return result


def _resolve_base(root: Path, relative: str) -> Path:
    relative_path = Path(relative)
    if relative_path.is_absolute():
        return relative_path
    return (root / relative_path).resolve()


def migrate_layout(
    *,
    root: Path,
    mapping: Dict[str, str],
    dry_run: bool,
) -> List[MigrationAction]:
    """Apply the refactor mapping under ``root``."""

    actions: List[MigrationAction] = []
    for legacy_rel, modern_rel in mapping.items():
        legacy_path = _resolve_base(root, legacy_rel)
        modern_path = _resolve_base(root, modern_rel)
        if legacy_path == modern_path:
            continue
        if not legacy_path.exists():
            actions.append(
                MigrationAction(
                    kind="skip", legacy=legacy_path, modern=modern_path, message="legacy-missing"
                )
            )
            continue
        if modern_path.exists():
            actions.append(
                MigrationAction(
                    kind="skip",
                    legacy=legacy_path,
                    modern=modern_path,
                    message="target-already-exists",
                )
            )
            continue
        actions.append(MigrationAction(kind="move", legacy=legacy_path, modern=modern_path))
        if not dry_run:
            modern_path.parent.mkdir(parents=True, exist_ok=True)
            legacy_path.rename(modern_path)
    return actions


def build_redirect_manifest(
    *,
    root: Path,
    mapping: Dict[str, str],
    include_missing: bool = False,
) -> Dict[str, str]:
    """Build a manifest mapping absolute legacy paths to modern targets."""

    manifest: Dict[str, str] = {}
    for legacy_rel, modern_rel in mapping.items():
        legacy_path = _resolve_base(root, legacy_rel)
        modern_path = _resolve_base(root, modern_rel)
        if not include_missing and not modern_path.exists():
            continue
        manifest[str(legacy_path)] = str(modern_path)
    return manifest


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Migra il layout dei dataset core/derived/external")
    parser.add_argument(
        "--root",
        type=Path,
        default=REPO_ROOT,
        help="Radice del repository o dell'archivio che contiene la cartella data/",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="Percorso al file JSON con le regole di redirect",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra le operazioni senza spostare alcun file",
    )
    parser.add_argument(
        "--redirect-output",
        type=Path,
        help="Se impostato, scrive un manifest JSON legacy->moderno per i servizi esterni",
    )
    parser.add_argument(
        "--include-missing",
        action="store_true",
        help="Includi le voci senza target esistente nel manifest di redirect",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    mapping = _load_redirects(args.config)
    root = args.root.resolve()

    actions = migrate_layout(root=root, mapping=mapping, dry_run=args.dry_run)
    for action in actions:
        print(action.to_log())

    if args.redirect_output:
        manifest = build_redirect_manifest(
            root=root, mapping=mapping, include_missing=args.include_missing
        )
        args.redirect_output.parent.mkdir(parents=True, exist_ok=True)
        args.redirect_output.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(f"[redirect] Manifest scritto in {args.redirect_output}")

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI
    sys.exit(main())
