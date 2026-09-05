from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol

import requests


@dataclass(slots=True)
class TranscriptionSegment:
    text: str
    confidence: float
    start: float | None = None
    end: float | None = None


@dataclass(slots=True)
class TranscriptionResult:
    segments: list[TranscriptionSegment]
    raw_response: dict | None = None


class BaseSpeechRecognizer(Protocol):
    def transcribe(
        self,
        audio: bytes,
        sample_rate: int,
        language: str,
        keywords: Iterable[str] | None = None,
    ) -> TranscriptionResult:
        ...


class HTTPSpeechRecognizer:
    """Simple recognizer that delegates to an HTTP API."""

    def __init__(self, endpoint: str, token: str | None = None, timeout: int = 30) -> None:
        self.endpoint = endpoint
        self.token = token
        self.timeout = timeout

    def transcribe(
        self,
        audio: bytes,
        sample_rate: int,
        language: str,
        keywords: Iterable[str] | None = None,
    ) -> TranscriptionResult:
        headers = {"Content-Type": "application/octet-stream"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        params = {"sample_rate": sample_rate, "language": language}
        if keywords:
            params["boost"] = list(keywords)

        response = requests.post(
            self.endpoint,
            params=params,
            headers=headers,
            data=audio,
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        segments = [
            TranscriptionSegment(
                text=segment.get("text", ""),
                confidence=float(segment.get("confidence", 0.0)),
                start=segment.get("start"),
                end=segment.get("end"),
            )
            for segment in payload.get("segments", [])
        ]
        if not segments and "text" in payload:
            segments = [TranscriptionSegment(text=payload["text"], confidence=float(payload.get("confidence", 0.0)))]
        return TranscriptionResult(segments=segments, raw_response=payload)
