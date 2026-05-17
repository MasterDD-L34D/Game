#!/usr/bin/env python3
"""CLI tool for bulk frontmatter generation and registry population for the docs governance system."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PATH_WORKSTREAM_MAP = {
    # Structural / cross-cutting
    "docs/core/": "cross-cutting",
    "docs/hubs/": "cross-cutting",
    "docs/governance/": "cross-cutting",
    "docs/adr/": "cross-cutting",
    "docs/guide/": "cross-cutting",
    "docs/appendici/": "cross-cutting",
    # Combat workstream (rules engine d20)
    "docs/combat/": "combat",
    # Flow workstream
    "docs/pipelines/": "flow",
    "docs/architecture/": "flow",
    # Atlas workstream
    "docs/frontend/": "atlas",
    # Dataset-pack workstream
    "docs/traits/": "dataset-pack",
    "docs/biomes/": "dataset-pack",
    "docs/species/": "dataset-pack",
    "docs/catalog/": "dataset-pack",
    "docs/balance/": "dataset-pack",
    "docs/evo-tactics/": "dataset-pack",
    "docs/evo-tactics-pack/": "dataset-pack",
    # Ops-QA workstream
    "docs/ci/": "ops-qa",
    "docs/qa/": "ops-qa",
    "docs/process/": "ops-qa",
    "docs/playtest/": "ops-qa",
    "docs/ops/": "ops-qa",
    "docs/logs/": "ops-qa",
    "docs/reports/": "ops-qa",
    "docs/tutorials/": "ops-qa",
    # Planning (cross-cutting workstream used for planning)
    "docs/planning/": "cross-cutting",
    # Incoming / archive / generated
    "docs/incoming/": "incoming",
    "docs/archive/": "incoming",
    "docs/generated/": "ops-qa",
}

AUTOGEN_PATH_PATTERNS = [
    "docs/generated/",
    "docs/evo-tactics-pack/reports/",
    "docs/evo-tactics-pack/services/",
    "docs/evo-tactics-pack/species/",
    "docs/evo-tactics-pack/state/",
    "docs/evo-tactics-pack/traits/",
    "docs/evo-tactics-pack/ui/",
    "docs/evo-tactics-pack/utils/",
    "docs/evo-tactics-pack/views/",
]

AUTOGEN_CONTENT_MARKERS = [
    "_Generato automaticamente",
    "Auto-generated",
    "<!-- generated -->",
]

WORKSTREAM_OWNERS = {
    "flow": "flow-team",
    "atlas": "atlas-team",
    "backend": "backend-team",
    "dataset-pack": "data-pack-team",
    "ops-qa": "ops-qa-team",
    "incoming": "incoming-archivist",
    "cross-cutting": "platform-docs",
    "combat": "combat-team",
}

CRITICAL_PATTERNS = [
    "docs/adr/",
    "docs/hubs/",
    "docs/governance/",
]
CRITICAL_ROOT_FILES = {"README.md", "CLAUDE.md", "CONTRIBUTING.md"}

STANDARD_PATTERNS = [
    "docs/planning/",
    "docs/process/",
    "docs/checklist/",
    "docs/piani/",
    "docs/pipelines/",
    "docs/dev/",
]

SCAN_DIRS = ["docs/"]
SCAN_ROOT_GLOBS = ["*.md"]
SCAN_REPORT_GLOBS = ["reports/*.md"]


# ---------------------------------------------------------------------------
# Shared helpers (mirroring check_docs_governance.py patterns)
# ---------------------------------------------------------------------------

@dataclass
class Issue:
    level: str
    code: str
    path: str
    message: str

    def as_dict(self) -> dict[str, str]:
        return {"level": self.level, "code": self.code, "path": self.path, "message": self.message}


def parse_frontmatter(path: Path) -> dict[str, Any] | None:
    """Parse YAML frontmatter from a markdown file. Returns None if absent."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError):
        return None
    lines = text.splitlines()
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
        if value.lower() == "true":
            fields[key] = True
        elif value.lower() == "false":
            fields[key] = False
        elif re.fullmatch(r"[0-9]+", value):
            fields[key] = int(value)
        else:
            fields[key] = value
    return fields


def extract_title(path: Path) -> str:
    """Extract title from first # heading or derive from filename."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError):
        return path.stem.replace("-", " ").replace("_", " ").title()
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("##"):
            return stripped[2:].strip()
    return path.stem.replace("-", " ").replace("_", " ").title()


def infer_workstream(rel_path: str) -> str:
    """Infer workstream from relative path using PATH_WORKSTREAM_MAP."""
    normalized = rel_path.replace("\\", "/")
    for prefix, ws in PATH_WORKSTREAM_MAP.items():
        if normalized.startswith(prefix):
            return ws
    return "cross-cutting"


def is_autogenerated(rel_path: str, content: str | None = None) -> bool:
    """Detect auto-generated files by path pattern or content markers."""
    normalized = rel_path.replace("\\", "/")
    for pattern in AUTOGEN_PATH_PATTERNS:
        if normalized.startswith(pattern):
            return True
    if content:
        for marker in AUTOGEN_CONTENT_MARKERS:
            if marker in content:
                return True
    return False


def classify_tier(rel_path: str) -> str:
    """Classify a doc path into critical / standard / low tier."""
    normalized = rel_path.replace("\\", "/")
    basename = Path(rel_path).name
    if basename in CRITICAL_ROOT_FILES and "/" not in normalized.rstrip("/"):
        return "critical"
    for pat in CRITICAL_PATTERNS:
        if normalized.startswith(pat):
            return "critical"
    for pat in STANDARD_PATTERNS:
        if normalized.startswith(pat):
            return "standard"
    # Numbered docs (01-xxx through 40-xxx)
    match = re.match(r"^(\d{1,2})-", basename)
    if match and 1 <= int(match.group(1)) <= 40:
        return "standard"
    return "low"


def collect_md_files(repo_root: Path) -> list[Path]:
    """Collect all markdown files in scope."""
    results: list[Path] = []
    # docs/ subtree
    docs_dir = repo_root / "docs"
    if docs_dir.is_dir():
        for p in sorted(docs_dir.rglob("*.md")):
            if p.is_file():
                results.append(p)
    # reports/*.md (non-recursive)
    reports_dir = repo_root / "reports"
    if reports_dir.is_dir():
        for p in sorted(reports_dir.glob("*.md")):
            if p.is_file():
                results.append(p)
    # root *.md
    for p in sorted(repo_root.glob("*.md")):
        if p.is_file():
            results.append(p)
    return results


def load_registry(path: Path) -> dict[str, Any]:
    """Load the governance registry JSON."""
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save_registry(path: Path, registry: dict[str, Any]) -> None:
    """Write the governance registry JSON back, sorted entries by path."""
    registry["entries"] = sorted(registry["entries"], key=lambda e: e.get("path", ""))
    path.write_text(
        json.dumps(registry, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def registry_paths(registry: dict[str, Any]) -> set[str]:
    """Return set of all paths already in the registry."""
    return {e["path"] for e in registry.get("entries", []) if "path" in e}


def today_str() -> str:
    return date.today().isoformat()


# ---------------------------------------------------------------------------
# Subcommand: scan
# ---------------------------------------------------------------------------

def cmd_scan(args: argparse.Namespace, repo_root: Path) -> int:
    files = collect_md_files(repo_root)
    report_entries = []
    for path in files:
        rel = path.relative_to(repo_root).as_posix()
        try:
            content = path.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeDecodeError):
            content = ""
        fm = parse_frontmatter(path)
        title = extract_title(path)
        ws = infer_workstream(rel)
        autogen = is_autogenerated(rel, content)
        entry = {
            "path": rel,
            "title": title,
            "workstream": ws,
            "has_frontmatter": fm is not None,
            "auto_generated": autogen,
            "tier": classify_tier(rel),
        }
        report_entries.append(entry)

    summary = {
        "total": len(report_entries),
        "with_frontmatter": sum(1 for e in report_entries if e["has_frontmatter"]),
        "auto_generated": sum(1 for e in report_entries if e["auto_generated"]),
        "by_workstream": {},
    }
    for e in report_entries:
        ws = e["workstream"]
        summary["by_workstream"][ws] = summary["by_workstream"].get(ws, 0) + 1

    payload = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "summary": summary, "files": report_entries}

    if args.report:
        out = Path(args.report)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"[scan] Report written to {out}")
    else:
        print(json.dumps(payload, indent=2, ensure_ascii=False))

    print(f"[scan] Total: {summary['total']}  With frontmatter: {summary['with_frontmatter']}  Auto-generated: {summary['auto_generated']}")
    return 0


# ---------------------------------------------------------------------------
# Subcommand: generate-frontmatter
# ---------------------------------------------------------------------------

def build_frontmatter_block(title: str, workstream: str, rel_path: str) -> str:
    """Build a YAML frontmatter string for a given doc."""
    owner = WORKSTREAM_OWNERS.get(workstream, "platform-docs")
    is_archive = rel_path.replace("\\", "/").startswith("docs/archive/")
    cycle = 30 if is_archive else 14
    lines = [
        "---",
        f"title: {title}",
        "doc_status: draft",
        f"doc_owner: {owner}",
        f"workstream: {workstream}",
        f"last_verified: {today_str()}",
        "source_of_truth: false",
        "language: it-en",
        f"review_cycle_days: {cycle}",
        "---",
    ]
    return "\n".join(lines) + "\n"


def cmd_generate_frontmatter(args: argparse.Namespace, repo_root: Path) -> int:
    files = collect_md_files(repo_root)
    modified = 0
    skipped = 0

    for path in files:
        rel = path.relative_to(repo_root).as_posix()

        # Filters
        if args.path and not rel.replace("\\", "/").startswith(args.path.replace("\\", "/")):
            continue
        if args.workstream and infer_workstream(rel) != args.workstream:
            continue

        try:
            content = path.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeDecodeError):
            skipped += 1
            continue

        # Skip files with existing frontmatter
        if content.lstrip().startswith("---"):
            fm = parse_frontmatter(path)
            if fm is not None:
                skipped += 1
                continue

        # Skip auto-generated
        if is_autogenerated(rel, content):
            skipped += 1
            continue

        title = extract_title(path)
        ws = infer_workstream(rel)
        block = build_frontmatter_block(title, ws, rel)

        if args.dry_run:
            print(f"[dry-run] Would add frontmatter to: {rel}")
            print(block)
            print()
        else:
            new_content = block + content
            path.write_text(new_content, encoding="utf-8")
            print(f"[generate-frontmatter] Added frontmatter: {rel}")
        modified += 1

    action = "Would modify" if args.dry_run else "Modified"
    print(f"[generate-frontmatter] {action}: {modified}  Skipped: {skipped}")
    return 0


# ---------------------------------------------------------------------------
# Subcommand: populate-registry
# ---------------------------------------------------------------------------

def cmd_populate_registry(args: argparse.Namespace, repo_root: Path) -> int:
    registry_path = repo_root / "docs" / "governance" / "docs_registry.json"
    if not registry_path.exists():
        print(f"[populate-registry] Registry not found: {registry_path}", file=sys.stderr)
        return 2

    registry = load_registry(registry_path)
    existing = registry_paths(registry)
    files = collect_md_files(repo_root)
    added = 0

    for path in files:
        rel = path.relative_to(repo_root).as_posix()
        if rel in existing:
            continue

        fm = parse_frontmatter(path)
        if fm is None:
            continue

        tier = classify_tier(rel)
        if args.tier and tier != args.tier:
            continue

        entry = {
            "path": rel,
            "title": fm.get("title", extract_title(path)),
            "doc_status": fm.get("doc_status", "draft"),
            "doc_owner": fm.get("doc_owner", WORKSTREAM_OWNERS.get(fm.get("workstream", ""), "platform-docs")),
            "workstream": fm.get("workstream", infer_workstream(rel)),
            "last_verified": fm.get("last_verified", today_str()),
            "source_of_truth": fm.get("source_of_truth", False),
            "language": fm.get("language", "it-en"),
            "review_cycle_days": fm.get("review_cycle_days", 14),
            "primary": False,
            "track": "migrated",
        }

        if args.dry_run:
            print(f"[dry-run] Would add to registry: {rel}")
            print(f"  {json.dumps(entry, ensure_ascii=False)}")
        else:
            registry["entries"].append(entry)
        added += 1

    if not args.dry_run and added > 0:
        save_registry(registry_path, registry)
        print(f"[populate-registry] Registry updated: {registry_path}")

    action = "Would add" if args.dry_run else "Added"
    print(f"[populate-registry] {action}: {added} entries")
    return 0


# ---------------------------------------------------------------------------
# Subcommand: report
# ---------------------------------------------------------------------------

def cmd_report(args: argparse.Namespace, repo_root: Path) -> int:
    registry_path = repo_root / "docs" / "governance" / "docs_registry.json"
    registry: dict[str, Any] = {}
    existing: set[str] = set()
    if registry_path.exists():
        registry = load_registry(registry_path)
        existing = registry_paths(registry)

    files = collect_md_files(repo_root)
    total = len(files)
    with_fm = 0
    autogen = 0
    ws_counts: dict[str, dict[str, int]] = {}

    for path in files:
        rel = path.relative_to(repo_root).as_posix()
        try:
            content = path.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeDecodeError):
            content = ""
        fm = parse_frontmatter(path)
        ws = infer_workstream(rel)
        is_ag = is_autogenerated(rel, content)

        if fm is not None:
            with_fm += 1
        if is_ag:
            autogen += 1

        if ws not in ws_counts:
            ws_counts[ws] = {"total": 0, "frontmatter": 0, "registry": 0, "autogen": 0}
        ws_counts[ws]["total"] += 1
        if fm is not None:
            ws_counts[ws]["frontmatter"] += 1
        if rel in existing:
            ws_counts[ws]["registry"] += 1
        if is_ag:
            ws_counts[ws]["autogen"] += 1

    in_registry = sum(1 for path in files if path.relative_to(repo_root).as_posix() in existing)

    # Print summary table
    print("=" * 72)
    print("DOCS GOVERNANCE MIGRATION REPORT")
    print("=" * 72)
    print(f"  Total .md files:          {total}")
    print(f"  With frontmatter:         {with_fm}")
    print(f"  In registry:              {in_registry}")
    print(f"  Auto-generated (excl.):   {autogen}")
    print(f"  Needing migration:        {total - with_fm - autogen}")
    print()
    print(f"  {'Workstream':<20} {'Total':>6} {'FM':>6} {'Reg':>6} {'Auto':>6}")
    print(f"  {'-'*20} {'-'*6} {'-'*6} {'-'*6} {'-'*6}")
    for ws in sorted(ws_counts.keys()):
        c = ws_counts[ws]
        print(f"  {ws:<20} {c['total']:>6} {c['frontmatter']:>6} {c['registry']:>6} {c['autogen']:>6}")
    print("=" * 72)
    return 0


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="docs_governance_migrator",
        description="Bulk frontmatter generation and registry population for docs governance.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # scan
    p_scan = sub.add_parser("scan", help="Classify all .md files and output a JSON report.")
    p_scan.add_argument("--report", default=None, help="Path to write JSON report (prints to stdout if omitted).")

    # generate-frontmatter
    p_gen = sub.add_parser("generate-frontmatter", help="Add YAML frontmatter to files without it.")
    p_gen.add_argument("--dry-run", action="store_true", help="Print what would be added without modifying files.")
    p_gen.add_argument("--path", default=None, help="Filter to files under this directory prefix.")
    p_gen.add_argument("--workstream", default=None, help="Filter to a specific workstream.")

    # populate-registry
    p_pop = sub.add_parser("populate-registry", help="Add entries to docs_registry.json from frontmatter.")
    p_pop.add_argument("--dry-run", action="store_true", help="Print entries without writing.")
    p_pop.add_argument("--tier", choices=["critical", "standard", "low"], default=None, help="Filter by tier.")

    # report
    sub.add_parser("report", help="Print coverage statistics.")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]

    if args.command == "scan":
        return cmd_scan(args, repo_root)
    elif args.command == "generate-frontmatter":
        return cmd_generate_frontmatter(args, repo_root)
    elif args.command == "populate-registry":
        return cmd_populate_registry(args, repo_root)
    elif args.command == "report":
        return cmd_report(args, repo_root)
    else:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
