#!/usr/bin/env python3
"""Wrapper CLI per il derivatore di tratti ambientali."""

from __future__ import annotations

import sys

from game_utils.env_traits_scanner import main


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    sys.exit(main())
