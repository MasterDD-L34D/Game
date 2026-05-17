// Round orchestrator JS foundation — unit test suite.
//
// Copre il modulo `apps/backend/services/roundOrchestrator.js`, port
// in JS della reference ex-Python `services/rules/round_orchestrator.py`
// (rimosso PR #2059, ADR-2026-04-19 Phase 3).
//
// Il modulo e' completamente isolato: zero wiring a session.js, zero
// endpoint, zero import da apps/backend/routes/*. Tutti i test
// costruiscono lo state minimale inline e usano un mock resolveAction
// deterministico (nessuna dipendenza da catalog reale o da
// services/traitEffects).
//
// Sezioni di test (25 test totali):
//   1. Phase machine (5)
//   2. Declare intent lifecycle (4)
//   3. Resolution queue (3)
//   4. Resolve round integration (4)
//   5. Reactions — attacked + parry (3)
//   6. Reactions — damaged + predicates (3)
//   7. Reactions — cooldown + events (3)
//   8. Determinism (2)

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PHASE_PLANNING,
  PHASE_COMMITTED,
  PHASE_RESOLVED,
  SUPPORTED_REACTION_EVENTS,
  SUPPORTED_REACTION_TYPES,
  SUPPORTED_PREDICATE_OPS,
  SUPPORTED_PREDICATE_FIELDS,
  DEFAULT_ACTION_SPEED,
  evaluatePredicates,
  buildContextForEvent,
  computeResolvePriority,
  buildResolutionQueue,
  beginRound,
  declareIntent,
  clearIntent,
  declareReaction,
  commitRound,
  resolveRound,
  createRoundOrchestrator,
  rngFromSequence,
} = require('../../apps/backend/services/roundOrchestrator');

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function makeUnit(id, overrides = {}) {
  return {
    id,
    hp: { current: 10, max: 10, ...(overrides.hp || {}) },
    ap: { current: 2, max: 2, ...(overrides.ap || {}) },
    reactions: { current: 1, max: 1, ...(overrides.reactions || {}) },
    initiative: overrides.initiative != null ? overrides.initiative : 10,
    tier: overrides.tier != null ? overrides.tier : 1,
    stress: overrides.stress != null ? overrides.stress : 0,
    statuses: overrides.statuses || [],
    reaction_cooldown_remaining: overrides.reaction_cooldown_remaining || 0,
  };
}

function makeState(overrides = {}) {
  return {
    session_id: 'test',
    turn: 1,
    round_phase: overrides.round_phase || PHASE_PLANNING,
    pending_intents: overrides.pending_intents || [],
    units: overrides.units || [
      makeUnit('alpha', { initiative: 14 }),
      makeUnit('bravo', { initiative: 10 }),
    ],
    log: [],
  };
}

function attackAction(actorId, targetId, extras = {}) {
  return {
    id: `act-${actorId}`,
    type: 'attack',
    actor_id: actorId,
    target_id: targetId,
    ap_cost: 1,
    damage_dice: { count: 1, sides: 6, modifier: 0 },
    ...extras,
  };
}

function moveAction(actorId) {
  return { id: `move-${actorId}`, type: 'move', actor_id: actorId, ap_cost: 1 };
}

function abilityAction(actorId, abilityId = 'test_ability') {
  return {
    id: `ab-${actorId}`,
    type: 'ability',
    actor_id: actorId,
    ability_id: abilityId,
    ap_cost: 1,
  };
}

// Mock resolveAction: subtract 3 hp from target on attack, no-op for
// other actions. Deterministic: nessun uso di rng. Ritorna turn_log_entry
// con damage_applied calcolato.
function mockResolveAction(state, action, _catalog, _rng) {
  const next = JSON.parse(JSON.stringify(state));
  let damageApplied = 0;
  let healingApplied = 0;
  if (action.type === 'attack' && action.target_id) {
    const target = next.units.find((u) => u.id === action.target_id);
    if (target) {
      damageApplied = 3;
      target.hp.current = Math.max(0, target.hp.current - damageApplied);
    }
  } else if (action.type === 'heal' && action.target_id) {
    const target = next.units.find((u) => u.id === action.target_id);
    if (target) {
      const missing = target.hp.max - target.hp.current;
      healingApplied = Math.min(Number(action.heal_amount || 4), missing);
      target.hp.current += healingApplied;
    }
  }
  // AP consumed
  const actor = next.units.find((u) => u.id === action.actor_id);
  if (actor && actor.ap) {
    actor.ap.current = Math.max(0, actor.ap.current - Number(action.ap_cost || 0));
  }
  const turnLogEntry = {
    turn: Number(next.turn || 1),
    action: { ...action },
    damage_applied: damageApplied,
    healing_applied: healingApplied,
  };
  (next.log = next.log || []).push(turnLogEntry);
  return { nextState: next, turnLogEntry };
}

// ─────────────────────────────────────────────────────────────────
// 1. Phase machine (5 test)
// ─────────────────────────────────────────────────────────────────

test('beginRound sets phase to planning and clears pending_intents', () => {
  const state = makeState({
    round_phase: PHASE_RESOLVED,
    pending_intents: [{ unit_id: 'alpha', action: attackAction('alpha', 'bravo') }],
  });
  const { nextState } = beginRound(state);
  assert.equal(nextState.round_phase, PHASE_PLANNING);
  assert.deepEqual(nextState.pending_intents, []);
});

test('declareIntent accepts in planning, rejects in committed', () => {
  const state = makeState({ round_phase: PHASE_PLANNING });
  const after = declareIntent(state, 'alpha', attackAction('alpha', 'bravo'));
  assert.equal(after.nextState.pending_intents.length, 1);

  const committed = makeState({ round_phase: PHASE_COMMITTED });
  assert.throws(
    () => declareIntent(committed, 'alpha', attackAction('alpha', 'bravo')),
    /round_phase/,
  );
});

test('commitRound transitions planning to committed', () => {
  const state = makeState({ round_phase: PHASE_PLANNING });
  const { nextState } = commitRound(state);
  assert.equal(nextState.round_phase, PHASE_COMMITTED);
});

test('commitRound rejects if phase is not planning', () => {
  const state = makeState({ round_phase: PHASE_RESOLVED });
  assert.throws(() => commitRound(state), /planning/);
});

test('resolveRound rejects if phase is not committed', () => {
  const state = makeState({ round_phase: PHASE_PLANNING });
  assert.throws(() => resolveRound(state, null, () => 0.5, mockResolveAction), /committed/);
});

// ─────────────────────────────────────────────────────────────────
// 2. Declare intent lifecycle (4 test)
// ─────────────────────────────────────────────────────────────────

test('declareIntent accumulates intent in pending_intents', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareIntent(state, 'bravo', moveAction('bravo')).nextState;
  assert.equal(state.pending_intents.length, 2);
  assert.equal(state.pending_intents[0].unit_id, 'alpha');
  assert.equal(state.pending_intents[1].unit_id, 'bravo');
});

test('declareIntent appends for same unit (W8k override — multi-intent)', () => {
  // W8k 2026-04-19 override ADR-2026-04-15: declareIntent APPEND invece di
  // latest-wins. Pre-W8k era latest-wins (1 intent per unit), post W8k
  // unit può dichiarare N intent finché AP budget sufficiente. Per
  // "cambiare idea" ora: clearIntent(unit) + declareIntent nuovo.
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareIntent(state, 'alpha', moveAction('alpha')).nextState;
  assert.equal(state.pending_intents.length, 2, 'APPEND: 2 intent accumulati per alpha');
  assert.equal(state.pending_intents[0].action.type, 'attack');
  assert.equal(state.pending_intents[1].action.type, 'move');
});

test('clearIntent removes pending intent', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = clearIntent(state, 'alpha').nextState;
  assert.equal(state.pending_intents.length, 0);
});

test('declareIntent preview-only does not mutate AP/HP', () => {
  const state = makeState({ round_phase: PHASE_PLANNING });
  const apBefore = state.units[0].ap.current;
  const hpBefore = state.units[1].hp.current;
  const { nextState } = declareIntent(state, 'alpha', attackAction('alpha', 'bravo'));
  // Next state AP must equal before (no consumption at declare)
  assert.equal(nextState.units[0].ap.current, apBefore);
  assert.equal(nextState.units[1].hp.current, hpBefore);
  // Original state never mutated
  assert.equal(state.units[0].ap.current, apBefore);
});

// ─────────────────────────────────────────────────────────────────
// 3. Resolution queue (3 test)
// ─────────────────────────────────────────────────────────────────

test('buildResolutionQueue sorts by priority desc, unitId asc', () => {
  const state = makeState({
    round_phase: PHASE_PLANNING,
    units: [
      makeUnit('alpha', { initiative: 10 }),
      makeUnit('bravo', { initiative: 14 }),
      makeUnit('charlie', { initiative: 10 }),
    ],
    pending_intents: [
      { unit_id: 'alpha', action: attackAction('alpha', 'bravo') },
      { unit_id: 'bravo', action: attackAction('bravo', 'alpha') },
      { unit_id: 'charlie', action: attackAction('charlie', 'alpha') },
    ],
  });
  const queue = buildResolutionQueue(state);
  // bravo higher priority (14), then alpha and charlie tied on 10 -> alpha first (alphabetic)
  assert.equal(queue[0].unit_id, 'bravo');
  assert.equal(queue[1].unit_id, 'alpha');
  assert.equal(queue[2].unit_id, 'charlie');
});

test('buildResolutionQueue excludes reaction intents', () => {
  const state = makeState({
    round_phase: PHASE_PLANNING,
    pending_intents: [
      { unit_id: 'alpha', action: attackAction('alpha', 'bravo') },
      {
        unit_id: 'bravo',
        reaction_trigger: { event: 'attacked', source_any_of: null, cooldown_rounds: 0 },
        reaction_payload: { type: 'parry', parry_bonus: 1 },
      },
    ],
  });
  const queue = buildResolutionQueue(state);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].unit_id, 'alpha');
});

test('computeResolvePriority applies panic -2 and disorient -1 penalties', () => {
  const panicUnit = makeUnit('p', {
    initiative: 10,
    statuses: [{ id: 'panic', intensity: 1, remaining_turns: 2 }],
  });
  const disUnit = makeUnit('d', {
    initiative: 10,
    statuses: [{ id: 'disorient', intensity: 2, remaining_turns: 2 }],
  });
  const attack = { type: 'attack' };
  // panic: 10 + 0 - (1 * 2) = 8
  assert.equal(computeResolvePriority(panicUnit, attack), 8);
  // disorient intensity 2: 10 + 0 - (2 * 1) = 8
  assert.equal(computeResolvePriority(disUnit, attack), 8);
});

// ─────────────────────────────────────────────────────────────────
// 4. Resolve round integration (4 test, con mock resolveAction)
// ─────────────────────────────────────────────────────────────────

test('resolveRound executes queue in priority order', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareIntent(state, 'bravo', attackAction('bravo', 'alpha')).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  // alpha (init 14) resolves first, then bravo (init 10)
  assert.equal(result.resolutionQueue[0].unit_id, 'alpha');
  assert.equal(result.resolutionQueue[1].unit_id, 'bravo');
  assert.equal(result.turnLogEntries.length, 2);
});

test('resolveRound skips actor with hp <= 0', () => {
  let state = makeState({
    round_phase: PHASE_PLANNING,
    units: [
      makeUnit('alpha', { initiative: 14, hp: { current: 0, max: 10 } }),
      makeUnit('bravo', { initiative: 10 }),
    ],
  });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'actor_dead');
  assert.equal(result.turnLogEntries.length, 0);
});

test('resolveRound skips attack with target hp <= 0', () => {
  let state = makeState({
    round_phase: PHASE_PLANNING,
    units: [
      makeUnit('alpha', { initiative: 14 }),
      makeUnit('bravo', { initiative: 10, hp: { current: 0, max: 10 } }),
    ],
  });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'target_dead');
});

test('resolveRound transitions to resolved and empties pending_intents', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  assert.equal(result.nextState.round_phase, PHASE_RESOLVED);
  assert.deepEqual(result.nextState.pending_intents, []);
});

// ─────────────────────────────────────────────────────────────────
// 5. Reactions — attacked + parry (3 test)
// ─────────────────────────────────────────────────────────────────

test('declareReaction rejects unsupported event', () => {
  const state = makeState({ round_phase: PHASE_PLANNING });
  assert.throws(
    () =>
      declareReaction(
        state,
        'bravo',
        { type: 'parry', parry_bonus: 1 },
        { event: 'unknown_event' },
      ),
    /non supportato/,
  );
});

test('declareReaction rejects unsupported payload type', () => {
  const state = makeState({ round_phase: PHASE_PLANNING });
  assert.throws(
    () => declareReaction(state, 'bravo', { type: 'nuke' }, { event: 'attacked' }),
    /non supportato/,
  );
});

test('resolveRound injects parry_response on matching attacked event', () => {
  // Resolver capture: conferma che l'action arriva con parry_response iniettato
  let capturedAction = null;
  const capturingResolveAction = (state, action, _catalog, _rng) => {
    capturedAction = action;
    return mockResolveAction(state, action, _catalog, _rng);
  };
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareReaction(
    state,
    'bravo',
    { type: 'parry', parry_bonus: 2 },
    { event: 'attacked', source_any_of: null, cooldown_rounds: 0 },
  ).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, capturingResolveAction);
  assert.ok(capturedAction.parry_response);
  assert.equal(capturedAction.parry_response.attempt, true);
  assert.equal(capturedAction.parry_response.parry_bonus, 2);
  assert.equal(result.reactionsTriggered.length, 1);
  assert.equal(result.reactionsTriggered[0].event, 'attacked');
});

// ─────────────────────────────────────────────────────────────────
// 6. Reactions — damaged + predicates (3 test)
// ─────────────────────────────────────────────────────────────────

test('resolveRound triggers damaged reaction with trigger_status payload', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareReaction(
    state,
    'bravo',
    {
      type: 'trigger_status',
      status_id: 'bleeding',
      duration: 2,
      intensity: 1,
      target: 'attacker',
    },
    { event: 'damaged', source_any_of: null, cooldown_rounds: 0 },
  ).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  assert.equal(result.reactionsTriggered.length, 1);
  assert.equal(result.reactionsTriggered[0].event, 'damaged');
  assert.equal(result.reactionsTriggered[0].status_target_side, 'attacker');
});

test('predicates DSL: damage >= 5 filter (no match on damage=3 from mock)', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareReaction(
    state,
    'bravo',
    { type: 'trigger_status', status_id: 'bleeding', duration: 1, intensity: 1 },
    {
      event: 'damaged',
      source_any_of: null,
      cooldown_rounds: 0,
      predicates: [{ op: '>=', field: 'damage', value: 5 }],
    },
  ).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  // mock deals 3 damage, predicate damage>=5 fails -> no trigger
  assert.equal(result.reactionsTriggered.length, 0);
});

test('predicates DSL: damage >= 2 filter (match on damage=3 from mock)', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareReaction(
    state,
    'bravo',
    { type: 'trigger_status', status_id: 'bleeding', duration: 1, intensity: 1 },
    {
      event: 'damaged',
      predicates: [{ op: '>=', field: 'damage', value: 2 }],
    },
  ).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  assert.equal(result.reactionsTriggered.length, 1);
});

// ─────────────────────────────────────────────────────────────────
// 7. Reactions — cooldown + events (3 test)
// ─────────────────────────────────────────────────────────────────

test('cooldown persists on unit.reaction_cooldown_remaining after trigger', () => {
  let state = makeState({ round_phase: PHASE_PLANNING });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
  state = declareReaction(
    state,
    'bravo',
    { type: 'parry', parry_bonus: 1 },
    { event: 'attacked', cooldown_rounds: 2 },
  ).nextState;
  state = commitRound(state).nextState;
  const result = resolveRound(state, null, () => 0.5, mockResolveAction);
  const bravoAfter = result.nextState.units.find((u) => u.id === 'bravo');
  assert.equal(bravoAfter.reaction_cooldown_remaining, 2);
});

test('beginRound decrements cooldown by 1 (min 0)', () => {
  const state = makeState({
    round_phase: PHASE_RESOLVED,
    units: [
      makeUnit('alpha', { reaction_cooldown_remaining: 3 }),
      makeUnit('bravo', { reaction_cooldown_remaining: 0 }),
      makeUnit('charlie', { reaction_cooldown_remaining: 1 }),
    ],
  });
  const { nextState } = beginRound(state);
  const alpha = nextState.units.find((u) => u.id === 'alpha');
  const bravo = nextState.units.find((u) => u.id === 'bravo');
  const charlie = nextState.units.find((u) => u.id === 'charlie');
  assert.equal(alpha.reaction_cooldown_remaining, 2);
  assert.equal(bravo.reaction_cooldown_remaining, 0);
  assert.equal(charlie.reaction_cooldown_remaining, 0);
});

test('declareReaction silent skip when cooldown active', () => {
  const state = makeState({
    round_phase: PHASE_PLANNING,
    units: [
      makeUnit('alpha', { initiative: 14 }),
      makeUnit('bravo', { initiative: 10, reaction_cooldown_remaining: 2 }),
    ],
  });
  const { nextState } = declareReaction(
    state,
    'bravo',
    { type: 'parry', parry_bonus: 1 },
    { event: 'attacked' },
  );
  // Silent skip: nessuna reaction aggiunta
  const reactionIntents = (nextState.pending_intents || []).filter((i) => i.reaction_trigger);
  assert.equal(reactionIntents.length, 0);
});

// ─────────────────────────────────────────────────────────────────
// 8. Determinism (2 test)
// ─────────────────────────────────────────────────────────────────

test('same intents + same rng + same state produce identical nextState', () => {
  const buildRun = () => {
    let state = makeState({ round_phase: PHASE_PLANNING });
    state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo')).nextState;
    state = declareIntent(state, 'bravo', moveAction('bravo')).nextState;
    state = commitRound(state).nextState;
    return resolveRound(state, null, rngFromSequence([0.5, 0.5]), mockResolveAction);
  };
  const a = buildRun();
  const b = buildRun();
  assert.equal(JSON.stringify(a.nextState), JSON.stringify(b.nextState));
  assert.equal(JSON.stringify(a.turnLogEntries), JSON.stringify(b.turnLogEntries));
});

test('deep copy: mutating output nextState does not affect input state', () => {
  const state = makeState({ round_phase: PHASE_PLANNING });
  const apBefore = state.units[0].ap.current;
  const hpBefore = state.units[1].hp.current;
  let running = state;
  running = declareIntent(running, 'alpha', attackAction('alpha', 'bravo')).nextState;
  running = commitRound(running).nextState;
  const result = resolveRound(running, null, () => 0.5, mockResolveAction);
  // Mutazione del risultato
  result.nextState.units[1].hp.current = -999;
  result.nextState.round_phase = 'mutated';
  // Input state originale intatto
  assert.equal(state.round_phase, PHASE_PLANNING);
  assert.equal(state.units[0].ap.current, apBefore);
  assert.equal(state.units[1].hp.current, hpBefore);
});

// ─────────────────────────────────────────────────────────────────
// Smoke: constants + factory
// ─────────────────────────────────────────────────────────────────

test('supported constants are exposed as sets', () => {
  assert.ok(SUPPORTED_REACTION_EVENTS.has('attacked'));
  assert.ok(SUPPORTED_REACTION_EVENTS.has('healed'));
  assert.ok(SUPPORTED_REACTION_TYPES.has('counter'));
  assert.ok(SUPPORTED_REACTION_TYPES.has('overwatch'));
  assert.ok(SUPPORTED_PREDICATE_OPS.has('>='));
  assert.ok(SUPPORTED_PREDICATE_FIELDS.has('healing'));
  assert.equal(DEFAULT_ACTION_SPEED.heal, -1);
});

test('createRoundOrchestrator returns bound API', () => {
  const o = createRoundOrchestrator({ resolveAction: mockResolveAction });
  assert.equal(typeof o.beginRound, 'function');
  assert.equal(typeof o.declareIntent, 'function');
  assert.equal(typeof o.resolveRound, 'function');
});

test('createRoundOrchestrator throws without resolveAction', () => {
  assert.throws(() => createRoundOrchestrator({}), /resolveAction/);
});

test('evaluatePredicates pure function comparators', () => {
  assert.equal(evaluatePredicates(null, {}), true);
  assert.equal(evaluatePredicates([], {}), true);
  assert.equal(evaluatePredicates([{ op: '>=', field: 'damage', value: 5 }], { damage: 5 }), true);
  assert.equal(evaluatePredicates([{ op: '>=', field: 'damage', value: 5 }], { damage: 4 }), false);
  // Fail-safe: unknown field -> false
  assert.equal(
    evaluatePredicates([{ op: '>=', field: 'damage', value: 5 }], { other: 100 }),
    false,
  );
});

test('buildContextForEvent populates event-specific fields', () => {
  const owner = { hp: { current: 5, max: 10 }, stress: 0.3, tier: 2 };
  const source = { tier: 3 };
  const ctx = buildContextForEvent({
    event: 'damaged',
    reactionOwner: owner,
    sourceUnit: source,
    damageApplied: 4,
  });
  assert.equal(ctx.hp_current, 5);
  assert.equal(ctx.hp_max, 10);
  assert.equal(ctx.hp_pct, 0.5);
  assert.equal(ctx.stress, 0.3);
  assert.equal(ctx.actor_tier, 2);
  assert.equal(ctx.source_tier, 3);
  assert.equal(ctx.damage, 4);
});
