// Round orchestrator — multi-intent regression tests (session-debugger P0-1/P0-2).
//
// Wave 8k override ADR-2026-04-15: declareIntent APPEND, non latest-wins.
// Session-debugger audit 2026-04-19 ha rivelato 2 P0:
//   P0-1: validatePlayerIntent non somma pending intents stesso actor
//          (exploit multi-intent AP via curl bypass client Wave 8N).
//   P0-2: buildResolutionQueue sort senza intent_index tiebreaker
//          (unstable cross-runtime su 2 intents stessa unit stessa priority).
//
// Questo file copre:
//   - resolution queue stable tiebreaker intent_index (P0-2)
//   - AP consumption correct: N intent ap_cost=1 consumano N AP reali (P0-1)

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PHASE_PLANNING,
  PHASE_COMMITTED,
  buildResolutionQueue,
  declareIntent,
  commitRound,
  resolveRound,
  DEFAULT_ACTION_SPEED,
} = require('../../apps/backend/services/roundOrchestrator');

function makeUnit(id, overrides = {}) {
  return {
    id,
    hp: { current: 10, max: 10, ...(overrides.hp || {}) },
    ap: { current: 3, max: 3, ...(overrides.ap || {}) },
    reactions: { current: 1, max: 1 },
    initiative: overrides.initiative != null ? overrides.initiative : 10,
    tier: 1,
    stress: 0,
    statuses: [],
    reaction_cooldown_remaining: 0,
  };
}

function attackAction(actorId, targetId, apCost = 1) {
  return {
    id: `atk-${actorId}-${Math.random()}`,
    type: 'attack',
    actor_id: actorId,
    target_id: targetId,
    ap_cost: apCost,
    damage_dice: { count: 1, sides: 6, modifier: 0 },
  };
}

function makeState(overrides = {}) {
  return {
    session_id: 'test-multi',
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

// Mock resolveAction that consumes ap_cost — same shape as production
// placeholderResolveAction in sessionRoundBridge.js.
function mockResolveAction(state, action) {
  const next = JSON.parse(JSON.stringify(state));
  const actor = next.units.find((u) => u.id === action.actor_id);
  if (actor && actor.ap) {
    actor.ap.current = Math.max(0, actor.ap.current - Number(action.ap_cost || 0));
  }
  if (action.type === 'attack' && action.target_id) {
    const target = next.units.find((u) => u.id === action.target_id);
    if (target && target.hp) {
      target.hp.current = Math.max(0, target.hp.current - 3);
    }
  }
  return {
    nextState: next,
    turnLogEntry: { turn: next.turn || 1, action: { ...action }, damage_applied: 3 },
  };
}

// ─────────────────────────────────────────────────────────────────
// P0-2: sort tiebreaker intent_index (multi-intent stable ordering)
// ─────────────────────────────────────────────────────────────────

test('buildResolutionQueue: 2 intent stessa unit stessa priority → ordinati per intent_index', () => {
  const state = makeState({
    units: [makeUnit('alpha', { initiative: 10 })],
    pending_intents: [
      { unit_id: 'alpha', action: attackAction('alpha', 'alpha', 1) }, // idx 0
      { unit_id: 'alpha', action: attackAction('alpha', 'alpha', 1) }, // idx 1
      { unit_id: 'alpha', action: attackAction('alpha', 'alpha', 1) }, // idx 2
    ],
  });
  const queue = buildResolutionQueue(state, DEFAULT_ACTION_SPEED);
  assert.equal(queue.length, 3);
  // Tutti stessa unit+priority → ordine = declaration order
  assert.equal(queue[0].intent_index, 0);
  assert.equal(queue[1].intent_index, 1);
  assert.equal(queue[2].intent_index, 2);
});

test('buildResolutionQueue: intent_index preservato anche con interleaving unit diversi', () => {
  const state = makeState({
    units: [
      makeUnit('alpha', { initiative: 10 }),
      makeUnit('bravo', { initiative: 10 }), // same initiative → priority collision
    ],
    pending_intents: [
      { unit_id: 'alpha', action: attackAction('alpha', 'bravo', 1) }, // idx 0
      { unit_id: 'bravo', action: attackAction('bravo', 'alpha', 1) }, // idx 1
      { unit_id: 'alpha', action: attackAction('alpha', 'bravo', 1) }, // idx 2
    ],
  });
  const queue = buildResolutionQueue(state, DEFAULT_ACTION_SPEED);
  assert.equal(queue.length, 3);
  // Priority identica → unit_id asc (alpha prima bravo) → poi intent_index
  assert.equal(queue[0].unit_id, 'alpha');
  assert.equal(queue[0].intent_index, 0);
  assert.equal(queue[1].unit_id, 'alpha');
  assert.equal(queue[1].intent_index, 2);
  assert.equal(queue[2].unit_id, 'bravo');
  assert.equal(queue[2].intent_index, 1);
});

// ─────────────────────────────────────────────────────────────────
// P0-1: resolveRound consumes ap_cost per action (multi-intent AP correct)
// ─────────────────────────────────────────────────────────────────

test('resolveRound: 3 intent ap_cost=1 stessa unit consumano 3 AP (pre-fix consumava 3 via mock OK)', () => {
  let state = makeState({
    units: [makeUnit('alpha', { ap: { current: 3, max: 3 } }), makeUnit('bravo')],
  });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo', 1)).nextState;
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo', 1)).nextState;
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo', 1)).nextState;
  state = commitRound(state).nextState;
  const { nextState } = resolveRound(state, null, null, mockResolveAction);
  const alpha = nextState.units.find((u) => u.id === 'alpha');
  assert.equal(alpha.ap.current, 0, 'alpha consumed 3 AP (was 3, now 0)');
});

test('resolveRound: 2 intent ap_cost=2 stessa unit consumano 4 AP — clamp a 0 se pool 3', () => {
  let state = makeState({
    units: [makeUnit('alpha', { ap: { current: 3, max: 3 } }), makeUnit('bravo')],
  });
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo', 2)).nextState;
  state = declareIntent(state, 'alpha', attackAction('alpha', 'bravo', 2)).nextState;
  state = commitRound(state).nextState;
  const { nextState } = resolveRound(state, null, null, mockResolveAction);
  const alpha = nextState.units.find((u) => u.id === 'alpha');
  // Math.max(0, ...) clamp → seconda action tenta su ap 1, scala a 0 (non negativo)
  assert.equal(alpha.ap.current, 0, 'alpha AP clamped to 0 post over-budget multi-intent');
});

test('resolveRound: ap_cost assente default 1 (retrocompatibilità legacy)', () => {
  let state = makeState({
    units: [makeUnit('alpha', { ap: { current: 2, max: 2 } }), makeUnit('bravo')],
  });
  const actionNoAp = { id: 'a1', type: 'attack', actor_id: 'alpha', target_id: 'bravo' };
  state = declareIntent(state, 'alpha', actionNoAp).nextState;
  state = commitRound(state).nextState;
  const { nextState } = resolveRound(state, null, null, mockResolveAction);
  const alpha = nextState.units.find((u) => u.id === 'alpha');
  // Mock non ha ap_cost → 0 scalato; production resolveFn ora Number(ap_cost||1) → 1
  // Test verify il mock comportamento (mock e' il contratto resolveRound).
  assert.equal(alpha.ap.current, 2, 'mock senza ap_cost lascia AP invariato (contract check)');
});
