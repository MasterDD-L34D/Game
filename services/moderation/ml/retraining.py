from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Iterable

from .config import RetrainingConfig
from .training import train_and_persist


@dataclass
class RetrainingEvent:
    run_at: datetime
    metrics: dict[str, float | dict[str, float]] | None = None
    status: str = "scheduled"
    note: str | None = None


@dataclass
class ModerationRetrainingPlanner:
    config: RetrainingConfig = field(default_factory=RetrainingConfig)
    notifier: Callable[[str], None] | None = None
    history_path: Path = field(default_factory=lambda: Path(__file__).resolve().parent / "retraining_history.json")

    def __post_init__(self) -> None:
        self._history: list[RetrainingEvent] = []
        if self.history_path.exists():
            raw = json.loads(self.history_path.read_text(encoding="utf-8"))
            for entry in raw:
                self._history.append(
                    RetrainingEvent(
                        run_at=datetime.fromisoformat(entry["run_at"]),
                        metrics=entry.get("metrics"),
                        status=entry.get("status", "scheduled"),
                        note=entry.get("note"),
                    )
                )

    @property
    def history(self) -> list[RetrainingEvent]:
        return list(self._history)

    def plan_next_run(self, base_time: datetime | None = None) -> RetrainingEvent:
        base = base_time or datetime.utcnow()
        event = RetrainingEvent(run_at=base + self.config.interval)
        self._history.append(event)
        self._persist_history()
        return event

    def run_now(self) -> RetrainingEvent:
        event = RetrainingEvent(run_at=datetime.utcnow(), status="running")
        self._history.append(event)
        self._persist_history()

        metrics = train_and_persist(
            dataset_path=self.config.dataset_path,
            model_path=self.config.model_path,
            metrics_path=self.config.metrics_path,
        )
        event.metrics = metrics
        event.status = "succeeded"
        self._persist_history()

        if self.notifier:
            self.notifier(self._format_notification(event))
        return event

    def incremental_update(self, samples: Iterable[tuple[str, str]]) -> None:
        from .model import ModerationTextClassifier

        model = ModerationTextClassifier.load(self.config.model_path)
        model.update(samples)
        model.save(self.config.model_path)

    def _format_notification(self, event: RetrainingEvent) -> str:
        accuracy = event.metrics.get("accuracy") if event.metrics else None
        message = [
            "🤖 Retraining completato",
            f"Modello aggiornato alle {event.run_at.isoformat()} UTC",
        ]
        if accuracy is not None:
            message.append(f"Accuratezza validazione: {accuracy:.2%}")
        return " - ".join(message)

    def _persist_history(self) -> None:
        payload = [
            {
                "run_at": event.run_at.isoformat(),
                "metrics": event.metrics,
                "status": event.status,
                "note": event.note,
            }
            for event in self._history
        ]
        self.history_path.parent.mkdir(parents=True, exist_ok=True)
        self.history_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
