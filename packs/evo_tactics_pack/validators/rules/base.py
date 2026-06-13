from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Literal, Mapping, Sequence

ValidationLevel = Literal["error", "warning", "info"]


@dataclass(frozen=True)
class ValidationMessage:
    """Represents a single validation outcome."""

    level: ValidationLevel
    code: str
    message: str
    subject: str | None = None
    context: Mapping[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "level": self.level,
            "code": self.code,
            "message": self.message,
        }
        if self.subject:
            payload["subject"] = self.subject
        if self.context:
            payload["context"] = dict(self.context)
        return payload


def has_errors(messages: Sequence[ValidationMessage]) -> bool:
    return any(message.level == "error" for message in messages)


def format_messages(messages: Iterable[ValidationMessage]) -> list[str]:
    rendered: list[str] = []
    for message in messages:
        prefix = "ERROR" if message.level == "error" else (
            "WARNING" if message.level == "warning" else "INFO"
        )
        subject = f"[{message.subject}] " if message.subject else ""
        rendered.append(f"{prefix}: {subject}{message.message}")
    return rendered
