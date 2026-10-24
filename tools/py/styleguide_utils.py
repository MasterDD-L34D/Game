"""Shared helpers for styleguide normalization scripts."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SLUG_RE = re.compile(r"^[a-z0-9-]+$")


def normalize_slug(value: str) -> str:
    """Return a repository-compliant slug.

    Slugs must be lowercase, use hyphens as separators and contain only
    alphanumeric characters plus the hyphen.
    """

    cleaned = value.strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned)
    cleaned = re.sub(r"-+", "-", cleaned)
    return cleaned.strip("-")


def is_slug(value: str) -> bool:
    return bool(SLUG_RE.fullmatch(value))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
