#!/usr/bin/env python3
"""Simulatore XP per le missioni con telemetria di progressione."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping

import yaml


@dataclass(frozen=True)
class WaveSlice:
    """Rappresenta una singola onda della missione."""

    index: int
    base_xp: float
    bonus_xp: float

    @property
    def total_xp(self) -> float:
        return self.base_xp + self.bonus_xp


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simula la progressione XP di una missione")
    parser.add_argument(
        "--mission",
        type=Path,
        default=Path("data/core/missions/skydock_siege.yaml"),
        help="File YAML della missione da analizzare",
    )
    parser.add_argument(
        "--mission-key",
        default="skydock_siege",
        help="Chiave della missione all'interno del file YAML",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("data/derived/analysis/progression"),
        help="Directory di output per i dati derivati",
    )
    return parser


def load_mission_config(path: Path, mission_key: str) -> Mapping[str, object]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    try:
        return payload[mission_key]
    except KeyError as exc:  # pragma: no cover - guardrail CLI
        raise SystemExit(f"Missione '{mission_key}' non trovata in {path}") from exc


def _wave_slices(progression: Mapping[str, object]) -> list[WaveSlice]:
    xp_model = progression["xp_model"]
    base_wave_xp = float(xp_model["base_wave_xp"])
    increment = float(xp_model["increment_per_wave"])
    wave_count = int(progression["waves"]["count"])
    bonuses: dict[int, float] = {
        int(entry["wave"]): float(entry["xp_bonus"])
        for entry in progression.get("wave_bonuses", [])
    }
    return [
        WaveSlice(
            index=wave,
            base_xp=base_wave_xp + increment * (wave - 1),
            bonus_xp=bonuses.get(wave, 0.0),
        )
        for wave in range(1, wave_count + 1)
    ]


def _sum_duration_minutes(waves: Mapping[str, object]) -> float:
    cadence = waves.get("cadence_minutes")
    if isinstance(cadence, Iterable):
        return float(sum(float(item) for item in cadence))
    return float(waves.get("duration_minutes", 0.0))


def _delta_vs_target(total_xp: float, target: float | None) -> float | None:
    if not target:
        return None
    if target == 0:
        return None
    return (total_xp - target) / target * 100.0


def simulate_xp_progression(mission: Mapping[str, object]) -> Mapping[str, object]:
    progression = mission["progression"]
    xp_model = progression["xp_model"]
    wave_slices = _wave_slices(progression)
    completion_bonus = float(xp_model["completion_bonus"])
    class_modifiers: Mapping[str, float] = progression["class_modifiers"]
    difficulty_scalars: Mapping[str, float] = xp_model["difficulty_scalars"]
    targets = progression.get("targets", {})
    total_duration = _sum_duration_minutes(progression["waves"])

    waves_payload = [
        {
            "wave": wave.index,
            "base_xp": wave.base_xp,
            "bonus_xp": wave.bonus_xp,
            "total_xp": wave.total_xp,
        }
        for wave in wave_slices
    ]

    difficulties: dict[str, object] = {}
    base_total = sum(slice_.total_xp for slice_ in wave_slices) + completion_bonus

    for difficulty, scalar in difficulty_scalars.items():
        scalar = float(scalar)
        difficulty_target = targets.get(difficulty, {})
        target_total_xp = difficulty_target.get("xp_total")
        classes_payload: dict[str, object] = {}

        for class_id, modifier in class_modifiers.items():
            modifier = float(modifier)
            wave_breakdown = [
                round(slice_.total_xp * scalar * modifier, 4)
                for slice_ in wave_slices
            ]
            completion_component = round(completion_bonus * scalar * modifier, 4)
            total_xp = round(sum(wave_breakdown) + completion_component, 4)
            delta_pct = _delta_vs_target(total_xp, target_total_xp)
            xp_per_minute = round(total_xp / total_duration, 4) if total_duration else None

            classes_payload[class_id] = {
                "total_xp": total_xp,
                "wave_breakdown": wave_breakdown,
                "completion_component": completion_component,
                "target_xp": target_total_xp,
                "delta_vs_target_pct": None if delta_pct is None else round(delta_pct, 4),
                "xp_per_minute": xp_per_minute,
            }

        average_total = sum(entry["total_xp"] for entry in classes_payload.values()) / len(classes_payload)
        difficulties[difficulty] = {
            "scalar": scalar,
            "target": difficulty_target,
            "classes": classes_payload,
            "average_total_xp": round(average_total, 4),
        }

    return {
        "waves": {
            "duration_minutes": total_duration,
            "breakdown": waves_payload,
            "base_total_xp": round(base_total, 4),
        },
        "difficulties": difficulties,
    }


def _write_json(path: Path, payload: Mapping[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _write_csv(path: Path, payload: Mapping[str, object]) -> None:
    import csv

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "difficulty",
                "class_id",
                "total_xp",
                "target_xp",
                "delta_vs_target_pct",
                "xp_per_minute",
            ]
        )
        for difficulty, diff_payload in payload["difficulties"].items():
            for class_id, class_payload in diff_payload["classes"].items():
                writer.writerow(
                    [
                        difficulty,
                        class_id,
                        class_payload["total_xp"],
                        class_payload["target_xp"],
                        class_payload["delta_vs_target_pct"],
                        class_payload["xp_per_minute"],
                    ]
                )


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    mission = load_mission_config(args.mission, args.mission_key)
    payload = simulate_xp_progression(mission)

    out_dir: Path = args.out_dir
    _write_json(out_dir / "skydock_siege_xp.json", payload)
    _write_csv(out_dir / "skydock_siege_xp_summary.csv", payload)

    print(f"Dati XP salvati in {out_dir}")
    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    raise SystemExit(main())

