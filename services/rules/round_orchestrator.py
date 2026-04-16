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
from .resolver import apply_status, begin_turn, resolve_action

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

#: Eventi che possono triggerare una reaction.
#:
#: - ``'attacked'`` (pre-hit): triggerato **prima** del damage step quando
#:   l'unita' e' bersaglio di un attack. Abilita parry contestata.
#: - ``'damaged'`` (post-hit): triggerato **dopo** il damage step, se
#:   l'unita' ha subito ``damage_applied > 0``. Abilita ``trigger_status``
#:   per applicare uno status effect in risposta al danno.
#: - ``'moved_adjacent'`` (post-move): triggerato dopo che un'unita'
#:   completa un ``action.type == "move"``. Non usa semantica di distanza
#:   (il rules engine non tracka grid positions); si affida al filtro
#:   ``reaction_trigger.source_any_of`` per selezionare quali unita'
#:   moventi attivano la reaction. Semantica: "quando X si muove".
#: - ``'ability_used'`` (post-ability): triggerato dopo che un'unita'
#:   esegue un ``action.type == "ability"``. Context include ``ability_id``.
#: - ``'healed'`` (post-heal): triggerato dopo che un'unita' esegue un
#:   ``action.type == "heal"`` che risulta in ``healing_applied > 0``.
#:   Il ``source_id`` e' chi ha curato (l'actor), il ``target_id`` del
#:   match e' il ricevente (il healed target). Context include ``healing``
#:   (quantita' applicata).
#:
#: Future estensioni: ``'status_applied'``.
SUPPORTED_REACTION_EVENTS = frozenset(
    {"attacked", "damaged", "moved_adjacent", "ability_used", "healed"}
)

#: Tipi di payload per reaction.
#:
#: - ``'parry'``: parry contestata d20 con bonus difensivo, usata solo con
#:   event ``'attacked'``. Richiede ``parry_bonus``. Inietta
#:   ``parry_response`` nell'action dell'attaccante.
#: - ``'trigger_status'``: applica uno status effect a un'unita' quando
#:   la reaction e' triggerata. Usata tipicamente con event ``'damaged'``.
#:   Richiede ``status_id`` (uno dei 5 status supportati: bleeding,
#:   fracture, disorient, rage, panic), ``duration``, ``intensity``, e
#:   ``target`` opzionale (``'attacker'`` default, o ``'self'``).
#: - ``'counter'``: contrattacco libero post-hit. Triggerato solo su event
#:   ``'damaged'``. Costruisce al volo una synthetic attack action con
#:   actor = reaction owner, target = attaccante originale, e la esegue
#:   via ``resolve_action``. Richiede ``counter_dice`` (dict
#:   ``{count, sides, modifier}``), ``counter_channel`` opzionale,
#:   ``counter_ap_cost`` opzionale (default 0). Anti-recursion: la
#:   synthetic action porta flag ``_is_counter=True`` e non ri-triggera
#:   damaged-reactions a cascata (max depth = 1).
#: - ``'overwatch'``: attacco opportunistico su movimento. Triggerato solo
#:   su event ``'moved_adjacent'``. Costruisce synthetic attack con
#:   actor = reaction owner (listener), target = unita' che si e' mossa.
#:   Richiede ``overwatch_dice``, campi opzionali ``overwatch_channel``,
#:   ``overwatch_ap_cost`` (default 0). Anti-recursion: flag
#:   ``_is_overwatch=True``, non triggera moved_adjacent-reactions.
SUPPORTED_REACTION_TYPES = frozenset(
    {"parry", "trigger_status", "counter", "overwatch"}
)


# ------------------------------------------------------------------
# Trigger predicates DSL (follow-up #5)
# ------------------------------------------------------------------

#: Operatori supportati dal mini-DSL dei predicati.
SUPPORTED_PREDICATE_OPS = frozenset({"==", "!=", ">", ">=", "<", "<="})

#: Fields supportati dal mini-DSL dei predicati, con il relativo tipo.
#: Disponibilita' dipende dal context dell'evento (vedi ``_build_context_for_event``).
SUPPORTED_PREDICATE_FIELDS = frozenset(
    {
        "damage",  # damage_applied (solo evento 'damaged')
        "healing",  # healing_applied (solo evento 'healed')
        "hp_pct",  # hp_current / hp_max del reaction owner
        "hp_current",
        "hp_max",
        "stress",  # float 0-1
        "source_tier",  # tier dell'attore che ha scatenato l'evento
        "actor_tier",  # tier del reaction owner
    }
)


def _evaluate_predicates(
    predicates: Optional[List[Dict[str, Any]]],
    context: Mapping[str, Any],
) -> bool:
    """Valuta una lista di predicati in AND contro un context dict.

    - Lista vuota o None → ritorna True (sempre match, no filtro).
    - Field non presente nel context → predicato fallisce (fail-safe).
    - Operatore o field non supportato → predicato fallisce (fail-safe,
      validation rigorosa avviene in ``declare_reaction``).
    - Tutti i predicati devono essere True (AND logic).

    Funzione pura, no side effect.
    """

    if not predicates:
        return True
    for pred in predicates:
        if not isinstance(pred, Mapping):
            return False
        op = pred.get("op")
        field = pred.get("field")
        value = pred.get("value")
        if op not in SUPPORTED_PREDICATE_OPS:
            return False
        if field not in SUPPORTED_PREDICATE_FIELDS:
            return False
        if field not in context:
            return False
        ctx_val = context[field]
        try:
            if op == "==":
                if not (ctx_val == value):
                    return False
            elif op == "!=":
                if not (ctx_val != value):
                    return False
            elif op == ">":
                if not (ctx_val > value):
                    return False
            elif op == ">=":
                if not (ctx_val >= value):
                    return False
            elif op == "<":
                if not (ctx_val < value):
                    return False
            elif op == "<=":
                if not (ctx_val <= value):
                    return False
        except (TypeError, ValueError):
            return False
    return True


def _build_context_for_event(
    event: str,
    reaction_owner: Mapping[str, Any],
    source_unit: Optional[Mapping[str, Any]] = None,
    damage_applied: int = 0,
    healing_applied: int = 0,
    action: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Costruisce il context dict per la valutazione dei predicati.

    Campi sempre presenti se disponibili:
    - ``hp_current``, ``hp_max``, ``hp_pct``, ``stress`` del reaction owner
    - ``actor_tier`` del reaction owner
    - ``source_tier`` dell'unita' che ha scatenato l'evento (se presente)

    Campi context-specific:
    - ``damage`` solo per evento ``'damaged'``
    - ``healing`` solo per evento ``'healed'``
    """

    hp = reaction_owner.get("hp") or {}
    hp_current = int(hp.get("current", 0))
    hp_max = int(hp.get("max", 1)) or 1
    context: Dict[str, Any] = {
        "hp_current": hp_current,
        "hp_max": hp_max,
        "hp_pct": hp_current / hp_max if hp_max > 0 else 0.0,
        "stress": float(reaction_owner.get("stress", 0.0)),
        "actor_tier": int(reaction_owner.get("tier", 1)),
    }
    if source_unit is not None:
        context["source_tier"] = int(source_unit.get("tier", 1))
    if event == "damaged":
        context["damage"] = int(damage_applied)
    if event == "healed":
        context["healing"] = int(healing_applied)
    return context


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
    "heal": -1,
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
    - **decrement reaction cooldown** di 1 (min 0) se presente

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
    # Decrement reaction cooldown per ogni unit (min 0)
    for unit in next_state.get("units", []):
        cd = int(unit.get("reaction_cooldown_remaining", 0))
        if cd > 0:
            unit["reaction_cooldown_remaining"] = cd - 1
    next_state["round_phase"] = PHASE_PLANNING
    next_state["pending_intents"] = []
    # Timer planning phase: se planning_deadline_ms e' configurato nello
    # state, begin_round registra il timestamp di inizio planning. Il
    # caller (session engine) puo' usare planning_started_at per enforce
    # il timeout e auto-committare quando scade. Il rules engine Python
    # non fa enforcement diretto (e' il session engine Node che gestisce
    # il timer via setTimeout / setInterval).
    deadline = state.get("planning_deadline_ms")
    if deadline is not None and int(deadline) > 0:
        next_state["planning_deadline_ms"] = int(deadline)
        import time

        next_state["planning_started_at"] = int(time.time() * 1000)
    return {
        "next_state": next_state,
        "expired": expired_all,
        "bleeding_total": bleeding_total,
    }


def is_planning_expired(state: Mapping[str, Any]) -> bool:
    """Controlla se il timer della planning phase e' scaduto.

    Ritorna True se:
    - ``planning_deadline_ms`` e' presente e > 0
    - ``planning_started_at`` e' presente
    - il tempo trascorso supera ``planning_deadline_ms``

    Il caller (session engine Node) usa questa funzione per decidere se
    auto-committare il round quando il timer scade. Il rules engine
    Python non auto-committa: e' responsabilita' del caller.
    """

    deadline = state.get("planning_deadline_ms")
    started = state.get("planning_started_at")
    if deadline is None or started is None:
        return False
    import time

    now = int(time.time() * 1000)
    return (now - int(started)) >= int(deadline)


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
            tra ``SUPPORTED_REACTION_EVENTS``, se il payload type non
            e' tra ``SUPPORTED_REACTION_TYPES``, o se i predicates
            contengono operatori/fields non supportati.
        KeyError: se ``unit_id`` non esiste nello state.

    Nota cooldown: se l'unit ha ``reaction_cooldown_remaining > 0``,
    la declare_reaction esegue un **silent skip** (ritorna lo state
    invariato senza eccezioni). Il client puo' verificare lo stato
    del cooldown prima di chiamare declare_reaction via
    ``unit["reaction_cooldown_remaining"]``.
    """

    phase = state.get("round_phase")
    if phase not in (PHASE_PLANNING, None):
        raise ValueError(
            f"declare_reaction richiede round_phase {PHASE_PLANNING!r}, "
            f"trovato {phase!r}"
        )
    unit_ref = _find_unit(state, unit_id)
    if unit_ref is None:
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

    # Validazione predicates (se presenti)
    predicates_raw = trigger.get("predicates")
    normalised_predicates: List[Dict[str, Any]] = []
    if predicates_raw:
        if not isinstance(predicates_raw, list):
            raise ValueError(
                f"reaction_trigger.predicates deve essere una lista, "
                f"trovato {type(predicates_raw).__name__}"
            )
        for pred in predicates_raw:
            if not isinstance(pred, Mapping):
                raise ValueError(
                    f"predicate deve essere un dict, trovato {type(pred).__name__}"
                )
            op = pred.get("op")
            field = pred.get("field")
            if op not in SUPPORTED_PREDICATE_OPS:
                raise ValueError(
                    f"predicate op non supportato: {op!r} "
                    f"(supportati: {sorted(SUPPORTED_PREDICATE_OPS)})"
                )
            if field not in SUPPORTED_PREDICATE_FIELDS:
                raise ValueError(
                    f"predicate field non supportato: {field!r} "
                    f"(supportati: {sorted(SUPPORTED_PREDICATE_FIELDS)})"
                )
            if "value" not in pred:
                raise ValueError("predicate richiede chiave 'value'")
            normalised_predicates.append(
                {"op": op, "field": field, "value": pred["value"]}
            )

    # Silent skip se l'unit e' in cooldown
    if int(unit_ref.get("reaction_cooldown_remaining", 0)) > 0:
        return {"next_state": copy.deepcopy(state)}

    # Validazione cooldown_rounds (int non-negative)
    cooldown_rounds = int(trigger.get("cooldown_rounds", 0))
    if cooldown_rounds < 0:
        raise ValueError(
            f"reaction_trigger.cooldown_rounds deve essere >= 0, "
            f"trovato {cooldown_rounds}"
        )

    next_state = copy.deepcopy(state)
    intents = [
        dict(i)
        for i in next_state.get("pending_intents", [])
        if str(i.get("unit_id", "")) != unit_id
    ]
    source_filter = trigger.get("source_any_of")
    normalised_trigger: Dict[str, Any] = {
        "event": event,
        "source_any_of": (
            list(source_filter) if isinstance(source_filter, (list, tuple)) else None
        ),
        "cooldown_rounds": cooldown_rounds,
    }
    if normalised_predicates:
        normalised_trigger["predicates"] = normalised_predicates
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


def _build_synthetic_counter_action(
    counter_actor_id: str,
    attacker_id: str,
    payload: Mapping[str, Any],
    turn: int,
) -> Dict[str, Any]:
    """Costruisce una synthetic ``attack`` action per una reaction
    ``counter``.

    L'action porta flag ``_is_counter=True`` per marcare esplicitamente
    che e' il risultato di una reaction e non deve ri-triggerare altre
    reactions (anti-recursion). Il ``resolve_action`` del resolver
    atomico ignora questo flag (non e' nel contratto), ma l'orchestrator
    lo usa per decidere se fare scan di reactions post-execution.
    """

    dice = payload.get("counter_dice") or {"count": 1, "sides": 6, "modifier": 0}
    return {
        "id": f"counter-{counter_actor_id}-{turn}",
        "type": "attack",
        "actor_id": counter_actor_id,
        "target_id": attacker_id,
        "ability_id": None,
        "ap_cost": int(payload.get("counter_ap_cost", 0)),
        "channel": payload.get("counter_channel"),
        "damage_dice": {
            "count": int(dice.get("count", 1)),
            "sides": int(dice.get("sides", 6)),
            "modifier": int(dice.get("modifier", 0)),
        },
        "_is_counter": True,
    }


def _build_synthetic_overwatch_action(
    listener_id: str,
    mover_id: str,
    payload: Mapping[str, Any],
    turn: int,
) -> Dict[str, Any]:
    """Costruisce una synthetic ``attack`` action per una reaction
    ``overwatch``.

    Analogo a ``_build_synthetic_counter_action`` ma con flag
    ``_is_overwatch=True``. Triggerato su evento ``moved_adjacent``.
    """

    dice = payload.get("overwatch_dice") or {"count": 1, "sides": 6, "modifier": 0}
    return {
        "id": f"overwatch-{listener_id}-{turn}",
        "type": "attack",
        "actor_id": listener_id,
        "target_id": mover_id,
        "ability_id": None,
        "ap_cost": int(payload.get("overwatch_ap_cost", 0)),
        "channel": payload.get("overwatch_channel"),
        "damage_dice": {
            "count": int(dice.get("count", 1)),
            "sides": int(dice.get("sides", 6)),
            "modifier": int(dice.get("modifier", 0)),
        },
        "_is_overwatch": True,
    }


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


def _match_reaction_for_event(
    reactions_by_unit: Mapping[str, Dict[str, Any]],
    event: str,
    target_id: str,
    source_id: str,
    context: Optional[Mapping[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Trova una reaction intent del target che matchi un dato evento.

    Filtri (in ordine):
    - target deve avere una reaction non ancora consumata
    - ``reaction_trigger.event`` deve essere uguale a ``event``
    - ``reaction_trigger.source_any_of`` deve essere None/vuoto oppure
      contenere ``source_id``
    - ``reaction_trigger.predicates`` (se presenti) devono valutare
      True contro il ``context`` passato (``_evaluate_predicates``)

    ``event`` puo' essere uno di ``SUPPORTED_REACTION_EVENTS``:

    - ``'attacked'``: triggerato pre-hit, ``source_id`` e' l'attaccante
    - ``'damaged'``: triggerato post-hit, ``source_id`` e' l'attaccante
      che ha inflitto il danno
    - ``'moved_adjacent'``: triggerato post-move, ``source_id`` e'
      l'unita' che si e' mossa
    - ``'ability_used'``: triggerato post-ability, ``source_id`` e'
      l'unita' che ha usato l'ability

    ``context`` e' un dict con i campi disponibili per la valutazione
    dei predicates (vedi ``_build_context_for_event``). Se None, i
    predicates eventuali sono considerati falliti (fail-safe).

    Ritorna l'entry (mutabile) se matcha, altrimenti None. Il caller
    e' responsabile di marcarlo come consumato (``_consumed=True``)
    e di settare il cooldown su ``unit.reaction_cooldown_remaining``.
    """

    entry = reactions_by_unit.get(target_id)
    if entry is None:
        return None
    if entry.get("_consumed"):
        return None
    trigger = entry.get("reaction_trigger", {})
    if trigger.get("event") != event:
        return None
    source_filter = trigger.get("source_any_of")
    if source_filter and source_id not in source_filter:
        return None
    predicates = trigger.get("predicates")
    if predicates:
        if context is None:
            return None
        if not _evaluate_predicates(predicates, context):
            return None
    return entry


def _match_reaction_for_attack(
    reactions_by_unit: Mapping[str, Dict[str, Any]],
    target_id: str,
    attacker_id: str,
) -> Optional[Dict[str, Any]]:
    """Alias retrocompatibile per ``_match_reaction_for_event`` con
    ``event='attacked'``. Mantenuta per compatibilita' con test e con
    qualsiasi caller esterno che usi l'API precedente. La versione
    generalizzata ``_match_reaction_for_event`` e' preferita per codice
    nuovo.
    """

    return _match_reaction_for_event(
        reactions_by_unit, "attacked", target_id, attacker_id
    )


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

    def _find_unit_by_id(unit_id: str) -> Optional[Dict[str, Any]]:
        return next(
            (u for u in next_state.get("units", []) if u.get("id") == unit_id), None
        )

    def _set_cooldown_on_unit(unit_id: str, trigger: Mapping[str, Any]) -> None:
        cd = int(trigger.get("cooldown_rounds", 0))
        if cd > 0:
            unit = _find_unit_by_id(unit_id)
            if unit is not None:
                unit["reaction_cooldown_remaining"] = cd

    for entry in queue:
        uid = entry["unit_id"]
        action = entry["action"]
        actor = _find_unit_by_id(uid)
        if actor is None or int((actor.get("hp") or {}).get("current", 0)) <= 0:
            skipped.append({"unit_id": uid, "reason": "actor_dead", "action": dict(action)})
            continue
        # Target dead check: solo per action type con target obbligatorio
        action_type = action.get("type")
        target_id = action.get("target_id")
        if target_id and action_type in ("attack", "parry"):
            target = _find_unit_by_id(str(target_id))
            if target is None or int((target.get("hp") or {}).get("current", 0)) <= 0:
                skipped.append(
                    {"unit_id": uid, "reason": "target_dead", "action": dict(action)}
                )
                continue

        # Reaction injection pre-hit (follow-up #1 + #3): se il target ha
        # una reaction intent con trigger="attacked" che matcha l'attaccante,
        # iniettiamo parry_response nell'action. Context costruito dallo
        # stato PRE resolve_action per valutare predicates.
        if action_type == "attack" and target_id:
            target_unit_pre = _find_unit_by_id(str(target_id))
            if target_unit_pre is not None:
                ctx_attacked = _build_context_for_event(
                    event="attacked",
                    reaction_owner=target_unit_pre,
                    source_unit=actor,
                )
                matched = _match_reaction_for_event(
                    reactions_by_unit,
                    "attacked",
                    str(target_id),
                    str(uid),
                    context=ctx_attacked,
                )
                if matched is not None:
                    payload = matched.get("reaction_payload", {})
                    if payload.get("type") == "parry":
                        action = dict(action)
                        action["parry_response"] = {
                            "attempt": True,
                            "parry_bonus": int(payload.get("parry_bonus", 0)),
                        }
                        matched["_consumed"] = True
                        _set_cooldown_on_unit(
                            str(target_id), matched.get("reaction_trigger", {})
                        )
                        reactions_triggered.append(
                            {
                                "target_unit_id": str(target_id),
                                "attacker_unit_id": str(uid),
                                "event": "attacked",
                                "reaction_payload": dict(payload),
                            }
                        )

        result = resolve_action(next_state, action, catalog, rng)
        next_state = result["next_state"]
        turn_log_entries.append(result["turn_log_entry"])

        # Post-hit reaction injection (follow-up #5 — event 'damaged'):
        # Anti-recursion: synthetic counter/overwatch actions NON ri-triggerano
        # damaged-reactions (max depth = 1).
        damage_applied = int(result["turn_log_entry"].get("damage_applied", 0))
        if (
            damage_applied > 0
            and action_type == "attack"
            and target_id
            and not action.get("_is_counter")
            and not action.get("_is_overwatch")
        ):
            target_unit_post = _find_unit_by_id(str(target_id))
            if target_unit_post is not None:
                ctx_damaged = _build_context_for_event(
                    event="damaged",
                    reaction_owner=target_unit_post,
                    source_unit=_find_unit_by_id(str(uid)),
                    damage_applied=damage_applied,
                )
                dmg_matched = _match_reaction_for_event(
                    reactions_by_unit,
                    "damaged",
                    str(target_id),
                    str(uid),
                    context=ctx_damaged,
                )
                if dmg_matched is not None:
                    dmg_payload = dmg_matched.get("reaction_payload", {})
                    if dmg_payload.get("type") == "trigger_status":
                        status_target_side = str(dmg_payload.get("target", "attacker"))
                        status_target_id = (
                            str(uid) if status_target_side == "attacker" else str(target_id)
                        )
                        status_target_unit = _find_unit_by_id(status_target_id)
                        if status_target_unit is not None:
                            apply_status(
                                status_target_unit,
                                status_id=str(dmg_payload.get("status_id", "bleeding")),
                                duration=int(dmg_payload.get("duration", 1)),
                                intensity=int(dmg_payload.get("intensity", 1)),
                                source_unit_id=str(target_id),
                                source_action_id="reaction_damaged",
                            )
                            dmg_matched["_consumed"] = True
                            _set_cooldown_on_unit(
                                str(target_id),
                                dmg_matched.get("reaction_trigger", {}),
                            )
                            reactions_triggered.append(
                                {
                                    "target_unit_id": str(target_id),
                                    "attacker_unit_id": str(uid),
                                    "event": "damaged",
                                    "reaction_payload": dict(dmg_payload),
                                    "status_target_unit_id": status_target_id,
                                }
                            )
                    elif dmg_payload.get("type") == "counter":
                        # Counter: synthetic attack del target verso
                        # l'attaccante originale (uid). Esegue solo se
                        # l'attaccante e' ancora vivo post-main-hit.
                        attacker_unit = _find_unit_by_id(str(uid))
                        attacker_alive = (
                            attacker_unit is not None
                            and int(
                                (attacker_unit.get("hp") or {}).get("current", 0)
                            )
                            > 0
                        )
                        if attacker_alive:
                            counter_action = _build_synthetic_counter_action(
                                counter_actor_id=str(target_id),
                                attacker_id=str(uid),
                                payload=dmg_payload,
                                turn=int(next_state.get("turn", 1)),
                            )
                            counter_result = resolve_action(
                                next_state, counter_action, catalog, rng
                            )
                            next_state = counter_result["next_state"]
                            turn_log_entries.append(
                                counter_result["turn_log_entry"]
                            )
                            dmg_matched["_consumed"] = True
                            _set_cooldown_on_unit(
                                str(target_id),
                                dmg_matched.get("reaction_trigger", {}),
                            )
                            reactions_triggered.append(
                                {
                                    "target_unit_id": str(target_id),
                                    "attacker_unit_id": str(uid),
                                    "event": "damaged",
                                    "reaction_payload": dict(dmg_payload),
                                    "counter_damage_applied": int(
                                        counter_result["turn_log_entry"].get(
                                            "damage_applied", 0
                                        )
                                    ),
                                }
                            )

        # Post-move reaction injection (follow-up #4 — event 'moved_adjacent'):
        # triggerato dopo un action.type == 'move'. Non usa distanza, si
        # affida al source_any_of filter. Scan tutte le reactions pending
        # per trovare match (non solo quelle su un target specifico).
        if action_type == "move":
            for listener_uid, listener_entry in reactions_by_unit.items():
                if listener_entry.get("_consumed"):
                    continue
                listener_unit = _find_unit_by_id(listener_uid)
                if listener_unit is None:
                    continue
                ctx_moved = _build_context_for_event(
                    event="moved_adjacent",
                    reaction_owner=listener_unit,
                    source_unit=_find_unit_by_id(str(uid)),
                )
                matched_move = _match_reaction_for_event(
                    reactions_by_unit,
                    "moved_adjacent",
                    listener_uid,
                    str(uid),
                    context=ctx_moved,
                )
                if matched_move is not None:
                    move_payload = matched_move.get("reaction_payload", {})
                    if move_payload.get("type") == "trigger_status":
                        status_target_side = str(move_payload.get("target", "attacker"))
                        status_target_id = (
                            str(uid) if status_target_side == "attacker" else listener_uid
                        )
                        status_target_unit = _find_unit_by_id(status_target_id)
                        if status_target_unit is not None:
                            apply_status(
                                status_target_unit,
                                status_id=str(move_payload.get("status_id", "bleeding")),
                                duration=int(move_payload.get("duration", 1)),
                                intensity=int(move_payload.get("intensity", 1)),
                                source_unit_id=listener_uid,
                                source_action_id="reaction_moved_adjacent",
                            )
                            matched_move["_consumed"] = True
                            _set_cooldown_on_unit(
                                listener_uid,
                                matched_move.get("reaction_trigger", {}),
                            )
                            reactions_triggered.append(
                                {
                                    "target_unit_id": listener_uid,
                                    "attacker_unit_id": str(uid),
                                    "event": "moved_adjacent",
                                    "reaction_payload": dict(move_payload),
                                    "status_target_unit_id": status_target_id,
                                }
                            )
                    elif move_payload.get("type") == "overwatch":
                        # Overwatch: synthetic attack del listener verso
                        # il mover. Esegue solo se il mover e' ancora vivo.
                        mover_unit = _find_unit_by_id(str(uid))
                        mover_alive = (
                            mover_unit is not None
                            and int((mover_unit.get("hp") or {}).get("current", 0))
                            > 0
                        )
                        if mover_alive:
                            overwatch_action = _build_synthetic_overwatch_action(
                                listener_id=listener_uid,
                                mover_id=str(uid),
                                payload=move_payload,
                                turn=int(next_state.get("turn", 1)),
                            )
                            ow_result = resolve_action(
                                next_state, overwatch_action, catalog, rng
                            )
                            next_state = ow_result["next_state"]
                            turn_log_entries.append(ow_result["turn_log_entry"])
                            matched_move["_consumed"] = True
                            _set_cooldown_on_unit(
                                listener_uid,
                                matched_move.get("reaction_trigger", {}),
                            )
                            reactions_triggered.append(
                                {
                                    "target_unit_id": listener_uid,
                                    "attacker_unit_id": str(uid),
                                    "event": "moved_adjacent",
                                    "reaction_payload": dict(move_payload),
                                    "overwatch_damage_applied": int(
                                        ow_result["turn_log_entry"].get(
                                            "damage_applied", 0
                                        )
                                    ),
                                }
                            )

        # Post-ability reaction injection (follow-up #4 — event 'ability_used'):
        if action_type == "ability":
            for listener_uid, listener_entry in reactions_by_unit.items():
                if listener_entry.get("_consumed"):
                    continue
                listener_unit = _find_unit_by_id(listener_uid)
                if listener_unit is None:
                    continue
                ctx_ability = _build_context_for_event(
                    event="ability_used",
                    reaction_owner=listener_unit,
                    source_unit=_find_unit_by_id(str(uid)),
                )
                matched_ab = _match_reaction_for_event(
                    reactions_by_unit,
                    "ability_used",
                    listener_uid,
                    str(uid),
                    context=ctx_ability,
                )
                if matched_ab is not None:
                    ab_payload = matched_ab.get("reaction_payload", {})
                    if ab_payload.get("type") == "trigger_status":
                        status_target_side = str(ab_payload.get("target", "attacker"))
                        status_target_id = (
                            str(uid) if status_target_side == "attacker" else listener_uid
                        )
                        status_target_unit = _find_unit_by_id(status_target_id)
                        if status_target_unit is not None:
                            apply_status(
                                status_target_unit,
                                status_id=str(ab_payload.get("status_id", "bleeding")),
                                duration=int(ab_payload.get("duration", 1)),
                                intensity=int(ab_payload.get("intensity", 1)),
                                source_unit_id=listener_uid,
                                source_action_id="reaction_ability_used",
                            )
                            matched_ab["_consumed"] = True
                            _set_cooldown_on_unit(
                                listener_uid,
                                matched_ab.get("reaction_trigger", {}),
                            )
                            reactions_triggered.append(
                                {
                                    "target_unit_id": listener_uid,
                                    "attacker_unit_id": str(uid),
                                    "event": "ability_used",
                                    "reaction_payload": dict(ab_payload),
                                    "status_target_unit_id": status_target_id,
                                    "ability_id": action.get("ability_id"),
                                }
                            )

        # Post-heal reaction injection (evento 'healed'):
        # Triggerato dopo action.type == 'heal' che risulta in
        # healing_applied > 0. source = caster (uid), heal_target =
        # receiver (action.target_id). Scan di tutte le reactions pending
        # per match via source_any_of filter + predicates.
        healing_applied = int(result["turn_log_entry"].get("healing_applied", 0))
        heal_target_id = action.get("target_id")
        if action_type == "heal" and healing_applied > 0 and heal_target_id:
            for listener_uid, listener_entry in reactions_by_unit.items():
                if listener_entry.get("_consumed"):
                    continue
                listener_unit = _find_unit_by_id(listener_uid)
                if listener_unit is None:
                    continue
                ctx_healed = _build_context_for_event(
                    event="healed",
                    reaction_owner=listener_unit,
                    source_unit=_find_unit_by_id(str(uid)),
                    healing_applied=healing_applied,
                )
                matched_heal = _match_reaction_for_event(
                    reactions_by_unit,
                    "healed",
                    listener_uid,
                    str(uid),
                    context=ctx_healed,
                )
                if matched_heal is not None:
                    heal_payload = matched_heal.get("reaction_payload", {})
                    if heal_payload.get("type") == "trigger_status":
                        status_target_side = str(heal_payload.get("target", "attacker"))
                        status_target_id = (
                            str(uid) if status_target_side == "attacker" else listener_uid
                        )
                        status_target_unit = _find_unit_by_id(status_target_id)
                        if status_target_unit is not None:
                            apply_status(
                                status_target_unit,
                                status_id=str(heal_payload.get("status_id", "bleeding")),
                                duration=int(heal_payload.get("duration", 1)),
                                intensity=int(heal_payload.get("intensity", 1)),
                                source_unit_id=listener_uid,
                                source_action_id="reaction_healed",
                            )
                            matched_heal["_consumed"] = True
                            _set_cooldown_on_unit(
                                listener_uid,
                                matched_heal.get("reaction_trigger", {}),
                            )
                            reactions_triggered.append(
                                {
                                    "target_unit_id": listener_uid,
                                    "attacker_unit_id": str(uid),
                                    "event": "healed",
                                    "reaction_payload": dict(heal_payload),
                                    "status_target_unit_id": status_target_id,
                                    "heal_target_unit_id": str(heal_target_id),
                                    "healing_applied": healing_applied,
                                }
                            )

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
    "SUPPORTED_PREDICATE_FIELDS",
    "SUPPORTED_PREDICATE_OPS",
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
    "is_planning_expired",
    "load_action_speed_table",
    "preview_round",
    "reload_action_speed_table",
    "resolve_round",
]
