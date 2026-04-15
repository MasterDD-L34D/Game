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
from pathlib import Path
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
# Reaction intents (follow-up #1 + #3)
# ------------------------------------------------------------------

#: Eventi che possono triggerare una reaction. Per v1 e' supportato solo
#: ``'attacked'`` (trigger sull'attack risolto dall'attaccante). Future
#: estensioni: ``'damaged'`` (dopo il damage step), ``'moved_adjacent'``,
#: ``'healed'``.
SUPPORTED_REACTION_EVENTS = frozenset({"attacked"})

#: Tipi di payload per reaction. Per v1 solo ``'parry'``. Future: ``'counter'``
#: (contrattacco libero), ``'overwatch'`` (attacco opportunistico).
SUPPORTED_REACTION_TYPES = frozenset({"parry"})


# ------------------------------------------------------------------
# Action speed table
# ------------------------------------------------------------------

#: Default action speed hardcoded — usato come fallback se lo YAML di
#: balance non e' caricabile. Mantieni sincronizzato con
#: ``packs/evo_tactics_pack/data/balance/action_speed.yaml``.
DEFAULT_ACTION_SPEED: Dict[str, int] = {
    "defend": 2,
    "parry": 2,
    "attack": 0,
    "ability": -1,
    "move": -2,
}

#: Path canonico dello YAML di balance caricato al primo import.
DEFAULT_ACTION_SPEED_PATH: Path = (
    Path(__file__).resolve().parents[2]
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "action_speed.yaml"
)


def load_action_speed_table(path: Optional[Path] = None) -> Dict[str, int]:
    """Carica la tabella ``action_speed`` da un file YAML di balance.

    Fallback a ``DEFAULT_ACTION_SPEED`` se:
    - ``path`` e' None e il default non esiste sul filesystem
    - il file esiste ma non e' parsabile come YAML
    - il file e' parsabile ma non contiene la chiave ``action_speed``
      come dict
    - ``pyyaml`` non e' disponibile nell'environment

    Il loader e' volutamente tollerante: non solleva mai eccezioni,
    sempre ritorna un dict ``{str: int}``. Questo permette di importare
    il modulo anche in environment minimal (CI deployment-checks senza
    ``yaml`` installato a livello root).

    Il caller test puo' passare un ``path`` esplicito per override.
    """

    target = path if path is not None else DEFAULT_ACTION_SPEED_PATH
    if not target.exists():
        return dict(DEFAULT_ACTION_SPEED)
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError:
        return dict(DEFAULT_ACTION_SPEED)
    try:
        with target.open("r", encoding="utf-8") as handle:
            doc = yaml.safe_load(handle) or {}
    except Exception:
        return dict(DEFAULT_ACTION_SPEED)
    if not isinstance(doc, Mapping):
        return dict(DEFAULT_ACTION_SPEED)
    table = doc.get("action_speed")
    if not isinstance(table, Mapping):
        return dict(DEFAULT_ACTION_SPEED)
    out: Dict[str, int] = {}
    for key, value in table.items():
        try:
            out[str(key)] = int(value)
        except (TypeError, ValueError):
            continue
    return out if out else dict(DEFAULT_ACTION_SPEED)


#: Tabella runtime caricata al primo import. Mutabile via
#: ``reload_action_speed_table(path)`` per hot reload nei test.
ACTION_SPEED: Dict[str, int] = load_action_speed_table()


def reload_action_speed_table(path: Optional[Path] = None) -> Dict[str, int]:
    """Ricarica ``ACTION_SPEED`` dal filesystem, mutando il dict in-place.

    Utile per i test che vogliono esercitare override della tabella
    senza dover passare il parametro ``speed_table`` a ogni chiamata.
    Ritorna il dict aggiornato per convenienza.
    """

    global ACTION_SPEED
    ACTION_SPEED.clear()
    ACTION_SPEED.update(load_action_speed_table(path))
    return ACTION_SPEED


def action_speed(
    action: Mapping[str, Any],
    table: Optional[Mapping[str, int]] = None,
) -> int:
    """Ritorna il modificatore di velocita' per un'action, default 0.

    ``table`` opzionale per override puntuale (es. test unitari che
    vogliono una tabella custom senza toccare il modulo-level
    ``ACTION_SPEED``).
    """

    lookup = table if table is not None else ACTION_SPEED
    return int(lookup.get(str(action.get("type", "")), 0))


def compute_resolve_priority(
    unit: Mapping[str, Any],
    action: Mapping[str, Any],
    speed_table: Optional[Mapping[str, int]] = None,
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

    ``speed_table`` opzionale per override (es. test).
    """

    base = int(unit.get("initiative", 0))
    speed = action_speed(action, table=speed_table)
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
    Rimuove anche eventuali reaction intents per la stessa unit.
    """

    next_state = copy.deepcopy(state)
    intents = [
        dict(i)
        for i in next_state.get("pending_intents", [])
        if str(i.get("unit_id", "")) != unit_id
    ]
    next_state["pending_intents"] = intents
    return {"next_state": next_state}


def declare_reaction(
    state: Mapping[str, Any],
    unit_id: str,
    reaction_payload: Mapping[str, Any],
    trigger: Mapping[str, Any],
) -> Dict[str, Any]:
    """Registra una **reaction intent** nella planning phase.

    Le reaction intents sono un concetto separato dalle azioni principali:
    non occupano la main queue del round, non consumano AP al commit e
    non vengono risolte in sequenza. Attendono invece un **evento trigger**
    (es. "essere attaccato") prodotto da un main intent. Quando il trigger
    matcha, l'orchestratore inietta il ``reaction_payload`` nell'action
    dell'attaccante (tipicamente come ``parry_response``) e lascia che
    il resolver atomico gestisca la pipeline esistente.

    Shape dell'intent risultante:

        {
          "unit_id": "<target>",
          "reaction_trigger": {
            "event": "attacked",
            "source_any_of": ["alpha", "charlie"]  # null = qualsiasi
          },
          "reaction_payload": {
            "type": "parry",
            "parry_bonus": 1
          }
        }

    **Preview-only**: non consuma AP ne' la reaction budget
    (``unit.reactions.current``). Il budget viene decrementato dal resolver
    atomico quando la reaction e' effettivamente triggerata durante
    ``resolve_round``. Una reaction dichiarata ma mai triggerata costa 0.

    **One per unit**: ogni unita' puo' avere **o** un main intent **o**
    un reaction intent (non entrambi contemporaneamente) per evitare
    ambiguita' di budget. La ri-dichiarazione latest-wins (come
    ``declare_intent``) azzera il precedente.

    Raises:
        ValueError: se la fase non e' ``'planning'``, se l'evento non e'
            tra ``SUPPORTED_REACTION_EVENTS``, o se il payload type non
            e' tra ``SUPPORTED_REACTION_TYPES``.
        KeyError: se ``unit_id`` non esiste nello state.
    """

    phase = state.get("round_phase")
    if phase not in (PHASE_PLANNING, None):
        raise ValueError(
            f"declare_reaction richiede round_phase {PHASE_PLANNING!r}, "
            f"trovato {phase!r}"
        )
    if _find_unit(state, unit_id) is None:
        raise KeyError(f"unit_id non trovato nello state: {unit_id}")
    event = str(trigger.get("event", ""))
    if event not in SUPPORTED_REACTION_EVENTS:
        raise ValueError(
            f"reaction trigger event non supportato: {event!r} "
            f"(supportati: {sorted(SUPPORTED_REACTION_EVENTS)})"
        )
    payload_type = str(reaction_payload.get("type", ""))
    if payload_type not in SUPPORTED_REACTION_TYPES:
        raise ValueError(
            f"reaction payload type non supportato: {payload_type!r} "
            f"(supportati: {sorted(SUPPORTED_REACTION_TYPES)})"
        )

    next_state = copy.deepcopy(state)
    intents = [
        dict(i)
        for i in next_state.get("pending_intents", [])
        if str(i.get("unit_id", "")) != unit_id
    ]
    source_filter = trigger.get("source_any_of")
    normalised_trigger = {
        "event": event,
        "source_any_of": (
            list(source_filter) if isinstance(source_filter, (list, tuple)) else None
        ),
    }
    intents.append(
        {
            "unit_id": unit_id,
            "reaction_trigger": normalised_trigger,
            "reaction_payload": dict(reaction_payload),
        }
    )
    next_state["pending_intents"] = intents
    if phase is None:
        next_state["round_phase"] = PHASE_PLANNING
    return {"next_state": next_state}


def _is_reaction_intent(intent: Mapping[str, Any]) -> bool:
    """Vero se l'intent ha un ``reaction_trigger``, altrimenti falso."""

    return bool(intent.get("reaction_trigger"))


def _partition_intents(
    state: Mapping[str, Any],
) -> tuple:
    """Separa ``pending_intents`` in (main_intents, reactions_by_unit_id).

    ``reactions_by_unit_id`` mappa l'unit_id della reaction al dict
    completo dell'intent (copia). ``main_intents`` e' la lista di
    intent "normali" da mettere nella resolution queue. Il partizionamento
    e' puro e non muta lo state.
    """

    main_intents: List[Mapping[str, Any]] = []
    reactions_by_unit: Dict[str, Dict[str, Any]] = {}
    for intent in state.get("pending_intents", []):
        if _is_reaction_intent(intent):
            uid = str(intent.get("unit_id", ""))
            if uid:
                reactions_by_unit[uid] = dict(intent)
        else:
            main_intents.append(intent)
    return main_intents, reactions_by_unit


def _match_reaction_for_attack(
    reactions_by_unit: Mapping[str, Dict[str, Any]],
    target_id: str,
    attacker_id: str,
) -> Optional[Dict[str, Any]]:
    """Trova una reaction intent del target che matchi l'evento 'attacked'.

    Filtri:
    - target deve avere una reaction non ancora consumata
    - ``reaction_trigger.event`` deve essere ``'attacked'``
    - ``reaction_trigger.source_any_of`` deve essere None/vuoto oppure
      contenere ``attacker_id``

    Ritorna l'entry (mutabile) se matcha, altrimenti None. Il caller
    e' responsabile di marcarlo come consumato (``_consumed=True``).
    """

    entry = reactions_by_unit.get(target_id)
    if entry is None:
        return None
    if entry.get("_consumed"):
        return None
    trigger = entry.get("reaction_trigger", {})
    if trigger.get("event") != "attacked":
        return None
    source_filter = trigger.get("source_any_of")
    if source_filter and attacker_id not in source_filter:
        return None
    return entry


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


def build_resolution_queue(
    state: Mapping[str, Any],
    speed_table: Optional[Mapping[str, int]] = None,
) -> List[Dict[str, Any]]:
    """Produce la queue di risoluzione ordinata dagli intents committed.

    Ordinamento:
    1. ``priority`` decrescente (alto = risolve prima)
    2. ``unit_id`` alfabetico (tiebreak deterministico)

    Intents per unita' non trovate nello state sono silenziosamente
    ignorati (difesa contro state drift). Le **reaction intents** sono
    escluse dalla main queue — vengono trattate come interrupt da
    ``resolve_round`` solo se il trigger matcha.

    ``speed_table`` opzionale per override della tabella ACTION_SPEED.

    Returns:
        Lista di dict ``{unit_id, action, priority}``.
    """

    units = {str(u.get("id", "")): u for u in state.get("units", [])}
    queue: List[Dict[str, Any]] = []
    for intent in state.get("pending_intents", []):
        if _is_reaction_intent(intent):
            continue
        uid = str(intent.get("unit_id", ""))
        unit = units.get(uid)
        if unit is None:
            continue
        action = intent.get("action", {})
        priority = compute_resolve_priority(unit, action, speed_table=speed_table)
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
    _, reactions_by_unit = _partition_intents(next_state)
    turn_log_entries: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    reactions_triggered: List[Dict[str, Any]] = []

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

        # Reaction injection (follow-up #1 + #3): se il target ha una
        # reaction intent con trigger="attacked" che matcha l'attaccante
        # e non e' ancora stata consumata, iniettiamo parry_response
        # nell'action dell'attaccante. Il resolver atomico gestira'
        # la pipeline parry come in ogni altra action con parry_response.
        if action_type == "attack" and target_id:
            matched = _match_reaction_for_attack(
                reactions_by_unit, str(target_id), str(uid)
            )
            if matched is not None:
                payload = matched.get("reaction_payload", {})
                if payload.get("type") == "parry":
                    # Clona l'action per non mutare l'entry nella queue
                    action = dict(action)
                    action["parry_response"] = {
                        "attempt": True,
                        "parry_bonus": int(payload.get("parry_bonus", 0)),
                    }
                    matched["_consumed"] = True
                    reactions_triggered.append(
                        {
                            "target_unit_id": str(target_id),
                            "attacker_unit_id": str(uid),
                            "reaction_payload": dict(payload),
                        }
                    )

        result = resolve_action(next_state, action, catalog, rng)
        next_state = result["next_state"]
        turn_log_entries.append(result["turn_log_entry"])

    next_state["round_phase"] = PHASE_RESOLVED
    next_state["pending_intents"] = []
    return {
        "next_state": next_state,
        "turn_log_entries": turn_log_entries,
        "resolution_queue": queue,
        "reactions_triggered": reactions_triggered,
        "skipped": skipped,
    }


def preview_round(
    state: Mapping[str, Any],
    catalog: Mapping[str, Any],
    rng: Callable[[], float],
) -> Dict[str, Any]:
    """Simula ``resolve_round`` su una deep copy, ritorna l'esito atteso.

    Questa e' la funzione di "what-if" per la UI e per il client che
    vuole mostrare al player l'outcome probabile del round corrente
    senza mai toccare lo stato canonico ne' consumare il rng canonico.

    Requisiti sul ``state``:

    - ``round_phase`` deve essere ``'planning'`` o ``'committed'``. Se
      ``'planning'``, la preview auto-committa sulla deep copy prima di
      chiamare ``resolve_round``. Se ``'committed'``, procede direttamente.
    - Stati ``'resolving'`` / ``'resolved'`` / altro → ``ValueError``.

    Il ``state`` di input **non viene mutato**: il caller puo' continuare
    a dichiarare intents come se la preview non fosse avvenuta.

    Il ``rng`` passato deve essere un generatore **dedicato alla preview**
    (es. namespaced_rng con namespace diverso dal canonical). Il caller
    e' responsabile di non riusare il rng canonico per la preview — questa
    funzione non prova a isolarlo internamente, per mantenere il contratto
    di purezza.

    Returns:
        Stessa shape di ``resolve_round``:
        ``{next_state, turn_log_entries, resolution_queue, skipped}``.
        Il ``next_state`` ritornato rappresenta "come sarebbe lo stato
        se il round fosse stato risolto", utile per UI previews.

    Raises:
        ValueError: se ``round_phase`` non e' planning o committed.
    """

    phase = state.get("round_phase")
    if phase not in (PHASE_PLANNING, PHASE_COMMITTED, None):
        raise ValueError(
            f"preview_round richiede round_phase in "
            f"{{{PHASE_PLANNING!r}, {PHASE_COMMITTED!r}}}, trovato {phase!r}"
        )
    preview_state = copy.deepcopy(state)
    if phase in (PHASE_PLANNING, None):
        # Se non c'e' mai stato un begin_round, trattiamo lo stato come
        # planning implicito (pending_intents assenti → queue vuota).
        if phase is None:
            preview_state["round_phase"] = PHASE_PLANNING
            preview_state.setdefault("pending_intents", [])
        preview_state = commit_round(preview_state)["next_state"]
    return resolve_round(preview_state, catalog, rng)


__all__ = [
    "ACTION_SPEED",
    "DEFAULT_ACTION_SPEED",
    "DEFAULT_ACTION_SPEED_PATH",
    "PHASE_COMMITTED",
    "PHASE_PLANNING",
    "PHASE_RESOLVED",
    "PHASE_RESOLVING",
    "SUPPORTED_REACTION_EVENTS",
    "SUPPORTED_REACTION_TYPES",
    "VALID_PHASES",
    "action_speed",
    "begin_round",
    "build_resolution_queue",
    "clear_intent",
    "commit_round",
    "compute_resolve_priority",
    "declare_intent",
    "declare_reaction",
    "load_action_speed_table",
    "preview_round",
    "reload_action_speed_table",
    "resolve_round",
]
