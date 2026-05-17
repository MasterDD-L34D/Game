// Round orchestrator (JS port della reference Python).
//
// Porta il loop shared-planning -> commit -> ordered-resolution sopra
// un `resolveAction` atomico iniettato dal caller. Mirror della
// ex-`services/rules/round_orchestrator.py` del rules engine Python
// (rimosso PR #2059, ADR-2026-04-19 Phase 3). Contratto semantico canonical
// ora vive qui in JS.
//
// Funzioni pubbliche:
//   - beginRound(state) -> { nextState, expired, bleedingTotal }
//   - declareIntent(state, unitId, action) -> { nextState }
//   - clearIntent(state, unitId) -> { nextState }
//   - declareReaction(state, unitId, payload, trigger) -> { nextState }
//   - commitRound(state) -> { nextState }
//   - buildResolutionQueue(state, speedTable?) -> queue
//   - resolveRound(state, catalog, rng) -> { nextState, turnLogEntries,
//                                             resolutionQueue,
//                                             reactionsTriggered, skipped }
//   - previewRound(state, catalog, rng) -> same as resolveRound
//   - computeResolvePriority(unit, action, speedTable?) -> int
//   - createRoundOrchestrator({ resolveAction, actionSpeedTable, catalog? })
//     -> factory con closure-scoped deps (pattern createSistemaTurnRunner).
//
// Pure first: tutte le funzioni top-level sono pure e non dipendono
// da closure o module-level state. La factory esiste solo per comodita'
// del caller che vuole wirare `resolveAction` una sola volta.
//
// Deep copy via `structuredClone` (Node 17+, il repo richiede 22.19.0).
// Mai muta lo state di input; ritorna sempre `nextState` (copia).
//
// Determinismo:
//   - Stessi intents + stesso rng + stesso catalog -> stesso nextState.
//   - Ordinamento resolution queue: priority desc, unitId asc (alfabetico).
//   - Reaction matching: prima reaction non consumata per (targetId, event).
//   - Nessun uso di Date.now/Math.random: il rng viene dal caller.
//
// Contratto semantico: vedi `docs/combat/round-loop.md` §3 (round lifecycle)
// + §4 (CombatState). Reference storica ex-Python rimossa PR #2059.

'use strict';

// ─────────────────────────────────────────────────────────────────
// Phase constants
// ─────────────────────────────────────────────────────────────────

const PHASE_PLANNING = 'planning';
const PHASE_COMMITTED = 'committed';
const PHASE_RESOLVING = 'resolving';
const PHASE_RESOLVED = 'resolved';

const VALID_PHASES = new Set([PHASE_PLANNING, PHASE_COMMITTED, PHASE_RESOLVING, PHASE_RESOLVED]);

// ─────────────────────────────────────────────────────────────────
// Reaction events + payload types
// ─────────────────────────────────────────────────────────────────

const SUPPORTED_REACTION_EVENTS = new Set([
  'attacked',
  'damaged',
  'moved_adjacent',
  'ability_used',
  'healed',
]);

const SUPPORTED_REACTION_TYPES = new Set(['parry', 'trigger_status', 'counter', 'overwatch']);

// ─────────────────────────────────────────────────────────────────
// Predicates DSL
// ─────────────────────────────────────────────────────────────────

const SUPPORTED_PREDICATE_OPS = new Set(['==', '!=', '>', '>=', '<', '<=']);

const SUPPORTED_PREDICATE_FIELDS = new Set([
  'damage',
  'healing',
  'hp_pct',
  'hp_current',
  'hp_max',
  'stress',
  'source_tier',
  'actor_tier',
]);

// ─────────────────────────────────────────────────────────────────
// Action speed table
// ─────────────────────────────────────────────────────────────────

const DEFAULT_ACTION_SPEED = Object.freeze({
  defend: 2,
  parry: 2,
  attack: 0,
  ability: -1,
  heal: -1,
  move: -2,
});

// ─────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────

function _deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function _findUnit(state, unitId) {
  const units = (state && state.units) || [];
  for (const u of units) {
    if (String(u && u.id) === String(unitId)) {
      return u;
    }
  }
  return null;
}

function _isReactionIntent(intent) {
  return Boolean(intent && intent.reaction_trigger);
}

function _partitionIntents(state) {
  const mainIntents = [];
  const reactionsByUnit = {};
  const pending = (state && state.pending_intents) || [];
  for (const intent of pending) {
    if (_isReactionIntent(intent)) {
      const uid = String(intent.unit_id || '');
      if (uid) {
        reactionsByUnit[uid] = { ...intent };
      }
    } else {
      mainIntents.push(intent);
    }
  }
  return { mainIntents, reactionsByUnit };
}

// ─────────────────────────────────────────────────────────────────
// Predicates DSL evaluator
// ─────────────────────────────────────────────────────────────────

/**
 * Valuta una lista di predicati in AND contro un context dict.
 * - Lista vuota/undefined/null -> true (sempre match).
 * - Field non presente nel context -> false (fail-safe).
 * - Operatore/field non supportato -> false (la validazione rigorosa
 *   avviene in declareReaction).
 */
function evaluatePredicates(predicates, context) {
  if (!predicates || predicates.length === 0) {
    return true;
  }
  for (const pred of predicates) {
    if (!pred || typeof pred !== 'object') {
      return false;
    }
    const { op, field, value } = pred;
    if (!SUPPORTED_PREDICATE_OPS.has(op)) {
      return false;
    }
    if (!SUPPORTED_PREDICATE_FIELDS.has(field)) {
      return false;
    }
    if (!(field in context)) {
      return false;
    }
    const ctxVal = context[field];
    try {
      switch (op) {
        case '==':
          if (!(ctxVal === value)) return false;
          break;
        case '!=':
          if (!(ctxVal !== value)) return false;
          break;
        case '>':
          if (!(ctxVal > value)) return false;
          break;
        case '>=':
          if (!(ctxVal >= value)) return false;
          break;
        case '<':
          if (!(ctxVal < value)) return false;
          break;
        case '<=':
          if (!(ctxVal <= value)) return false;
          break;
        default:
          return false;
      }
    } catch (_e) {
      return false;
    }
  }
  return true;
}

/**
 * Costruisce il context dict per la valutazione dei predicati.
 * Campi sempre presenti: hp_current, hp_max, hp_pct, stress, actor_tier.
 * Campi opzionali: source_tier (se sourceUnit passato), damage (solo
 * event='damaged'), healing (solo event='healed').
 */
function buildContextForEvent({
  event,
  reactionOwner,
  sourceUnit = null,
  damageApplied = 0,
  healingApplied = 0,
}) {
  const hp = (reactionOwner && reactionOwner.hp) || {};
  const hpCurrent = Number(hp.current || 0);
  const hpMaxRaw = Number(hp.max || 1);
  const hpMax = hpMaxRaw > 0 ? hpMaxRaw : 1;
  const context = {
    hp_current: hpCurrent,
    hp_max: hpMax,
    hp_pct: hpMax > 0 ? hpCurrent / hpMax : 0,
    stress: Number((reactionOwner && reactionOwner.stress) || 0),
    actor_tier: Number((reactionOwner && reactionOwner.tier) || 1),
  };
  if (sourceUnit) {
    context.source_tier = Number(sourceUnit.tier || 1);
  }
  if (event === 'damaged') {
    context.damage = Number(damageApplied || 0);
  }
  if (event === 'healed') {
    context.healing = Number(healingApplied || 0);
  }
  return context;
}

// ─────────────────────────────────────────────────────────────────
// Resolution priority
// ─────────────────────────────────────────────────────────────────

function actionSpeed(action, table = DEFAULT_ACTION_SPEED) {
  if (!action || typeof action !== 'object') return 0;
  const type = String(action.type || '');
  const val = table[type];
  return typeof val === 'number' ? val : 0;
}

/**
 * priority = unit.initiative + action_speed - status_penalty - slow_down
 *
 * Status penalty (legacy `unit.statuses` array shape):
 *   - panic:     -2 per intensity
 *   - disorient: -1 per intensity
 *   - rage / focused / stunned: no penalty here (gestiti altrove)
 *
 * Action 5b (2026-04-29) — slow_down trigger (object-map shape `unit.status`):
 *   - panic > 0 OR confused > 0 → -1
 *   - bleeding ≥ medium severity → -1
 *   - fracture ≥ medium severity → -1
 *   Trigger combinati NON cumulano (cap -1, "1 tier slower" canonical).
 *   Letto da statusModifiers.computeSlowDownPenalty (lazy require).
 */
function computeResolvePriority(unit, action, speedTable = DEFAULT_ACTION_SPEED) {
  const base = Number((unit && unit.initiative) || 0);
  const speed = actionSpeed(action, speedTable);
  let penalty = 0;
  const statuses = (unit && unit.statuses) || [];
  for (const s of statuses) {
    if (!s) continue;
    const intensity = Number(s.intensity || 1);
    if (s.id === 'panic') penalty += intensity * 2;
    else if (s.id === 'disorient') penalty += intensity;
  }
  // Action 5b — slow_down (object-map status shape). Lazy require evita cycle.
  let slowDown = 0;
  if (unit && unit.status && typeof unit.status === 'object') {
    try {
      const { computeSlowDownPenalty } = require('./combat/statusModifiers');
      slowDown = Number(computeSlowDownPenalty(unit).amount) || 0;
    } catch {
      slowDown = 0;
    }
  }
  penalty += slowDown;
  // Sprint Spore Moderate (ADR-2026-04-26 §S6) — archetype ambush_plus init+2
  // se action.is_critical OR action.is_flank. Lazy require evita cycle import
  // cross-module; back-compat: zero delta quando passive assente o trigger
  // non match. Pattern: passive token check fast-path inline (avoid require
  // per chiamata se passives empty).
  let archetypeInitBonus = 0;
  const passives = Array.isArray(unit && unit._archetype_passives) ? unit._archetype_passives : [];
  if (passives.length > 0) {
    try {
      const { getInitiativeBonus } = require('./combat/archetypePassives');
      archetypeInitBonus = getInitiativeBonus(unit, action);
    } catch {
      archetypeInitBonus = 0;
    }
  }
  return base + speed - penalty + archetypeInitBonus;
}

/**
 * Ordinamento: priority desc, unitId asc. Reaction intents escluse.
 * Intents per unita' assenti dallo state sono silenziosamente scartati.
 */
function buildResolutionQueue(state, speedTable = DEFAULT_ACTION_SPEED) {
  const unitsMap = new Map();
  for (const u of (state && state.units) || []) {
    unitsMap.set(String(u.id), u);
  }
  const pending = (state && state.pending_intents) || [];
  const queue = [];
  // P0-2 fix (session-debugger): preserve declaration index as stable
  // tiebreaker. Prima: priority desc, unit_id asc — 2 intents stessa unit
  // avevano stessa chiave (priority+uid), ordine arbitrario cross-runtime.
  // Ora: priority desc, unit_id asc, intent_index asc → stable multi-intent.
  pending.forEach((intent, idx) => {
    if (_isReactionIntent(intent)) return;
    const uid = String(intent.unit_id || '');
    const unit = unitsMap.get(uid);
    if (!unit) return;
    const action = intent.action || {};
    queue.push({
      unit_id: uid,
      action,
      priority: computeResolvePriority(unit, action, speedTable),
      intent_index: idx,
    });
  });
  queue.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const uidCmp = a.unit_id.localeCompare(b.unit_id);
    if (uidCmp !== 0) return uidCmp;
    return a.intent_index - b.intent_index;
  });
  return queue;
}

// ─────────────────────────────────────────────────────────────────
// Lifecycle: beginRound / declareIntent / clearIntent / commitRound
// ─────────────────────────────────────────────────────────────────

/**
 * Avvia un nuovo round:
 *   - refresh AP a max per tutte le unita'
 *   - refresh reactions a max
 *   - decay status (decrement remaining_turns, drop <= 0)
 *   - bleeding tick (HP -= intensity per bleeding attivo)
 *   - decrement reaction_cooldown_remaining di 1 (min 0)
 *   - round_phase = 'planning'
 *   - pending_intents = []
 *
 * Ritorna: { nextState, expired, bleedingTotal }.
 */
function beginRound(state) {
  const nextState = _deepClone(state || {});
  const expiredAll = [];
  let bleedingTotal = 0;
  const units = nextState.units || [];
  for (const unit of units) {
    // AP refresh
    const ap = unit.ap || { current: 0, max: 0 };
    ap.current = Number(ap.max || 0);
    unit.ap = ap;
    // Reactions refresh
    const reactions = unit.reactions || { current: 0, max: 0 };
    reactions.current = Number(reactions.max || 0);
    unit.reactions = reactions;
    // Bleeding tick
    const statuses = Array.isArray(unit.statuses) ? unit.statuses : [];
    let bleedingDamage = 0;
    for (const s of statuses) {
      if (s && s.id === 'bleeding') {
        bleedingDamage += Number(s.intensity || 1);
      }
    }
    if (bleedingDamage > 0 && unit.hp) {
      unit.hp.current = Math.max(0, Number(unit.hp.current || 0) - bleedingDamage);
      bleedingTotal += bleedingDamage;
    }
    // Status decay
    const kept = [];
    for (const s of statuses) {
      if (!s) continue;
      const remaining = Number(s.remaining_turns || 0) - 1;
      if (remaining > 0) {
        kept.push({ ...s, remaining_turns: remaining });
      } else {
        expiredAll.push({ unit_id: String(unit.id || ''), status_id: s.id });
      }
    }
    unit.statuses = kept;
    // Cooldown decrement
    const cd = Number(unit.reaction_cooldown_remaining || 0);
    if (cd > 0) {
      unit.reaction_cooldown_remaining = cd - 1;
    } else {
      unit.reaction_cooldown_remaining = 0;
    }
  }
  nextState.round_phase = PHASE_PLANNING;
  nextState.pending_intents = [];
  return { nextState, expired: expiredAll, bleedingTotal };
}

/**
 * Preview-only: accumula l'intent in pending_intents.
 *
 * W8k (2026-04-19) SPEC CHANGE: APPEND invece di latest-wins.
 * Una unit può dichiarare N main intents per round (es. 2 attacchi stesso
 * target), fino al limite AP. Override ADR-2026-04-15 canonical per UX user
 * feedback. Per "cambiare idea" ora: chiamare clearIntent(unitId) prima.
 * Reaction intents preservati in ogni caso.
 *
 * Raise: se round_phase e' settato ed e' diverso da 'planning'.
 *        Se la fase e' null/undefined, imposta planning implicitamente.
 */
function declareIntent(state, unitId, action) {
  const phase = state && state.round_phase;
  if (phase !== undefined && phase !== null && phase !== PHASE_PLANNING) {
    throw new Error(`declareIntent richiede round_phase '${PHASE_PLANNING}', trovato '${phase}'`);
  }
  if (!_findUnit(state, unitId)) {
    throw new Error(`unit_id non trovato nello state: ${unitId}`);
  }
  const nextState = _deepClone(state || {});
  // W8k — append, non filter per unit_id. Multi-intent supported.
  const pending = (nextState.pending_intents || []).map((i) => _deepClone(i));
  pending.push({ unit_id: String(unitId), action: _deepClone(action || {}) });
  nextState.pending_intents = pending;
  if (phase === undefined || phase === null) {
    nextState.round_phase = PHASE_PLANNING;
  }
  return { nextState };
}

/**
 * Rimuove main intent + eventuale reaction intent per la stessa unit.
 * No-op se non esistono.
 */
function clearIntent(state, unitId) {
  const nextState = _deepClone(state || {});
  const pending = (nextState.pending_intents || []).filter(
    (i) => String(i.unit_id || '') !== String(unitId),
  );
  nextState.pending_intents = pending;
  return { nextState };
}

/**
 * Registra reaction intent. Valida event + payload type + predicates +
 * cooldown_rounds. Silent skip se l'unit e' in cooldown.
 */
function declareReaction(state, unitId, reactionPayload, trigger) {
  const phase = state && state.round_phase;
  if (phase !== undefined && phase !== null && phase !== PHASE_PLANNING) {
    throw new Error(`declareReaction richiede round_phase '${PHASE_PLANNING}', trovato '${phase}'`);
  }
  const unitRef = _findUnit(state, unitId);
  if (!unitRef) {
    throw new Error(`unit_id non trovato nello state: ${unitId}`);
  }
  const event = String((trigger && trigger.event) || '');
  if (!SUPPORTED_REACTION_EVENTS.has(event)) {
    throw new Error(
      `reaction trigger event non supportato: '${event}' (supportati: ${[...SUPPORTED_REACTION_EVENTS].sort().join(', ')})`,
    );
  }
  const payloadType = String((reactionPayload && reactionPayload.type) || '');
  if (!SUPPORTED_REACTION_TYPES.has(payloadType)) {
    throw new Error(
      `reaction payload type non supportato: '${payloadType}' (supportati: ${[...SUPPORTED_REACTION_TYPES].sort().join(', ')})`,
    );
  }

  // Validazione predicates
  const predicatesRaw = trigger && trigger.predicates;
  const normalisedPredicates = [];
  if (predicatesRaw) {
    if (!Array.isArray(predicatesRaw)) {
      throw new Error(
        `reaction_trigger.predicates deve essere una lista, trovato ${typeof predicatesRaw}`,
      );
    }
    for (const pred of predicatesRaw) {
      if (!pred || typeof pred !== 'object') {
        throw new Error('predicate deve essere un oggetto');
      }
      const { op, field } = pred;
      if (!SUPPORTED_PREDICATE_OPS.has(op)) {
        throw new Error(
          `predicate op non supportato: '${op}' (supportati: ${[...SUPPORTED_PREDICATE_OPS].sort().join(', ')})`,
        );
      }
      if (!SUPPORTED_PREDICATE_FIELDS.has(field)) {
        throw new Error(
          `predicate field non supportato: '${field}' (supportati: ${[...SUPPORTED_PREDICATE_FIELDS].sort().join(', ')})`,
        );
      }
      if (!('value' in pred)) {
        throw new Error("predicate richiede chiave 'value'");
      }
      normalisedPredicates.push({ op, field, value: pred.value });
    }
  }

  // Silent skip se cooldown attivo
  if (Number(unitRef.reaction_cooldown_remaining || 0) > 0) {
    return { nextState: _deepClone(state || {}) };
  }

  const cooldownRounds = Number((trigger && trigger.cooldown_rounds) || 0);
  if (cooldownRounds < 0) {
    throw new Error(`reaction_trigger.cooldown_rounds deve essere >= 0, trovato ${cooldownRounds}`);
  }

  const nextState = _deepClone(state || {});
  const pending = (nextState.pending_intents || []).filter(
    (i) => String(i.unit_id || '') !== String(unitId),
  );
  const sourceFilter = trigger && trigger.source_any_of;
  const normalisedTrigger = {
    event,
    source_any_of: Array.isArray(sourceFilter) ? [...sourceFilter] : null,
    cooldown_rounds: cooldownRounds,
  };
  if (normalisedPredicates.length > 0) {
    normalisedTrigger.predicates = normalisedPredicates;
  }
  pending.push({
    unit_id: String(unitId),
    reaction_trigger: normalisedTrigger,
    reaction_payload: _deepClone(reactionPayload || {}),
  });
  nextState.pending_intents = pending;
  if (phase === undefined || phase === null) {
    nextState.round_phase = PHASE_PLANNING;
  }
  return { nextState };
}

/**
 * Blocca gli intents del round, transita a 'committed'.
 * Raise se non in planning.
 */
function commitRound(state) {
  const phase = state && state.round_phase;
  if (phase !== PHASE_PLANNING) {
    throw new Error(`commitRound richiede round_phase '${PHASE_PLANNING}', trovato '${phase}'`);
  }
  const nextState = _deepClone(state);
  nextState.round_phase = PHASE_COMMITTED;
  return { nextState };
}

// ─────────────────────────────────────────────────────────────────
// Reaction matching
// ─────────────────────────────────────────────────────────────────

function _matchReactionForEvent({ reactionsByUnit, event, targetId, sourceId, context }) {
  const entry = reactionsByUnit[String(targetId)];
  if (!entry) return null;
  if (entry._consumed) return null;
  const trigger = entry.reaction_trigger || {};
  if (trigger.event !== event) return null;
  const sourceFilter = trigger.source_any_of;
  if (Array.isArray(sourceFilter) && sourceFilter.length > 0) {
    if (!sourceFilter.includes(sourceId)) return null;
  }
  const predicates = trigger.predicates;
  if (predicates && predicates.length > 0) {
    if (!context) return null;
    if (!evaluatePredicates(predicates, context)) return null;
  }
  return entry;
}

// ─────────────────────────────────────────────────────────────────
// Resolve round
// ─────────────────────────────────────────────────────────────────

/**
 * Risolve tutti gli intents committed in priority order.
 *
 * Pipeline per ogni entry:
 *   1. skip se actor morto (hp <= 0) -> reason 'actor_dead'
 *   2. skip se action=attack/parry e target morto -> reason 'target_dead'
 *   3. reaction injection pre-hit (evento 'attacked') su attack
 *   4. resolveAction(nextState, action, catalog, rng)
 *   5. threading dello state
 *   6. reaction injection post-hit (evento 'damaged') se damage_applied > 0
 *      e action non e' counter/overwatch synthetic
 *   7. reaction injection post-move (evento 'moved_adjacent') se action=move
 *   8. reaction injection post-ability (evento 'ability_used') se action=ability
 *   9. reaction injection post-heal (evento 'healed') se healing_applied > 0
 *
 * Post: round_phase = 'resolved', pending_intents = [].
 *
 * Raise se round_phase !== 'committed'.
 */
function resolveRound(state, catalog, rng, resolveAction, speedTable = DEFAULT_ACTION_SPEED) {
  if ((state && state.round_phase) !== PHASE_COMMITTED) {
    throw new Error(
      `resolveRound richiede round_phase '${PHASE_COMMITTED}', trovato '${state && state.round_phase}'`,
    );
  }
  if (typeof resolveAction !== 'function') {
    throw new Error('resolveRound richiede resolveAction come funzione');
  }
  let nextState = _deepClone(state);
  nextState.round_phase = PHASE_RESOLVING;
  // Sprint α (JA3 pattern) — interrupt fire drain BEFORE main resolve queue.
  // Light scope: queue ordering only, no full perception graph (deferred).
  // Caller può addToQueue prima di commitRound; resolveRound flush qui in
  // priority desc + FIFO. Pure: errori non bloccano resolve principale.
  try {
    const interruptFire = require('./combat/interruptFire');
    if (Array.isArray(nextState._interrupt_queue) && nextState._interrupt_queue.length > 0) {
      const flushed = interruptFire.resolveQueue(nextState, (intent) => ({
        executed: false,
        reason: 'light_scope_no_perception_graph',
        intent_actor: intent.actor_id,
      }));
      nextState._interrupt_resolved = flushed;
    }
  } catch {
    /* interrupt fire optional */
  }
  const queue = buildResolutionQueue(nextState, speedTable);
  const { reactionsByUnit } = _partitionIntents(nextState);
  const turnLogEntries = [];
  const skipped = [];
  const reactionsTriggered = [];

  const findUnitInNext = (uid) => _findUnit(nextState, uid);

  const setCooldownOnUnit = (uid, trigger) => {
    const cd = Number((trigger && trigger.cooldown_rounds) || 0);
    if (cd > 0) {
      const unit = findUnitInNext(uid);
      if (unit) {
        unit.reaction_cooldown_remaining = cd;
      }
    }
  };

  for (const entry of queue) {
    const uid = entry.unit_id;
    let action = entry.action;
    const actor = findUnitInNext(uid);
    if (!actor || Number((actor.hp && actor.hp.current) || 0) <= 0) {
      skipped.push({ unit_id: uid, reason: 'actor_dead', action: { ...action } });
      continue;
    }
    const actionType = action.type;
    const targetId = action.target_id;
    if (targetId && (actionType === 'attack' || actionType === 'parry')) {
      const target = findUnitInNext(String(targetId));
      if (!target || Number((target.hp && target.hp.current) || 0) <= 0) {
        skipped.push({ unit_id: uid, reason: 'target_dead', action: { ...action } });
        continue;
      }
    }

    // Pre-hit reaction injection (attacked -> parry)
    if (actionType === 'attack' && targetId) {
      const targetUnitPre = findUnitInNext(String(targetId));
      if (targetUnitPre) {
        const ctxAttacked = buildContextForEvent({
          event: 'attacked',
          reactionOwner: targetUnitPre,
          sourceUnit: actor,
        });
        const matched = _matchReactionForEvent({
          reactionsByUnit,
          event: 'attacked',
          targetId: String(targetId),
          sourceId: String(uid),
          context: ctxAttacked,
        });
        if (matched) {
          const payload = matched.reaction_payload || {};
          if (payload.type === 'parry') {
            action = {
              ...action,
              parry_response: {
                attempt: true,
                parry_bonus: Number(payload.parry_bonus || 0),
              },
            };
            matched._consumed = true;
            setCooldownOnUnit(String(targetId), matched.reaction_trigger);
            reactionsTriggered.push({
              target_unit_id: String(targetId),
              attacker_unit_id: String(uid),
              event: 'attacked',
              reaction_payload: { ...payload },
            });
          }
        }
      }
    }

    const result = resolveAction(nextState, action, catalog, rng);
    nextState = result.nextState;
    turnLogEntries.push(result.turnLogEntry);

    // Post-hit reaction injection (damaged)
    const damageApplied = Number((result.turnLogEntry && result.turnLogEntry.damage_applied) || 0);
    if (
      damageApplied > 0 &&
      actionType === 'attack' &&
      targetId &&
      !action._is_counter &&
      !action._is_overwatch
    ) {
      const targetUnitPost = findUnitInNext(String(targetId));
      if (targetUnitPost) {
        const ctxDamaged = buildContextForEvent({
          event: 'damaged',
          reactionOwner: targetUnitPost,
          sourceUnit: findUnitInNext(String(uid)),
          damageApplied,
        });
        const dmgMatched = _matchReactionForEvent({
          reactionsByUnit,
          event: 'damaged',
          targetId: String(targetId),
          sourceId: String(uid),
          context: ctxDamaged,
        });
        if (dmgMatched) {
          const dmgPayload = dmgMatched.reaction_payload || {};
          if (dmgPayload.type === 'trigger_status') {
            dmgMatched._consumed = true;
            setCooldownOnUnit(String(targetId), dmgMatched.reaction_trigger);
            reactionsTriggered.push({
              target_unit_id: String(targetId),
              attacker_unit_id: String(uid),
              event: 'damaged',
              reaction_payload: { ...dmgPayload },
              status_target_side: String(dmgPayload.target || 'attacker'),
            });
          }
        }
      }
    }

    // Post-move reaction injection (moved_adjacent)
    if (actionType === 'move') {
      for (const listenerUid of Object.keys(reactionsByUnit)) {
        const listenerEntry = reactionsByUnit[listenerUid];
        if (listenerEntry._consumed) continue;
        const listenerUnit = findUnitInNext(listenerUid);
        if (!listenerUnit) continue;
        const ctxMoved = buildContextForEvent({
          event: 'moved_adjacent',
          reactionOwner: listenerUnit,
          sourceUnit: findUnitInNext(String(uid)),
        });
        const matchedMove = _matchReactionForEvent({
          reactionsByUnit,
          event: 'moved_adjacent',
          targetId: listenerUid,
          sourceId: String(uid),
          context: ctxMoved,
        });
        if (matchedMove) {
          const movePayload = matchedMove.reaction_payload || {};
          if (movePayload.type === 'trigger_status') {
            matchedMove._consumed = true;
            setCooldownOnUnit(listenerUid, matchedMove.reaction_trigger);
            reactionsTriggered.push({
              target_unit_id: listenerUid,
              attacker_unit_id: String(uid),
              event: 'moved_adjacent',
              reaction_payload: { ...movePayload },
            });
          }
        }
      }
    }

    // Post-ability reaction injection (ability_used)
    if (actionType === 'ability') {
      for (const listenerUid of Object.keys(reactionsByUnit)) {
        const listenerEntry = reactionsByUnit[listenerUid];
        if (listenerEntry._consumed) continue;
        const listenerUnit = findUnitInNext(listenerUid);
        if (!listenerUnit) continue;
        const ctxAbility = buildContextForEvent({
          event: 'ability_used',
          reactionOwner: listenerUnit,
          sourceUnit: findUnitInNext(String(uid)),
        });
        const matchedAb = _matchReactionForEvent({
          reactionsByUnit,
          event: 'ability_used',
          targetId: listenerUid,
          sourceId: String(uid),
          context: ctxAbility,
        });
        if (matchedAb) {
          const abPayload = matchedAb.reaction_payload || {};
          if (abPayload.type === 'trigger_status') {
            matchedAb._consumed = true;
            setCooldownOnUnit(listenerUid, matchedAb.reaction_trigger);
            reactionsTriggered.push({
              target_unit_id: listenerUid,
              attacker_unit_id: String(uid),
              event: 'ability_used',
              reaction_payload: { ...abPayload },
              ability_id: action.ability_id || null,
            });
          }
        }
      }
    }

    // Post-heal reaction injection (healed)
    const healingApplied = Number(
      (result.turnLogEntry && result.turnLogEntry.healing_applied) || 0,
    );
    const healTargetId = action.target_id;
    if (actionType === 'heal' && healingApplied > 0 && healTargetId) {
      for (const listenerUid of Object.keys(reactionsByUnit)) {
        const listenerEntry = reactionsByUnit[listenerUid];
        if (listenerEntry._consumed) continue;
        const listenerUnit = findUnitInNext(listenerUid);
        if (!listenerUnit) continue;
        const ctxHealed = buildContextForEvent({
          event: 'healed',
          reactionOwner: listenerUnit,
          sourceUnit: findUnitInNext(String(uid)),
          healingApplied,
        });
        const matchedHeal = _matchReactionForEvent({
          reactionsByUnit,
          event: 'healed',
          targetId: listenerUid,
          sourceId: String(uid),
          context: ctxHealed,
        });
        if (matchedHeal) {
          const healPayload = matchedHeal.reaction_payload || {};
          if (healPayload.type === 'trigger_status') {
            matchedHeal._consumed = true;
            setCooldownOnUnit(listenerUid, matchedHeal.reaction_trigger);
            reactionsTriggered.push({
              target_unit_id: listenerUid,
              attacker_unit_id: String(uid),
              event: 'healed',
              reaction_payload: { ...healPayload },
              heal_target_unit_id: String(healTargetId),
              healing_applied: healingApplied,
            });
          }
        }
      }
    }
  }

  nextState.round_phase = PHASE_RESOLVED;
  nextState.pending_intents = [];
  return {
    nextState,
    turnLogEntries,
    resolutionQueue: queue,
    reactionsTriggered,
    skipped,
  };
}

/**
 * Preview what-if: clona lo state, auto-committa se in planning, poi
 * invoca resolveRound. Non muta l'input.
 */
function previewRound(state, catalog, rng, resolveAction, speedTable = DEFAULT_ACTION_SPEED) {
  const phase = state && state.round_phase;
  if (
    phase !== PHASE_PLANNING &&
    phase !== PHASE_COMMITTED &&
    phase !== undefined &&
    phase !== null
  ) {
    throw new Error(
      `previewRound richiede round_phase in {${PHASE_PLANNING}, ${PHASE_COMMITTED}}, trovato '${phase}'`,
    );
  }
  let previewState = _deepClone(state || {});
  if (phase === undefined || phase === null || phase === PHASE_PLANNING) {
    if (phase === undefined || phase === null) {
      previewState.round_phase = PHASE_PLANNING;
      previewState.pending_intents = previewState.pending_intents || [];
    }
    previewState = commitRound(previewState).nextState;
  }
  return resolveRound(previewState, catalog, rng, resolveAction, speedTable);
}

// ─────────────────────────────────────────────────────────────────
// Factory helper (pattern createSistemaTurnRunner)
// ─────────────────────────────────────────────────────────────────

/**
 * Wrapper con closure-scoped deps. Il caller passa resolveAction,
 * catalog e speed table una sola volta e ottiene un oggetto con i
 * metodi lifecycle gia' bindati.
 */
function createRoundOrchestrator(deps = {}) {
  const {
    resolveAction,
    catalog = null,
    actionSpeedTable = DEFAULT_ACTION_SPEED,
    defaultRng = null,
  } = deps;
  if (typeof resolveAction !== 'function') {
    throw new Error('createRoundOrchestrator richiede deps.resolveAction');
  }
  return {
    beginRound: (state) => beginRound(state),
    declareIntent: (state, unitId, action) => declareIntent(state, unitId, action),
    clearIntent: (state, unitId) => clearIntent(state, unitId),
    declareReaction: (state, unitId, payload, trigger) =>
      declareReaction(state, unitId, payload, trigger),
    commitRound: (state) => commitRound(state),
    buildResolutionQueue: (state) => buildResolutionQueue(state, actionSpeedTable),
    computeResolvePriority: (unit, action) =>
      computeResolvePriority(unit, action, actionSpeedTable),
    resolveRound: (state, cat = catalog, rng = defaultRng) =>
      resolveRound(state, cat, rng, resolveAction, actionSpeedTable),
    previewRound: (state, cat = catalog, rng = defaultRng) =>
      previewRound(state, cat, rng, resolveAction, actionSpeedTable),
  };
}

// ─────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Helper test equivalente al pattern Python rng_from_sequence: ritorna
 * un rng che consuma i valori della sequenza in ordine. Throw quando
 * finiscono i valori.
 */
function rngFromSequence(values) {
  const seq = [...values];
  let idx = 0;
  return function rng() {
    if (idx >= seq.length) {
      throw new Error('rngFromSequence exhausted');
    }
    return seq[idx++];
  };
}

// ─────────────────────────────────────────────────────────────────
// B1 pattern: auto phase transition check
// ─────────────────────────────────────────────────────────────────

/**
 * Controlla se la fase corrente dovrebbe avanzare automaticamente.
 * Ritorna la prossima fase target, oppure null se non serve avanzare.
 *
 * planning → committed: tutti gli alive units hanno un main intent
 * resolving → resolved: resolution queue vuota (tutte le azioni risolte)
 */
function shouldAutoAdvance(state, opts = {}) {
  const { requirePlayerOnly = false } = opts;
  const phase = state && state.round_phase;
  if (phase === PHASE_PLANNING) {
    let units = (state.units || []).filter((u) => u && u.hp > 0);
    if (requirePlayerOnly) {
      units = units.filter((u) => u && u.controlled_by === 'player');
    }
    if (units.length === 0) return null;
    const pending = (state.pending_intents || []).filter((i) => !_isReactionIntent(i));
    const unitIds = new Set(units.map((u) => String(u.id)));
    const declaredIds = new Set(pending.map((i) => String(i.unit_id)));
    for (const id of unitIds) {
      if (!declaredIds.has(id)) return null;
    }
    return PHASE_COMMITTED;
  }
  if (phase === PHASE_RESOLVING) {
    const queue = state._resolutionQueue || state.resolution_queue || [];
    if (queue.length === 0) return PHASE_RESOLVED;
  }
  return null;
}

module.exports = {
  // Phase constants
  PHASE_PLANNING,
  PHASE_COMMITTED,
  PHASE_RESOLVING,
  PHASE_RESOLVED,
  VALID_PHASES,
  // Reaction constants
  SUPPORTED_REACTION_EVENTS,
  SUPPORTED_REACTION_TYPES,
  SUPPORTED_PREDICATE_OPS,
  SUPPORTED_PREDICATE_FIELDS,
  DEFAULT_ACTION_SPEED,
  // Pure functions
  evaluatePredicates,
  buildContextForEvent,
  actionSpeed,
  computeResolvePriority,
  buildResolutionQueue,
  beginRound,
  declareIntent,
  clearIntent,
  declareReaction,
  commitRound,
  resolveRound,
  previewRound,
  shouldAutoAdvance,
  // Factory
  createRoundOrchestrator,
  // Test helpers
  rngFromSequence,
};
