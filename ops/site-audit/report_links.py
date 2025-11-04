#!/usr/bin/env python3
"""Genera un report Markdown sintetico a partire dal link_report.csv."""
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Iterable


def load_records(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Report non trovato: {path}")
    with path.open(encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        return [dict(row) for row in reader]


def summarize(records: Iterable[dict[str, str]]) -> tuple[int, int, list[dict[str, str]]]:
    records = list(records)
    broken = [
        r
        for r in records
        if r.get("status") in {"error", "404", "500"}
        or (r.get("status") and r["status"].startswith("5"))
        or (r.get("status") and r["status"].startswith("4"))
    ]
    return len(records), len(broken), broken


def render_markdown(site: str, total: int, broken: list[dict[str, str]], output_csv: Path) -> str:
    lines = [
        "# Site Audit",
        "",
        f"- Sito analizzato: `{site}`",
        f"- Link verificati: **{total}**",
        f"- Link problematici: **{len(broken)}**",
        "",
    ]
    if broken:
        lines.append("## Link problematici")
        lines.append("| Pagina sorgente | Link | Stato | Nota |")
        lines.append("| --- | --- | --- | --- |")
        for row in broken:
            lines.append(
                f"| {row.get('source','')} | {row.get('target','')} | {row.get('status','')} | {row.get('note','')} |"
            )
    else:
        lines.append("Nessun link problematico rilevato.")
    lines.append("")
    lines.append(f"_Report generato da `{output_csv}`._")
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--csv", default="ops/site-audit/_out/link_report.csv")
    ap.add_argument("--out", default="REPORT_site_audit.md")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    records = load_records(csv_path)
    total, broken_count, broken = summarize(records)
    markdown = render_markdown(args.site, total, broken, csv_path)
    Path(args.out).write_text(markdown, encoding="utf-8")
    print(f"[report] link totali: {total} | problematici: {broken_count} → {args.out}")


if __name__ == "__main__":
    main()
