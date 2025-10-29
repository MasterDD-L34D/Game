#!/usr/bin/env python3
"""Generate Pathfinder ETL coverage across functional axes vs trait library."""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
from collections import Counter
from pathlib import Path
from typing import Any, Mapping

try:  # pragma: no cover - optional dependency for YAML parsing
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    yaml = None

AXIS_CONFIG: tuple[tuple[str, str, str], ...] = (
    ("threat", "Asse Minaccia", "offensiva"),
    ("defense", "Asse Difensivo", "difesa"),
    ("mobility", "Asse Mobilità", "locomozione"),
    ("perception", "Asse Sensoriale", "sensoriale"),
    ("magic", "Asse Strategico", "strategia"),
    ("social", "Asse Supporto", "supporto"),
    ("stealth", "Asse Occulto", "simbiotico"),
    ("environment", "Asse Ambientale", "metabolismo"),
    ("versatility", "Asse Strutturale", "struttura"),
)

HIGH_THRESHOLD = 0.6
CRITICAL_THRESHOLD = 0.8
CREATURES_PER_TRAIT = 45


def load_json(path: Path) -> Mapping[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_yaml(path: Path) -> Mapping[str, Any]:
    if yaml is None:
        raise RuntimeError(
            "PyYAML non disponibile: impossibile analizzare la baseline dei tratti"
        )
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def role_from_entry(entry: Mapping[str, Any]) -> str:
    type_field = str(entry.get("type") or "").lower()
    if type_field in {"dragon", "magical beast", "outsider", "aberration"}:
        return "predatore_terziario_apex"
    if type_field in {"plant", "ooze", "vermin"}:
        return "ingegneri_ecosistema"
    if type_field in {"construct", "undead"}:
        return "minaccia_microbica"
    return "evento_ecologico"


def collect_pathfinder_stats(dataset_path: Path) -> dict[str, Any]:
    payload = load_json(dataset_path)
    creatures = payload.get("creatures")
    if not isinstance(creatures, list):
        return {}

    axis_stats: dict[str, dict[str, Any]] = {}
    for key, _, _ in AXIS_CONFIG:
        axis_stats[key] = {
            "scores": [],
            "high_count": 0,
            "critical_count": 0,
            "roles": Counter(),
        }

    for entry in creatures:
        if not isinstance(entry, Mapping):
            continue
        axes = entry.get("axes") if isinstance(entry, Mapping) else {}
        if not isinstance(axes, Mapping):
            axes = {}
        role = role_from_entry(entry)
        for key, _, _ in AXIS_CONFIG:
            score = axes.get(key, 0)
            try:
                numeric = float(score)
            except (TypeError, ValueError):
                numeric = 0.0
            stats = axis_stats[key]
            stats["scores"].append(numeric)
            if numeric >= HIGH_THRESHOLD:
                stats["high_count"] += 1
                stats["roles"][role] += 1
            if numeric >= CRITICAL_THRESHOLD:
                stats["critical_count"] += 1

    return axis_stats


def collect_trait_counts(baseline_path: Path) -> Counter[str]:
    baseline = load_yaml(baseline_path)
    traits = baseline.get("traits")
    counts: Counter[str] = Counter()
    if not isinstance(traits, Mapping):
        return counts
    for entry in traits.values():
        if not isinstance(entry, Mapping):
            continue
        if entry.get("missing_metadata"):
            continue
        archetype = entry.get("archetype")
        if isinstance(archetype, str):
            key = archetype.strip().lower()
            if key:
                counts[key] += 1
    return counts


def format_roles(counter: Counter[str]) -> str:
    if not counter:
        return ""
    parts = [f"{role}:{count}" for role, count in counter.most_common(3)]
    return "; ".join(parts)


def impact_category(score: int, missing: int) -> str:
    if missing <= 0:
        return "Stabile"
    if score >= 300:
        return "Critico"
    if score >= 150:
        return "Alto"
    if score >= 60:
        return "Medio"
    return "Basso"


def effort_estimate(missing: int) -> str:
    if missing <= 0:
        return "Allineato"
    if missing == 1:
        return "Basso (1 tratto)"
    if missing <= 3:
        return "Medio (2-3 tratti)"
    return "Alto (≥4 tratti)"


def summarise(axis_stats: Mapping[str, Any], trait_counts: Counter[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for key, label, archetype in AXIS_CONFIG:
        stats = axis_stats.get(key, {})
        scores = stats.get("scores", []) if isinstance(stats, Mapping) else []
        high_count = int(stats.get("high_count", 0)) if isinstance(stats, Mapping) else 0
        critical_count = (
            int(stats.get("critical_count", 0)) if isinstance(stats, Mapping) else 0
        )
        total = len(scores)
        average = round(sum(scores) / total, 3) if total else 0.0
        median = round(statistics.median(scores), 3) if total else 0.0
        roles = stats.get("roles") if isinstance(stats, Mapping) else Counter()
        if not isinstance(roles, Counter):
            roles = Counter(roles) if isinstance(roles, Mapping) else Counter()
        library_traits = trait_counts.get(archetype.lower(), 0)
        recommended = math.ceil(high_count / CREATURES_PER_TRAIT) if high_count else 0
        missing = max(0, recommended - library_traits)
        impact_score = high_count + (critical_count * 2)
        rows.append(
            {
                "axis_key": key,
                "axis_label": label,
                "trait_archetype": archetype,
                "creatures_total": total,
                "avg_score": average,
                "median_score": median,
                "high_creatures": high_count,
                "critical_creatures": critical_count,
                "top_roles": format_roles(roles),
                "library_traits": library_traits,
                "recommended_traits": recommended,
                "missing_traits": missing,
                "impact_score": impact_score,
                "impact_category": impact_category(impact_score, missing),
                "effort_estimate": effort_estimate(missing),
            }
        )
    rows.sort(key=lambda row: row["impact_score"], reverse=True)
    return rows


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["axis_key", "axis_label", "trait_archetype", "note"])
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path("data/external/pathfinder_bestiary_1e.json"),
        help="Dataset normalizzato dal bestiario Pathfinder",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=Path("data/analysis/trait_baseline.yaml"),
        help="Baseline dei tratti Evo Tactics",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("reports/pathfinder_trait_gap.csv"),
        help="Percorso del report CSV da generare",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    axis_stats = collect_pathfinder_stats(args.dataset)
    trait_counts = collect_trait_counts(args.baseline)
    rows = summarise(axis_stats, trait_counts)
    write_csv(args.out, rows)
    print(f"Report generato in {args.out}")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())
