"""Round orchestrator per il rules engine di Evo-Tactics.

Questo modulo implementa il loop **shared-planning → commit → ordered-resolution**
sopra il resolver atomico ``services.rules.resolver.resolve_action``.

Il resolver atomico resta invariato: opera su ``(state, action, catalog, rng)``
e ritorna ``{next_state, turn_log_entry}`` per una singola intenzione. Questo
orchestratore aggiunge un layer che:

1. Traccia la fase del round: ``planning | committed | resolving | resolved``.
2. Accumula **intents** (azioni dichiarate) durante la planning senza mutare
   lo stato reale del combat (preview-only, AP non consumati).
3. Su ``commit_round`` blocca gli intents e congela la composizione del round.
4. Su ``resolve_round`` costruisce una **resolution queue** ordinata per
   ``resolve_priority`` decrescente (tiebreak alfabetico sull'``unit_id``) e
   invoca ``resolve_action`` per ogni intent, concatenando lo stato.

Semantica cambiata vs sprint 006-023:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- ``unit.initiative`` **non** significa piu' "ordine dei turni individuali",
  significa **velocita' di reazione** (stat passiva). Un'unita' con iniziativa
  piu' alta risolve prima nel round, non "gioca prima".
- ``resolve_priority = unit.initiative + action_speed(action) - status_penalty``.
  Piu' alto = piu' veloce. Status come panic / disorient rallentano.
- Il combattimento non e' piu' modellato come "una sola unita' attiva alla
  volta": tutte le intenzioni del round vengono risolte nello stesso round,
  la dichiarazione e' simultanea, la risoluzione e' ordinata deterministica.

Contratti di determinismo:
~~~~~~~~~~~~~~~~~~~~~~~~~

- Stessi intents + stesso rng + stesso catalog → stesso ``next_state``.
- Ordinamento deterministico (priority desc, poi id crescente).
- Nessun randomness in ``build_resolution_queue`` o nelle transizioni di fase.
  Tutto il randomness vive dentro ``resolve_action`` e consuma il rng in ordine
  deterministico di queue.

Preview-only della planning phase:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- ``declare_intent(state, unit_id, action)`` accumula l'intento in
  ``state.pending_intents`` ma NON chiama ``resolve_action``, NON consuma AP,
  NON modifica HP, log, o altri campi dello stato.
- Gli AP sono consumati solo durante ``resolve_round`` (tramite
  ``resolve_action`` che gia' fa il ``_consume_ap`` internamente).
- Il client/UI puo' mostrare "preview" dei costi e dei target senza mai
  toccare lo stato canonico.

Compatibilita' con lo schema esistente:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``packages/contracts/schemas/combat.schema.json`` dichiara
``additionalProperties: true`` al livello di ``CombatState``, quindi i campi
``round_phase``, ``pending_intents``, ``resolution_queue`` possono essere
aggiunti senza schema bump. I campi legacy ``initiative_order`` e
``active_unit_id`` restano presenti per retrocompatibilita' ma il loro
significato e' "ordine di default per la resolution queue" e "unita'
attualmente in resolving (advisory)", non piu' "chi gioca ora".

Vedi ``docs/combat/round-loop.md`` e
``docs/adr/ADR-2026-04-15-round-based-combat-model.md`` per il design
completo e il piano di migrazione.
"""
from __future__ import annotations

import copy
from typing import Any, Callable, Dict, List, Mapping, Optional

# Relative import: funziona sia quando il package e' importato come
# ``services.rules.round_orchestrator`` (pytest da repo root) sia quando
# ``services/`` e' in sys.path e il package si chiama ``rules``
# (pattern usato da tests/test_resolver.py che inserisce ``services/`` in path).
from .resolver import begin_turn, resolve_action

# ------------------------------------------------------------------
# Round phase enum
# ------------------------------------------------------------------

#: Fase "shared planning": i player e l'AI dichiarano intents senza
#: toccare lo stato reale. Preview-only, AP non consumati.
PHASE_PLANNING = "planning"

#: Fase "locked": gli intents sono congelati. Nessuna nuova dichiarazione,
#: nessuna modifica. Transitoria: il caller passa subito a resolve_round.
PHASE_COMMITTED = "committed"

#: Fase interna: ``resolve_round`` sta processando la queue. Usata per
#: segnalare inconsistenze se il caller prova a ri-entrare.
PHASE_RESOLVING = "resolving"

#: Fase finale del round: tutti gli intents risolti, pending_intents
#: svuotato, log aggiornato. Il caller puo' ora chiamare ``begin_round``
#: per iniziare il round successivo.
PHASE_RESOLVED = "resolved"

VALID_PHASES = frozenset({PHASE_PLANNING, PHASE_COMMITTED, PHASE_RESOLVING, PHASE_RESOLVED})


# ------------------------------------------------------------------
# Action speed table
# ------------------------------------------------------------------

#: Modificatori di velocita' di risoluzione per action type. Piu' alto =
#: risolve prima. La convenzione: azioni difensive/stance gia' mantenute
#: sono rapide, azioni offensive sono baseline, movimento e abilita'
#: elaborate sono leggermente piu' lente.
#:
#: Valori di prima iterazione — possono essere calibrati in seguito
#: con il balance pack. Ogni action type non in tabella vale 0.
ACTION_SPEED: Dict[str, int] = {
    "defend": 2,
    "parry": 2,
    "attack": 0,
    "ability": -1,
    "move": -2,
}


def action_speed(action: Mapping[str, Any]) -> int:
    """Ritorna il modificatore di velocita' per un'action, default 0."""

    return int(ACTION_SPEED.get(str(action.get("type", "")), 0))


def compute_resolve_priority(
    unit: Mapping[str, Any],
    action: Mapping[str, Any],
) -> int:
    """Calcola la priorita' di risoluzione di un intent nel round.

    Formula: ``priority = unit.initiative + action_speed(action) - status_penalty``

    - ``unit.initiative`` e' la stat passiva di reaction speed dell'unita'.
    - ``action_speed`` sposta la priorita' in base al tipo di azione.
    - Status mentali rallentano:
        - ``panic``: -2 per intensity (panico rallenta le reazioni)
        - ``disorient``: -1 per intensity (disorientamento riduce prontezza)
        - ``rage``, ``focused``, ``stunned``: priorita' non influenzata in
          questa iterazione (rage ha gia' bonus attack_mod nel resolver,
          stunned viene trattato come skip a livello policy).

    Priorita' piu' alta = risolve prima nel round. Tiebreak in
    ``build_resolution_queue`` alfabetico su ``unit_id``.
    """

    base = int(unit.get("initiative", 0))
    speed = action_speed(action)
    penalty = 0
    for status in unit.get("statuses") or []:
        sid = status.get("id")
        intensity = int(status.get("intensity", 1))
        if sid == "panic":
            penalty += intensity * 2
        elif sid == "disorient":
            penalty += intensity
    return base + speed - penalty


# ------------------------------------------------------------------
# Round lifecycle
# ------------------------------------------------------------------


def _find_unit(state: Mapping[str, Any], unit_id: str) -> Optional[Mapping[str, Any]]:
    for unit in state.get("units", []):
        if str(unit.get("id", "")) == unit_id:
            return unit
    return None


def begin_round(state: Mapping[str, Any]) -> Dict[str, Any]:
    """Avvia un nuovo round.

    Per ogni unita' (ordinata alfabeticamente per determinismo):

    - refresh AP a max
    - refresh reactions a max
    - decay degli status di 1 turno
    - bleeding tick prima del decay (lo status e' attivo per tutto il turno
      in cui scade, come da semantica di ``resolver.begin_turn``)

    Imposta ``round_phase = 'planning'`` e svuota ``pending_intents``.

    Returns:
        ``{next_state, expired, bleeding_total}`` dove ``expired`` e
        ``bleeding_total`` aggregano gli effetti di tutti i ``begin_turn``
        invocati questo round.
    """

    next_state = copy.deepcopy(state)
    expired_all: List[Dict[str, Any]] = []
    bleeding_total = 0
    unit_ids_sorted = sorted(
        (str(u.get("id", "")) for u in next_state.get("units", [])),
        key=lambda s: s,
    )
    for uid in unit_ids_sorted:
        if not uid:
            continue
        result = begin_turn(next_state, uid)
        next_state = result["next_state"]
        expired_all.extend(result.get("expired", []))
        bleeding_total += int(result.get("bleeding_damage", 0))
    next_state["round_phase"] = PHASE_PLANNING
    next_state["pending_intents"] = []
    return {
        "next_state": next_state,
        "expired": expired_all,
        "bleeding_total": bleeding_total,
    }


def declare_intent(
    state: Mapping[str, Any],
    unit_id: str,
    action: Mapping[str, Any],
) -> Dict[str, Any]:
    """Registra un intent nella fase di planning. Preview-only.

    NON muta AP/HP/log dello stato. Se l'unita' ha gia' un intent dichiarato
    nel round corrente, viene sostituito (latest-wins). Questo riflette il
    flusso UI: il giocatore puo' cambiare idea quante volte vuole prima del
    commit.

    Raises:
        ValueError: se ``state.round_phase`` non e' ``'planning'``
        KeyError: se ``unit_id`` non esiste nello state
    """

    phase = state.get("round_phase")
    if phase not in (PHASE_PLANNING, None):
        raise ValueError(
            f"declare_intent richiede round_phase {PHASE_PLANNING!r}, "
            f"trovato {phase!r}"
        )
    if _find_unit(state, unit_id) is None:
        raise KeyError(f"unit_id non trovato nello state: {unit_id}")
    next_state = copy.deepcopy(state)
    intents = [
        dict(i)
        for i in next_state.get("pending_intents", [])
        if str(i.get("unit_id", "")) != unit_id
    ]
    intents.append({"unit_id": unit_id, "action": dict(action)})
    next_state["pending_intents"] = intents
    # Se era None, imposta planning per rendere esplicita la fase
    if phase is None:
        next_state["round_phase"] = PHASE_PLANNING
    return {"next_state": next_state}


def clear_intent(state: Mapping[str, Any], unit_id: str) -> Dict[str, Any]:
    """Rimuove l'intent precedentemente dichiarato per ``unit_id``.

    No-op se l'unita' non ha intents. Rispetta la fase di planning.
    """

    next_state = copy.deepcopy(state)
    intents = [
        dict(i)
        for i in next_state.get("pending_intents", [])
        if str(i.get("unit_id", "")) != unit_id
    ]
    next_state["pending_intents"] = intents
    return {"next_state": next_state}


def commit_round(state: Mapping[str, Any]) -> Dict[str, Any]:
    """Blocca gli intents del round, transita a ``'committed'``.

    Raises:
        ValueError: se non siamo in fase planning, o se nessun intent e'
            stato dichiarato. In teoria un round puo' avere zero intents
            (nessuno sceglie di agire), ma per ora il caller deve almeno
            dichiarare esplicitamente l'assenza — questa regola puo'
            essere rilassata in futuro per supportare "tutti skip".
    """

    phase = state.get("round_phase")
    if phase != PHASE_PLANNING:
        raise ValueError(
            f"commit_round richiede round_phase {PHASE_PLANNING!r}, "
            f"trovato {phase!r}"
        )
    next_state = copy.deepcopy(state)
    next_state["round_phase"] = PHASE_COMMITTED
    return {"next_state": next_state}


def build_resolution_queue(state: Mapping[str, Any]) -> List[Dict[str, Any]]:
    """Produce la queue di risoluzione ordinata dagli intents committed.

    Ordinamento:
    1. ``priority`` decrescente (alto = risolve prima)
    2. ``unit_id`` alfabetico (tiebreak deterministico)

    Intents per unita' non trovate nello state sono silenziosamente
    ignorati (difesa contro state drift).

    Returns:
        Lista di dict ``{unit_id, action, priority}``.
    """

    units = {str(u.get("id", "")): u for u in state.get("units", [])}
    queue: List[Dict[str, Any]] = []
    for intent in state.get("pending_intents", []):
        uid = str(intent.get("unit_id", ""))
        unit = units.get(uid)
        if unit is None:
            continue
        action = intent.get("action", {})
        priority = compute_resolve_priority(unit, action)
        queue.append({"unit_id": uid, "action": action, "priority": priority})
    queue.sort(key=lambda q: (-int(q["priority"]), str(q["unit_id"])))
    return queue


def resolve_round(
    state: Mapping[str, Any],
    catalog: Mapping[str, Any],
    rng: Callable[[], float],
) -> Dict[str, Any]:
    """Risolve tutti gli intents committed in ordine di priority.

    Pipeline per ogni entry della queue:

    1. Se l'actor e' morto (hp <= 0) → skip con reason=``actor_dead``.
    2. Se l'action e' un attacco/parata e il target e' morto → skip con
       reason=``target_dead``. Per altri action type (move, ability senza
       target, defend) il target non e' verificato.
    3. Altrimenti ``resolve_action(state, action, catalog, rng)``, e si
       usa il ``next_state`` risultante come stato di partenza per l'entry
       successiva. Il ``turn_log_entry`` e' accumulato.

    Gli skip NON consumano rng: il resolver non viene invocato affatto.
    Gli skip sono loggati in ``result["skipped"]`` per UI/debug.

    Post-condizioni sul ``next_state``:

    - ``round_phase = 'resolved'``
    - ``pending_intents = []``
    - ``log`` esteso con i ``turn_log_entry`` dei soli intents eseguiti

    Raises:
        ValueError: se ``state.round_phase`` non e' ``'committed'``
    """

    if state.get("round_phase") != PHASE_COMMITTED:
        raise ValueError(
            f"resolve_round richiede round_phase {PHASE_COMMITTED!r}, "
            f"trovato {state.get('round_phase')!r}"
        )
    next_state = copy.deepcopy(state)
    next_state["round_phase"] = PHASE_RESOLVING
    queue = build_resolution_queue(next_state)
    turn_log_entries: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []

    for entry in queue:
        uid = entry["unit_id"]
        action = entry["action"]
        actor = next((u for u in next_state.get("units", []) if u.get("id") == uid), None)
        if actor is None or int((actor.get("hp") or {}).get("current", 0)) <= 0:
            skipped.append({"unit_id": uid, "reason": "actor_dead", "action": dict(action)})
            continue
        # Target dead check: solo per action type con target obbligatorio
        action_type = action.get("type")
        target_id = action.get("target_id")
        if target_id and action_type in ("attack", "parry"):
            target = next(
                (u for u in next_state.get("units", []) if u.get("id") == target_id), None
            )
            if target is None or int((target.get("hp") or {}).get("current", 0)) <= 0:
                skipped.append(
                    {"unit_id": uid, "reason": "target_dead", "action": dict(action)}
                )
                continue
        result = resolve_action(next_state, action, catalog, rng)
        next_state = result["next_state"]
        turn_log_entries.append(result["turn_log_entry"])

    next_state["round_phase"] = PHASE_RESOLVED
    next_state["pending_intents"] = []
    return {
        "next_state": next_state,
        "turn_log_entries": turn_log_entries,
        "resolution_queue": queue,
        "skipped": skipped,
    }


__all__ = [
    "ACTION_SPEED",
    "PHASE_COMMITTED",
    "PHASE_PLANNING",
    "PHASE_RESOLVED",
    "PHASE_RESOLVING",
    "VALID_PHASES",
    "action_speed",
    "begin_round",
    "build_resolution_queue",
    "clear_intent",
    "commit_round",
    "compute_resolve_priority",
    "declare_intent",
    "resolve_round",
]
