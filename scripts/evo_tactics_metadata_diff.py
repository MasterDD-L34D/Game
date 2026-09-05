#!/usr/bin/env python3
"""Utility per analizzare la documentazione Evo-Tactics.

Il comando svolge due operazioni principali:

1. Estrae dal file di inventario gli elementi importati che sono stati
   convertiti nella cartella `docs/evo-tactics/`, riportando la
   destinazione indicata nelle note o nei campi dedicati.
2. Confronta i metadati (frontmatter YAML) e le ancore esplicite
   `{#ancora}` tra i documenti consolidati e le versioni archiviate nel
   cleanup del 19 dicembre 2025.

L'output è un JSON che include l'elenco dei documenti importati, i
risultati del diff e un riepilogo di eventuali file non abbinati.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import yaml


ANCHOR_PATTERN = re.compile(r"\{#([^}]+)\}")


@dataclass
class InventoryEntry:
    source: str
    destination: Optional[str]
    note: Optional[str]


@dataclass
class DiffResult:
    consolidated: Path
    archive: Optional[Path]
    frontmatter_missing_in_archive: List[str]
    frontmatter_missing_in_consolidated: List[str]
    frontmatter_mismatched: Dict[str, Tuple[Optional[str], Optional[str]]]
    anchors_added: List[str]
    anchors_removed: List[str]


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mode",
        choices={"diff", "backfill", "anchors"},
        default="diff",
        help=(
            "Modalità operativa: "
            "`diff` genera il report JSON (default); "
            "`backfill` sincronizza i frontmatter nell'archivio; "
            "`anchors` produce la mappa delle ancore."
        ),
    )
    parser.add_argument(
        "--inventory",
        type=Path,
        default=Path("incoming/lavoro_da_classificare/inventario.yml"),
        help="Percorso al file di inventario.",
    )
    parser.add_argument(
        "--consolidated-root",
        type=Path,
        default=Path("docs/evo-tactics"),
        help="Radice dei documenti consolidati.",
    )
    parser.add_argument(
        "--archive-root",
        type=Path,
        default=Path("incoming/archive/2025-12-19_inventory_cleanup"),
        help="Radice dell'archivio da confrontare.",
    )
    parser.add_argument(
        "--target",
        type=Path,
        help=(
            "Directory di destinazione per la modalità `backfill`."
            " Se omessa viene utilizzato `--archive-root`."
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Percorso del file JSON di output. Se omesso stampa su stdout.",
    )
    return parser.parse_args()


def load_inventory_entries(path: Path) -> List[InventoryEntry]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    entries: List[InventoryEntry] = []
    for item in data.get("inventario", []):
        source = str(item.get("percorso"))
        note = item.get("note")
        destination = item.get("destinazione")

        if note:
            match = re.search(r"convertito in\s+([\w./-]+\.md)", note)
            if match:
                destination = destination or match.group(1)

        # Consideriamo solo elementi che hanno una destinazione esplicita
        if destination:
            entries.append(
                InventoryEntry(
                    source=source,
                    destination=str(destination),
                    note=note,
                )
            )

    return entries


def read_frontmatter(path: Path) -> Dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}

    end = text.find("\n---", 4)
    if end == -1:
        return {}

    frontmatter_text = text[4:end]
    try:
        meta = yaml.safe_load(frontmatter_text) or {}
    except yaml.YAMLError:
        meta = {}
    # Convertiamo tutto in stringhe per un confronto coerente
    normalized = {}
    for key, value in meta.items():
        if isinstance(value, (list, dict)):
            normalized[key] = json.dumps(value, sort_keys=True, ensure_ascii=False)
        else:
            normalized[key] = str(value)
    return normalized


def extract_frontmatter(path: Path) -> Tuple[Dict[str, object], str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}, text

    end = text.find("\n---", 4)
    if end == -1:
        return {}, text

    frontmatter_text = text[4:end]
    body = text[end + 4 :]
    try:
        data = yaml.safe_load(frontmatter_text) or {}
    except yaml.YAMLError:
        data = {}
    return data, body


def extract_anchors(path: Path) -> List[str]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    anchors = set(match.group(1) for match in ANCHOR_PATTERN.finditer(text))
    return sorted(anchors)


def normalized_name(path: Path) -> str:
    stem = path.stem.lower()
    return re.sub(r"[^a-z0-9]+", " ", stem)


def find_best_match(consolidated: Path, archive_files: Iterable[Path]) -> Optional[Path]:
    best_path: Optional[Path] = None
    best_ratio = 0.0
    consolidated_name = normalized_name(consolidated)

    for candidate in archive_files:
        ratio = SequenceMatcher(None, consolidated_name, normalized_name(candidate)).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_path = candidate

    if best_ratio < 0.45:
        return None
    return best_path


def diff_documents(consolidated_files: List[Path], archive_root: Path) -> List[DiffResult]:
    archive_files = sorted(archive_root.rglob("*.md"))
    results: List[DiffResult] = []

    for consolidated in sorted(consolidated_files):
        archive_match = find_best_match(consolidated, archive_files)

        consolidated_frontmatter = read_frontmatter(consolidated)
        consolidated_anchors = extract_anchors(consolidated)

        if archive_match and archive_match.exists():
            archive_frontmatter = read_frontmatter(archive_match)
            archive_anchors = extract_anchors(archive_match)
        else:
            archive_frontmatter = {}
            archive_anchors = []

        missing_in_archive = sorted(set(consolidated_frontmatter) - set(archive_frontmatter))
        missing_in_consolidated = sorted(set(archive_frontmatter) - set(consolidated_frontmatter))

        mismatched: Dict[str, Tuple[Optional[str], Optional[str]]] = {}
        for key in set(consolidated_frontmatter) & set(archive_frontmatter):
            if consolidated_frontmatter[key] != archive_frontmatter[key]:
                mismatched[key] = (
                    consolidated_frontmatter[key],
                    archive_frontmatter[key],
                )

        anchors_added = sorted(set(consolidated_anchors) - set(archive_anchors))
        anchors_removed = sorted(set(archive_anchors) - set(consolidated_anchors))

        results.append(
            DiffResult(
                consolidated=consolidated,
                archive=archive_match,
                frontmatter_missing_in_archive=missing_in_archive,
                frontmatter_missing_in_consolidated=missing_in_consolidated,
                frontmatter_mismatched=mismatched,
                anchors_added=anchors_added,
                anchors_removed=anchors_removed,
            )
        )

    return results


def build_payload(entries: List[InventoryEntry], diffs: List[DiffResult]) -> Dict[str, object]:
    payload: Dict[str, object] = {
        "imports": [
            {
                "source": entry.source,
                "destination": entry.destination,
                "note": entry.note,
            }
            for entry in entries
        ],
        "diffs": [],
        "unmatched": [],
    }

    for diff in diffs:
        if diff.archive is None:
            payload["unmatched"].append(str(diff.consolidated))

        payload["diffs"].append(
            {
                "consolidated": str(diff.consolidated),
                "archive": str(diff.archive) if diff.archive else None,
                "frontmatter_missing_in_archive": diff.frontmatter_missing_in_archive,
                "frontmatter_missing_in_consolidated": diff.frontmatter_missing_in_consolidated,
                "frontmatter_mismatched": {
                    key: {
                        "consolidated": value[0],
                        "archive": value[1],
                    }
                    for key, value in diff.frontmatter_mismatched.items()
                },
                "anchors_added": diff.anchors_added,
                "anchors_removed": diff.anchors_removed,
            }
        )

    return payload


def write_frontmatter(path: Path, frontmatter: Dict[str, object], body: str) -> None:
    cleaned_body = body.lstrip("\n")
    yaml_block = yaml.safe_dump(frontmatter, sort_keys=False, allow_unicode=True).strip()
    rendered = "---\n"
    if yaml_block:
        rendered += f"{yaml_block}\n"
    rendered += "---\n"
    if cleaned_body:
        rendered += "\n" + cleaned_body
    if not rendered.endswith("\n"):
        rendered += "\n"
    path.write_text(rendered, encoding="utf-8")


def run_backfill(diffs: List[DiffResult], archive_root: Path, target_root: Path) -> None:
    updated = 0
    skipped = 0
    for diff in diffs:
        if diff.archive is None:
            skipped += 1
            continue

        consolidated_data, _ = extract_frontmatter(diff.consolidated)
        if not consolidated_data:
            skipped += 1
            continue

        try:
            archive_rel = diff.archive.relative_to(archive_root)
        except ValueError:
            archive_rel = diff.archive.name
        archive_path = target_root / archive_rel

        if not archive_path.exists():
            skipped += 1
            continue

        archive_path.parent.mkdir(parents=True, exist_ok=True)
        _, body = extract_frontmatter(archive_path)
        write_frontmatter(archive_path, consolidated_data, body)
        updated += 1

    print(f"Frontmatter sincronizzati: {updated}; file saltati: {skipped}")


def generate_anchor_map(files: List[Path], base: Path) -> List[Tuple[str, str, str]]:
    rows: List[Tuple[str, str, str]] = []
    for file_path in files:
        anchors = extract_anchors(file_path)
        if not anchors:
            continue
        rel_path = file_path.relative_to(base)
        document_path = (base / rel_path).resolve().relative_to(Path.cwd())
        href_root = "/" + str(document_path.with_suffix(""))
        href_root = href_root.replace("\\", "/")
        for anchor in anchors:
            rows.append((str(document_path), anchor, f"{href_root}#{anchor}"))
    rows.sort()
    return rows


def run_anchors(files: List[Path], base: Path, output_path: Path) -> None:
    rows = generate_anchor_map(files, base)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        handle.write("document,anchor,href\n")
        for document, anchor, href in rows:
            handle.write(f"{document},{anchor},{href}\n")
    print(f"Mappa ancore generata: {output_path}")


def main() -> None:
    args = parse_arguments()

    entries = load_inventory_entries(args.inventory)

    consolidated_files = list(args.consolidated_root.rglob("*.md"))
    diffs = diff_documents(consolidated_files, args.archive_root)

    if args.mode == "backfill":
        target = args.target or args.archive_root
        run_backfill(diffs, args.archive_root, target)
        return

    if args.mode == "anchors":
        if not args.output:
            raise SystemExit("La modalità 'anchors' richiede l'argomento --output")
        run_anchors(consolidated_files, args.consolidated_root, args.output)
        return

    payload = build_payload(entries, diffs)

    output = json.dumps(payload, indent=2, ensure_ascii=False)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)


if __name__ == "__main__":
    main()
