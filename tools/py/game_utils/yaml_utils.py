"""Utility per il caricamento dei file YAML del progetto."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Union

import yaml

PathLike = Union[str, Path]


def load_yaml(path: PathLike) -> Any:
    """Carica un file YAML restituendo l'oggetto Python corrispondente."""

    resolved = Path(path)
    if not resolved.exists():
        raise FileNotFoundError(resolved)
    with resolved.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


__all__ = ["load_yaml"]
