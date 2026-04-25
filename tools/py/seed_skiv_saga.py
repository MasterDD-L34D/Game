#!/usr/bin/env python3
"""Skiv Saga Seed — composes canonical creature state showcase.

Skiv (Arenavenator vagans) is the canonical recap-creature persona introduced
2026-04-25. This script seeds his post-content-sprint state by composing:

- Progression: class-change Schermidore → **Stalker** Lv 4 (210 / 275 XP), 1 perk
  picked (st_r1_marksman) showcasing the new jobs_expansion catalog.
- Cabinet: i_osservatore + n_intuizione_terrena internalized (both have
  effect_bonus); p_adattatore unlocked but inactive. Demonstrates Skiv #4
  biome_resonance reduction (n_intuizione_terrena cost 1 base → still 1 due
  to clamp; tier-2 n_pioniere_possibile would have benefited).
- Mutation: artigli_grip_to_glass applied (artigli_sette_vie → artigli_vetrificati
  per mutation_catalog tier 2, cost 12 PE + 7 PI).
- Diary: 8 narrative entries spanning all 8 event_type whitelist slots.

Outputs:
- data/derived/skiv_saga.json (machine-readable state, gitignored if
  data/derived/unit_diaries/* but THIS sits at data/derived/ root, committed).
- docs/playtest/2026-04-25-skiv-saga-state.md (creature card + saga timeline).

Validates references against:
- data/core/jobs_expansion.yaml (Stalker job + perk ids)
- data/core/mutations/mutation_catalog.yaml (artigli_grip_to_glass)
- data/core/thoughts/mbti_thoughts.yaml (4 thought ids)
- data/core/species.yaml (dune_stalker biome_affinity)

Usage:
    python3 tools/py/seed_skiv_saga.py
    python3 tools/py/seed_skiv_saga.py --out-dir custom/out --quiet

Skiv must remain consistent across sessions. Never invent ids — always
validate against YAML. Cross-check with feedback_gamer_recap_creature_card_format.md
memory file.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "data" / "core"

JOBS_EXPANSION = DATA_DIR / "jobs_expansion.yaml"
MUTATION_CATALOG = DATA_DIR / "mutations" / "mutation_catalog.yaml"
MBTI_THOUGHTS = DATA_DIR / "thoughts" / "mbti_thoughts.yaml"
SPECIES = DATA_DIR / "species.yaml"

DEFAULT_OUT_JSON = REPO_ROOT / "data" / "derived" / "skiv_saga.json"
DEFAULT_OUT_MD = REPO_ROOT / "docs" / "playtest" / "2026-04-25-skiv-saga-state.md"

# ─────────────────────────────────────────────────────────
# Skiv canonical state (deterministic, audited)
# ─────────────────────────────────────────────────────────

SKIV_UNIT_ID = "skiv"
SKIV_SPECIES_ID = "dune_stalker"
SKIV_BIOME_ID = "savana"  # matches species biome_affinity → resonance ON

# Class change: was skirmisher (placeholder), now stalker (matches species name)
SKIV_FROM_JOB = "skirmisher"
SKIV_TO_JOB = "stalker"
SKIV_LEVEL = 4
SKIV_XP_TOTAL = 210
SKIV_PICKED_PERK = {"level": 2, "perk_id": "st_r1_marksman", "choice": "a"}

# Mutation: artigli_sette_vie (species default trait) → artigli_vetrificati
SKIV_MUTATION_ID = "artigli_grip_to_glass"

# MBTI INTP-leaning-I per consistency (E_I correction from earlier card)
SKIV_MBTI_AXES = {
    "E_I": {"value": 0.68, "coverage": "full"},  # I tier1
    "T_F": {"value": 0.72, "coverage": "full"},  # T excluded from thoughts
    "S_N": {"value": 0.22, "coverage": "full"},  # N tier1 + tier2
    "J_P": {"value": 0.32, "coverage": "full"},  # P tier1
}

SKIV_UNLOCKED_THOUGHTS = [
    "i_osservatore",          # E_I high tier1 (>=0.65)
    "n_intuizione_terrena",   # S_N low tier1 (<=0.35)
    "n_pioniere_possibile",   # S_N low tier2 (<=0.25)
    "p_adattatore",           # J_P low tier1 (<=0.35)
]
SKIV_INTERNALIZED = ["i_osservatore", "n_intuizione_terrena"]
SKIV_RESEARCHING = []

# ─────────────────────────────────────────────────────────
# Validators (raise on missing reference — never invent ids)
# ─────────────────────────────────────────────────────────


def load_yaml(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"required YAML missing: {path}")
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def validate_state(quiet: bool = False) -> dict:
    """Load all referenced YAMLs and assert every Skiv id resolves."""
    jobs = load_yaml(JOBS_EXPANSION)
    mutations = load_yaml(MUTATION_CATALOG)
    thoughts = load_yaml(MBTI_THOUGHTS)
    species = load_yaml(SPECIES)

    # Stalker job
    stalker_job = (jobs.get("jobs") or {}).get(SKIV_TO_JOB)
    assert stalker_job, f"job {SKIV_TO_JOB} not found in jobs_expansion.yaml"

    # Stalker perk id picked
    perks_block = (jobs.get("perks") or {}).get(SKIV_TO_JOB) or {}
    level_block = perks_block.get(f"level_{SKIV_PICKED_PERK['level']}") or {}
    perk_a = level_block.get("perk_a") or {}
    perk_b = level_block.get("perk_b") or {}
    assert (
        perk_a.get("id") == SKIV_PICKED_PERK["perk_id"]
        or perk_b.get("id") == SKIV_PICKED_PERK["perk_id"]
    ), f"perk {SKIV_PICKED_PERK['perk_id']} not in stalker level_2"

    # Mutation
    mutation_entry = (mutations.get("mutations") or {}).get(SKIV_MUTATION_ID)
    assert mutation_entry, f"mutation {SKIV_MUTATION_ID} not in mutation_catalog.yaml"

    # Thoughts (4 ids must exist)
    thought_catalog = thoughts.get("thoughts") or {}
    for tid in SKIV_UNLOCKED_THOUGHTS:
        assert tid in thought_catalog, f"thought {tid} not in mbti_thoughts.yaml"

    # Species + biome_affinity
    skiv_species = next(
        (s for s in (species.get("species") or []) if s.get("id") == SKIV_SPECIES_ID),
        None,
    )
    assert skiv_species, f"species {SKIV_SPECIES_ID} not in species.yaml"
    affinity = skiv_species.get("biome_affinity")
    assert affinity == SKIV_BIOME_ID, (
        f"species biome_affinity {affinity} != saga biome {SKIV_BIOME_ID}"
    )

    if not quiet:
        print(
            f"[validate] {len(thought_catalog)} thoughts, "
            f"{len(mutations.get('mutations') or {})} mutations, "
            f"stalker job + perk {SKIV_PICKED_PERK['perk_id']} OK"
        )
    return {
        "stalker_job": stalker_job,
        "mutation": mutation_entry,
        "thoughts": thought_catalog,
        "species": skiv_species,
    }


# ─────────────────────────────────────────────────────────
# Compose state (deterministic, no I/O)
# ─────────────────────────────────────────────────────────


def compose_progression() -> dict:
    return {
        "unit_id": SKIV_UNIT_ID,
        "job": SKIV_TO_JOB,
        "xp_total": SKIV_XP_TOTAL,
        "level": SKIV_LEVEL,
        "picked_perks": [SKIV_PICKED_PERK],
        "previous_job": SKIV_FROM_JOB,
    }


def compose_cabinet() -> dict:
    return {
        "unlocked": list(SKIV_UNLOCKED_THOUGHTS),
        "researching": list(SKIV_RESEARCHING),
        "internalized": list(SKIV_INTERNALIZED),
        "slots_max": 3,
        "slots_used": len(SKIV_INTERNALIZED) + len(SKIV_RESEARCHING),
    }


def compose_mutations() -> list[dict]:
    return [
        {
            "id": SKIV_MUTATION_ID,
            "trait_swap": {"remove": ["artigli_sette_vie"], "add": ["artigli_vetrificati"]},
            "tier": 2,
            "category": "physiological",
        }
    ]


def compose_diary(start_iso: str = "2026-04-25T18:00:00Z") -> list[dict]:
    """8 entries — one per allowed event_type. Chronological.

    Timestamps are deterministic +1h offsets from start_iso for reproducibility.
    """
    base = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    entries = [
        {
            "ts_offset_h": 0,
            "turn": 1,
            "encounter_id": "enc_savana_alpha",
            "event_type": "scenario_completed",
            "payload": {
                "scenario": "enc_savana_alpha",
                "outcome": "victory",
                "rounds": 6,
                "biome_id": SKIV_BIOME_ID,
            },
        },
        {
            "ts_offset_h": 1,
            "turn": None,
            "encounter_id": None,
            "event_type": "mbti_axis_threshold_crossed",
            "payload": {
                "axis": "S_N",
                "from_value": 0.34,
                "to_value": 0.22,
                "newly_unlocked": ["n_intuizione_terrena", "n_pioniere_possibile"],
            },
        },
        {
            "ts_offset_h": 2,
            "turn": 2,
            "encounter_id": "enc_savana_beta",
            "event_type": "thought_internalized",
            "payload": {
                "thought_id": "i_osservatore",
                "research_cost": 1,
                "effect_bonus": {"attack_range": 1},
                "effect_cost": {"ap": 1},
            },
        },
        {
            "ts_offset_h": 3,
            "turn": 4,
            "encounter_id": "enc_savana_beta",
            "event_type": "thought_internalized",
            "payload": {
                "thought_id": "n_intuizione_terrena",
                "research_cost": 1,  # already min, biome resonance no-op at tier1
                "effect_bonus": {"attack_range": 1},
                "effect_cost": {"defense_dc": 1},
                "biome_resonance_eligible": True,
            },
        },
        {
            "ts_offset_h": 4,
            "turn": None,
            "encounter_id": None,
            "event_type": "job_changed",
            "payload": {
                "from_job": SKIV_FROM_JOB,
                "to_job": SKIV_TO_JOB,
                "reason": "species_alignment",
                "level": SKIV_LEVEL,
            },
        },
        {
            "ts_offset_h": 5,
            "turn": 1,
            "encounter_id": "enc_savana_gamma",
            "event_type": "synergy_triggered",
            "payload": {
                "synergy_id": "echo_backstab",
                "parts": ["senses.echolocation", "offense.sand_claws"],
                "bonus_damage": 1,
                "ability": "alpha_strike",
            },
        },
        {
            "ts_offset_h": 6,
            "turn": 3,
            "encounter_id": "enc_savana_gamma",
            "event_type": "defy_used",
            "payload": {
                "sg_cost": 2,
                "pressure_before": 75,
                "pressure_after": 50,
                "tier_before": "Critical",
                "tier_after": "Escalated",
                "ap_penalty_next_turn": 1,
            },
        },
        {
            "ts_offset_h": 7,
            "turn": None,
            "encounter_id": None,
            "event_type": "mutation_acquired",
            "payload": {
                "mutation_id": SKIV_MUTATION_ID,
                "tier": 2,
                "category": "physiological",
                "trait_swap": {
                    "remove": ["artigli_sette_vie"],
                    "add": ["artigli_vetrificati"],
                },
                "pe_cost": 12,
                "pi_cost": 7,
            },
        },
    ]
    out = []
    for e in entries:
        ts = (base + timedelta(hours=e["ts_offset_h"])).strftime("%Y-%m-%dT%H:%M:%SZ")
        out.append(
            {
                "ts": ts,
                "turn": e["turn"],
                "encounter_id": e["encounter_id"],
                "event_type": e["event_type"],
                "payload": e["payload"],
            }
        )
    return out


def build_saga_state() -> dict:
    return {
        "schema_version": "0.1.0",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "unit_id": SKIV_UNIT_ID,
        "species_id": SKIV_SPECIES_ID,
        "biome_id": SKIV_BIOME_ID,
        "mbti_axes": SKIV_MBTI_AXES,
        "progression": compose_progression(),
        "cabinet": compose_cabinet(),
        "mutations": compose_mutations(),
        "diary": compose_diary(),
        "_notes": (
            "Canonical creature state showcasing 2026-04-25 content sprint #1776 "
            "+ Skiv 5/8 wishlist (synergy #2 + biome resonance #4 + Defy #5 + "
            "Diary #7 + Hybrid Path #6). Regenerate via "
            "tools/py/seed_skiv_saga.py."
        ),
    }


# ─────────────────────────────────────────────────────────
# Markdown card report
# ─────────────────────────────────────────────────────────


MARKDOWN_TEMPLATE = """---
title: Skiv Saga — Canonical Creature State (2026-04-25)
workstream: cross-cutting
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - skiv
  - canonical-creature
  - saga-seed
  - generated
---

# Skiv Saga — Canonical Creature State

> **Auto-generato** da `tools/py/seed_skiv_saga.py` post-content-sprint #1776.
> Ricompose via `python3 tools/py/seed_skiv_saga.py` ogni volta che cambia
> il catalogo (jobs/mutations/thoughts/species).

```
              ╱\\_/\\
             (  o.o )    "Sento le 111 trame del mondo.
              > ^ <       Ho la classe del mio nome.
                          Mangio gli artigli vecchi e ne nasco di nuovi."
```

## Identity

| Campo               | Valore                                                |
| ------------------- | ----------------------------------------------------- |
| Unit ID             | `{unit_id}`                                           |
| Species             | `{species_id}` (Arenavenator vagans / Dune Stalker)   |
| Biome affinity      | `{biome_id}` ✓ (resonance ON)                         |
| Job                 | **{job}** Lv {level} ({xp_total} / 275 XP)            |
| Previous job        | `{previous_job}` (placeholder pre-class-change)       |
| Form (MBTI)         | INTP — T={t} · I={i} · N={s} · P={j}                  |

## Progression

- Picked perk: `{perk_id}` (level {perk_level}, choice {perk_choice})
- Available perks pending (Stalker tree): level 3, 4, 5, 6, 7 (10 perks)

## Thought Cabinet

| Status        | Thought                                | Effect                                                    |
| ------------- | -------------------------------------- | --------------------------------------------------------- |
| Internalized  | `i_osservatore`                        | +1 attack_range / -1 AP turno iniziale                    |
| Internalized  | `n_intuizione_terrena`                 | +1 attack_range (biome) / -1 defense_dc fuori cover       |
| Unlocked      | `n_pioniere_possibile` (tier 2)        | (no effect_bonus assegnato)                               |
| Unlocked      | `p_adattatore` (tier 1)                | +1 AP cambio intent / -1 defense_dc round transizione     |

Slots: {slots_used}/3 (1 libero per ricerca futura)

## Mutation acquired

- **`{mutation_id}`** (tier 2, physiological)
  - trait_swap: `artigli_sette_vie` → `artigli_vetrificati`
  - cost: 12 PE + 7 PI
  - effetto: +1 dmg always → +2 dmg condizionato MoS≥5 (burst trade-off)

## Diary timeline (8 events — one per whitelist slot)

{diary_table}

## Score pillars (questo Skiv specifico, post-saga)

| Pillar              | Status      |
| ------------------- | ----------- |
| P1 Tattica          | 🟢+ (synergy echo+claw + alpha_strike combo)  |
| P2 Evoluzione       | 🟢+ (mutation acquired, vetrificati live)     |
| P3 Identità×Job     | 🟢+ (job align con species + 1 perk)          |
| P4 MBTI             | 🟡+ (4 thoughts unlocked, 2 internalized)     |
| P5 Co-op            | 🟡+ (diary persiste cross-session)            |
| P6 Fairness         | 🟢 (1 Defy usato a Critical → Escalated)      |

## Replay

```bash
python3 tools/py/seed_skiv_saga.py --out-dir tmp/
diff data/derived/skiv_saga.json tmp/skiv_saga.json   # deterministic
```
"""


def render_markdown(state: dict) -> str:
    p = state["progression"]
    cab = state["cabinet"]
    mut = state["mutations"][0]
    axes = state["mbti_axes"]
    diary = state["diary"]

    diary_lines = [
        "| # | Event type | Encounter | Turn | Payload key |",
        "|---|---|---|---|---|",
    ]
    for i, e in enumerate(diary, 1):
        payload_keys = ", ".join(sorted(e["payload"].keys())[:3]) if e["payload"] else "—"
        enc = e["encounter_id"] or "—"
        turn = e["turn"] if e["turn"] is not None else "—"
        diary_lines.append(
            f"| {i} | `{e['event_type']}` | {enc} | {turn} | {payload_keys} |"
        )
    diary_table = "\n".join(diary_lines)

    return MARKDOWN_TEMPLATE.format(
        unit_id=state["unit_id"],
        species_id=state["species_id"],
        biome_id=state["biome_id"],
        job=p["job"],
        level=p["level"],
        xp_total=p["xp_total"],
        previous_job=p["previous_job"],
        t=axes["T_F"]["value"],
        i=axes["E_I"]["value"],
        s=axes["S_N"]["value"],
        j=axes["J_P"]["value"],
        perk_id=p["picked_perks"][0]["perk_id"],
        perk_level=p["picked_perks"][0]["level"],
        perk_choice=p["picked_perks"][0]["choice"],
        slots_used=cab["slots_used"],
        mutation_id=mut["id"],
        diary_table=diary_table,
    )


# ─────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out-dir", default=None, help="Override output dir for JSON+MD")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)

    validate_state(quiet=args.quiet)
    state = build_saga_state()

    if args.out_dir:
        out_dir = Path(args.out_dir)
        out_json = out_dir / "skiv_saga.json"
        out_md = out_dir / "2026-04-25-skiv-saga-state.md"
    else:
        out_json = DEFAULT_OUT_JSON
        out_md = DEFAULT_OUT_MD

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    out_md.write_text(render_markdown(state), encoding="utf-8")

    if not args.quiet:
        print(f"[seed-skiv-saga] JSON: {out_json}")
        print(f"[seed-skiv-saga] MD:   {out_md}")
        print(f"[seed-skiv-saga] diary entries: {len(state['diary'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
