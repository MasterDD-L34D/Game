#!/usr/bin/env python3
"""Encounter XP budget audit — Pathfinder-inspired difficulty framework.

Closes pcg-level-design-illuminator P1 — XP budget encounter builder.

Audits existing encounters (tutorials + hardcore) by computing per-unit
"power" (Pathfinder XP analogue), summing per side, then validating that
the enemy:player ratio matches the declared `difficulty_rating`.

The formula is intentionally simple and tunable; treat it as a baseline
proxy. Action-economy distortions (1 BOSS vs 5 minion) and skill-gradient
multipliers are out of scope (deferred to playtest empirical calibration).

## Usage

    # Audit all known scenarios via live backend
    REST_PLAY_HOST=http://localhost:3334 python3 tools/py/encounter_xp_budget.py \\
        --all --out-md docs/balance/2026-04-25-encounter-xp-audit.md

    # Audit a specific scenario JSON dump
    curl -s http://localhost:3334/api/tutorial/enc_tutorial_03 | \\
        python3 tools/py/encounter_xp_budget.py --stdin

    # Audit from a JSON file
    python3 tools/py/encounter_xp_budget.py --json scenario.json

## Formula

    unit_power = hp + mod * 5 + max(0, dc - 10) * 3 + len(traits) * 2

    party_power_per_pc = sum(player_power) / party_size
    expected_enemy_power = party_power_per_pc * party_size * MULT[difficulty]

    ratio = actual_enemy_power / expected_enemy_power

    verdict:
      ratio < 0.7       → too_easy
      0.7 <= ratio <= 1.3 → balanced
      ratio > 1.3       → too_hard

## Difficulty multiplier table (Pathfinder-inspired)

    1 (tutorial easy)         → 0.6
    2 (tutorial standard)     → 0.85
    3 (tutorial advanced)     → 1.0
    4 (tutorial advanced+)    → 1.4
    5 (boss)                  → 1.7
    6 (hardcore)              → 2.2

## References

- Pathfinder Encounter Building: https://aonprd.com/Rules.aspx?ID=252
- Agent: .claude/agents/pcg-level-design-illuminator.md
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


DEFAULT_HOST = "http://localhost:3334"

# Multipliers per declared difficulty_rating. Tunable post-playtest.
DIFFICULTY_MULTIPLIER = {
    1: 0.6,
    2: 0.85,
    3: 1.0,
    4: 1.4,
    5: 1.7,
    6: 2.2,
    7: 2.6,
    8: 3.0,
}

# Verdict thresholds on actual/expected ratio.
TOO_EASY_MAX = 0.7
TOO_HARD_MIN = 1.3

# Known scenario IDs as of 2026-04-25.
KNOWN_SCENARIOS = (
    "enc_tutorial_01",
    "enc_tutorial_02",
    "enc_tutorial_03",
    "enc_tutorial_04",
    "enc_tutorial_05",
    "enc_tutorial_06_hardcore",
    "enc_tutorial_06_hardcore_quartet",
    "enc_tutorial_07_hardcore_pod_rush",
)


@dataclass
class UnitAudit:
    id: str
    side: str  # 'player' | 'sistema'
    power: float
    components: dict


@dataclass
class EncounterAudit:
    scenario_id: str
    difficulty_rating: int
    party_power: float
    enemy_power: float
    expected_enemy_power: float
    ratio: float
    verdict: str
    units: list[UnitAudit]


# ─────────────────────────────────────────────────────────
# Power computation
# ─────────────────────────────────────────────────────────


def unit_power(unit: dict) -> tuple[float, dict]:
    """Compute Pathfinder-inspired power score for one unit.

    Returns (total, components_dict) so reports can attribute the score.
    """
    hp = float(unit.get("hp", 0) or 0)
    mod = float(unit.get("mod", unit.get("attack_mod", 0)) or 0)
    dc = float(unit.get("dc", unit.get("defense_dc", 10)) or 10)
    traits = unit.get("traits") or []
    n_traits = len(traits) if isinstance(traits, list) else 0

    hp_part = hp
    mod_part = mod * 5
    dc_part = max(0.0, dc - 10) * 3
    trait_part = n_traits * 2.0

    total = hp_part + mod_part + dc_part + trait_part
    return total, {
        "hp": round(hp_part, 1),
        "mod": round(mod_part, 1),
        "dc": round(dc_part, 1),
        "traits": round(trait_part, 1),
    }


def split_units(scenario: dict) -> tuple[list[dict], list[dict]]:
    """Partition encounter units into players vs sistema (enemies)."""
    units = scenario.get("units") or []
    players = [u for u in units if u.get("controlled_by") == "player"]
    enemies = [u for u in units if u.get("controlled_by") == "sistema"]
    return players, enemies


# ─────────────────────────────────────────────────────────
# Encounter audit
# ─────────────────────────────────────────────────────────


def audit_encounter(scenario: dict) -> EncounterAudit:
    """Run full audit on a scenario JSON dump."""
    sid = str(scenario.get("id", "<unknown>"))
    difficulty = int(scenario.get("difficulty_rating", 0) or 0)
    players, enemies = split_units(scenario)

    if not players:
        raise ValueError(f"Scenario {sid} has no player units (cannot compute baseline)")
    if not enemies:
        raise ValueError(f"Scenario {sid} has no enemy units (cannot audit)")

    p_units, e_units = [], []
    party_power = 0.0
    for u in players:
        total, comps = unit_power(u)
        party_power += total
        p_units.append(UnitAudit(id=u.get("id", "?"), side="player", power=total, components=comps))

    enemy_power = 0.0
    for u in enemies:
        total, comps = unit_power(u)
        enemy_power += total
        e_units.append(UnitAudit(id=u.get("id", "?"), side="sistema", power=total, components=comps))

    multiplier = DIFFICULTY_MULTIPLIER.get(difficulty, 1.0)
    expected = party_power * multiplier
    ratio = (enemy_power / expected) if expected > 0 else float("inf")

    if ratio < TOO_EASY_MAX:
        verdict = "too_easy"
    elif ratio > TOO_HARD_MIN:
        verdict = "too_hard"
    else:
        verdict = "balanced"

    return EncounterAudit(
        scenario_id=sid,
        difficulty_rating=difficulty,
        party_power=round(party_power, 1),
        enemy_power=round(enemy_power, 1),
        expected_enemy_power=round(expected, 1),
        ratio=round(ratio, 3),
        verdict=verdict,
        units=p_units + e_units,
    )


# ─────────────────────────────────────────────────────────
# HTTP scenario fetcher
# ─────────────────────────────────────────────────────────


def fetch_scenario(host: str, scenario_id: str) -> dict | None:
    url = f"{host}/api/tutorial/{scenario_id}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            if resp.status != 200:
                return None
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None


# ─────────────────────────────────────────────────────────
# Markdown report
# ─────────────────────────────────────────────────────────


def format_markdown(audits: list[EncounterAudit]) -> str:
    today = datetime.now().date().isoformat()
    lines: list[str] = []
    lines.append("---")
    lines.append(f"title: Encounter XP Budget Audit ({today})")
    lines.append("doc_status: active")
    lines.append("doc_owner: claude-code")
    lines.append("workstream: dataset-pack")
    lines.append(f"last_verified: '{today}'")
    lines.append("source_of_truth: false")
    lines.append("language: it")
    lines.append("review_cycle_days: 30")
    lines.append("tags:")
    lines.append("  - balance")
    lines.append("  - pcg")
    lines.append("  - encounter")
    lines.append("  - pathfinder-xp")
    lines.append("  - generated")
    lines.append("---")
    lines.append("")
    lines.append("# Encounter XP Budget Audit")
    lines.append("")
    lines.append(
        "Pathfinder-inspired difficulty audit. Closes "
        "[pcg-level-design-illuminator P1](.claude/agents/pcg-level-design-illuminator.md). "
        "Ratio = enemy_power / (party_power × difficulty_multiplier)."
    )
    lines.append("")
    lines.append("## Verdict per scenario")
    lines.append("")
    lines.append("| Scenario | Diff | Party | Enemy | Expected | Ratio | Verdict |")
    lines.append("| --- | ---: | ---: | ---: | ---: | ---: | --- |")
    for a in audits:
        badge = {
            "balanced": "✅ balanced",
            "too_easy": "🟢 too_easy (player power)",
            "too_hard": "🔴 too_hard (enemy power)",
        }.get(a.verdict, a.verdict)
        lines.append(
            f"| `{a.scenario_id}` | {a.difficulty_rating} | "
            f"{a.party_power} | {a.enemy_power} | {a.expected_enemy_power} | "
            f"**{a.ratio}** | {badge} |"
        )
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    counts: dict[str, int] = {}
    for a in audits:
        counts[a.verdict] = counts.get(a.verdict, 0) + 1
    for verdict, count in counts.items():
        pct = round(100 * count / len(audits), 1) if audits else 0
        lines.append(f"- **{verdict}**: {count}/{len(audits)} ({pct}%)")
    lines.append("")
    lines.append("## Difficulty multiplier table")
    lines.append("")
    lines.append("| Difficulty | Multiplier |")
    lines.append("| ---: | ---: |")
    for d, m in sorted(DIFFICULTY_MULTIPLIER.items()):
        lines.append(f"| {d} | {m} |")
    lines.append("")
    lines.append("## Per-unit power breakdown")
    lines.append("")
    for a in audits:
        lines.append(f"### `{a.scenario_id}`")
        lines.append("")
        lines.append("| Unit | Side | Power | hp | mod | dc | traits |")
        lines.append("| --- | --- | ---: | ---: | ---: | ---: | ---: |")
        for u in a.units:
            c = u.components
            lines.append(
                f"| `{u.id}` | {u.side} | {round(u.power, 1)} | "
                f"{c['hp']} | {c['mod']} | {c['dc']} | {c['traits']} |"
            )
        lines.append("")
    lines.append("## Notes & limits")
    lines.append("")
    lines.append("- Action economy (1 BOSS vs N minion) **non** modellata: 1 boss da 50 power")
    lines.append("  e 5 minion da 10 power dichiarano lo stesso enemy_power totale, ma giocano")
    lines.append("  diversamente (focus-fire vs spread). Calibrazione finale resta empirica.")
    lines.append("- DC contribuisce solo per la parte > 10 (proxy difensivo, non valore assoluto).")
    lines.append("- Traits = +2 power flat per trait (placeholder; trait scaling profondo è in")
    lines.append("  `data/balance/trait_mechanics.yaml`).")
    lines.append("- Multipliers tunable in `tools/py/encounter_xp_budget.py::DIFFICULTY_MULTIPLIER`.")
    lines.append("")
    lines.append("## Sources")
    lines.append("")
    lines.append("- [Pathfinder Encounter Building](https://aonprd.com/Rules.aspx?ID=252)")
    lines.append("- Agent: `.claude/agents/pcg-level-design-illuminator.md`")
    lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────


def audit_to_dict(a: EncounterAudit) -> dict:
    return {
        "scenario_id": a.scenario_id,
        "difficulty_rating": a.difficulty_rating,
        "party_power": a.party_power,
        "enemy_power": a.enemy_power,
        "expected_enemy_power": a.expected_enemy_power,
        "ratio": a.ratio,
        "verdict": a.verdict,
        "units": [
            {"id": u.id, "side": u.side, "power": round(u.power, 1), "components": u.components}
            for u in a.units
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--all", action="store_true", help="Audit all known scenarios via HTTP")
    src.add_argument("--scenario", help="Single scenario id via HTTP")
    src.add_argument("--json", help="Path to scenario JSON file")
    src.add_argument("--stdin", action="store_true", help="Read scenario JSON from stdin")
    parser.add_argument("--host", default=os.environ.get("REST_PLAY_HOST", DEFAULT_HOST))
    parser.add_argument("--out-md", default=None)
    parser.add_argument("--out-json", default=None)
    args = parser.parse_args(argv)

    scenarios: list[dict] = []

    if args.all:
        for sid in KNOWN_SCENARIOS:
            sc = fetch_scenario(args.host, sid)
            if sc is None:
                print(f"  warn: failed to fetch {sid}", file=sys.stderr)
                continue
            scenarios.append(sc)
    elif args.scenario:
        sc = fetch_scenario(args.host, args.scenario)
        if sc is None:
            print(f"ERROR: failed to fetch {args.scenario}", file=sys.stderr)
            return 2
        scenarios.append(sc)
    elif args.json:
        scenarios.append(json.loads(Path(args.json).read_text(encoding="utf-8")))
    elif args.stdin:
        scenarios.append(json.loads(sys.stdin.read()))

    if not scenarios:
        print("ERROR: no scenarios loaded", file=sys.stderr)
        return 2

    audits: list[EncounterAudit] = []
    for sc in scenarios:
        try:
            audits.append(audit_encounter(sc))
        except ValueError as e:
            print(f"  warn: {e}", file=sys.stderr)

    print(f"\nAudit results ({len(audits)} scenarios):")
    for a in audits:
        print(
            f"  {a.scenario_id}: ratio={a.ratio} verdict={a.verdict} "
            f"(party={a.party_power} enemy={a.enemy_power} expected={a.expected_enemy_power})"
        )

    if args.out_md:
        out_path = Path(args.out_md)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(format_markdown(audits), encoding="utf-8")
        print(f"Markdown saved: {out_path}")

    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps([audit_to_dict(a) for a in audits], indent=2), encoding="utf-8"
        )
        print(f"JSON saved: {out_path}")

    # Exit code 0 if everything balanced, 1 if any imbalance found.
    return 0 if all(a.verdict == "balanced" for a in audits) else 1


if __name__ == "__main__":
    sys.exit(main())
