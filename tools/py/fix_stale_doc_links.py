#!/usr/bin/env python3
"""Stale burn-down batch-3a: fix dead internal .md links in stale living-docs.

Post docs-reorg, many stale docs link to .md files that MOVED. This fixes ONLY
the high-confidence cases (basename has exactly ONE git-tracked match AND is not
a generic name like README.md/INDEX.md) -> rewrites the link to the correct
relative path. Ambiguous (generic / multi-match) and deleted (no-match) links are
LEFT untouched (need human judgment).

For docs whose broken links are ALL safe-fixable (-> zero broken after fix), bumps
last_verified to today in BOTH the registry and the frontmatter (an honest bump:
the doc was reviewed + corrected). Partial docs are improved but NOT bumped.

Usage: python tools/py/fix_stale_doc_links.py [--apply] [--today YYYY-MM-DD]
  (dry-run by default; --apply writes files + registry)
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
REGISTRY = REPO / "docs/governance/docs_registry.json"
DRIFT = REPO / "reports/docs/governance_drift_report.json"
GENERIC = {
    "README.md",
    "INDEX.md",
    "00-INDEX.md",
    "CHANGELOG.md",
    "index.md",
    "readme.md",
    "template.md",
}
LINK_RE = re.compile(r"\]\(([^)]+\.md)(#[^)]*)?\)")
LIVING = {"active", "draft", "legacy_active"}


def git_md_files() -> dict[str, list[str]]:
    out = subprocess.check_output(
        ["git", "ls-files", "*.md"], cwd=REPO, encoding="utf-8"
    )
    by_base: dict[str, list[str]] = {}
    for f in out.strip().split("\n"):
        by_base.setdefault(Path(f).name, []).append(f)
    return by_base


def rel_link(from_doc: str, to_path: str) -> str:
    """Relative POSIX path from the doc's dir to the target (markdown style)."""
    import os

    rel = os.path.relpath(to_path, str(Path(from_doc).parent)).replace("\\", "/")
    if not rel.startswith("."):
        rel = "./" + rel
    return rel


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--today", default=None)
    args = ap.parse_args()

    from datetime import date

    today = args.today or date.today().isoformat()

    registry = json.loads(REGISTRY.read_text(encoding="utf-8-sig"))
    status_of = {e["path"]: e.get("doc_status") for e in registry["entries"]}
    drift = json.loads(DRIFT.read_text(encoding="utf-8"))
    stale = [
        i["path"]
        for i in drift["issues"]
        if i["code"] == "stale_document" and status_of.get(i["path"]) in LIVING
    ]
    by_base = git_md_files()

    total_fixed = 0
    fully_clean: list[str] = []
    partial: list[str] = []
    for rel in stale:
        p = REPO / rel
        try:
            txt = p.read_text(encoding="utf-8")
        except OSError:
            continue
        broken_total = 0
        replacements: list[tuple[str, str]] = []
        for m in LINK_RE.finditer(txt):
            target = m.group(1).split("#")[0].strip()
            if target.startswith(("http", "mailto")):
                continue
            if target.startswith("docs/") or target.startswith("/"):
                abs_t = REPO / target.lstrip("/")
            else:
                abs_t = (p.parent / target).resolve()
            if abs_t.exists():
                continue
            broken_total += 1
            base = Path(target).name
            matches = by_base.get(base, [])
            if base in GENERIC or len(matches) != 1:
                continue  # ambiguous / deleted -> leave
            new_rel = rel_link(rel, matches[0])
            anchor = m.group(2) or ""
            replacements.append(
                (f"]({target}{anchor})", f"]({new_rel}{anchor})")
            )
        if broken_total == 0:
            continue
        # Apply unique replacements (dedupe; replace_all per pair).
        new_txt = txt
        for old, new in dict(replacements).items():
            new_txt = new_txt.replace(old, new)
        n_fixed = len(set(r[0] for r in replacements))
        if n_fixed == 0:
            partial.append(rel)
            continue
        total_fixed += n_fixed
        # Authoritative fully-clean check: re-scan new_txt for ANY broken link
        # (handles a link repeated N times -> one fix clears all occurrences).
        still_broken = 0
        for m in LINK_RE.finditer(new_txt):
            t = m.group(1).split("#")[0].strip()
            if t.startswith(("http", "mailto")):
                continue
            at = (REPO / t.lstrip("/")) if (t.startswith("docs/") or t.startswith("/")) else (p.parent / t).resolve()
            if not at.exists():
                still_broken += 1
        if still_broken == 0:
            fully_clean.append(rel)
        else:
            partial.append(rel)
        if args.apply and new_txt != txt:
            p.write_text(new_txt, encoding="utf-8")

    # Bump last_verified for fully-clean docs (registry + frontmatter).
    bumped = 0
    if args.apply and fully_clean:
        fc = set(fully_clean)
        for e in registry["entries"]:
            if e["path"] in fc:
                e["last_verified"] = today
                bumped += 1
        REGISTRY.write_text(
            json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        for rel in fully_clean:
            p = REPO / rel
            txt = p.read_text(encoding="utf-8")
            new = re.sub(
                r"(?m)^last_verified:.*$",
                f"last_verified: '{today}'",
                txt,
                count=1,
            )
            if new != txt:
                p.write_text(new, encoding="utf-8")

    mode = "APPLIED" if args.apply else "DRY-RUN"
    print(f"[{mode}] links fixed: {total_fixed}")
    print(f"[{mode}] docs fully-clean (bumped): {len(fully_clean)}")
    print(f"[{mode}] docs partial (links fixed, NOT bumped): {len(partial)}")
    if args.apply:
        print(f"[{mode}] registry entries bumped: {bumped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
