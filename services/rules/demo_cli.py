"""CLI demo del rules engine d20 di Evo-Tactics.

Orchestri un combat completo da terminale, dall'hydration di un encounter
fino alla condizione di fine. Usa direttamente le funzioni pure di
``services.rules.hydration`` e ``services.rules.resolver``, senza passare
dal worker bridge (la demo gira nello stesso processo Python).

**Uso interattivo**::

    python -m services.rules.demo_cli --seed demo-1

Il giocatore sceglie l'azione di ogni party member da un menu testuale.
Le unita' hostile agiscono via AI minimale (attack al primo party vivo).

**Uso automatico** (per test e smoke check)::

    python -m services.rules.demo_cli --auto --seed demo-1 --max-rounds 10

In modalita' ``--auto``, anche i party usano l'AI minimale; utile per
run deterministiche, snapshot end-to-end e regression test.

Il seed di combattimento e' passato al resolver via ``namespaced_rng`` con
un namespace unico per ogni action (``attack-T{turn}-{unit_id}-{index}``),
cosi' lo stesso seed produce sempre la stessa sequenza completa.
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
_TOOLS_PY = REPO_ROOT / "tools" / "py"
if _TOOLS_PY.exists() and str(_TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(_TOOLS_PY))

from game_utils.random_utils import namespaced_rng  # noqa: E402

from services.rules.hydration import (  # noqa: E402
    hydrate_encounter,
    load_trait_mechanics,
)
from services.rules.resolver import begin_turn, resolve_action  # noqa: E402

DEFAULT_ENCOUNTER_PATH = REPO_ROOT / "docs" / "examples" / "encounter_caverna.txt"
DEFAULT_MECHANICS_PATH = (
    REPO_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "trait_mechanics.yaml"
)

#: Party preset di default. 3 unita' con trait core diversificati (offensive,
#: defensive, defensive) per dimostrare l'aggregazione resistances + i bonus
#: attack/defense del layer Balancer.
DEFAULT_PARTY: List[Dict[str, Any]] = [
    {
        "id": "party-01",
        "species_id": "anguis_magnetica",
        "trait_ids": ["artigli_sette_vie", "coda_frusta_cinetica"],
    },
    {
        "id": "party-02",
        "species_id": "aetherloom_stalker",
        "trait_ids": ["mantello_meteoritico", "sangue_piroforico"],
    },
    {
        "id": "party-03",
        "species_id": "crysalis_ember",
        "trait_ids": ["cute_resistente_sali", "criostasi_adattiva"],
    },
]

DEFAULT_HOSTILE_SPECIES: List[str] = [
    "umbroid_lurker",
    "mud_sentinel",
    "echo_seer",
    "crystal_ward",
]
DEFAULT_HOSTILE_TRAITS: List[List[str]] = [
    [],
    [],
    ["spore_psichiche_silenziate"],
    [],
]

#: Damage dice di default per attack di ogni unita' in modalita' demo.
#: Coerente col Frattura draft "1d8+3 elettrico" del Polpo tier 3.
DEFAULT_DAMAGE_DICE = {"count": 1, "sides": 8, "modifier": 3}


# ---------------------------------------------------------------------------
# Helper puri (testabili via pytest)
# ---------------------------------------------------------------------------


def find_unit(state: Mapping[str, Any], unit_id: str) -> Optional[Dict[str, Any]]:
    for unit in state.get("units", []):
        if unit.get("id") == unit_id:
            return copy.deepcopy(unit)
    return None


def is_alive(unit: Mapping[str, Any]) -> bool:
    hp = unit.get("hp") or {}
    return int(hp.get("current", 0)) > 0


def alive_units_by_side(state: Mapping[str, Any], side: str) -> List[Dict[str, Any]]:
    return [
        dict(u)
        for u in state.get("units", [])
        if u.get("side") == side and is_alive(u)
    ]


def is_combat_over(state: Mapping[str, Any]) -> Tuple[bool, Optional[str]]:
    """Combat e' finito se una delle due fazioni ha zero unita' vive.

    Returns:
        ``(over, winner)`` dove ``winner`` e' ``"party"`` / ``"hostile"`` /
        ``None`` (tie o ancora in corso).
    """

    party_alive = len(alive_units_by_side(state, "party"))
    hostile_alive = len(alive_units_by_side(state, "hostile"))
    if party_alive == 0 and hostile_alive == 0:
        return True, None
    if party_alive == 0:
        return True, "hostile"
    if hostile_alive == 0:
        return True, "party"
    return False, None


def ai_pick_target(state: Mapping[str, Any], actor_side: str) -> Optional[str]:
    """Seleziona il primo target valido per un'unita' ostile (o auto-party).

    Ritorna l'``id`` della prima unita' viva di fazione opposta, o ``None``
    se nessun target valido.
    """

    opponent_side = "hostile" if actor_side == "party" else "party"
    candidates = alive_units_by_side(state, opponent_side)
    if not candidates:
        return None
    return str(candidates[0]["id"])


def build_attack_action(
    action_id: str,
    actor_id: str,
    target_id: str,
    ap_cost: int = 1,
    damage_dice: Optional[Mapping[str, Any]] = None,
    channel: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "id": action_id,
        "type": "attack",
        "actor_id": actor_id,
        "target_id": target_id,
        "ability_id": None,
        "ap_cost": ap_cost,
        "channel": channel,
        "damage_dice": dict(damage_dice or DEFAULT_DAMAGE_DICE),
    }


def build_defend_action(action_id: str, actor_id: str, ap_cost: int = 1) -> Dict[str, Any]:
    return {
        "id": action_id,
        "type": "defend",
        "actor_id": actor_id,
        "target_id": None,
        "ability_id": None,
        "ap_cost": ap_cost,
    }


# ---------------------------------------------------------------------------
# Pretty printing
# ---------------------------------------------------------------------------


def format_unit_line(unit: Mapping[str, Any]) -> str:
    hp = unit.get("hp") or {}
    ap = unit.get("ap") or {}
    reactions = unit.get("reactions") or {}
    statuses = unit.get("statuses") or []
    status_str = (
        ", ".join(f"{s['id']}({s.get('intensity', 1)},{s.get('remaining_turns', 0)}t)" for s in statuses)
        if statuses
        else "-"
    )
    alive_mark = " " if is_alive(unit) else "X"
    return (
        f"[{alive_mark}] {unit.get('id'):<12} "
        f"T{unit.get('tier', '?')} "
        f"HP {hp.get('current', 0):>3}/{hp.get('max', 0):<3} "
        f"AP {ap.get('current', 0)}/{ap.get('max', 0)} "
        f"armor {unit.get('armor', 0)} "
        f"pt {unit.get('pt', 0)} "
        f"react {reactions.get('current', 0)}/{reactions.get('max', 0)} "
        f"stress {float(unit.get('stress', 0.0)):.2f} "
        f"status: {status_str}"
    )


def format_state_board(state: Mapping[str, Any]) -> str:
    lines = [f"--- Turn {state.get('turn', '?')} | active: {state.get('active_unit_id', '?')} ---"]
    lines.append("PARTY:")
    for unit in state.get("units", []):
        if unit.get("side") == "party":
            lines.append("  " + format_unit_line(unit))
    lines.append("HOSTILE:")
    for unit in state.get("units", []):
        if unit.get("side") == "hostile":
            lines.append("  " + format_unit_line(unit))
    return "\n".join(lines)


def format_turn_log_entry(entry: Mapping[str, Any]) -> str:
    action = entry.get("action") or {}
    roll = entry.get("roll")
    damage = entry.get("damage_applied", 0)
    base = f"  -> {action.get('actor_id')} {action.get('type')}"
    target = action.get("target_id")
    if target:
        base += f" -> {target}"
    if roll:
        nat = roll.get("natural")
        dc = roll.get("dc")
        total = roll.get("total")
        mos = roll.get("mos")
        pt = roll.get("pt_gained")
        tag = "CRIT" if roll.get("is_crit") else ("FUMBLE" if roll.get("is_fumble") else ("HIT" if roll.get("success") else "MISS"))
        base += f" | {tag} nat={nat} total={total} vs CD {dc}"
        if roll.get("success"):
            base += f" (MoS {mos}, step {roll.get('damage_step', 0)}, PT+{pt}, dmg {damage})"
    applied = entry.get("statuses_applied") or []
    if applied:
        status_str = ", ".join(f"{s.get('id')}({s.get('intensity', 1)})" for s in applied)
        base += f" | status: {status_str}"
    return base


# ---------------------------------------------------------------------------
# Input loops (interactive vs auto)
# ---------------------------------------------------------------------------


ActionGetter = Callable[[Dict[str, Any], str, int], Optional[Dict[str, Any]]]


def ai_action_for_unit(
    state: Dict[str, Any],
    unit_id: str,
    action_index: int,
) -> Optional[Dict[str, Any]]:
    """AI minimale: attack al primo target opposto vivo, damage dice default.

    Se non ci sono target validi, ritorna ``None`` (skip).
    """

    unit = find_unit(state, unit_id)
    if unit is None or not is_alive(unit):
        return None
    target_id = ai_pick_target(state, str(unit.get("side")))
    if target_id is None:
        return None
    return build_attack_action(
        action_id=f"act-{unit_id}-{action_index:02d}",
        actor_id=unit_id,
        target_id=target_id,
    )


def interactive_action_for_unit(
    state: Dict[str, Any],
    unit_id: str,
    action_index: int,
) -> Optional[Dict[str, Any]]:
    """Chiede all'utente l'azione per una party unit via stdin."""

    unit = find_unit(state, unit_id)
    if unit is None or not is_alive(unit):
        return None
    targets = alive_units_by_side(state, "hostile")
    print(f"\nAzione per {unit_id} (AP {unit['ap']['current']}, PT {unit.get('pt', 0)}):")
    print("  [a] Attack")
    print("  [d] Defend (skip turn)")
    print("  [q] Quit demo")
    choice = input("> ").strip().lower() or "a"
    if choice == "q":
        raise SystemExit("Demo interrotta dall'utente.")
    if choice == "d":
        return build_defend_action(
            action_id=f"act-{unit_id}-{action_index:02d}",
            actor_id=unit_id,
        )
    if choice != "a":
        print(f"  (scelta '{choice}' non valida, eseguo attack)")
    if not targets:
        print("  Nessun target valido, defend.")
        return build_defend_action(
            action_id=f"act-{unit_id}-{action_index:02d}",
            actor_id=unit_id,
        )
    print("  Target:")
    for i, t in enumerate(targets, start=1):
        print(f"    [{i}] {t['id']} HP {t['hp']['current']}/{t['hp']['max']} armor {t['armor']}")
    tgt_choice = input("> ").strip() or "1"
    try:
        idx = max(1, min(len(targets), int(tgt_choice))) - 1
    except ValueError:
        idx = 0
    target_id = str(targets[idx]["id"])
    return build_attack_action(
        action_id=f"act-{unit_id}-{action_index:02d}",
        actor_id=unit_id,
        target_id=target_id,
    )


# ---------------------------------------------------------------------------
# Run loop
# ---------------------------------------------------------------------------


def run_combat(
    state: Dict[str, Any],
    catalog: Mapping[str, Any],
    seed: str,
    get_party_action: ActionGetter,
    get_hostile_action: ActionGetter = ai_action_for_unit,
    max_rounds: int = 20,
    out=None,
) -> Dict[str, Any]:
    """Esegue il loop completo di combattimento e ritorna lo stato finale.

    Ritorna un dict con ``final_state``, ``winner`` (``"party"`` / ``"hostile"`` /
    ``None``) e ``rounds_played``. Il parametro ``out`` e' un writer (default
    ``sys.stdout``) usato per tutti i print, cosi' i test possono catturare
    l'output via ``io.StringIO``.
    """

    if out is None:
        out = sys.stdout

    def write(line: str = "") -> None:
        out.write(line + "\n")

    write("=== Evo-Tactics rules engine — demo combat ===")
    write(format_state_board(state))

    rounds = 0
    winner: Optional[str] = None
    while rounds < max_rounds:
        rounds += 1
        write(f"\n========== ROUND {rounds} ==========")
        initiative = list(state.get("initiative_order", []))
        for unit_id in initiative:
            unit = find_unit(state, unit_id)
            if unit is None or not is_alive(unit):
                continue

            # Begin turn: reset + decay + bleeding tick
            bt = begin_turn(state, unit_id)
            state = bt["next_state"]
            if bt.get("bleeding_damage", 0) > 0:
                write(f"  ...{unit_id} bleeding tick: -{bt['bleeding_damage']} HP")
            for exp in bt.get("expired", []):
                write(f"  ...{unit_id} status expired: {exp['status_id']}")

            unit = find_unit(state, unit_id)
            if unit is None or not is_alive(unit):
                continue

            state["active_unit_id"] = unit_id
            write(f"\n{unit_id} ({unit.get('side')}) attivo")

            action_index = 0
            while True:
                unit = find_unit(state, unit_id)
                if unit is None or not is_alive(unit):
                    break
                if int(unit.get("ap", {}).get("current", 0)) <= 0:
                    break
                over, _ = is_combat_over(state)
                if over:
                    break

                getter = (
                    get_party_action if unit.get("side") == "party" else get_hostile_action
                )
                action = getter(state, unit_id, action_index)
                if action is None:
                    break

                # Seed namespaced unico per questa action
                action_ns = f"attack-T{state.get('turn', 1)}-{unit_id}-{action_index}"
                rng = namespaced_rng(seed, action_ns)

                try:
                    result = resolve_action(state, action, catalog, rng)
                except ValueError as err:
                    write(f"  !! action rejected: {err}")
                    break

                state = result["next_state"]
                write(format_turn_log_entry(result["turn_log_entry"]))
                action_index += 1

                over, winner = is_combat_over(state)
                if over:
                    break

            over, winner = is_combat_over(state)
            if over:
                break

        over, winner = is_combat_over(state)
        if over:
            break

        state = dict(state)
        state["turn"] = int(state.get("turn", 1)) + 1

    write("\n--- Stato finale ---")
    write(format_state_board(state))
    if winner:
        write(f"\n>>> Combat over — winner: {winner} (round {rounds}) <<<")
    else:
        write(f"\n>>> Combat over — nessun vincitore entro {max_rounds} round <<<")

    return {
        "final_state": state,
        "winner": winner,
        "rounds_played": rounds,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def _load_encounter(path: Path) -> Dict[str, Any]:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="services.rules.demo_cli",
        description="Demo interattiva del rules engine d20 di Evo-Tactics.",
    )
    parser.add_argument("--seed", default="demo-cli-1", help="Seed del combattimento.")
    parser.add_argument(
        "--encounter",
        type=Path,
        default=DEFAULT_ENCOUNTER_PATH,
        help="Path al JSON dell'encounter.",
    )
    parser.add_argument(
        "--mechanics",
        type=Path,
        default=DEFAULT_MECHANICS_PATH,
        help="Path al layer trait_mechanics.yaml.",
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Modalita' automatica: anche i party usano l'AI (attack primo hostile vivo). Utile per test deterministici.",
    )
    parser.add_argument(
        "--max-rounds",
        type=int,
        default=20,
        help="Numero massimo di round prima di uscire in caso di stall.",
    )
    args = parser.parse_args(argv)

    catalog = load_trait_mechanics(args.mechanics)
    encounter = _load_encounter(args.encounter)

    state = hydrate_encounter(
        encounter=encounter,
        party=DEFAULT_PARTY,
        catalog=catalog,
        seed=args.seed,
        session_id=f"demo-{args.seed}",
        encounter_id=args.encounter.stem,
        hostile_species_ids=DEFAULT_HOSTILE_SPECIES,
        hostile_trait_ids=DEFAULT_HOSTILE_TRAITS,
    )

    getter: ActionGetter = ai_action_for_unit if args.auto else interactive_action_for_unit

    result = run_combat(
        state=state,
        catalog=catalog,
        seed=args.seed,
        get_party_action=getter,
        get_hostile_action=ai_action_for_unit,
        max_rounds=args.max_rounds,
    )
    return 0 if result["winner"] == "party" else (2 if result["winner"] == "hostile" else 1)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
