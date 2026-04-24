#!/usr/bin/env python3
"""Validate docs governance registry and metadata coherence."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DEFAULT_REQUIRED_FIELDS = [
    "doc_status",
    "doc_owner",
    "workstream",
    "last_verified",
    "source_of_truth",
    "language",
    "review_cycle_days",
]
DEFAULT_STATUS_VALUES = {
    "active",
    "draft",
    "review_needed",
    "legacy_active",
    "generated",
    "historical_ref",
    "superseded",
}
DEFAULT_WORKSTREAMS = {
    "flow",
    "atlas",
    "backend",
    "dataset-pack",
    "ops-qa",
    "incoming",
    "cross-cutting",
    "combat",
}
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")


@dataclass
class Issue:
    level: str
    code: str
    path: str
    message: str

    def as_dict(self) -> dict[str, str]:
        return {
            "level": self.level,
            "code": self.code,
            "path": self.path,
            "message": self.message,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--registry",
        default="docs/governance/docs_registry.json",
        help="Path to governance registry JSON.",
    )
    parser.add_argument(
        "--report",
        default="reports/docs/governance_drift_report.json",
        help="Path for JSON report output.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when errors are found.",
    )
    parser.add_argument(
        "--strict-warnings",
        action="store_true",
        help="Exit non-zero when warnings are found.",
    )
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def parse_frontmatter(path: Path) -> dict[str, Any] | None:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return None

    end = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end = idx
            break
    if end is None:
        return None

    fields: dict[str, Any] = {}
    for raw in lines[1:end]:
        line = raw.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()

        # Strip matching surrounding YAML quotes (single or double).
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]

        if value.lower() == "true":
            fields[key] = True
        elif value.lower() == "false":
            fields[key] = False
        elif re.fullmatch(r"[0-9]+", value):
            fields[key] = int(value)
        else:
            fields[key] = value
    return fields


def parse_iso_date(value: str) -> date | None:
    if not DATE_RE.match(value):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def compare_frontmatter(
    issues: list[Issue],
    rel_path: str,
    frontmatter: dict[str, Any],
    entry: dict[str, Any],
    required_fields: list[str],
) -> None:
    for field in required_fields:
        if field not in frontmatter:
            issues.append(
                Issue(
                    "error",
                    "frontmatter_missing_field",
                    rel_path,
                    f"Campo obbligatorio mancante nel frontmatter: {field}",
                )
            )
            continue

        expected = entry.get(field)
        actual = frontmatter.get(field)
        if str(actual) != str(expected):
            issues.append(
                Issue(
                    "warning",
                    "frontmatter_registry_mismatch",
                    rel_path,
                    f"Campo {field} differente tra frontmatter ({actual}) e registry ({expected})",
                )
            )


def validate_registry(repo_root: Path, registry: dict[str, Any]) -> list[Issue]:
    issues: list[Issue] = []
    entries = registry.get("entries", [])
    status_values = set(registry.get("doc_status_values", list(DEFAULT_STATUS_VALUES)))
    workstreams = set(registry.get("workstreams", list(DEFAULT_WORKSTREAMS)))
    required_fields = DEFAULT_REQUIRED_FIELDS
    today = datetime.now(timezone.utc).date()

    if not isinstance(entries, list) or not entries:
        issues.append(Issue("error", "registry_entries_empty", "docs/governance/docs_registry.json", "Il registry non contiene entry valide."))
        return issues

    entrypoint = registry.get("entrypoint")
    if not isinstance(entrypoint, str) or not entrypoint:
        issues.append(Issue("error", "entrypoint_missing", "docs/governance/docs_registry.json", "Campo entrypoint mancante o invalido."))

    source_of_truth_paths: list[str] = []
    ws_coverage: dict[str, int] = {ws: 0 for ws in workstreams}

    for entry in entries:
        rel_path = str(entry.get("path", ""))
        if not rel_path:
            issues.append(Issue("error", "entry_path_missing", "docs/governance/docs_registry.json", "Entry senza path."))
            continue

        abs_path = repo_root / rel_path

        for field in required_fields:
            if field not in entry:
                issues.append(Issue("error", "entry_missing_field", rel_path, f"Campo obbligatorio mancante nel registry: {field}"))

        status = entry.get("doc_status")
        if status not in status_values:
            issues.append(Issue("error", "invalid_doc_status", rel_path, f"doc_status non ammesso: {status}"))

        ws = entry.get("workstream")
        if ws not in workstreams:
            issues.append(Issue("error", "invalid_workstream", rel_path, f"workstream non ammesso: {ws}"))
        else:
            if entry.get("source_of_truth") is True:
                ws_coverage[ws] = ws_coverage.get(ws, 0) + 1

        lv = str(entry.get("last_verified", ""))
        lv_date = parse_iso_date(lv)
        if lv_date is None:
            issues.append(Issue("error", "invalid_last_verified", rel_path, f"last_verified invalida: {lv}"))
        else:
            cycle = entry.get("review_cycle_days")
            if not isinstance(cycle, int) or cycle <= 0:
                issues.append(Issue("error", "invalid_review_cycle", rel_path, f"review_cycle_days invalido: {cycle}"))
            else:
                due = lv_date + timedelta(days=cycle)
                if due < today:
                    issues.append(Issue("warning", "stale_document", rel_path, f"Documento stale: revisione scaduta il {due.isoformat()}"))

        if not abs_path.exists():
            issues.append(Issue("error", "path_missing", rel_path, "Percorso dichiarato nel registry non trovato."))
            continue

        if entry.get("source_of_truth") is True:
            source_of_truth_paths.append(rel_path)
            frontmatter = parse_frontmatter(abs_path)
            if frontmatter is None:
                issues.append(Issue("error", "frontmatter_missing", rel_path, "Documento source_of_truth senza frontmatter YAML."))
            else:
                compare_frontmatter(issues, rel_path, frontmatter, entry, required_fields)

    if entrypoint and entrypoint not in source_of_truth_paths:
        issues.append(
            Issue(
                "error",
                "entrypoint_not_source_of_truth",
                str(entrypoint),
                "L'entrypoint dichiarato non e' marcato come source_of_truth nel registry.",
            )
        )

    for ws in sorted(workstreams):
        if ws == "cross-cutting":
            continue
        if ws_coverage.get(ws, 0) == 0:
            issues.append(
                Issue(
                    "warning",
                    "workstream_without_canonical_doc",
                    "docs/governance/docs_registry.json",
                    f"Nessun documento source_of_truth per workstream: {ws}",
                )
            )

    return issues


def write_report(path: Path, issues: list[Issue]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "summary": {
            "total": len(issues),
            "errors": sum(1 for issue in issues if issue.level == "error"),
            "warnings": sum(1 for issue in issues if issue.level == "warning"),
        },
        "issues": [issue.as_dict() for issue in issues],
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    registry_path = (repo_root / args.registry).resolve()
    report_path = (repo_root / args.report).resolve()

    if not registry_path.exists():
        print(f"[docs-governance] registry non trovato: {registry_path}")
        return 2

    registry = load_json(registry_path)
    issues = validate_registry(repo_root, registry)
    write_report(report_path, issues)

    errors = sum(1 for issue in issues if issue.level == "error")
    warnings = sum(1 for issue in issues if issue.level == "warning")

    print(f"[docs-governance] report: {report_path}")
    print(f"[docs-governance] errors={errors} warnings={warnings}")

    if args.strict and errors > 0:
        return 1
    if args.strict_warnings and warnings > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


