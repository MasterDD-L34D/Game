from __future__ import annotations

import audioop
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .recognizers import BaseSpeechRecognizer


@dataclass(slots=True)
class TranscriptionJob:
    source_path: Path
    language: str = "it"
    chunk_duration: int = 30
    boost_keywords: list[str] | None = None


@dataclass(slots=True)
class ChunkResult:
    start: float
    end: float
    text: str
    confidence: float


class VoiceToTextPipeline:
    def __init__(
        self,
        recognizer: BaseSpeechRecognizer,
        target_sample_rate: int = 16000,
        sample_width: int = 2,
        channels: int = 1,
    ) -> None:
        self.recognizer = recognizer
        self.target_sample_rate = target_sample_rate
        self.sample_width = sample_width
        self.channels = channels

    def transcribe(self, job: TranscriptionJob) -> list[ChunkResult]:
        raw_audio = self._load_and_normalize(job.source_path)
        chunks = list(self._chunk_audio(raw_audio, job.chunk_duration))
        results: list[ChunkResult] = []
        for start, end, payload in chunks:
            transcription = self.recognizer.transcribe(
                payload,
                sample_rate=self.target_sample_rate,
                language=job.language,
                keywords=job.boost_keywords,
            )
            text = " ".join(segment.text for segment in transcription.segments)
            confidence = sum(segment.confidence for segment in transcription.segments) / max(
                len(transcription.segments), 1
            )
            results.append(ChunkResult(start=start, end=end, text=text.strip(), confidence=confidence))
        return results

    def _load_and_normalize(self, path: Path) -> bytes:
        with wave.open(str(path), "rb") as source:
            raw = source.readframes(source.getnframes())
            sample_width = source.getsampwidth()
            channels = source.getnchannels()
            sample_rate = source.getframerate()

        if channels != self.channels:
            raw = audioop.tomono(raw, sample_width, 0.5, 0.5)

        if sample_rate != self.target_sample_rate:
            raw = audioop.ratecv(raw, sample_width, self.channels, sample_rate, self.target_sample_rate, None)[0]

        if sample_width != self.sample_width:
            raw = audioop.lin2lin(raw, sample_width, self.sample_width)

        max_amplitude = max(audioop.max(raw, self.sample_width), 1)
        max_possible = (1 << (8 * self.sample_width - 1)) - 1
        target_peak = int(max_possible * 0.95)
        scale = min(1.0, target_peak / max_amplitude)
        normalized = audioop.mul(raw, self.sample_width, scale)
        return normalized

    def _chunk_audio(self, raw: bytes, chunk_duration: int) -> Iterable[tuple[float, float, bytes]]:
        chunk_size = int(self.target_sample_rate * chunk_duration)
        frame_size = self.sample_width * self.channels
        total_frames = len(raw) // frame_size
        for index in range(0, total_frames, chunk_size):
            start_frame = index
            end_frame = min(index + chunk_size, total_frames)
            start_time = start_frame / self.target_sample_rate
            end_time = end_frame / self.target_sample_rate
            chunk = raw[start_frame * frame_size : end_frame * frame_size]
            yield start_time, end_time, chunk
