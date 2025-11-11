"""Utility per sincronizzare i trace hash dei manifest del pacchetto Evo Tactics.

Lo script normalizza il contenuto dei manifest (JSON e YAML), escludendo i
campi ``trace_hash``, calcola l'hash SHA-256 del payload risultante e aggiorna
il valore del campo ``trace_hash`` originale mantenendo il formato del file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import List, MutableMapping, Sequence

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]


JSON_DIRECTORIES: Sequence[Path] = (
    REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "species",
    REPO_ROOT / "docs" / "evo-tactics-pack" / "species",
    REPO_ROOT / "public" / "docs" / "evo-tactics-pack" / "species",
)

JSON_AGGREGATES: Sequence[Path] = (
    REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "catalog_data.json",
    REPO_ROOT / "docs" / "evo-tactics-pack" / "catalog_data.json",
    REPO_ROOT / "public" / "docs" / "evo-tactics-pack" / "catalog_data.json",
)

YAML_ROOT = REPO_ROOT / "packs" / "evo_tactics_pack" / "data"


@dataclass
class UpdateResult:
    path: Path
    trace_hashes: List[str]


@dataclass
class CanonicalTraceHashes:
    by_path: dict[Path, str]
    by_id: dict[str, str]


def _remove_trace_hashes(payload):
    """Remove trace_hash keys recursively from a manifest payload."""

    if isinstance(payload, MutableMapping):
        cleaned = {}
        for key, value in payload.items():
            if key == "trace_hash":
                continue
            cleaned[key] = _remove_trace_hashes(value)
        return cleaned
    if isinstance(payload, list):
        return [_remove_trace_hashes(item) for item in payload]
    return payload


def _stable_digest(manifest_payload) -> str:
    cleaned = _remove_trace_hashes(manifest_payload)
    normalized = json.dumps(
        cleaned,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    )
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _resolve_canonical_digest(
    *,
    current_file: Path,
    manifest: MutableMapping[str, object],
    canonical: CanonicalTraceHashes,
) -> str | None:
    path_value = manifest.get("path")
    if isinstance(path_value, str):
        resolved = (current_file.parent / path_value).resolve()
        digest = canonical.by_path.get(resolved)
        if digest:
            return digest

    manifest_id = manifest.get("id")
    if isinstance(manifest_id, str):
        return canonical.by_id.get(manifest_id)

    return None


def _update_json_file(
    path: Path, *, apply: bool, canonical: CanonicalTraceHashes
) -> UpdateResult | None:
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle, object_pairs_hook=OrderedDict)

    pending_updates: List[tuple[MutableMapping[str, object], str]] = []

    def _process(node) -> None:
        if isinstance(node, MutableMapping):
            receipt = node.get("receipt")
            if isinstance(receipt, MutableMapping) and "trace_hash" in receipt:
                digest = _resolve_canonical_digest(
                    current_file=path, manifest=node, canonical=canonical
                )
                if digest is None:
                    digest = _stable_digest(node)
                if receipt.get("trace_hash") != digest:
                    pending_updates.append((receipt, digest))
            for value in node.values():
                _process(value)
        elif isinstance(node, list):
            for item in node:
                _process(item)

    _process(payload)

    if not pending_updates:
        return None

    if apply:
        for receipt, digest in pending_updates:
            receipt["trace_hash"] = digest
        with path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, ensure_ascii=False)
            handle.write("\n")

    return UpdateResult(path=path, trace_hashes=[digest for _, digest in pending_updates])


def _update_yaml_file(
    path: Path, *, apply: bool
) -> tuple[UpdateResult | None, str | None, str | None]:
    text = path.read_text(encoding="utf-8")
    payload = yaml.safe_load(text)

    if not isinstance(payload, MutableMapping):
        return None, None, None

    digest = _stable_digest(payload)
    manifest_id = payload.get("id") if isinstance(payload.get("id"), str) else None

    updated_text_lines: List[str] = []
    changed = False

    for line in text.splitlines():
        if "trace_hash:" not in line:
            updated_text_lines.append(line)
            continue

        prefix, sep, suffix = line.partition("trace_hash:")
        if not sep:
            updated_text_lines.append(line)
            continue

        comment = ""
        value_part = suffix
        if "#" in suffix:
            value_part, comment = suffix.split("#", 1)
            comment = "#" + comment

        leading_ws_len = len(value_part) - len(value_part.lstrip(" "))
        leading_ws = value_part[:leading_ws_len]
        value_str = value_part.strip()

        quote = ""
        if value_str.startswith(("'", '"')) and value_str.endswith(value_str[0]):
            quote = value_str[0]

        new_line = f"{prefix}trace_hash:{leading_ws}{quote}{digest}{quote}"
        if comment:
            if not comment.startswith(" "):
                new_line += " "
            new_line += comment

        if new_line != line:
            changed = True
        updated_text_lines.append(new_line)

    if not changed:
        return None, digest, manifest_id

    if apply:
        path.write_text("\n".join(updated_text_lines) + "\n", encoding="utf-8")

    return UpdateResult(path=path, trace_hashes=[digest]), digest, manifest_id


def _collect_canonical_trace_hashes(*, apply: bool) -> tuple[CanonicalTraceHashes, List[UpdateResult]]:
    updates: List[UpdateResult] = []
    by_path: dict[Path, str] = {}
    by_id: dict[str, str] = {}

    if not YAML_ROOT.exists():
        return CanonicalTraceHashes(by_path=by_path, by_id=by_id), updates

    yaml_paths = sorted(YAML_ROOT.rglob("*.yaml")) + sorted(YAML_ROOT.rglob("*.yml"))

    for path in yaml_paths:
        result, digest, manifest_id = _update_yaml_file(path, apply=apply)
        if digest:
            resolved = path.resolve()
            by_path[resolved] = digest
            if manifest_id:
                by_id.setdefault(manifest_id, digest)
        if result:
            updates.append(result)

    return CanonicalTraceHashes(by_path=by_path, by_id=by_id), updates

def update_trace_hashes(*, apply: bool) -> List[UpdateResult]:
    updates: List[UpdateResult] = []

    canonical, yaml_updates = _collect_canonical_trace_hashes(apply=apply)
    updates.extend(yaml_updates)

    for directory in JSON_DIRECTORIES:
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.json")):
            result = _update_json_file(path, apply=apply, canonical=canonical)
            if result:
                updates.append(result)

    for path in JSON_AGGREGATES:
        if path.exists():
            result = _update_json_file(path, apply=apply, canonical=canonical)
            if result:
                updates.append(result)

    return updates


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Calcola gli hash senza modificare i file",
    )

    args = parser.parse_args(argv)

    if args.dry_run:
        updates = update_trace_hashes(apply=False)
        if updates:
            print("Sono stati rilevati hash da aggiornare:")
            for update in updates:
                hashes = ", ".join(update.trace_hashes)
                print(f" - {update.path}: {hashes}")
            print("Rieseguire senza --dry-run per applicare le modifiche.")
            return 1
        print("Tutti i trace_hash sono aggiornati.")
        return 0

    updates = update_trace_hashes(apply=True)
    for update in updates:
        hashes = ", ".join(update.trace_hashes)
        print(f"Aggiornato {update.path} → {hashes}")

    if not updates:
        print("Nessun trace_hash aggiornato.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
