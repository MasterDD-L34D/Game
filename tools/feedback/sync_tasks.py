"""Sincronizza i feedback prioritari con il backlog incoming.

Lo script legge un file JSONL contenente le submission raccolte dal form
(`intake.jsonl`), filtra quelle con severità pari o superiore alla soglia
configurata e aggiorna `docs/incoming/FEATURE_MAP_EVO_TACTICS.md` aggiungendo
entry strutturate.

Esecuzione tipica:
    python tools/feedback/sync_tasks.py --dry-run
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence

SEVERITY_PRIORITY = {
    "4": "P0",
    "3": "P1",
    "2": "P2",
    "1": "P3",
}

DEFAULT_INTAKE_PATH = Path("data/feedback/intake.jsonl")
DEFAULT_BACKLOG_PATH = Path("docs/incoming/FEATURE_MAP_EVO_TACTICS.md")


@dataclass
class FeedbackEntry:
    """Rappresentazione normalizzata di una submission di feedback."""

    feedback_id: str
    summary: str
    severity: str
    feature_area: str
    scenario_slug: str
    build_version: str
    status: str

    @classmethod
    def from_payload(cls, payload: dict) -> "FeedbackEntry":
        return cls(
            feedback_id=str(payload.get("feedback_id") or payload.get("id") or ""),
            summary=str(payload.get("summary") or payload.get("title") or ""),
            severity=str(payload.get("severity") or "0"),
            feature_area=str(payload.get("feature_area") or payload.get("area") or "uncategorized"),
            scenario_slug=str(payload.get("scenario_slug") or payload.get("scenario") or "unknown"),
            build_version=str(payload.get("build_version") or "n/a"),
            status=str(payload.get("status") or "new"),
        )

    @property
    def priority(self) -> str:
        return SEVERITY_PRIORITY.get(self.severity, "P3")

    def to_markdown(self) -> str:
        return (
            f"- [{self.priority}] {self.feedback_id or 'UNSET'} — {self.summary}\n"
            f"  - build: `{self.build_version}` · scenario: `{self.scenario_slug}`\n"
            f"  - area: `{self.feature_area}` · status: `{self.status}`\n"
        )


def read_intake_file(path: Path) -> List[FeedbackEntry]:
    """Carica le submission dal file JSONL specificato."""

    if not path.exists():
        return []

    entries: List[FeedbackEntry] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            entries.append(FeedbackEntry.from_payload(payload))
    return entries


def filter_priorities(entries: Sequence[FeedbackEntry], min_severity: int) -> List[FeedbackEntry]:
    threshold = max(1, min(4, min_severity))
    return [entry for entry in entries if int(entry.severity or 0) >= threshold]


def append_to_backlog(backlog_path: Path, entries: Iterable[FeedbackEntry]) -> None:
    backlog_path.parent.mkdir(parents=True, exist_ok=True)
    with backlog_path.open("a", encoding="utf-8") as handle:
        handle.write("\n## Feedback prioritari\n")
        for entry in entries:
            handle.write(entry.to_markdown())
            handle.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sincronizza feedback prioritari nel backlog.")
    parser.add_argument("--intake", type=Path, default=DEFAULT_INTAKE_PATH, help="Percorso file JSONL intake")
    parser.add_argument("--backlog", type=Path, default=DEFAULT_BACKLOG_PATH, help="Percorso file backlog Markdown")
    parser.add_argument("--min-severity", type=int, default=3, help="Severità minima da sincronizzare (1-4)")
    parser.add_argument("--dry-run", action="store_true", help="Mostra i task senza scrivere il backlog")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    entries = read_intake_file(args.intake)
    if not entries:
        print(f"Nessuna submission trovata in {args.intake}.")
        return

    selected = filter_priorities(entries, args.min_severity)
    if not selected:
        print("Nessun feedback supera la soglia di severità.")
        return

    if args.dry_run:
        print("Anteprima task da sincronizzare:\n")
        for entry in selected:
            print(entry.to_markdown())
        return

    append_to_backlog(args.backlog, selected)
    print(f"Aggiunti {len(selected)} feedback al backlog {args.backlog}.")


if __name__ == "__main__":
    main()
