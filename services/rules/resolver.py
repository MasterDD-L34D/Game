"""Resolver d20 per il rules engine di Evo-Tactics.

Risoluzione di una ``action`` contro un ``CombatState``, producendo il
prossimo stato e un ``TurnLog`` entry conforme a
``packages/contracts/schemas/combat.schema.json``.

Decisioni di design recepite dalla discussione con l'utente (vedi ADR):

- **Valore di 1 step danno**: ``flat_bonus = floor(avg_base * 0.25 * step_count)``
  dove ``avg_base = count*(sides+1)/2 + modifier``. Il bonus viene sommato
  al danno effettivamente rollato per mantenere la varianza del dado.
- **Armor DR-style**: sottratto dopo le resistenze. Ordine:
  ``base_rolled + step_bonus`` -> applicazione resist% -> sottrazione armor
  -> clamp a 0.
- **CD di attack**: ``10 + target.tier + defense_mod_aggregato_target``.
  ``defense_mod`` e ``attack_mod`` sono aggregati sommando i trait attivi
  dai rispettivi lati.
- **Resistenze**: moltiplicative con ``floor`` e clamp del ``modifier_pct``
  a ``[-100, 100]``.

Rimandi espliciti (fase successive):

- Status effect automatici (bleeding/fracture/disorient/rage/panic) non
  vengono applicati dal resolver; il catalog espone solo il cap sull'applicazione
  via ``action.type == "ability"`` esplicita.
- Stress non viene modificato dal resolver per attack base. Gli unici
  triggers di stress nel Frattura draft sono hazard ambientali e forme
  attivate, non attack.
- PT accumulation: ``RollResult.pt_gained`` viene calcolato dalla formula
  del doc (+1 nat 15-19, +2 nat 20, +1 ogni +5 MoS) e scritto nel ``TurnLog``,
  ma non viene persistito in un pool di stato.
- Parry/defend/ability/move: consumano ``ap_cost`` dell'attore ma non hanno
  logica di risoluzione in questa iterazione. Saranno aggiunte in seguito
  quando definiremo il registro effetti e la parata contrapposta.

Il modulo e' puro: nessun I/O, nessun state globale, nessun randomness
interno (l'rng e' passato come argomento).
"""
from __future__ import annotations

import copy
import math
import sys
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Tuple

# Il resolver riusa l'helper RNG di ``tools/py/game_utils/random_utils.py``
# (fase 1 dell'ADR). Il worker bridge o il test caller deve avere
# ``tools/py`` in ``sys.path``; se non c'e', lo aggiungiamo best-effort per
# rendere il modulo usabile anche in test locali.
_TOOLS_PY = Path(__file__).resolve().parents[2] / "tools" / "py"
if _TOOLS_PY.exists() and str(_TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(_TOOLS_PY))

from game_utils.random_utils import RandomFloatGenerator, roll_die  # noqa: E402


#: CD base per un attack "normale" prima di aggiungere tier e defense_mod.
#: Ancorata a ``docs/10-SISTEMA_TATTICO.md`` e al Frattura draft (CD 14-18
#: per abilita', 10 e' la base d20 standard prima dei modificatori).
ATTACK_CD_BASE = 10

#: Soglia della scala crit naturale (``natural >= CRIT_THRESHOLD`` -> PT +1).
CRIT_PT_THRESHOLD = 15

#: Valore di crit maximo che assegna +2 PT.
NATURAL_MAX = 20

#: Valore di fumble che auto-miss.
NATURAL_FUMBLE = 1

#: Granularita' del MoS per step danno: ogni +5 di scarto sulla CD = +1 step.
MOS_PER_STEP = 5

#: Action types che consumano AP ma non hanno logica di risoluzione in
#: questa iterazione del resolver.
NOOP_ACTION_TYPES = frozenset({"defend", "parry", "ability", "move"})

#: CD fissa per il tiro reattivo di parata (Fase 7). Semplificata rispetto
#: al pattern "d20 contrapposto" del doc per la prima iterazione.
PARRY_CD = 12

#: PT difensivi base generati da una parata riuscita. Nat 20 sulla parry
#: assegna ``PARRY_PT_CRIT`` invece. Formula simmetrica a ``compute_pt_gained``
#: senza MoS (la parry non ha "scarto oltre CD" nel modello attuale).
PARRY_PT_BASE = 1
PARRY_PT_CRIT = 2

#: Tipologie di spesa PT supportate dal resolver. Le altre 3 citate in
#: ``docs/10-SISTEMA_TATTICO.md`` ("spinte", "condizioni", "combo") sono
#: rimandate con TODO nell'ADR.
SUPPORTED_PT_SPEND_TYPES = frozenset({"perforazione"})

#: Riduzione armor applicata dalla spesa PT "perforazione".
PERFORAZIONE_ARMOR_REDUCTION = 2

#: Breakpoints dello stress float 0-1 che triggerano status mentali
#: automatici (Fase 8). Fonte: ``docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md``
#: "breakpoints 0.25/0.5/0.75".
STRESS_BREAKPOINT_RAGE = 0.5
STRESS_BREAKPOINT_PANIC = 0.75

#: Default di rage/panic quando triggerati da breakpoint stress.
RAGE_DEFAULT_INTENSITY = 1
RAGE_DEFAULT_DURATION = 3
PANIC_DEFAULT_INTENSITY = 1
PANIC_DEFAULT_DURATION = 2

#: Effetti gameplay dei 5 status (Fase 8 + Phase 2).
#: - bleeding: ``-intensity`` HP all'inizio del turno del target
#: - fracture: ``-intensity`` allo step_count degli attack del portatore
#: - disorient: ``-intensity * DISORIENT_ATTACK_MALUS_PER_INTENSITY`` all'attack_mod
#: - rage: ``+intensity * RAGE_ATTACK_BONUS`` all'attack_mod,
#:         ``+intensity * RAGE_DAMAGE_STEP_BONUS`` al damage_step,
#:         ``-intensity * RAGE_DEFENSE_MALUS`` al defense_mod (furia cieca)
#: - panic: ``-intensity * PANIC_ATTACK_MALUS`` all'attack_mod,
#:          blocca PT spend (panico impedisce azioni concentrate)
DISORIENT_ATTACK_MALUS_PER_INTENSITY = 2
FRACTURE_STEP_REDUCTION_PER_INTENSITY = 1
RAGE_ATTACK_BONUS_PER_INTENSITY = 1
RAGE_DAMAGE_STEP_BONUS_PER_INTENSITY = 1
RAGE_DEFENSE_MALUS_PER_INTENSITY = 1
PANIC_ATTACK_MALUS_PER_INTENSITY = 2


def aggregate_mod(
    trait_ids: Iterable[str],
    catalog: Mapping[str, Any],
    field: str,
) -> int:
    """Somma un campo intero (``attack_mod``/``defense_mod``/``damage_step``)
    sui trait attivi. Trait sconosciuti al catalog vengono ignorati.
    """

    total = 0
    for trait_id in trait_ids:
        entry = catalog.get(trait_id)
        if not isinstance(entry, Mapping):
            continue
        value = entry.get(field)
        if isinstance(value, int):
            total += value
    return total


def compute_pt_gained(natural: int, mos: int) -> int:
    """Formula del doc 10-SISTEMA_TATTICO: +1 per nat 15-19, +2 per nat 20,
    +1 per ogni +5 di MoS.
    """

    pt = 0
    if natural == NATURAL_MAX:
        pt += 2
    elif natural >= CRIT_PT_THRESHOLD:
        pt += 1
    pt += max(0, mos // MOS_PER_STEP)
    return pt


def compute_step_count(mos: int, trait_damage_step_bonus: int) -> int:
    """Step danno totali = ``MoS // 5`` + bonus trait.

    Il ``damage_step`` del trait attaccante e' un "extra step gia' maturato"
    che si somma a quelli derivati dal MoS. Il cap +1 del framework Balancer
    garantisce che un attaccante con un solo trait offensive parta con
    damage_step = +1 e ottenga piu' step solo sbrogliando il tiro.
    """

    from_mos = max(0, mos // MOS_PER_STEP)
    return from_mos + max(0, trait_damage_step_bonus)


def compute_step_flat_bonus(
    count: int,
    sides: int,
    modifier: int,
    step_count: int,
) -> int:
    """Calcola il bonus flat da ``step_count`` step sulla base del danno
    medio del ``damage_dice``.

    Formula: ``floor(avg_base * 0.25 * step_count)`` dove
    ``avg_base = count * (sides+1)/2 + modifier``. Deterministico,
    indipendente dal tiro. Se ``step_count == 0`` il bonus e' 0.
    """

    if step_count <= 0:
        return 0
    avg_base = count * (sides + 1) / 2 + modifier
    bonus = avg_base * 0.25 * step_count
    return math.floor(bonus)


def apply_resistance(damage: int, resistances: Iterable[Mapping[str, Any]], channel: Optional[str]) -> int:
    """Applica la resistenza del target per il canale dell'attacco.

    Formula: ``floor(damage * (1 - pct/100))``. Se il canale non matcha
    nessuna resistenza del target, il danno passa invariato. Un
    ``modifier_pct`` negativo amplifica il danno (vulnerabilita').
    """

    if damage <= 0 or channel is None:
        return damage
    for res in resistances:
        if res.get("channel") == channel:
            pct = int(res.get("modifier_pct", 0))
            factor = (100 - pct) / 100
            return _floor(damage * factor)
    return damage


def apply_armor(damage: int, armor: int) -> int:
    """Armor DR-style: ``max(0, damage - armor)``."""

    return max(0, damage - max(0, armor))


def roll_damage_dice(
    dice: Mapping[str, Any],
    rng: RandomFloatGenerator,
) -> int:
    """Rolla ``count`` dadi a ``sides`` facce e somma ``modifier``."""

    count = int(dice["count"])
    sides = int(dice["sides"])
    modifier = int(dice["modifier"])
    total = modifier
    for _ in range(count):
        total += roll_die(rng, sides)
    return total


def _find_unit(state: Mapping[str, Any], unit_id: str) -> Dict[str, Any]:
    for unit in state.get("units", []):
        if unit.get("id") == unit_id:
            return unit  # type: ignore[return-value]
    raise KeyError(f"unit_id non trovato nello state: {unit_id}")


def begin_turn(state: Mapping[str, Any], unit_id: str) -> Dict[str, Any]:
    """Reset di AP e reactions dell'unita' + decay status + bleeding tick.

    Funzione pura: restituisce un dict ``{next_state, expired, bleeding_damage}``.

    - ``next_state``: deep copy dello state con AP/reactions refreshati, status
      decrementati di 1 turno, status con ``remaining_turns`` <= 0 rimossi,
      HP ridotto di ``intensity`` per ogni ``bleeding`` attivo (clamp >= 0).
    - ``expired``: lista di ``{unit_id, status_id}`` per gli status decaduti
      questo turno. Il caller puo' inserirlo nel ``turn_log``.
    - ``bleeding_damage``: totale HP sottratti dal tick bleeding (utile per log
      o UI).

    Raises:
        KeyError: se ``unit_id`` non esiste nello state.
    """

    next_state = copy.deepcopy(state)
    unit = _find_unit(next_state, unit_id)
    ap = unit.get("ap") or {}
    ap["current"] = int(ap.get("max", 0))
    unit["ap"] = ap
    reactions = unit.get("reactions") or {"current": 0, "max": 0}
    reactions["current"] = int(reactions.get("max", 0))
    unit["reactions"] = reactions

    # Bleeding tick PRIMA del decay: se bleeding sta per decadere, l'ultimo
    # tick viene comunque applicato. Convenzione: lo status e' attivo per tutto
    # il turno in cui scade.
    bleeding_damage = 0
    statuses: List[Dict[str, Any]] = [dict(s) for s in unit.get("statuses") or []]
    for status in statuses:
        if status.get("id") == "bleeding":
            bleeding_damage += int(status.get("intensity", 1))
    if bleeding_damage > 0:
        hp = unit.get("hp") or {}
        new_hp = max(0, int(hp.get("current", 0)) - bleeding_damage)
        hp["current"] = new_hp
        unit["hp"] = hp

    # Decay: decrement e filter out degli scaduti
    expired: List[Dict[str, Any]] = []
    surviving: List[Dict[str, Any]] = []
    for status in statuses:
        remaining = int(status.get("remaining_turns", 0)) - 1
        if remaining <= 0:
            expired.append({"unit_id": unit_id, "status_id": status.get("id")})
        else:
            status["remaining_turns"] = remaining
            surviving.append(status)
    unit["statuses"] = surviving

    return {
        "next_state": next_state,
        "expired": expired,
        "bleeding_damage": bleeding_damage,
    }


def get_status(unit: Mapping[str, Any], status_id: str) -> Optional[Dict[str, Any]]:
    """Restituisce lo status attivo sull'unita' con ``status_id``, se presente."""

    for status in unit.get("statuses") or []:
        if status.get("id") == status_id:
            return dict(status)
    return None


def apply_status(
    unit: Dict[str, Any],
    status_id: str,
    duration: int,
    intensity: int,
    source_unit_id: Optional[str] = None,
    source_action_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Applica uno status all'unita' (mutazione in-place).

    Semantica di stack:

    - Se lo status non e' presente: aggiunto con i valori indicati.
    - Se gia' presente: ``remaining_turns = max(existing, duration)`` e
      ``intensity = max(existing, intensity)``. I source_* sono sovrascritti
      dal nuovo applicatore (l'ultimo applicatore "firma" lo status).

    Returns:
        Lo status effect dict finale (copia del record appena scritto).
    """

    statuses: List[Dict[str, Any]] = list(unit.get("statuses") or [])
    existing: Optional[Dict[str, Any]] = None
    for status in statuses:
        if status.get("id") == status_id:
            existing = status
            break

    if existing is None:
        new_status: Dict[str, Any] = {
            "id": status_id,
            "intensity": int(intensity),
            "remaining_turns": int(duration),
            "source_unit_id": source_unit_id,
            "source_action_id": source_action_id,
        }
        statuses.append(new_status)
        unit["statuses"] = statuses
        return dict(new_status)

    existing["intensity"] = max(int(existing.get("intensity", 1)), int(intensity))
    existing["remaining_turns"] = max(
        int(existing.get("remaining_turns", 0)), int(duration)
    )
    existing["source_unit_id"] = source_unit_id
    existing["source_action_id"] = source_action_id
    unit["statuses"] = statuses
    return dict(existing)


def check_stress_breakpoints(
    target: Dict[str, Any],
    stress_before: float,
    stress_after: float,
    source_unit_id: Optional[str],
    source_action_id: Optional[str],
) -> List[Dict[str, Any]]:
    """Applica rage/panic se lo stress del target ha attraversato i breakpoint.

    Ogni breakpoint si attiva **una sola volta** per la transizione
    ``stress_before < breakpoint <= stress_after``. Se il target aveva gia'
    lo status (anche a intensity diversa), ``apply_status`` esegue il refresh
    invece di aggiungere una seconda copia.

    Returns:
        Lista degli status applicati (stessa shape di ``turn_log_entry.statuses_applied``).
    """

    applied: List[Dict[str, Any]] = []
    if stress_before < STRESS_BREAKPOINT_RAGE <= stress_after:
        applied.append(
            apply_status(
                target,
                status_id="rage",
                duration=RAGE_DEFAULT_DURATION,
                intensity=RAGE_DEFAULT_INTENSITY,
                source_unit_id=source_unit_id,
                source_action_id=source_action_id,
            )
        )
    if stress_before < STRESS_BREAKPOINT_PANIC <= stress_after:
        applied.append(
            apply_status(
                target,
                status_id="panic",
                duration=PANIC_DEFAULT_DURATION,
                intensity=PANIC_DEFAULT_INTENSITY,
                source_unit_id=source_unit_id,
                source_action_id=source_action_id,
            )
        )
    return applied


def resolve_parry(
    target: Mapping[str, Any],
    rng: RandomFloatGenerator,
    parry_bonus: int = 0,
) -> Dict[str, Any]:
    """Esegue un tiro di parata per il target.

    Tira d20 + ``parry_bonus`` vs ``PARRY_CD``. Restituisce un dict con la
    forma del ``$defs.parry_result`` dello schema combat. Non muta il target.
    Il caller decide se applicare ``step_reduced`` e se sommare
    ``pt_defensive_gained`` al pool del target.
    """

    natural = roll_die(rng, 20)
    total = natural + int(parry_bonus)
    success = natural == NATURAL_MAX or total >= PARRY_CD
    pt_gained = 0
    step_reduced = 0
    if success:
        step_reduced = 1
        pt_gained = PARRY_PT_CRIT if natural == NATURAL_MAX else PARRY_PT_BASE
    return {
        "attempted": True,
        "executed": True,
        "natural": int(natural),
        "total": int(total),
        "success": bool(success),
        "step_reduced": int(step_reduced),
        "pt_defensive_gained": int(pt_gained),
    }


def apply_pt_spend(
    actor: Dict[str, Any],
    pt_spend: Mapping[str, Any],
) -> int:
    """Consuma il pool PT dell'attore per una spesa dichiarata.

    Mutazione in-place dell'``actor`` (che viene sempre una copia del
    ``next_state``, mai dell'input). Restituisce la quantita' consumata.

    Raises:
        ValueError: se il tipo di spesa non e' supportato o se l'attore non
            ha PT sufficienti. La spesa avviene PRIMA del roll, quindi un
            ValueError qui blocca l'intera ``resolve_action`` senza effetti
            collaterali sullo stato.
    """

    spend_type = pt_spend.get("type")
    if spend_type not in SUPPORTED_PT_SPEND_TYPES:
        raise ValueError(f"tipo pt_spend non supportato: {spend_type!r}")
    amount = int(pt_spend.get("amount", 0))
    if amount <= 0:
        raise ValueError("pt_spend.amount deve essere >= 1")
    current_pt = int(actor.get("pt", 0))
    if current_pt < amount:
        raise ValueError(
            f"PT insufficienti per {spend_type}: richiesti {amount}, disponibili {current_pt}"
        )
    actor["pt"] = current_pt - amount
    return amount


def _floor(value: float) -> int:
    """Floor verso meno infinito (equivalente a ``math.floor``)."""
    int_val = int(value)
    if value < 0 and value != int_val:
        return int_val - 1
    return int_val


def resolve_action(
    state: Mapping[str, Any],
    action: Mapping[str, Any],
    catalog: Mapping[str, Any],
    rng: RandomFloatGenerator,
) -> Dict[str, Any]:
    """Risolve una ``action`` e restituisce ``next_state`` + ``turn_log_entry``.

    - Se ``action.type == "attack"`` esegue la pipeline completa: d20 + mod,
      CD, MoS, damage_dice roll + step_bonus, resistenze, armor, update HP
      del target, AP del attacker.
    - Se ``action.type`` e' uno di ``defend/parry/ability/move``, il resolver
      consuma solo l'AP del attore e produce un ``turn_log_entry`` senza
      ``roll``. Logica di risoluzione reale sara' aggiunta in iterazioni
      successive.

    Non muta gli argomenti: ritorna copie deep.
    """

    action_type = action.get("type")
    next_state = copy.deepcopy(state)

    actor = _find_unit(next_state, str(action["actor_id"]))
    _consume_ap(actor, int(action.get("ap_cost", 0)))

    log_entry: Dict[str, Any] = {
        "turn": int(next_state.get("turn", 1)),
        "action": dict(action),
        "roll": None,
        "damage_applied": 0,
        "statuses_applied": [],
        "statuses_expired": [],
    }

    if action_type == "attack":
        target_id = action.get("target_id")
        if not target_id:
            raise ValueError("attack action richiede target_id")
        target = _find_unit(next_state, str(target_id))
        damage_dice = action.get("damage_dice") or {"count": 1, "sides": 6, "modifier": 0}

        # --- STEP 1: consumo PT caricato PRIMA del roll -----------------
        # Decisione utente: "tutti i colpi caricati che mancano consumano
        # cmq risorse". Un ValueError qui interrompe la resolve_action
        # prima di qualunque mutazione allo state (deep copy gia' pagato
        # ma side-effect minimi).
        # --- STEP 1: consumo PT (panic blocca la spesa) ---
        pt_spend = action.get("pt_spend")
        pt_spent = 0
        perforazione_active = False
        actor_panic = get_status(actor, "panic")
        if pt_spend:
            if actor_panic is not None:
                # Panic impedisce azioni concentrate: PT spend rifiutato
                pass
            else:
                pt_spent = apply_pt_spend(actor, pt_spend)
                if pt_spend.get("type") == "perforazione":
                    perforazione_active = True

        attack_mod = aggregate_mod(actor.get("trait_ids", []), catalog, "attack_mod")
        defense_mod_target = aggregate_mod(
            target.get("trait_ids", []), catalog, "defense_mod"
        )
        trait_damage_step = aggregate_mod(
            actor.get("trait_ids", []), catalog, "damage_step"
        )

        # Status malus su attack_mod dell'attore (disorient)
        disorient = get_status(actor, "disorient")
        if disorient is not None:
            attack_mod -= (
                int(disorient.get("intensity", 1)) * DISORIENT_ATTACK_MALUS_PER_INTENSITY
            )

        # Status rage dell'attore: bonus offensivo, malus difensivo (furia cieca)
        actor_rage = get_status(actor, "rage")
        if actor_rage is not None:
            rage_int = int(actor_rage.get("intensity", 1))
            attack_mod += rage_int * RAGE_ATTACK_BONUS_PER_INTENSITY
            trait_damage_step += rage_int * RAGE_DAMAGE_STEP_BONUS_PER_INTENSITY

        # Status panic dell'attore: malus offensivo
        if actor_panic is not None:
            attack_mod -= (
                int(actor_panic.get("intensity", 1)) * PANIC_ATTACK_MALUS_PER_INTENSITY
            )

        # Status rage del target: riduce defense_mod (furia cieca lo espone)
        target_rage = get_status(target, "rage")
        if target_rage is not None:
            defense_mod_target -= (
                int(target_rage.get("intensity", 1)) * RAGE_DEFENSE_MALUS_PER_INTENSITY
            )

        cd = ATTACK_CD_BASE + int(target.get("tier", 1)) + defense_mod_target

        natural = roll_die(rng, 20)
        total = natural + attack_mod
        is_fumble = natural == NATURAL_FUMBLE
        is_crit = natural == NATURAL_MAX
        # Il crit auto-succede anche se total < cd; il fumble auto-fallisce.
        if is_fumble:
            success = False
        elif is_crit:
            success = True
        else:
            success = total >= cd
        mos = max(0, total - cd) if success else 0

        # --- STEP 2: parry opt-in se attack success ---------------------
        parry_info: Optional[Dict[str, Any]] = None
        parry_response = action.get("parry_response")
        if parry_response and parry_response.get("attempt"):
            target_reactions = target.get("reactions") or {"current": 0, "max": 0}
            if success and int(target_reactions.get("current", 0)) > 0:
                target_reactions["current"] = int(target_reactions.get("current", 0)) - 1
                target["reactions"] = target_reactions
                parry_info = resolve_parry(
                    target=target,
                    rng=rng,
                    parry_bonus=int(parry_response.get("parry_bonus", 0)),
                )
                if parry_info["success"]:
                    target["pt"] = int(target.get("pt", 0)) + int(parry_info["pt_defensive_gained"])
            else:
                parry_info = {
                    "attempted": True,
                    "executed": False,
                    "natural": 0,
                    "total": 0,
                    "success": False,
                    "step_reduced": 0,
                    "pt_defensive_gained": 0,
                }

        step_count = compute_step_count(mos, trait_damage_step)
        # Status malus su step_count dell'attore (fracture)
        fracture = get_status(actor, "fracture")
        if fracture is not None:
            step_count = max(
                0,
                step_count
                - int(fracture.get("intensity", 1)) * FRACTURE_STEP_REDUCTION_PER_INTENSITY,
            )
        if parry_info and parry_info.get("success"):
            step_count = max(0, step_count - int(parry_info["step_reduced"]))
        pt_gained = compute_pt_gained(natural, mos)

        damage_applied = 0
        if success:
            base_damage = roll_damage_dice(damage_dice, rng)
            step_bonus = compute_step_flat_bonus(
                count=int(damage_dice["count"]),
                sides=int(damage_dice["sides"]),
                modifier=int(damage_dice["modifier"]),
                step_count=step_count,
            )
            pre_resist = base_damage + step_bonus
            after_resist = apply_resistance(
                pre_resist,
                target.get("resistances", []),
                action.get("channel"),
            )
            effective_armor = int(target.get("armor", 0))
            if perforazione_active:
                effective_armor = max(0, effective_armor - PERFORAZIONE_ARMOR_REDUCTION)
            after_armor = apply_armor(after_resist, effective_armor)
            damage_applied = max(0, after_armor)
            target_hp = target.get("hp", {})
            target_hp["current"] = int(target_hp.get("current", 0)) - damage_applied
            target["hp"] = target_hp

        # --- STEP 3: status auto-trigger dai trait attaccante ---------
        statuses_applied: List[Dict[str, Any]] = []
        if success:
            # on_hit_stress_delta: somma i delta di tutti i trait attaccante,
            # applica al target (clamp 0-1), poi check breakpoints.
            stress_delta_total = 0.0
            for trait_id in actor.get("trait_ids", []):
                entry = catalog.get(trait_id)
                if isinstance(entry, Mapping):
                    delta = entry.get("on_hit_stress_delta")
                    if isinstance(delta, (int, float)):
                        stress_delta_total += float(delta)
            if stress_delta_total != 0.0:
                stress_before = float(target.get("stress", 0.0))
                stress_after = max(0.0, min(1.0, stress_before + stress_delta_total))
                target["stress"] = stress_after
                breakpoint_applied = check_stress_breakpoints(
                    target=target,
                    stress_before=stress_before,
                    stress_after=stress_after,
                    source_unit_id=actor.get("id"),
                    source_action_id=action.get("id"),
                )
                statuses_applied.extend(breakpoint_applied)

            # on_hit_status: SV del target d20+0 vs trigger_dc; fail -> apply
            for trait_id in actor.get("trait_ids", []):
                entry = catalog.get(trait_id)
                if not isinstance(entry, Mapping):
                    continue
                on_hit = entry.get("on_hit_status")
                if not isinstance(on_hit, Mapping):
                    continue
                sv_natural = roll_die(rng, 20)
                sv_total = sv_natural  # +0 mod per ora
                trigger_dc = int(on_hit.get("trigger_dc", 10))
                if sv_total < trigger_dc:
                    applied = apply_status(
                        target,
                        status_id=str(on_hit.get("status_id")),
                        duration=int(on_hit.get("duration", 1)),
                        intensity=int(on_hit.get("intensity", 1)),
                        source_unit_id=actor.get("id"),
                        source_action_id=action.get("id"),
                    )
                    statuses_applied.append(applied)

        # --- STEP 4: accumulo PT dell'attore sul roll ------------------
        actor["pt"] = int(actor.get("pt", 0)) + int(pt_gained)

        roll_result = {
            "natural": int(natural),
            "modifier": int(attack_mod),
            "total": int(total),
            "dc": int(cd),
            "success": bool(success),
            "mos": int(mos),
            "damage_step": int(step_count),
            "pt_gained": int(pt_gained),
            "is_crit": bool(is_crit),
            "is_fumble": bool(is_fumble),
            "parry": parry_info,
            "pt_spent": int(pt_spent),
        }
        log_entry["roll"] = roll_result
        log_entry["damage_applied"] = int(damage_applied)
        log_entry["statuses_applied"] = statuses_applied
    elif action_type in NOOP_ACTION_TYPES:
        # AP gia' consumato sopra. Nessun roll, nessun update stato oltre.
        pass
    else:
        raise ValueError(f"action.type non supportato: {action_type!r}")

    log_list: List[Dict[str, Any]] = list(next_state.get("log", []))
    log_list.append(log_entry)
    next_state["log"] = log_list

    return {
        "next_state": next_state,
        "turn_log_entry": log_entry,
    }


def _consume_ap(unit: Dict[str, Any], ap_cost: int) -> None:
    ap = unit.get("ap") or {}
    current = int(ap.get("current", 0))
    ap["current"] = max(0, current - max(0, ap_cost))
    unit["ap"] = ap


__all__ = [
    "ATTACK_CD_BASE",
    "CRIT_PT_THRESHOLD",
    "DISORIENT_ATTACK_MALUS_PER_INTENSITY",
    "FRACTURE_STEP_REDUCTION_PER_INTENSITY",
    "MOS_PER_STEP",
    "NATURAL_FUMBLE",
    "NATURAL_MAX",
    "NOOP_ACTION_TYPES",
    "PANIC_ATTACK_MALUS_PER_INTENSITY",
    "PANIC_DEFAULT_DURATION",
    "PANIC_DEFAULT_INTENSITY",
    "RAGE_ATTACK_BONUS_PER_INTENSITY",
    "RAGE_DAMAGE_STEP_BONUS_PER_INTENSITY",
    "RAGE_DEFENSE_MALUS_PER_INTENSITY",
    "PARRY_CD",
    "PARRY_PT_BASE",
    "PARRY_PT_CRIT",
    "PERFORAZIONE_ARMOR_REDUCTION",
    "RAGE_DEFAULT_DURATION",
    "RAGE_DEFAULT_INTENSITY",
    "STRESS_BREAKPOINT_PANIC",
    "STRESS_BREAKPOINT_RAGE",
    "SUPPORTED_PT_SPEND_TYPES",
    "aggregate_mod",
    "apply_armor",
    "apply_pt_spend",
    "apply_resistance",
    "apply_status",
    "begin_turn",
    "check_stress_breakpoints",
    "compute_pt_gained",
    "compute_step_count",
    "compute_step_flat_bonus",
    "get_status",
    "resolve_action",
    "resolve_parry",
    "roll_damage_dice",
]
