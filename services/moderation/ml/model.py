from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline


@dataclass
class EvaluationResult:
    report: dict[str, dict[str, float]]
    accuracy: float


class ModerationTextClassifier:
    """Wrapper around a Scikit-learn pipeline for toxicity detection."""

    def __init__(
        self,
        max_features: int = 20000,
        min_df: int = 1,
        ngram_range: tuple[int, int] = (1, 2),
    ) -> None:
        self.pipeline = Pipeline(
            steps=
            [
                (
                    "vectorizer",
                    TfidfVectorizer(
                        max_features=max_features,
                        min_df=min_df,
                        ngram_range=ngram_range,
                        lowercase=True,
                        strip_accents="unicode",
                    ),
                ),
                (
                    "classifier",
                    LogisticRegression(
                        max_iter=200,
                        class_weight="balanced",
                        solver="liblinear",
                    ),
                ),
            ]
        )

    def train(self, texts: Sequence[str], labels: Sequence[str]) -> None:
        self.pipeline.fit(texts, labels)

    def predict(self, texts: Sequence[str]) -> list[str]:
        return list(self.pipeline.predict(texts))

    def predict_proba(self, texts: Sequence[str]) -> list[list[float]]:
        classifier = self.pipeline.named_steps["classifier"]
        if hasattr(classifier, "predict_proba"):
            return list(self.pipeline.predict_proba(texts))
        raise AttributeError("Classifier does not support probability predictions.")

    def evaluate(self, texts: Sequence[str], labels: Sequence[str]) -> EvaluationResult:
        predictions = self.pipeline.predict(texts)
        report = classification_report(labels, predictions, output_dict=True)
        return EvaluationResult(report=report, accuracy=report["accuracy"])

    def save(self, path: Path | str) -> Path:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, target)
        return target

    @classmethod
    def load(cls, path: Path | str) -> "ModerationTextClassifier":
        classifier = cls.__new__(cls)
        classifier.pipeline = joblib.load(path)
        return classifier

    def update(self, dataset: Iterable[tuple[str, str]]) -> None:
        texts, labels = zip(*dataset)
        self.train(list(texts), list(labels))
