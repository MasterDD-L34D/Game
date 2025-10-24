#!/usr/bin/env python3
"""Wrapper CLI per l'analisi dei contenuti di supporto."""
from __future__ import annotations

import sys
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parents[1] / "tools" / "py"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from investigate_sources import main as investigate_main  # type: ignore


def main() -> int:
    """Esegue l'indagine dei file tramite il tool condiviso."""
    return investigate_main()


if __name__ == "__main__":
    sys.exit(main())
