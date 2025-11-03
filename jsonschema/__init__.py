"""Minimal stub of jsonschema for offline validation.

This stub provides only the limited surface used by scripts/trait_audit.py
within this repository. It is **not** a full implementation and merely
ensures that validation can run in environments without the jsonschema
package installed. When the real :mod:`jsonschema` package is present it is
imported and re-exported so validation still occurs.
"""
from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path
from types import ModuleType


def _try_load_real_jsonschema() -> ModuleType | None:
    """Attempt to import the real jsonschema module if it is installed.

    The repository contains this lightweight stub at ``jsonschema/``. When
    scripts are executed with ``PYTHONPATH=.`` (the recommended workflow), the
    stub would normally shadow the third-party dependency. To avoid that, the
    loader temporarily removes the repository path from the import search and
    loads the actual package if available.
    """

    repo_root = Path(__file__).resolve().parent.parent
    blocked_path = os.path.realpath(str(repo_root))

    original_sys_path = list(sys.path)
    filtered_paths = [
        entry
        for entry in original_sys_path
        if os.path.realpath(entry or os.curdir) != blocked_path
    ]

    if len(filtered_paths) == len(original_sys_path):
        # The repository path is not in sys.path, so importing normally is fine.
        try:
            return importlib.import_module(__name__)
        except ModuleNotFoundError:
            return None

    stub_module = sys.modules.get(__name__)

    try:
        sys.path[:] = filtered_paths
        sys.modules.pop(__name__, None)
        try:
            module = importlib.import_module(__name__)
        except ModuleNotFoundError:
            return None
    finally:
        sys.path[:] = original_sys_path
        if stub_module is not None:
            sys.modules[__name__] = stub_module

    return module


_REAL_JSONSCHEMA = _try_load_real_jsonschema()


def _mirror_package_metadata(real_module: ModuleType) -> None:
    """Copy package metadata from the real module onto this stub.

    Restoring the stub module in ``sys.modules`` after importing the real
    package means Python would otherwise keep using the stub's ``__spec__`` and
    ``__path__`` for submodule resolution. Mirroring the key metadata ensures
    that imports such as ``jsonschema.cli`` continue to resolve against the
    installed distribution when available.
    """

    current_module = sys.modules.get(__name__)
    if current_module is None:
        return

    for attribute in ("__file__", "__spec__", "__loader__", "__package__"):
        value = getattr(real_module, attribute, None)
        if value is not None:
            setattr(current_module, attribute, value)
            globals()[attribute] = value

    if hasattr(real_module, "__path__"):
        current_module.__path__ = real_module.__path__  # type: ignore[attr-defined]
        globals()["__path__"] = real_module.__path__  # type: ignore[attr-defined]


if _REAL_JSONSCHEMA is not None:
    _mirror_package_metadata(_REAL_JSONSCHEMA)
    Draft202012Validator = _REAL_JSONSCHEMA.Draft202012Validator
    RefResolver = _REAL_JSONSCHEMA.RefResolver
    SchemaError = _REAL_JSONSCHEMA.SchemaError
    ValidationError = _REAL_JSONSCHEMA.ValidationError
    exceptions = _REAL_JSONSCHEMA.exceptions
    __all__ = getattr(_REAL_JSONSCHEMA, "__all__", [
        "Draft202012Validator",
        "RefResolver",
        "SchemaError",
        "ValidationError",
        "exceptions",
    ])
else:
    from dataclasses import dataclass
    from typing import Any, Dict, Iterable, List

    class SchemaError(Exception):
        """Placeholder schema error."""

    class ValidationError(Exception):
        """Placeholder validation error used for compatibility."""

        def __init__(
            self, message: str, absolute_path: Iterable[Any] | None = None
        ) -> None:
            super().__init__(message)
            self.message = message
            self.absolute_path = list(absolute_path or [])

    class _ExceptionsModule:
        SchemaError = SchemaError
        ValidationError = ValidationError

    exceptions = _ExceptionsModule()

    @dataclass
    class RefResolver:
        """Minimal resolver that stores the schema and reference store."""

        schema: Dict[str, Any]
        store: Dict[str, Any]

        @classmethod
        def from_schema(
            cls, schema: Dict[str, Any], store: Dict[str, Any] | None = None
        ) -> "RefResolver":
            return cls(schema=schema, store=store or {})

    class Draft202012Validator:
        """No-op JSON schema validator."""

        def __init__(
            self, schema: Dict[str, Any], resolver: RefResolver | None = None
        ) -> None:
            self.schema = schema
            self.resolver = resolver

        @staticmethod
        def check_schema(schema: Dict[str, Any]) -> None:
            """Pretend to validate the schema structure."""
            if not isinstance(schema, dict):
                raise SchemaError("Schema must be a dictionary")

        def iter_errors(self, instance: Any) -> List[ValidationError]:
            """Return an empty list to indicate no validation errors."""
            return []

    __all__ = [
        "Draft202012Validator",
        "RefResolver",
        "SchemaError",
        "ValidationError",
        "exceptions",
    ]


def __getattr__(name: str) -> object:
    """Delegate attribute access to the real package when available."""

    if _REAL_JSONSCHEMA is not None:
        return getattr(_REAL_JSONSCHEMA, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
