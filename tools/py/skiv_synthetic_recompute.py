#!/usr/bin/env python3
"""Skiv state synthetic recompute scaffold — TKT-ECO-Z7 Phase 4 prep.

ADR-2026-05-15 follow-up: master-dd verdict D-Phase-A-residue-Skiv = B
(synthetic recompute via seed_skiv_saga.py extended ~2h).

Purpose: simulate post-encounter state evolution per Skiv saga.json updates
WITHOUT requiring live playtest. Generates plausible synthetic encounter
events + applies XP/mood/thought deltas. MVP scaffold ships event generator
+ apply function; full TKT-ECO-Z7 implementation deferred Phase 4 playtest
userland (requires real session.events log consumption).

Usage:
    # Generate N synthetic encounters per Skiv
    python3 tools/py/skiv_synthetic_recompute.py --count 10 --biome savana

    # Apply to saga state (writes to data/derived/skiv_saga_synthetic.json)
    python3 tools/py/skiv_synthetic_recompute.py --count 10 --apply

Output:
    data/derived/skiv_synthetic_events.jsonl (synthetic events)
    data/derived/skiv_saga_synthetic.json (state post-apply, when --apply)

Cross-link:
    docs/skiv/CANONICAL.md (Skiv canonical identity)
    tools/py/seed_skiv_saga.py (initial state composer)
    docs/planning/2026-05-13-ecosystem-research-solution-plan.md TKT-ECO-Z7
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SAGA_PATH = ROOT / "data" / "derived" / "skiv_saga.json"
SYNTHETIC_EVENTS_PATH = ROOT / "data" / "derived" / "skiv_synthetic_events.jsonl"
SAGA_SYNTHETIC_PATH = ROOT / "data" / "derived" / "skiv_saga_synthetic.json"

# Heuristic XP grant per encounter outcome.
XP_BY_OUTCOME = {
    "victory_low": 25,
    "victory_med": 50,
    "victory_apex": 100,
    "draw": 15,
    "defeat": 10,
}

# Plausible encounter outcomes weighted (Skiv = INTP stalker, vagans loner,
# Sentience T2-T3, level 4 — favors stealth victories).
OUTCOME_WEIGHTS = [
    ("victory_low", 0.40),
    ("victory_med", 0.30),
    ("victory_apex", 0.10),
    ("draw", 0.15),
    ("defeat", 0.05),
]

# ADR-2026-05-15 Phase 3 Path D extension — Skiv canonical voice diary beats
# per outcome type (italian, sensory-desertic, prima persona).
# Cross-link: docs/skiv/CANONICAL.md:30-37 voice rule.
DIARY_BEATS = {
    "victory_low": [
        "Sabbia copre tracce sue. Allenatore mi guida bene.",
        "Vento aiuta, ho sentito prima del balzo.",
        "Piccolo trionfo. Ridge sopra ancora cantano.",
    ],
    "victory_med": [
        "Allenatore vede crepa. Io l'ho odorata ore prima.",
        "Branco non c'era, ma il deserto sì. Mi tiene memoria.",
        "Caldo dell'ora bassa nel torace, vittoria nuova.",
    ],
    "victory_apex": [
        "Apex caduto. Allenatore non sapeva del polso magnetico. Io sì.",
        "Sussulto profondo dopo. La sabbia ricorda.",
        "Predatore più grande di me, ora io sopra. Sabbia segue.",
    ],
    "draw": [
        "Né vinto né perso. Allenatore valuta. Io aspetto.",
        "Equilibrio sospeso, vento porta tracce di entrambi.",
    ],
    "defeat": [
        "Ferito. Sabbia copre, allenatore raccoglie. Imparare.",
        "Errore di lettura, predatore più rapido. Ridge tace.",
    ],
}

# Synthetic mutation trigger thresholds (heuristic Skiv lifecycle):
# - victory_apex count >=3 → mutation eligible (Apex resonance)
# - cumulative XP >=500 → mutation slot unlock
# - defeat count >=2 in window → wound-mutation (scar adaptation)
MUTATION_TRIGGERS = {
    "apex_resonance": {
        "condition": lambda tally, xp: tally.get("victory_apex", 0) >= 3,
        "mutation_id": "echo_apex_chord",
        "diary": "Apex tre volte. Voci si combinano in coro nel petto. Allenatore noterà.",
    },
    "xp_threshold_unlock": {
        "condition": lambda tally, xp: xp >= 500,
        "mutation_id": "skiv_resonance_growth",
        "diary": "Crescita lenta. Allenatore mi pesa, dice che cambio. Sabbia conferma.",
    },
    "wound_scar_adaptation": {
        "condition": lambda tally, xp: tally.get("defeat", 0) >= 2,
        "mutation_id": "scar_pattern_evolution",
        "diary": "Cicatrici parlano. Imparo a leggere lo scontro prima. Ferito mi insegna.",
    },
}


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--count", type=int, default=10, help="Number of synthetic encounters")
    p.add_argument(
        "--biome",
        default="savana",
        help="Biome context per encounters (default: savana, Skiv canonical)",
    )
    p.add_argument(
        "--seed",
        type=int,
        default=42,
        help="RNG seed for deterministic synthetic (default: 42)",
    )
    p.add_argument("--apply", action="store_true", help="Apply events to saga state")
    p.add_argument(
        "--start-iso",
        default="2026-05-16T09:00:00Z",
        help="Synthetic events start timestamp",
    )
    return p.parse_args()


def weighted_outcome(rng: random.Random) -> str:
    """Sample outcome per OUTCOME_WEIGHTS distribution."""
    r = rng.random()
    cumulative = 0.0
    for outcome, weight in OUTCOME_WEIGHTS:
        cumulative += weight
        if r < cumulative:
            return outcome
    return OUTCOME_WEIGHTS[-1][0]


def generate_synthetic_events(count: int, biome: str, seed: int, start_iso: str) -> list[dict]:
    """Generate N plausible synthetic encounter events."""
    rng = random.Random(seed)
    start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    events = []
    for i in range(count):
        ts = start + timedelta(hours=i * 4)
        outcome = weighted_outcome(rng)
        events.append(
            {
                "ts": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "unit_id": "skiv",
                "event_type": "encounter_synthetic",
                "turn": i + 1,
                "payload": {
                    "biome": biome,
                    "outcome": outcome,
                    "xp_gained": XP_BY_OUTCOME[outcome],
                    "synthetic_seed": seed,
                },
                "source": "skiv_synthetic_recompute",
            }
        )
    return events


def apply_events_to_state(state: dict, events: list[dict]) -> dict:
    """Mutate state.progression + synthetic diary beats + mutation triggers.

    ADR-2026-05-15 Phase 3 Path D extension — TKT-ECO-Z7 Skiv lifecycle full:
        - xp_total += sum(xp_gained per event)
        - level auto-recompute via XP ladder (heuristic 100*level^2)
        - encounter_count += len(events)
        - synthetic diary beats appended (Skiv canonical voice)
        - mutation triggers evaluated (apex resonance, xp threshold, wound adaptation)
        - last_synthetic_apply_ts = now
    """
    rng = random.Random(events[0]["payload"]["synthetic_seed"] if events else 42)
    new_state = json.loads(json.dumps(state))  # deep copy
    progression = new_state.setdefault("progression", {})
    progression.setdefault("unit_id", "skiv")
    progression.setdefault("job", "stalker")
    progression.setdefault("xp_total", 0)
    progression.setdefault("level", 1)
    progression.setdefault("encounter_count", 0)

    xp_delta = sum(e["payload"]["xp_gained"] for e in events)
    progression["xp_total"] += xp_delta
    progression["encounter_count"] += len(events)
    # Heuristic level curve: level_xp_threshold = 100 * level^2
    new_level = 1
    while 100 * new_level * new_level <= progression["xp_total"]:
        new_level += 1
    progression["level"] = new_level
    progression["last_synthetic_apply_ts"] = datetime.now(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    progression["last_synthetic_xp_delta"] = xp_delta

    # Synthetic diary beats (Skiv canonical voice, italian, sensory-desertic).
    diary = new_state.setdefault("diary", [])
    outcome_tally = {}
    for ev in events:
        outcome = ev["payload"]["outcome"]
        outcome_tally[outcome] = outcome_tally.get(outcome, 0) + 1
        beats = DIARY_BEATS.get(outcome, [])
        if beats:
            beat = rng.choice(beats)
            diary.append({
                "ts": ev["ts"],
                "outcome": outcome,
                "biome": ev["payload"]["biome"],
                "turn": ev["turn"],
                "voice": beat,
                "source": "skiv_synthetic_recompute",
            })

    # Mutation triggers evaluation (heuristic Skiv lifecycle progression).
    triggered_mutations = new_state.setdefault("synthetic_mutations", [])
    triggered_ids = {m.get("mutation_id") for m in triggered_mutations}
    for trigger_id, trigger_def in MUTATION_TRIGGERS.items():
        condition = trigger_def["condition"]
        if condition(outcome_tally, progression["xp_total"]):
            mid = trigger_def["mutation_id"]
            if mid not in triggered_ids:
                triggered_mutations.append({
                    "mutation_id": mid,
                    "trigger_id": trigger_id,
                    "triggered_at": progression["last_synthetic_apply_ts"],
                    "diary": trigger_def["diary"],
                    "outcome_tally": outcome_tally,
                    "xp_at_trigger": progression["xp_total"],
                })
                # Append diary beat for mutation
                diary.append({
                    "ts": progression["last_synthetic_apply_ts"],
                    "outcome": "mutation_trigger",
                    "turn": progression["encounter_count"],
                    "voice": trigger_def["diary"],
                    "mutation_id": mid,
                    "source": "skiv_synthetic_recompute",
                })

    new_state["generated_at"] = progression["last_synthetic_apply_ts"]
    new_state["origin"] = "skiv_synthetic_recompute"
    new_state["synthetic_outcome_tally"] = outcome_tally
    return new_state


def main():
    args = parse_args()
    events = generate_synthetic_events(
        count=args.count,
        biome=args.biome,
        seed=args.seed,
        start_iso=args.start_iso,
    )

    SYNTHETIC_EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SYNTHETIC_EVENTS_PATH.open("w", encoding="utf-8") as fh:
        for e in events:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"[skiv-synth] {len(events)} synthetic events → {SYNTHETIC_EVENTS_PATH}")

    outcome_tally = {}
    for e in events:
        o = e["payload"]["outcome"]
        outcome_tally[o] = outcome_tally.get(o, 0) + 1
    print(f"[skiv-synth] outcome distribution: {outcome_tally}")

    if args.apply:
        if not SAGA_PATH.exists():
            print(f"ERROR: {SAGA_PATH} not found — run seed_skiv_saga.py first", file=sys.stderr)
            return 2
        state = json.loads(SAGA_PATH.read_text(encoding="utf-8"))
        new_state = apply_events_to_state(state, events)
        SAGA_SYNTHETIC_PATH.write_text(
            json.dumps(new_state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(
            f"[skiv-synth] state applied → {SAGA_SYNTHETIC_PATH} "
            f"(xp_total: {state.get('progression', {}).get('xp_total', 0)} → {new_state['progression']['xp_total']}, "
            f"level: {state.get('progression', {}).get('level', 1)} → {new_state['progression']['level']})"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
