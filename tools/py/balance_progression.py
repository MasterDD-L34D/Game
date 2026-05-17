#!/usr/bin/env python3
"""Simulatore XP per le missioni con telemetria di progressione."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping
from copy import deepcopy

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
    parser.add_argument(
        "--profile",
        dest="profiles",
        action="append",
        metavar="NAME=CLASS:WEIGHT[,CLASS:WEIGHT...]",
        help="Definisce o sovrascrive un profilo multi-classe (es. helix_cipher=helix:0.55,cipher:0.45)",
    )
    parser.add_argument(
        "--profile-label",
        dest="profile_labels",
        action="append",
        metavar="NAME=LABEL",
        help="Etichetta per un profilo definito nel mission file o via CLI",
    )
    parser.add_argument(
        "--profile-target",
        dest="profile_targets",
        action="append",
        metavar="NAME:DIFFICOLTA=VALORE",
        help="Override del target XP per un profilo (es. helix_cipher:standard=1430)",
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


def _normalize_mix(raw_mix: Mapping[str, float]) -> dict[str, float]:
    mix = {str(class_id): float(weight) for class_id, weight in raw_mix.items()}
    total = sum(mix.values())
    if total <= 0:
        raise ValueError("Il mix del profilo deve avere un totale positivo")
    return {class_id: round(weight / total, 6) for class_id, weight in sorted(mix.items())}


def _normalize_profile_map(raw_profiles: Mapping[str, object]) -> dict[str, Mapping[str, object]]:
    normalized: dict[str, dict[str, object]] = {}
    for profile_name, profile in raw_profiles.items():
        if not isinstance(profile, Mapping):
            raise ValueError(f"Profilo '{profile_name}' non valido: atteso un mapping")
        mix = profile.get("mix")
        if not isinstance(mix, Mapping) or not mix:
            raise ValueError(f"Profilo '{profile_name}' privo di mix")
        normalized_mix = _normalize_mix(mix)
        label = profile.get("label")
        notes = profile.get("notes")
        raw_targets = profile.get("targets", {})
        targets: dict[str, dict[str, float]] = {}
        if isinstance(raw_targets, Mapping):
            for difficulty, target_payload in raw_targets.items():
                xp_total: float | None = None
                extra: dict[str, float] = {}
                if isinstance(target_payload, Mapping):
                    if "xp_total" in target_payload:
                        xp_total = float(target_payload["xp_total"])
                        extra = {k: target_payload[k] for k in target_payload if k != "xp_total"}
                elif target_payload is not None:
                    xp_total = float(target_payload)
                if xp_total is not None:
                    targets[difficulty] = {"xp_total": xp_total, **extra}
        normalized[profile_name] = {
            "mix": normalized_mix,
            "label": label,
            "notes": notes,
            "targets": targets,
        }
    return normalized


def collect_profiles(
    mission: Mapping[str, object],
    cli_profiles: Iterable[str] | None = None,
    cli_labels: Iterable[str] | None = None,
    cli_targets: Iterable[str] | None = None,
) -> Mapping[str, Mapping[str, object]] | None:
    progression = mission["progression"]
    base_profiles = progression.get("profiles", {})
    if isinstance(base_profiles, Mapping):
        profiles: dict[str, dict[str, object]] = {
            name: deepcopy(config) for name, config in base_profiles.items()
        }
    else:
        profiles = {}

    def ensure_profile(name: str) -> dict[str, object]:
        if name not in profiles:
            profiles[name] = {"mix": {}, "targets": {}}
        return profiles[name]

    for spec in cli_profiles or []:
        if "=" not in spec:
            raise SystemExit(f"Formato profilo non valido: '{spec}'")
        name, mix_spec = spec.split("=", 1)
        name = name.strip()
        mix_entries: dict[str, float] = {}
        for part in mix_spec.split(","):
            if ":" not in part:
                raise SystemExit(f"Formato mix non valido per il profilo '{name}': '{part}'")
            class_id, weight = part.split(":", 1)
            mix_entries[class_id.strip()] = float(weight)
        profile = ensure_profile(name)
        profile["mix"] = mix_entries

    for spec in cli_labels or []:
        if "=" not in spec:
            raise SystemExit(f"Formato label non valido: '{spec}'")
        name, label = spec.split("=", 1)
        name = name.strip()
        profile = ensure_profile(name)
        profile["label"] = label.strip()

    for spec in cli_targets or []:
        if "=" not in spec or ":" not in spec.split("=", 1)[0]:
            raise SystemExit(f"Formato target profilo non valido: '{spec}'")
        lhs, value = spec.split("=", 1)
        name, difficulty = lhs.split(":", 1)
        name = name.strip()
        difficulty = difficulty.strip()
        profile = ensure_profile(name)
        targets = profile.setdefault("targets", {})
        target_payload = targets.get(difficulty, {})
        if not isinstance(target_payload, Mapping):
            target_payload = {}
        target_payload.update({"xp_total": float(value)})
        targets[difficulty] = target_payload

    profiles = {name: config for name, config in profiles.items() if config.get("mix")}
    if not profiles:
        return None
    try:
        return _normalize_profile_map(profiles)
    except ValueError as exc:  # pragma: no cover - validazione CLI
        raise SystemExit(str(exc)) from exc


def simulate_xp_progression(
    mission: Mapping[str, object],
    profiles: Mapping[str, Mapping[str, object]] | None = None,
) -> Mapping[str, object]:
    progression = mission["progression"]
    xp_model = progression["xp_model"]
    wave_slices = _wave_slices(progression)
    completion_bonus = float(xp_model["completion_bonus"])
    class_modifiers: Mapping[str, float] = progression["class_modifiers"]
    difficulty_scalars: Mapping[str, float] = xp_model["difficulty_scalars"]
    targets = progression.get("targets", {})
    total_duration = _sum_duration_minutes(progression["waves"])
    raw_profiles = profiles if profiles is not None else progression.get("profiles", {})
    normalized_profiles = (
        _normalize_profile_map(raw_profiles)
        if isinstance(raw_profiles, Mapping) and raw_profiles
        else {}
    )

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

    profile_payload: dict[str, object] = {}

    for profile_name, profile_config in normalized_profiles.items():
        mix: Mapping[str, float] = profile_config["mix"]
        label = profile_config.get("label")
        notes = profile_config.get("notes")
        profile_targets: Mapping[str, Mapping[str, float]] = profile_config.get("targets", {})
        difficulties_payload: dict[str, object] = {}

        for difficulty, diff_payload in difficulties.items():
            classes_payload = diff_payload["classes"]
            missing = [class_id for class_id in mix if class_id not in classes_payload]
            if missing:
                raise ValueError(
                    f"Classi mancanti per il profilo '{profile_name}': {', '.join(missing)}"
                )
            total_xp = sum(
                classes_payload[class_id]["total_xp"] * mix[class_id]
                for class_id in mix
            )
            total_xp = round(total_xp, 4)
            xp_per_minute = round(total_xp / total_duration, 4) if total_duration else None
            target_payload = profile_targets.get(difficulty, {})
            target_xp = target_payload.get("xp_total") if isinstance(target_payload, Mapping) else None
            delta_pct = _delta_vs_target(total_xp, target_xp)
            difficulties_payload[difficulty] = {
                "total_xp": total_xp,
                "target_xp": target_xp,
                "delta_vs_target_pct": None if delta_pct is None else round(delta_pct, 4),
                "xp_per_minute": xp_per_minute,
            }

        profile_payload[profile_name] = {
            "label": label,
            "notes": notes,
            "mix": dict(mix),
            "targets": profile_targets,
            "difficulties": difficulties_payload,
        }

    return {
        "waves": {
            "duration_minutes": total_duration,
            "breakdown": waves_payload,
            "base_total_xp": round(base_total, 4),
        },
        "difficulties": difficulties,
        "profiles": profile_payload,
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


def _write_profiles_csv(path: Path, payload: Mapping[str, object]) -> None:
    import csv

    profiles = payload.get("profiles")
    if not profiles:
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "profile_id",
                "label",
                "difficulty",
                "total_xp",
                "target_xp",
                "delta_vs_target_pct",
                "xp_per_minute",
            ]
        )
        for profile_id, profile_payload in profiles.items():
            label = profile_payload.get("label")
            for difficulty, diff_payload in profile_payload["difficulties"].items():
                writer.writerow(
                    [
                        profile_id,
                        label,
                        difficulty,
                        diff_payload["total_xp"],
                        diff_payload["target_xp"],
                        diff_payload["delta_vs_target_pct"],
                        diff_payload["xp_per_minute"],
                    ]
                )


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    mission = load_mission_config(args.mission, args.mission_key)
    profiles = collect_profiles(mission, args.profiles, args.profile_labels, args.profile_targets)
    payload = simulate_xp_progression(mission, profiles)

    out_dir: Path = args.out_dir
    _write_json(out_dir / "skydock_siege_xp.json", payload)
    _write_csv(out_dir / "skydock_siege_xp_summary.csv", payload)
    _write_profiles_csv(out_dir / "skydock_siege_xp_profiles.csv", payload)

    computed_profiles = ", ".join(payload["profiles"].keys()) if payload["profiles"] else "nessuno"
    print(f"Dati XP salvati in {out_dir} (profili: {computed_profiles})")
    return 0


if __name__ == "__main__":  # pragma: no cover - entrypoint script
    raise SystemExit(main())

