#!/usr/bin/env python3
"""Patch delta report — Sprint γ Tech Baseline (2026-04-28).

Pattern: CK3 (research §7 strategy-games-tech-extraction).
Auto-generate markdown report di delta tra 2 git refs: file changed,
LOC delta, commit list, risk areas (heuristic).

Usage:
    python tools/py/patch_delta_report.py --from <ref> --to HEAD [--output PATH] [--dry-run]
    make patch-delta-report SPRINT=N FROM=origin/main

Exit codes:
    0 = report generated
    2 = git error o invalid refs

Output: markdown con sezioni:
    §Summary       — totale file/LOC/commit
    §Files changed — table con added/removed per file
    §Commits       — list short SHA + message
    §Risk areas    — schema/migrations/contracts changed
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_OUTPUT_DIR = Path("reports/patch-delta")

# Risk path heuristics (ALERT keywords)
RISK_PATTERNS = [
    ("schema", ["packages/contracts/", "schemas/"]),
    ("migrations", ["migrations/", "prisma/migrations/"]),
    ("workflows", [".github/workflows/"]),
    ("session_engine", ["apps/backend/routes/session.js", "apps/backend/services/combat/"]),
    ("auth", ["apps/backend/middleware/auth", "AUTH_"]),
]


def _git(args, check=True):
    """Run git command, return stdout. Raise on non-zero if check=True."""
    try:
        result = subprocess.run(
            ["git", *args],
            capture_output=True,
            text=True,
            check=check,
            encoding="utf-8",
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"[patch-delta] git {' '.join(args)} fail: {e.stderr}", file=sys.stderr)
        if check:
            raise
        return ""


def _resolve_refs(from_ref, to_ref):
    """Validate refs exist. Return (from_sha, to_sha)."""
    try:
        from_sha = _git(["rev-parse", "--short", from_ref])
        to_sha = _git(["rev-parse", "--short", to_ref])
        return from_sha, to_sha
    except subprocess.CalledProcessError:
        return None, None


def _diff_stats(from_ref, to_ref):
    """Get diff --numstat between refs. Returns list of (added, removed, file)."""
    raw = _git(["diff", "--numstat", f"{from_ref}..{to_ref}"], check=False)
    if not raw:
        return []
    rows = []
    for line in raw.splitlines():
        parts = line.split("\t")
        if len(parts) >= 3:
            added = parts[0]
            removed = parts[1]
            fpath = parts[2]
            try:
                a = int(added) if added != "-" else 0
                r = int(removed) if removed != "-" else 0
            except ValueError:
                a, r = 0, 0
            rows.append((a, r, fpath))
    return rows


def _commits(from_ref, to_ref):
    """List commits between refs (short SHA + subject)."""
    raw = _git(["log", "--pretty=format:%h %s", f"{from_ref}..{to_ref}"], check=False)
    if not raw:
        return []
    return raw.splitlines()


def _risk_areas(files):
    """Heuristic: tag files matching risk patterns."""
    detected = {}
    for area, patterns in RISK_PATTERNS:
        hits = [f for f in files if any(p in f for p in patterns)]
        if hits:
            detected[area] = hits
    return detected


def _format_report(from_ref, from_sha, to_ref, to_sha, sprint, stats, commits, risks):
    """Build markdown report."""
    total_added = sum(s[0] for s in stats)
    total_removed = sum(s[1] for s in stats)
    total_files = len(stats)
    total_commits = len(commits)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        f"# Patch Delta Report — Sprint {sprint or 'N/A'}",
        "",
        f"**Generated**: {timestamp}",
        f"**From**: `{from_ref}` ({from_sha})",
        f"**To**: `{to_ref}` ({to_sha})",
        "",
        "## Summary",
        "",
        f"- **Files changed**: {total_files}",
        f"- **Lines added**: +{total_added}",
        f"- **Lines removed**: -{total_removed}",
        f"- **Net delta**: {total_added - total_removed:+d}",
        f"- **Commits**: {total_commits}",
        "",
        "## Files changed",
        "",
    ]

    if stats:
        lines.append("| Added | Removed | File |")
        lines.append("|------:|--------:|------|")
        for added, removed, fpath in sorted(stats, key=lambda x: -(x[0] + x[1]))[:50]:
            lines.append(f"| +{added} | -{removed} | `{fpath}` |")
        if len(stats) > 50:
            lines.append(f"| ... | ... | _({len(stats) - 50} more files truncated)_ |")
    else:
        lines.append("_No files changed._")

    lines.extend(["", "## Commits", ""])
    if commits:
        for c in commits[:30]:
            lines.append(f"- `{c}`")
        if len(commits) > 30:
            lines.append(f"- _({len(commits) - 30} more commits truncated)_")
    else:
        lines.append("_No commits._")

    lines.extend(["", "## Risk areas", ""])
    if risks:
        for area, hits in risks.items():
            lines.append(f"### {area} ({len(hits)} files)")
            lines.append("")
            for h in hits[:10]:
                lines.append(f"- `{h}`")
            lines.append("")
    else:
        lines.append("_No risk patterns detected (schema/migrations/workflows/session/auth clean)._")

    lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--from", dest="from_ref", required=True, help="git ref (base)")
    ap.add_argument("--to", dest="to_ref", default="HEAD", help="git ref (target)")
    ap.add_argument("--sprint", default=None, help="sprint label (e.g. gamma)")
    ap.add_argument("--output", default=None, help="output md path")
    ap.add_argument("--dry-run", action="store_true", help="generate but don't fail on missing refs")
    args = ap.parse_args()

    from_sha, to_sha = _resolve_refs(args.from_ref, args.to_ref)
    if not from_sha or not to_sha:
        if args.dry_run:
            print(f"[patch-delta] dry-run: refs not resolvable, generating empty report")
            from_sha = from_sha or "unknown"
            to_sha = to_sha or "unknown"
        else:
            print(f"[patch-delta] FAIL: refs not resolvable", file=sys.stderr)
            return 2

    stats = _diff_stats(args.from_ref, args.to_ref)
    commits = _commits(args.from_ref, args.to_ref)
    files = [s[2] for s in stats]
    risks = _risk_areas(files)

    report = _format_report(args.from_ref, from_sha, args.to_ref, to_sha, args.sprint, stats, commits, risks)

    if args.output:
        out_path = Path(args.output)
    else:
        DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        sprint_tag = args.sprint or "delta"
        out_path = DEFAULT_OUTPUT_DIR / f"sprint-{sprint_tag}-{date_str}.md"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        fh.write(report)

    print(f"[patch-delta] OK — {len(stats)} files, {len(commits)} commits, {len(risks)} risk areas")
    print(f"[patch-delta] output: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
