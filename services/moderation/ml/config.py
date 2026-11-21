from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "dataset.jsonl"
MODEL_PATH = Path(__file__).resolve().parents[3] / "models" / "moderation" / "text_classifier.joblib"
METRICS_PATH = BASE_DIR / "metrics.json"


@dataclass(frozen=True)
class TrainingConfig:
    test_size: float = 0.2
    random_state: int = 42
    max_features: int = 20000
    min_df: int = 1
    ngram_range: tuple[int, int] = (1, 2)


@dataclass(frozen=True)
class RetrainingConfig:
    interval: timedelta = timedelta(days=7)
    max_runs: int | None = None
    notify_channel: str = "#moderation-ops"
    dataset_path: Path = DATASET_PATH
    model_path: Path = MODEL_PATH
    metrics_path: Path = METRICS_PATH
