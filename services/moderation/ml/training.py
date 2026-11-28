from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from sklearn.model_selection import train_test_split

from .config import DATASET_PATH, METRICS_PATH, MODEL_PATH, TrainingConfig
from .model import ModerationTextClassifier


class DatasetLoadError(RuntimeError):
    pass


def load_dataset(path: Path | str = DATASET_PATH) -> tuple[list[str], list[str]]:
    dataset_path = Path(path)
    if not dataset_path.exists():
        raise DatasetLoadError(f"Dataset not found at {dataset_path}")

    texts: list[str] = []
    labels: list[str] = []
    with dataset_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            sample = json.loads(line)
            texts.append(sample["text"])
            labels.append(sample["label"])
    if not texts:
        raise DatasetLoadError("Dataset is empty")
    return texts, labels


def _serialize_metrics(metrics: dict) -> dict:
    serialized: dict[str, dict[str, float] | float] = {}
    for label, values in metrics.items():
        if isinstance(values, dict):
            serialized[label] = {
                metric: round(float(value), 4) for metric, value in values.items()
            }
        else:
            serialized[label] = round(float(values), 4)
    return serialized


def train_and_persist(
    dataset_path: Path | str = DATASET_PATH,
    model_path: Path | str = MODEL_PATH,
    metrics_path: Path | str = METRICS_PATH,
    config: TrainingConfig | None = None,
) -> dict:
    cfg = config or TrainingConfig()

    texts, labels = load_dataset(dataset_path)
    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=cfg.test_size,
        random_state=cfg.random_state,
        stratify=labels,
    )

    classifier = ModerationTextClassifier(
        max_features=cfg.max_features,
        min_df=cfg.min_df,
        ngram_range=cfg.ngram_range,
    )
    classifier.train(x_train, y_train)
    metrics = classifier.evaluate(x_test, y_test)
    classifier.save(model_path)

    serialized_metrics = _serialize_metrics(metrics.report)
    metrics_file = Path(metrics_path)
    metrics_file.parent.mkdir(parents=True, exist_ok=True)
    metrics_file.write_text(json.dumps(serialized_metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    return serialized_metrics


def stream_retraining_samples(dataset_path: Path | str = DATASET_PATH) -> Iterable[tuple[str, str]]:
    texts, labels = load_dataset(dataset_path)
    for text, label in zip(texts, labels):
        yield text, label
