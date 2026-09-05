#!/usr/bin/env python3
"""Generate the DECISIONS_LOG.md ADR index from docs/adr/*.md (derive-don't-maintain).

Anti-drift (anti-pattern #19): the chronological ADR index is a GENERATED projection
of the ADR files' front-matter + filename dates, injected between markers. Hand prose
(scope, tag-index, superseded narrative, criteri) lives OUTSIDE the markers and is
preserved verbatim. A CI `git diff --exit-code` gate makes the index impossible to drift.

Design (spec docs/superpowers/specs/2026-05-30-governance-auto-sync-design.md):
- Source of truth = docs/adr/*.md (front-matter `status`/`doc_status` + filename date + title).
- Generated block = a flat chronological table between
  `<!-- gen:adr-index -->` ... `<!-- /gen:adr-index -->`.
- Deterministic: stable sort (date asc, then filename) -> clean diffs.

Usage:
    python tools/generate_decisions_log.py            # rewrite DECISIONS_LOG.md in place
    python tools/generate_decisions_log.py --check    # exit 1 if out of sync (CI gate)
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ADR_DIR = REPO_ROOT / "docs" / "adr"
LOG_PATH = REPO_ROOT / "DECISIONS_LOG.md"
BEGIN = "<!-- gen:adr-index -->"
END = "<!-- /gen:adr-index -->"

DATE_RE = re.compile(r"ADR-(\d{4}(?:-\d{2}){0,2})")


def parse_frontmatter(text: str) -> dict[str, str]:
    """Minimal YAML-ish front-matter: top-level `key: value` between leading `---` fences."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    fields: dict[str, str] = {}
    for raw in lines[1:]:
        if raw.strip() == "---":
            break
        if not raw or raw.lstrip().startswith("#") or ":" not in raw:
            continue
        key, _, val = raw.partition(":")
        key = key.strip()
        val = val.strip().strip("'\"")
        if key and key not in fields:
            fields[key] = val
    return fields


def adr_title(text: str, fm: dict[str, str], stem: str) -> str:
    if fm.get("title"):
        return fm["title"]
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return stem


# normalize ADR-lifecycle `status` + governance `doc_status` into one display vocab,
# so the index column is uniform regardless of which field an ADR uses (anti-mixed-status).
STATUS_MAP = {
    "accepted": "Accepted",
    "active": "Accepted",
    "superseded": "Superseded",
    "deprecated": "Deprecated",
    "proposed": "Proposed",
    "draft": "Proposed",
    "review_needed": "Proposed",
    "historical_ref": "Accepted",
    "legacy_active": "Accepted",
    "rejected": "Rejected",
}


def adr_status(fm: dict[str, str]) -> str:
    """Normalized status; prefer ADR `status`, fallback governance `doc_status`.
    Clean the first token (strip prose after '(' / '--' / '—') then map to display vocab."""
    raw = fm.get("status") or fm.get("doc_status") or "unknown"
    token = re.split(r"[(—]|--", raw, maxsplit=1)[0].strip().strip(" -").lower()
    return STATUS_MAP.get(token, token.capitalize() if token else "Unknown")


def adr_date(stem: str) -> str:
    m = DATE_RE.search(stem)
    if not m:
        return "0000-00-00"
    d = m.group(1)
    # pad partial dates (ADR-2025-11 -> 2025-11-00) for stable sort, display raw
    parts = d.split("-")
    while len(parts) < 3:
        parts.append("00")
    return "-".join(parts)


def collect_rows() -> list[tuple[str, str, str, str, str]]:
    rows = []
    for path in sorted(ADR_DIR.glob("ADR-*.md")):
        text = path.read_text(encoding="utf-8-sig")
        fm = parse_frontmatter(text)
        stem = path.stem
        rows.append(
            (
                adr_date(stem),
                stem,
                f"[{stem}](docs/adr/{path.name})",
                adr_title(text, fm, stem),
                adr_status(fm),
            )
        )
    rows.sort(key=lambda r: (r[0], r[1]))
    return rows


def render_table(rows: list[tuple[str, str, str, str, str]]) -> str:
    out = [
        f"_Generato da `tools/generate_decisions_log.py` ({len(rows)} ADR). NON editare a mano: editi gli ADR in `docs/adr/`._",
        "",
        "| Data | ADR | Titolo | Status |",
        "| --- | --- | --- | --- |",
    ]
    for date, _stem, link, title, status in rows:
        disp_date = date if not date.endswith("-00") else date[:7].rstrip("-0") or date[:4]
        title_safe = title.replace("|", "\\|")
        out.append(f"| {disp_date} | {link} | {title_safe} | {status} |")
    return "\n".join(out)


def build_block(rows) -> str:
    return f"{BEGIN}\n{render_table(rows)}\n{END}"


def apply(text: str, block: str) -> str:
    if BEGIN in text and END in text:
        pre = text.split(BEGIN, 1)[0]
        post = text.split(END, 1)[1]
        return f"{pre}{block}{post}"
    # first run: inject under the "## Index per data" heading
    marker = "## Index per data"
    if marker in text:
        head, _, tail = text.partition(marker)
        # drop everything from the heading up to the next "## " (the old hand tables)
        rest = tail.split("\n## ", 1)
        after = ("\n## " + rest[1]) if len(rest) > 1 else ""
        return f"{head}{marker} (cronologico)\n\n{block}\n{after}"
    raise SystemExit("DECISIONS_LOG.md: no markers and no '## Index per data' anchor")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="exit 1 if out of sync (CI gate)")
    args = ap.parse_args()

    rows = collect_rows()
    block = build_block(rows)
    current = LOG_PATH.read_text(encoding="utf-8-sig")
    updated = apply(current, block)

    if args.check:
        if updated != current:
            print(f"[decisions-log] OUT OF SYNC ({len(rows)} ADR). Run: python tools/generate_decisions_log.py", file=sys.stderr)
            return 1
        print(f"[decisions-log] in sync ({len(rows)} ADR)")
        return 0

    if updated != current:
        LOG_PATH.write_text(updated, encoding="utf-8")
        print(f"[decisions-log] regenerated ({len(rows)} ADR)")
    else:
        print(f"[decisions-log] no change ({len(rows)} ADR)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
