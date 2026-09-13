#!/usr/bin/env python3
"""Compatibilità: inoltra alla nuova utility `tools/py/scan_env_traits.py`."""

from __future__ import annotations

import sys
from pathlib import Path


def _bootstrap_path() -> None:
    """Garantisce che il modulo condiviso sia importabile anche da percorsi legacy."""

    root_tools = Path(__file__).resolve().parents[4] / "tools" / "py"
    if str(root_tools) not in sys.path:
        sys.path.insert(0, str(root_tools))


def main() -> int:
    _bootstrap_path()
    from game_utils import env_traits_scanner

    return env_traits_scanner.main()


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    sys.exit(main())
