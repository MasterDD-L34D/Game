"""Shared helpers for Evo automation scripts."""

from __future__ import annotations

import logging
from typing import Optional

__all__ = ["configure_logging", "get_logger"]


def configure_logging(*, verbose: bool = False, logger: Optional[logging.Logger] = None) -> logging.Logger:
    """Configure and return a logger suitable for CLI automation tools.

    The function initialises the root logger with a plain message formatter when no
    handlers are present, mirroring the conventions used across automation
    scripts. The ``verbose`` flag toggles the log level between ``INFO`` and
    ``DEBUG``.
    """

    level = logging.DEBUG if verbose else logging.INFO
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        root_logger.addHandler(handler)
    root_logger.setLevel(level)

    if logger is None:
        return root_logger

    logger.setLevel(level)
    return logger


def get_logger(name: str) -> logging.Logger:
    """Return a child logger using the shared namespace for automation tools."""

    return logging.getLogger(name)
