#!/usr/bin/env python3
"""Utility to assemble the static site artifact for deployment."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
DATA_DIR = ROOT / "data"
DIST_DIR = ROOT / "dist"

# Directories inside `docs/` that should not be published as part of the static site.
EXCLUDED_DIRECTORIES = {"chatgpt_changes", "checklist", "Canvas"}
# File patterns we do not want to publish from `docs/`.
EXCLUDED_PATTERNS = ["*.md"]


def ensure_directory(path: Path) -> None:
    """Remove the directory if it exists and (re)create it empty."""
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def docs_ignore_patterns():
    """Create the ignore pattern callable for copytree."""
    return shutil.ignore_patterns(*(EXCLUDED_PATTERNS + list(EXCLUDED_DIRECTORIES)))


def copy_docs() -> None:
    if not DOCS_DIR.is_dir():
        raise SystemExit(f"Docs directory not found: {DOCS_DIR}")

    ignore = docs_ignore_patterns()
    # `copytree` expects the destination not to exist.
    shutil.copytree(DOCS_DIR, DIST_DIR, ignore=ignore, dirs_exist_ok=True)


def copy_data() -> None:
    if not DATA_DIR.is_dir():
        raise SystemExit(f"Data directory not found: {DATA_DIR}")

    destination = DIST_DIR / "data"
    shutil.copytree(DATA_DIR, destination, dirs_exist_ok=True)


def main() -> None:
    ensure_directory(DIST_DIR)
    copy_docs()
    copy_data()


if __name__ == "__main__":
    main()
