"""Utilities to read MongoDB deployment configuration files."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Mapping

_ENV_PATTERN = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}")


@dataclass(frozen=True)
class MongoConfig:
    """Normalized MongoDB configuration."""

    mongo_url: str
    database: str
    options: Dict[str, Any]
    extras: Dict[str, Any]


def _expand_placeholders(value: str) -> str:
    """Replace ${VAR} placeholders with environment variables when available."""

    def _replace(match: re.Match[str]) -> str:  # type: ignore[name-defined]
        env_name = match.group(1)
        return os.environ.get(env_name, match.group(0))

    return _ENV_PATTERN.sub(_replace, value)


def _resolve_entry(value: Any) -> Any:
    if isinstance(value, str):
        return _expand_placeholders(value)
    if isinstance(value, Mapping):
        if "env" in value:
            env_name = value["env"]
            if not isinstance(env_name, str) or not env_name:
                raise ValueError("Chiave 'env' non valida nella configurazione MongoDB")
            default_value = value.get("default")
            resolved = os.environ.get(env_name, default_value)
            if resolved is None:
                raise ValueError(
                    f"Variabile d'ambiente '{env_name}' richiesta ma non impostata per la configurazione MongoDB"
                )
            if isinstance(resolved, str):
                return _expand_placeholders(resolved)
            return resolved
        return {key: _resolve_entry(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_resolve_entry(item) for item in value]
    return value


def load_mongo_config(config_path: str | Path) -> MongoConfig:
    """Load and normalize a MongoDB configuration file."""

    path = Path(config_path)
    if not path.is_file():
        raise FileNotFoundError(f"Configurazione MongoDB non trovata: {path}")

    with path.open("r", encoding="utf-8") as handle:
        raw_payload: Dict[str, Any] = json.load(handle)

    resolved = _resolve_entry(raw_payload)

    mongo_url = resolved.get("mongoUrl") or resolved.get("uri")
    database = resolved.get("database") or resolved.get("dbName")
    options = resolved.get("options") or {}

    if not isinstance(mongo_url, str) or not mongo_url.strip():
        raise ValueError(f"Parametro 'mongoUrl' non valido nel file di configurazione {path}")
    if not isinstance(database, str) or not database.strip():
        raise ValueError(f"Parametro 'database' non valido nel file di configurazione {path}")
    if not isinstance(options, Mapping):
        raise ValueError(f"Parametro 'options' deve essere un oggetto nel file di configurazione {path}")

    extras = {
        key: value
        for key, value in resolved.items()
        if key not in {"mongoUrl", "uri", "database", "dbName", "options"}
    }

    return MongoConfig(mongo_url=mongo_url, database=database, options=dict(options), extras=extras)


__all__ = ["MongoConfig", "load_mongo_config"]
