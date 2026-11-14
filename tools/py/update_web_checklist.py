"""Aggiorna la checklist web con gli esiti di test e coverage.

Lo script esegue opzionalmente i test automatizzati, raccoglie indicatori
di copertura/regressioni e aggiorna la sezione marcata della checklist
`docs/process/traits_checklist.md`. Può inoltre appendere il riepilogo
al log periodico `logs/web_status.md`.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
from pathlib import Path
from typing import List, Optional


CHECKLIST_MARKER_START = "<!-- web_status:start -->"
CHECKLIST_MARKER_END = "<!-- web_status:end -->"
LOG_MARKER_START = "<!-- web_log:start -->"
LOG_MARKER_END = "<!-- web_log:end -->"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Aggiorna lo stato della checklist web con test e coverage."
    )
    parser.add_argument(
        "--checklist",
        type=Path,
        default=Path("docs/process/traits_checklist.md"),
        help="Percorso al file checklist da aggiornare.",
    )
    parser.add_argument(
        "--tests-command",
        type=str,
        default=None,
        help="Comando da eseguire per i test automatizzati (opzionale).",
    )
    parser.add_argument(
        "--tests-status",
        choices=["pass", "fail"],
        help=(
            "Esito dei test nel caso non venga fornito un comando. "
            "Accetta 'pass' o 'fail'."
        ),
    )
    parser.add_argument(
        "--coverage",
        type=float,
        help="Valore numerico della copertura funzionale (0-100).",
    )
    parser.add_argument(
        "--coverage-file",
        type=Path,
        help=(
            "File JSON da cui estrarre la copertura (chiave 'coverage' o 'total')."
        ),
    )
    parser.add_argument(
        "--regressions",
        type=str,
        default=None,
        help="Elenco regressioni separato da punto e virgola o 'nessuna'.",
    )
    parser.add_argument(
        "--regressions-file",
        type=Path,
        help="File di testo con regressioni (una per riga).",
    )
    parser.add_argument(
        "--notes",
        type=str,
        default=None,
        help="Note opzionali da includere nel report.",
    )
    parser.add_argument(
        "--log",
        type=Path,
        default=Path("logs/web_status.md"),
        help="File log dove registrare il riepilogo periodico.",
    )
    parser.add_argument(
        "--no-log",
        action="store_true",
        help="Non aggiornare il log periodico.",
    )
    return parser.parse_args()


def run_tests(command: Optional[str]) -> tuple[str, Optional[str]]:
    if not command:
        return "non eseguiti", None

    completed = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
    )
    status = "pass" if completed.returncode == 0 else "fail"
    output = (completed.stdout + completed.stderr).strip() or None
    return status, output


def load_coverage(value: Optional[float], file_path: Optional[Path]) -> Optional[float]:
    if value is not None:
        return value
    if not file_path:
        return None
    data = json.loads(file_path.read_text(encoding="utf-8"))
    for key in ("coverage", "total", "functional", "pct"):
        if isinstance(data, dict) and key in data:
            try:
                return float(data[key])
            except (TypeError, ValueError):
                continue
    raise ValueError(
        "Impossibile estrarre la copertura dal file fornito. "
        "Usa una chiave numerica come 'coverage' o 'total'."
    )


def load_regressions(text: Optional[str], file_path: Optional[Path]) -> List[str]:
    entries: List[str] = []
    if text:
        entries.extend([item.strip() for item in text.split(";") if item.strip()])
    if file_path:
        lines = [line.strip() for line in file_path.read_text(encoding="utf-8").splitlines()]
        entries.extend([line for line in lines if line])
    cleaned = [entry for entry in entries if entry.lower() != "nessuna"]
    if not cleaned:
        return []
    # Rimuove duplicati preservando l'ordine
    seen = set()
    unique: List[str] = []
    for entry in cleaned:
        if entry not in seen:
            seen.add(entry)
            unique.append(entry)
    return unique


def format_status_block(
    timestamp: dt.datetime,
    tests_status: str,
    coverage: Optional[float],
    regressions: List[str],
    notes: Optional[str],
    tests_output: Optional[str],
) -> str:
    status_map = {
        "pass": "✅ Test superati",
        "fail": "❌ Test falliti",
        "non eseguiti": "⚠️ Test non eseguiti",
    }
    status_label = status_map.get(tests_status, tests_status)
    coverage_label = (
        f"{coverage:.2f}%" if coverage is not None else "n.d."
    )
    regressions_text = "; ".join(regressions) if regressions else "Nessuna"
    parts = [
        f"**Ultimo aggiornamento:** {timestamp:%Y-%m-%d %H:%M} UTC",
        f"- **Esito test:** {status_label}",
        f"- **Copertura funzionale:** {coverage_label}",
        f"- **Regressioni note:** {regressions_text}",
    ]
    if notes:
        parts.append(f"- **Note:** {notes}")
    if tests_output:
        parts.append("\n<details><summary>Log test</summary>\n\n```")
        parts.append(tests_output)
        parts.append("```\n</details>")
    return "\n".join(parts)


def update_marked_section(
    file_path: Path, start_marker: str, end_marker: str, new_content: str
) -> None:
    text = file_path.read_text(encoding="utf-8")
    pattern = re.compile(
        re.escape(start_marker) + r"(.*?)" + re.escape(end_marker),
        re.DOTALL,
    )
    replacement = f"{start_marker}\n{new_content}\n{end_marker}"
    if pattern.search(text):
        updated = pattern.sub(replacement, text)
    else:
        # Se i marker non esistono, aggiungiamo la sezione in coda.
        updated = text.rstrip() + "\n\n" + replacement + "\n"
    file_path.write_text(updated, encoding="utf-8")


def prepend_log_entry(
    log_path: Path,
    timestamp: dt.datetime,
    tests_status: str,
    coverage: Optional[float],
    regressions: List[str],
    notes: Optional[str],
) -> None:
    if not log_path.exists():
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("# Log stato sito web\n\n", encoding="utf-8")

    text = log_path.read_text(encoding="utf-8")
    pattern = re.compile(
        re.escape(LOG_MARKER_START) + r"(.*?)" + re.escape(LOG_MARKER_END),
        re.DOTALL,
    )

    entry_lines = [
        f"### {timestamp:%Y-%m-%d %H:%M} UTC",
        f"- Esito test: {tests_status}",
        f"- Copertura funzionale: {coverage:.2f}%" if coverage is not None else "- Copertura funzionale: n.d.",
        "- Regressioni: " + ("; ".join(regressions) if regressions else "nessuna"),
    ]
    if notes:
        entry_lines.append(f"- Note: {notes}")
    entry = "\n".join(entry_lines)

    if pattern.search(text):
        existing = pattern.search(text).group(1).strip()
        if existing and existing != "Nessuna esecuzione registrata.":
            combined = entry + "\n\n" + existing
        else:
            combined = entry
        updated = pattern.sub(
            f"{LOG_MARKER_START}\n{combined}\n{LOG_MARKER_END}",
            text,
        )
    else:
        combined = entry
        updated = text.rstrip() + "\n\n" + f"{LOG_MARKER_START}\n{combined}\n{LOG_MARKER_END}\n"
    log_path.write_text(updated + ("\n" if not updated.endswith("\n") else ""), encoding="utf-8")


def main() -> None:
    args = parse_args()
    timestamp = dt.datetime.utcnow()

    tests_status, tests_output = run_tests(args.tests_command)
    if args.tests_status:
        tests_status = args.tests_status

    coverage = load_coverage(args.coverage, args.coverage_file)
    regressions = load_regressions(args.regressions, args.regressions_file)

    status_block = format_status_block(
        timestamp,
        tests_status,
        coverage,
        regressions,
        args.notes,
        tests_output,
    )
    update_marked_section(
        args.checklist,
        CHECKLIST_MARKER_START,
        CHECKLIST_MARKER_END,
        status_block,
    )

    if not args.no_log and args.log:
        prepend_log_entry(
            args.log,
            timestamp,
            tests_status,
            coverage,
            regressions,
            args.notes,
        )


if __name__ == "__main__":
    main()
