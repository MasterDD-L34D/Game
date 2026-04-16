#!/usr/bin/env python3
"""E1: Balance simulation script — automated combat scenario testing.

Simula N combattimenti con specie/trait/bioma configurabili.
Valida target freeze: 60-70% hit pari livello, 50-60% vs elite.

Uso:
    python tools/py/simulate_balance.py
    python tools/py/simulate_balance.py --attacker-tier 3 --defender-tier 3 --n 5000
    python tools/py/simulate_balance.py --scenario elite --n 2000
"""

import argparse
import sys
from pathlib import Path

# Add services/rules to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services" / "rules"))
sys.path.insert(0, str(Path(__file__).resolve().parents[0]))

from resolver import (
    ATTACK_CD_BASE,
    aggregate_mod,
    predict_combat,
)
from hydration import load_trait_mechanics


DEFAULT_CATALOG_PATH = (
    Path(__file__).resolve().parents[2]
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "trait_mechanics.yaml"
)

# Predefined scenarios
SCENARIOS = {
    "mirror": {
        "label": "Pari livello (T3 vs T3)",
        "attacker": {"tier": 3, "hp": 50, "armor": 4, "trait_ids": ["artigli_sette_vie"]},
        "defender": {"tier": 3, "hp": 50, "armor": 4, "trait_ids": ["struttura_elastica_amorfa"]},
        "target_hit_pct": (60, 70),
    },
    "elite": {
        "label": "Vs Elite (T3 vs T4)",
        "attacker": {"tier": 3, "hp": 50, "armor": 4, "trait_ids": ["artigli_sette_vie"]},
        "defender": {"tier": 4, "hp": 80, "armor": 6, "trait_ids": ["mantello_meteoritico"]},
        "target_hit_pct": (50, 60),
    },
    "boss": {
        "label": "Vs Boss (T3 vs T5)",
        "attacker": {"tier": 3, "hp": 50, "armor": 4, "trait_ids": ["sangue_piroforico"]},
        "defender": {"tier": 5, "hp": 120, "armor": 8, "trait_ids": ["criostasi_adattiva", "mantello_meteoritico"]},
        "target_hit_pct": (35, 50),
    },
    "minion": {
        "label": "Vs Minion (T3 vs T1)",
        "attacker": {"tier": 3, "hp": 50, "armor": 4, "trait_ids": ["artigli_sette_vie"]},
        "defender": {"tier": 1, "hp": 20, "armor": 2, "trait_ids": []},
        "target_hit_pct": (75, 90),
    },
}


def build_unit(tier, hp, armor, trait_ids, damage_dice=None):
    return {
        "tier": tier,
        "hp": hp,
        "max_hp": hp,
        "armor": armor,
        "trait_ids": trait_ids,
        "damage_dice": damage_dice or {"count": 1, "sides": 6, "modifier": 2},
        "resistances": [],
        "terrain_defense_mod": 0,
    }


def run_scenario(scenario, catalog, n=1000):
    attacker = build_unit(**scenario["attacker"])
    defender = build_unit(**scenario["defender"])

    result = predict_combat(attacker, defender, catalog, n=n)

    target_lo, target_hi = scenario.get("target_hit_pct", (0, 100))
    hit = result["hit_pct"]
    in_range = target_lo <= hit <= target_hi

    return {
        "label": scenario["label"],
        "hit_pct": hit,
        "crit_pct": result["crit_pct"],
        "fumble_pct": result["fumble_pct"],
        "kill_pct": result["kill_pct"],
        "avg_damage": result["avg_damage"],
        "cd": result["cd"],
        "attack_mod": result["attack_mod"],
        "target_range": f"{target_lo}-{target_hi}%",
        "in_range": in_range,
        "verdict": "PASS" if in_range else "FAIL",
    }


def main():
    parser = argparse.ArgumentParser(description="Balance simulation")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()), default=None)
    parser.add_argument("--all", action="store_true", help="Run all scenarios")
    parser.add_argument("--n", type=int, default=2000, help="Simulations per scenario")
    parser.add_argument("--catalog", default=str(DEFAULT_CATALOG_PATH))
    args = parser.parse_args()

    catalog = load_trait_mechanics(Path(args.catalog))

    if args.all or args.scenario is None:
        scenarios_to_run = SCENARIOS
    else:
        scenarios_to_run = {args.scenario: SCENARIOS[args.scenario]}

    print(f"[simulate_balance] {len(scenarios_to_run)} scenarios, N={args.n}")
    print()

    all_pass = True
    for name, scenario in scenarios_to_run.items():
        result = run_scenario(scenario, catalog, n=args.n)
        status = "PASS" if result["in_range"] else "** FAIL **"
        if not result["in_range"]:
            all_pass = False

        print(f"  {result['label']}")
        print(f"    Hit: {result['hit_pct']}%  (target: {result['target_range']})")
        print(f"    Crit: {result['crit_pct']}%  Fumble: {result['fumble_pct']}%")
        print(f"    Kill: {result['kill_pct']}%  Avg dmg: {result['avg_damage']}")
        print(f"    CD: {result['cd']}  Attack mod: {result['attack_mod']}")
        print(f"    Verdict: {status}")
        print()

    summary = "ALL PASS" if all_pass else "SOME FAILED"
    print(f"[simulate_balance] {summary}")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
