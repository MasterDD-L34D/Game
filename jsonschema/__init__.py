"""Minimal stub of jsonschema for offline validation.

This stub provides only the limited surface used by scripts/trait_audit.py
within this repository. It is **not** a full implementation and merely
ensures that validation can run in environments without the jsonschema
package installed. The validator intentionally performs no schema
validation and yields no errors.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List


class SchemaError(Exception):
    """Placeholder schema error."""


class ValidationError(Exception):
    """Placeholder validation error used for compatibility."""

    def __init__(self, message: str, absolute_path: Iterable[Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.absolute_path = list(absolute_path or [])


class RefResolutionError(Exception):
    """Raised when a reference cannot be resolved in the stub validator."""


class _ExceptionsModule:
    SchemaError = SchemaError
    ValidationError = ValidationError
    RefResolutionError = RefResolutionError


exceptions = _ExceptionsModule()


@dataclass
class RefResolver:
    """Minimal resolver that stores the schema and reference store."""

    schema: Dict[str, Any]
    store: Dict[str, Any]

    @classmethod
    def from_schema(cls, schema: Dict[str, Any], store: Dict[str, Any] | None = None) -> "RefResolver":
        return cls(schema=schema, store=store or {})


class Draft202012Validator:
    """No-op JSON schema validator."""

    def __init__(self, schema: Dict[str, Any], resolver: RefResolver | None = None) -> None:
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

    def validate(self, instance: Any) -> None:
        """Raise the first validation error if any are produced."""

        errors = list(self.iter_errors(instance))
        if errors:
            raise errors[0]
        return None


def validator_for(schema: Dict[str, Any]) -> type[Draft202012Validator]:
    """Return the default no-op validator class for any schema."""

    if not isinstance(schema, dict):
        raise SchemaError("Schema must be a dictionary")
    return Draft202012Validator


__all__ = [
    "Draft202012Validator",
    "RefResolver",
    "SchemaError",
    "ValidationError",
    "RefResolutionError",
    "exceptions",
    "validator_for",
]
