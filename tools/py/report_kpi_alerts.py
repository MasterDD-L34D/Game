"""Analyse KPI metrics exported by tests/validate_dashboard.py and raise alerts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
BASELINE_PATH = REPO_ROOT / "config" / "dashboard_metrics_baseline.json"
DEFAULT_TOLERANCE = 0.1


class MetricsError(RuntimeError):
    """Raised when KPI deviations exceed the configured tolerance."""


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"File JSON non trovato: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _evaluate(current: dict[str, Any], baseline: dict[str, Any], tolerance: float) -> list[str]:
    alerts: list[str] = []
    for section, baseline_metrics in baseline.items():
        current_metrics = current.get(section)
        if not isinstance(baseline_metrics, dict) or not isinstance(current_metrics, dict):
            continue
        for key, baseline_value in baseline_metrics.items():
            if not isinstance(baseline_value, (int, float)):
                continue
            current_value = current_metrics.get(key)
            if not isinstance(current_value, (int, float)):
                continue
            if baseline_value == 0:
                continue
            delta_ratio = (baseline_value - current_value) / baseline_value
            if delta_ratio > tolerance:
                alerts.append(
                    f"[{section}] metrica '{key}' scesa da {baseline_value} a {current_value} (variazione {delta_ratio:.1%})"
                )
    return alerts


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Confronta le metriche correnti con la baseline di riferimento")
    parser.add_argument("--metrics", type=Path, required=True, help="Percorso del file JSON generato dal validator")
    parser.add_argument(
        "--baseline",
        type=Path,
        default=BASELINE_PATH,
        help="Baseline di riferimento da usare per il confronto",
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=DEFAULT_TOLERANCE,
        help="Tolleranza massima consentita (espressa come percentuale di calo)",
    )
    args = parser.parse_args(argv)

    current_metrics = _load_json(args.metrics)
    baseline_metrics = _load_json(args.baseline)

    alerts = _evaluate(current_metrics, baseline_metrics, args.tolerance)
    if alerts:
        for line in alerts:
            print(line)
        raise MetricsError("Deviazioni KPI oltre soglia")

    print("Nessuna deviazione KPI oltre la soglia configurata")


if __name__ == "__main__":
    main()
