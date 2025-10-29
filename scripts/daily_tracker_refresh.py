#!/usr/bin/env python3
"""Genera l'indice tracker e aggiorna lo stato di avanzamento nel README.

Il contenuto è guidato da `config/tracker_registry.yaml` e viene inserito tra
marcatori dedicati in `docs/00-INDEX.md` e `README.md`.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "config" / "tracker_registry.yaml"
INDEX_MARKER_START = "<!-- tracker-registry:start -->"
INDEX_MARKER_END = "<!-- tracker-registry:end -->"
STATUS_MARKER_START = "<!-- tracker-status:start -->"
STATUS_MARKER_END = "<!-- tracker-status:end -->"
CHECKBOX_PATTERN = re.compile(r"- \[(?P<state>[ xX])\]")


@dataclass
class TrackerEntry:
    path: Path
    title: str
    purpose: str
    owner: str

    def last_update(self) -> str:
        return git_last_modified(self.path)

    def file_name(self) -> str:
        return self.path.name


@dataclass
class ProgressCompute:
    kind: str
    path: Optional[Path] = None
    value: Optional[float] = None


@dataclass
class ProgressReference:
    label: str
    target: str

    def to_markdown(self) -> str:
        return f"[{self.label}]({self.target})"


@dataclass
class ProgressItem:
    name: str
    description: str
    compute: ProgressCompute
    references: List[ProgressReference]

    def ratio(self) -> float:
        if self.compute.kind == "checkbox":
            if self.compute.path is None:
                raise ValueError("Il percorso per il metodo checkbox non può essere nullo")
            checked, total = count_checkboxes(self.compute.path)
            if total == 0:
                return 0.0
            return checked / total
        if self.compute.kind == "manual":
            if self.compute.value is None:
                raise ValueError("Il metodo manual richiede un valore esplicito")
            return max(0.0, min(1.0, self.compute.value))
        raise ValueError(f"Metodo di calcolo sconosciuto: {self.compute.kind}")

    def progress_bar(self) -> str:
        ratio = self.ratio()
        percent = round(ratio * 100)
        filled = int(round(percent / 10))
        filled = max(0, min(10, filled))
        bar = "█" * filled + "░" * (10 - filled)
        references_md = " e ".join(ref.to_markdown() for ref in self.references)
        reference_tail = f" Vedi {references_md}." if references_md else ""
        return (
            f"- **{bar} {percent}% · {self.name}** — {self.description}{reference_tail}"
        )


@dataclass
class ProgressSection:
    category: str
    items: List[ProgressItem]

    def to_markdown(self) -> str:
        lines = [f"#### {self.category}"]
        lines.extend(item.progress_bar() for item in self.items)
        return "\n".join(lines)


def load_config(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def build_tracker_entries(config: Dict[str, Any]) -> Dict[str, List[TrackerEntry]]:
    result: Dict[str, List[TrackerEntry]] = {}
    for table in config.get("tables", []):
        entries: List[TrackerEntry] = []
        for raw_entry in table.get("entries", []):
            entry = TrackerEntry(
                path=(REPO_ROOT / raw_entry["path"]).resolve().relative_to(REPO_ROOT),
                title=raw_entry["title"],
                purpose=raw_entry["purpose"],
                owner=raw_entry.get("owner", "N/D"),
            )
            entries.append(entry)
        result[table["title"]] = entries
    return result


def build_progress_sections(config: Dict[str, Any]) -> List[ProgressSection]:
    sections: List[ProgressSection] = []
    for raw_section in config.get("progress_sections", []):
        items: List[ProgressItem] = []
        for raw_item in raw_section.get("items", []):
            compute_cfg = raw_item.get("compute", {})
            compute = ProgressCompute(
                kind=compute_cfg.get("type", "manual"),
                path=(REPO_ROOT / compute_cfg["path"]).resolve().relative_to(REPO_ROOT)
                if compute_cfg.get("path")
                else None,
                value=compute_cfg.get("value"),
            )
            references = [
                ProgressReference(label=ref.get("label", ref["target"]), target=ref["target"])
                for ref in raw_item.get("references", [])
            ]
            items.append(
                ProgressItem(
                    name=raw_item["name"],
                    description=raw_item["description"],
                    compute=compute,
                    references=references,
                )
            )
        sections.append(ProgressSection(category=raw_section["category"], items=items))
    return sections


def count_checkboxes(path: Path) -> tuple[int, int]:
    file_path = REPO_ROOT / path
    text = file_path.read_text(encoding="utf-8")
    matches = CHECKBOX_PATTERN.findall(text)
    total = len(matches)
    checked = sum(1 for state in matches if state.lower() == "x")
    return checked, total


def git_last_modified(path: Path) -> str:
    rel_path = str(path)
    try:
        output = subprocess.check_output(
            ["git", "log", "-1", "--format=%cs", rel_path],
            cwd=REPO_ROOT,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return "N/D"
    value = output.decode().strip()
    return value or "N/D"


def generate_table_markdown(entries_by_category: Dict[str, List[TrackerEntry]]) -> str:
    sections: List[str] = []
    for category, entries in entries_by_category.items():
        lines = [f"### {category}", "", "| File | Titolo | Scopo | Owner attuale | Ultimo aggiornamento | Percorso |", "| --- | --- | --- | --- | --- | --- |"]
        for entry in entries:
            file_link = f"[{entry.file_name()}]({entry.path.as_posix()})"
            last_update = entry.last_update()
            percorso = f"`{entry.path.as_posix()}`"
            lines.append(
                f"| {file_link} | {entry.title} | {entry.purpose} | {entry.owner} | {last_update} | {percorso} |"
            )
        sections.append("\n".join(lines))
    return "\n\n".join(sections)


def generate_status_markdown(progress_sections: Iterable[ProgressSection]) -> str:
    return "\n\n".join(section.to_markdown() for section in progress_sections)


def replace_section(content: str, marker_start: str, marker_end: str, new_section: str) -> str:
    if marker_start not in content or marker_end not in content:
        raise ValueError("Marcatori non trovati nel file di destinazione")
    before, _, rest = content.partition(marker_start)
    _, _, after = rest.partition(marker_end)
    return f"{before}{marker_start}\n{new_section}\n{marker_end}{after}"


def write_if_changed(path: Path, new_content: str) -> bool:
    path = path if path.is_absolute() else REPO_ROOT / path
    existing = path.read_text(encoding="utf-8")
    if existing == new_content:
        return False
    path.write_text(new_content, encoding="utf-8")
    return True


def update_index(entries_by_category: Dict[str, List[TrackerEntry]], index_path: Path) -> bool:
    full_path = REPO_ROOT / index_path
    content = full_path.read_text(encoding="utf-8")
    table_md = generate_table_markdown(entries_by_category)
    new_content = replace_section(content, INDEX_MARKER_START, INDEX_MARKER_END, table_md)
    return write_if_changed(full_path, new_content)


def update_readme(progress_sections: List[ProgressSection], readme_path: Path) -> bool:
    full_path = REPO_ROOT / readme_path
    content = full_path.read_text(encoding="utf-8")
    status_md = generate_status_markdown(progress_sections)
    new_content = replace_section(content, STATUS_MARKER_START, STATUS_MARKER_END, status_md)
    return write_if_changed(full_path, new_content)


def export_summary(
    path: Optional[Path],
    entries: Dict[str, List[TrackerEntry]],
    sections: List[ProgressSection],
) -> None:
    if path is None:
        return
    summary = {
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "tables": {
            category: [
                {
                    "path": entry.path.as_posix(),
                    "title": entry.title,
                    "purpose": entry.purpose,
                    "owner": entry.owner,
                    "last_update": entry.last_update(),
                }
                for entry in entries_list
            ]
            for category, entries_list in entries.items()
        },
        "progress": {
            section.category: [
                {
                    "name": item.name,
                    "description": item.description,
                    "ratio": item.ratio(),
                    "references": [ref.target for ref in item.references],
                }
                for item in section.items
            ]
            for section in sections
        },
    }
    export_path = path if path.is_absolute() else REPO_ROOT / path
    export_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aggiorna tracker e stato README")
    parser.add_argument("--config", default=str(CONFIG_PATH), help="File di configurazione YAML")
    parser.add_argument("--index", default="docs/00-INDEX.md", help="Percorso dell'indice da aggiornare")
    parser.add_argument("--readme", default="README.md", help="Percorso del README da aggiornare")
    parser.add_argument("--export-json", dest="export_json", default=None, help="Percorso opzionale per esportare un riepilogo JSON")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(Path(args.config))
    entries_by_category = build_tracker_entries(config)
    progress_sections = build_progress_sections(config)

    index_changed = update_index(entries_by_category, Path(args.index))
    readme_changed = update_readme(progress_sections, Path(args.readme))
    if args.export_json:
        export_summary(Path(args.export_json), entries_by_category, progress_sections)

    changed = []
    if index_changed:
        changed.append(args.index)
    if readme_changed:
        changed.append(args.readme)
    if changed:
        print("Aggiornati:", ", ".join(changed))
    else:
        print("Nessun aggiornamento necessario")


if __name__ == "__main__":
    main()
