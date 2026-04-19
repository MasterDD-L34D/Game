#!/usr/bin/env python3
"""M6-#4 Phase 1: inject deprecation marker header a ogni Python file
in services/rules/ + tools/py/master_dm.py.

Idempotente: skip se marker già presente.

Usage: python3 tools/py/mark_python_rules_deprecated.py [--dry-run]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

TARGETS = [
    REPO_ROOT / "services" / "rules" / "__init__.py",
    REPO_ROOT / "services" / "rules" / "demo_cli.py",
    REPO_ROOT / "services" / "rules" / "grid.py",
    REPO_ROOT / "services" / "rules" / "hydration.py",
    REPO_ROOT / "services" / "rules" / "resolver.py",
    REPO_ROOT / "services" / "rules" / "round_orchestrator.py",
    REPO_ROOT / "services" / "rules" / "trait_effects.py",
    REPO_ROOT / "services" / "rules" / "worker.py",
    REPO_ROOT / "tools" / "py" / "master_dm.py",
]

MARKER = "# @deprecated (M6-#4 Phase 1, 2026-04-19)"

HEADER_TEMPLATE = """# @deprecated (M6-#4 Phase 1, 2026-04-19)
# Python rules engine deprecated in favour of Node runtime canonical.
# User direction "1 solo gioco online, senza master" → tabletop DM feature
# morta. Node session engine (apps/backend/) = single source of truth.
# Vedi services/rules/DEPRECATED.md + docs/adr/ADR-2026-04-19-kill-python-rules-engine.md
# NO new features. NO bug fixes non-blocking. Porting a Node.

"""


def inject(path: Path, dry_run: bool = False) -> bool:
    """Return True se file modificato. Idempotente su MARKER."""
    content = path.read_text(encoding="utf-8")
    if MARKER in content:
        return False

    # Insert dopo shebang (se presente) o all'inizio
    lines = content.split("\n", 1)
    if lines[0].startswith("#!"):
        new_content = lines[0] + "\n" + HEADER_TEMPLATE + (lines[1] if len(lines) > 1 else "")
    else:
        new_content = HEADER_TEMPLATE + content

    if not dry_run:
        path.write_text(new_content, encoding="utf-8")
    return True


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    modified = []
    skipped = []
    for path in TARGETS:
        if not path.exists():
            print(f"MISSING: {path}", file=sys.stderr)
            continue
        if inject(path, dry_run=args.dry_run):
            modified.append(path)
        else:
            skipped.append(path)

    mode = "DRY-RUN" if args.dry_run else "WROTE"
    print(f"\n[{mode}] modified={len(modified)} skipped={len(skipped)}")
    for p in modified:
        print(f"  + {p.relative_to(REPO_ROOT)}")
    for p in skipped:
        print(f"  = {p.relative_to(REPO_ROOT)} (already marked)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
