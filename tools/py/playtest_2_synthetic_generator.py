#!/usr/bin/env python3
"""Synthetic playtest #2 telemetry generator — N-session plausible distribution.

Generates JSONL telemetry matching the schema expected by
tools/py/playtest_2_analyzer.py. Statistically plausible distributions
(MBTI 16-type prior, Ennea 9-archetype mix, Conviction 3-axis Gaussian,
Sentience T0-T6 weighted) so analyzer surfaces realistic verdicts.

Use cases:
  - Pre-userland dry-run of full pipeline (validate analyzer + reporting)
  - Synthetic baseline ahead of real playtest #2
  - Regression fixture (deterministic via --seed)

Usage:
  python tools/py/playtest_2_synthetic_generator.py \\
      --sessions 30 --seed 42 \\
      --output playtest-2-synthetic-30-sessions.jsonl

  # Then run analyzer:
  python tools/py/playtest_2_analyzer.py \\
      --telemetry playtest-2-synthetic-30-sessions.jsonl \\
      --output docs/playtest/2026-05-14-playtest-2-baseline.md
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

# Windows cp1252 stdout chokes on Unicode arrows; force UTF-8 if supported.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except (TypeError, ValueError):
        pass


# Plausible distributions. MBTI: real-world skew (ISFJ/ESFJ frequent, ENTJ rare).
MBTI_WEIGHTS = {
    "ISFJ": 13.8, "ESFJ": 12.3, "ISTJ": 11.6, "ISFP": 8.8,
    "ESTJ": 8.7,  "ESFP": 8.5,  "ENFP": 8.1, "ISTP": 5.4,
    "INFP": 4.4,  "ESTP": 4.3,  "INTP": 3.3, "ENTP": 3.2,
    "ENFJ": 2.5,  "INTJ": 2.1,  "ENTJ": 1.8, "INFJ": 1.5,
}

ENNEA_LABELS = [
    "Riformatore(1)", "Coordinatore(2)", "Conquistatore(3)",
    "Individualista(4)", "Architetto(5)", "Lealista(6)",
    "Esploratore(7)", "Cacciatore(8)", "Stoico(9)",
]

# Job mix — bias toward melee classes (combat-driven game).
JOB_WEIGHTS = {
    "guerriero": 35,
    "custode": 25,
    "esploratore": 25,
    "tessitore": 15,
}

# Sentience tier distribution per RFC v0.1 (Pack v2-plus skew: T0-T3 dominant).
SENTIENCE_WEIGHTS = {
    "T0": 5, "T1": 30, "T2": 30, "T3": 20, "T4": 10, "T5": 4, "T6": 1,
}

INTEROCEPTION_TRAITS = {
    "proprioception_balance": 0.35,
    "vestibular_advantage": 0.25,
    "nociception_reactive": 0.15,
    "thermoception_resist": 0.18,
}

BIOMES = [
    "savana", "caverna", "foresta_temperata", "atollo_obsidiana",
    "badlands", "dorsale_termale", "canyon_risonante",
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Synthetic playtest #2 telemetry generator")
    p.add_argument("--sessions", type=int, default=30, help="Number of sessions")
    p.add_argument("--seed", type=int, default=42, help="Random seed (deterministic)")
    p.add_argument("--output", required=True, help="Output JSONL path")
    return p.parse_args()


def weighted_choice(rng: random.Random, weights: dict[str, float]) -> str:
    """Weighted random pick by dict values."""
    items = list(weights.keys())
    w = list(weights.values())
    return rng.choices(items, weights=w, k=1)[0]


def gen_session(rng: random.Random, sid: str) -> list[dict]:
    """Generate ~8-15 plausible events for one session."""
    events: list[dict] = []
    actor_id = f"pg-{sid}"
    job_id = weighted_choice(rng, JOB_WEIGHTS)
    mbti_type = weighted_choice(rng, MBTI_WEIGHTS)
    ennea = rng.choice(ENNEA_LABELS)
    sentience_tier = weighted_choice(rng, SENTIENCE_WEIGHTS)

    # Conviction axes — Gaussian-like distribution centered at 50.
    conviction = {
        "utility": max(0, min(100, int(rng.gauss(50, 15)))),
        "liberty": max(0, min(100, int(rng.gauss(50, 15)))),
        "morality": max(0, min(100, int(rng.gauss(50, 15)))),
    }

    num_attacks = rng.randint(3, 8)
    for i in range(num_attacks):
        # Per-attack: latency Gaussian centered ~65ms (PASS-ish), σ=25.
        latency = max(10, int(rng.gauss(65, 25)))
        trait_effects = []
        # Each interoception trait fires with its probability per attack.
        for tag, prob in INTEROCEPTION_TRAITS.items():
            if rng.random() < prob:
                trait_effects.append({"trait": tag, "triggered": True, "effect": tag})
        events.append({
            "session_id": sid,
            "action_type": "attack",
            "actor_id": actor_id,
            "command_latency_ms": latency,
            "trait_effects": trait_effects,
            "pressure_tier": rng.randint(1, 4),
        })

    # 25% sessions trigger rewind.
    if rng.random() < 0.25:
        events.append({
            "session_id": sid,
            "action_type": "rewind",
            "actor_id": actor_id,
            "command_latency_ms": max(80, int(rng.gauss(110, 20))),
        })

    # ~85% sessions trigger promotion (some don't reach threshold).
    if rng.random() < 0.85:
        # Tier picked weighted: more veterans + captains than elite/master.
        tier = weighted_choice(rng, {
            "veteran": 40,
            "captain": 30,
            "elite": 20,
            "master": 10,
        })
        events.append({
            "session_id": sid,
            "action_type": "promotion",
            "actor_id": actor_id,
            "job_id": job_id,
            "applied_tier": tier,
            "command_latency_ms": max(20, int(rng.gauss(45, 12))),
        })

    # vc_snapshot — always emitted at debrief.
    events.append({
        "session_id": sid,
        "event_type": "vc_snapshot",
        "per_actor": {
            actor_id: {
                "mbti_type": mbti_type,
                "ennea_archetypes": {ennea: True},
                "conviction_axis": conviction,
                "sentience": {"tier": sentience_tier, "source": "species_catalog"},
            }
        }
    })

    # ~40% sessions use Skiv pulse.
    pulse_count = rng.randint(1, 3) if rng.random() < 0.4 else 0
    for _ in range(pulse_count):
        biome = rng.choice(BIOMES)
        events.append({
            "session_id": sid,
            "event_type": "skiv_pulse_fired",
            "actor_id": actor_id,
            "target_biome_id": biome,
        })
        # 60% chance pulse → biome_focus click (player engages reveal)
        if rng.random() < 0.6:
            events.append({
                "session_id": sid,
                "event_type": "biome_focus_changed",
                "biome_id": biome,
            })

    return events


def main() -> int:
    args = parse_args()
    rng = random.Random(args.seed)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    total_events = 0
    with out_path.open("w", encoding="utf-8") as f:
        f.write(f"# Synthetic playtest #2 telemetry — seed={args.seed} "
                f"sessions={args.sessions}\n")
        f.write("# Generated by tools/py/playtest_2_synthetic_generator.py\n")
        f.write("# Use for analyzer dry-run + baseline reference pre-userland.\n")
        for i in range(args.sessions):
            sid = f"synth-s{i+1:03d}"
            for ev in gen_session(rng, sid):
                f.write(json.dumps(ev, ensure_ascii=False) + "\n")
                total_events += 1

    print(f"[synth-gen] wrote {args.sessions} sessions / {total_events} events → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
