"""Genera report settimanale a partire dalle submission di feedback."""

from __future__ import annotations

import argparse
import csv
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Iterable, List

import sync_tasks

DEFAULT_INTAKE_PATH = Path("data/feedback/intake.jsonl")
DEFAULT_OUTPUT_DIR = Path("reports/feedback")


def summarise_by(entries: Iterable[sync_tasks.FeedbackEntry], attribute: str) -> Counter:
    counter: Counter = Counter()
    for entry in entries:
        counter[getattr(entry, attribute, "unknown") or "unknown"] += 1
    return counter


def write_markdown_report(entries: List[sync_tasks.FeedbackEntry], output_path: Path) -> None:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    severity_counts = summarise_by(entries, "severity")
    area_counts = summarise_by(entries, "feature_area")

    lines = [
        "# Feedback weekly digest",
        "",
        f"Generato il: {timestamp}",
        "",
        "## Totali",
        f"- Submission totali: {len(entries)}",
    ]
    lines.append("- Distribuzione severità:")
    for severity in sorted(severity_counts.keys(), reverse=True):
        lines.append(f"  - S{severity}: {severity_counts[severity]}")
    lines.append("- Distribuzione area:")
    for area, count in sorted(area_counts.items(), key=lambda item: item[1], reverse=True):
        lines.append(f"  - {area}: {count}")

    lines.append("\n## Dettaglio priorità")
    for entry in entries:
        lines.append(
            f"- [{entry.priority}] {entry.feedback_id or 'UNSET'} — {entry.summary} (build {entry.build_version}, scenario {entry.scenario_slug})"
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def write_csv_snapshot(entries: List[sync_tasks.FeedbackEntry], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "feedback_id",
        "priority",
        "severity",
        "feature_area",
        "scenario_slug",
        "build_version",
        "status",
    ]
    with output_path.open("w", encoding="utf-8", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for entry in entries:
            writer.writerow(
                {
                    "feedback_id": entry.feedback_id,
                    "priority": entry.priority,
                    "severity": entry.severity,
                    "feature_area": entry.feature_area,
                    "scenario_slug": entry.scenario_slug,
                    "build_version": entry.build_version,
                    "status": entry.status,
                }
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera report feedback in Markdown e CSV")
    parser.add_argument("--intake", type=Path, default=DEFAULT_INTAKE_PATH, help="Percorso file JSONL intake")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Directory di output")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    entries = sync_tasks.read_intake_file(args.intake)
    if not entries:
        print(f"Nessuna submission trovata in {args.intake}.")
        return

    markdown_path = args.output_dir / "weekly_digest.md"
    csv_path = args.output_dir / "weekly_digest.csv"

    write_markdown_report(entries, markdown_path)
    write_csv_snapshot(entries, csv_path)
    print(f"Report generato in {markdown_path} e {csv_path}.")


if __name__ == "__main__":
    main()
