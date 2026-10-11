// tests/services/telepathicReveal.test.js
//
// Telepatic-link real intent-reveal pipe (2026-04-25 audit follow-up to
// PR #1822 + PR #1811 magnetic_rift_resonance).
//
// Probes per-actor reveal payload: when actor has status.telepatic_link > 0,
// enemy intents within range N (default 3) are exposed for planning-phase
// foresight. Pure helper, additive to threat_preview pipeline.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeTelepathicReveal,
  DEFAULT_RANGE,
  manhattanDistance,
} = require('../../apps/backend/services/combat/telepathicReveal');

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function makeUnit(overrides = {}) {
  return {
    id: 'u1',
    hp: 10,
    max_hp: 10,
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    status: {},
    ...overrides,
  };
}

function makeSession(units, pendingIntents) {
  return {
    units,
    roundState: { pending_intents: pendingIntents },
  };
}

// ─────────────────────────────────────────────────────────────────
// Sanity / defaults
// ─────────────────────────────────────────────────────────────────

test('DEFAULT_RANGE is 3', () => {
  assert.equal(DEFAULT_RANGE, 3);
});

test('manhattanDistance: basic + null guards', () => {
  assert.equal(manhattanDistance({ x: 0, y: 0 }, { x: 2, y: 1 }), 3);
  assert.equal(manhattanDistance({ x: 1, y: 1 }, { x: 1, y: 1 }), 0);
  assert.equal(manhattanDistance(null, { x: 0, y: 0 }), Infinity);
  assert.equal(manhattanDistance({ x: 0, y: 0 }, null), Infinity);
});

// ─────────────────────────────────────────────────────────────────
// Empty / degraded inputs
// ─────────────────────────────────────────────────────────────────

test('computeTelepathicReveal: null session → []', () => {
  assert.deepEqual(computeTelepathicReveal(null), []);
  assert.deepEqual(computeTelepathicReveal({}), []);
  assert.deepEqual(computeTelepathicReveal({ units: [] }), []);
});

test('computeTelepathicReveal: no roundState → []', () => {
  const session = { units: [makeUnit()] };
  assert.deepEqual(computeTelepathicReveal(session), []);
});

test('computeTelepathicReveal: empty pending_intents → []', () => {
  const session = makeSession([makeUnit()], []);
  assert.deepEqual(computeTelepathicReveal(session), []);
});

test('computeTelepathicReveal: no actor has telepatic_link → []', () => {
  const player = makeUnit({ id: 'p_scout', position: { x: 1, y: 1 } });
  const enemy = makeUnit({
    id: 'e_nomad_1',
    controlled_by: 'sistema',
    position: { x: 2, y: 1 },
  });
  const session = makeSession(
    [player, enemy],
    [{ unit_id: 'e_nomad_1', action: { type: 'attack', target_id: 'p_scout' } }],
  );
  assert.deepEqual(computeTelepathicReveal(session), []);
});

// ─────────────────────────────────────────────────────────────────
// Active link cases
// ─────────────────────────────────────────────────────────────────

test('computeTelepathicReveal: active link reveals enemy attack within range', () => {
  const player = makeUnit({
    id: 'p_scout',
    position: { x: 1, y: 1 },
    status: { telepatic_link: 2 },
  });
  const enemy = makeUnit({
    id: 'e_nomad_1',
    controlled_by: 'sistema',
    position: { x: 2, y: 2 }, // distance 2 ≤ 3
  });
  const session = makeSession(
    [player, enemy],
    [{ unit_id: 'e_nomad_1', action: { type: 'attack', target_id: 'p_scout' } }],
  );
  const result = computeTelepathicReveal(session);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    actor_id: 'p_scout',
    revealed: [{ enemy_id: 'e_nomad_1', intent_type: 'attack', target_id: 'p_scout', distance: 2 }],
  });
});

test('computeTelepathicReveal: enemy out of range NOT revealed', () => {
  const player = makeUnit({
    id: 'p_scout',
    position: { x: 0, y: 0 },
    status: { telepatic_link: 1 },
  });
  const farEnemy = makeUnit({
    id: 'e_far',
    controlled_by: 'sistema',
    position: { x: 5, y: 5 }, // distance 10 > 3
  });
  const session = makeSession(
    [player, farEnemy],
    [{ unit_id: 'e_far', action: { type: 'move', move_to: { x: 4, y: 5 } } }],
  );
  assert.deepEqual(computeTelepathicReveal(session), []);
});

test('computeTelepathicReveal: respects custom range', () => {
  const player = makeUnit({
    id: 'p_scout',
    position: { x: 0, y: 0 },
    status: { telepatic_link: 1 },
  });
  const enemy = makeUnit({
    id: 'e_far',
    controlled_by: 'sistema',
    position: { x: 5, y: 0 }, // distance 5
  });
  const session = makeSession(
    [player, enemy],
    [{ unit_id: 'e_far', action: { type: 'attack', target_id: 'p_scout' } }],
  );
  // Default 3 → no reveal
  assert.deepEqual(computeTelepathicReveal(session), []);
  // Range 6 → reveal
  const widened = computeTelepathicReveal(session, { range: 6 });
  assert.equal(widened.length, 1);
  assert.equal(widened[0].revealed[0].distance, 5);
});

test('computeTelepathicReveal: KO actor → no reveal', () => {
  const player = makeUnit({
    id: 'p_scout',
    hp: 0,
    position: { x: 1, y: 1 },
    status: { telepatic_link: 2 },
  });
  const enemy = makeUnit({
    id: 'e_nomad_1',
    controlled_by: 'sistema',
    position: { x: 2, y: 1 },
  });
  const session = makeSession(
    [player, enemy],
    [{ unit_id: 'e_nomad_1', action: { type: 'attack', target_id: 'p_scout' } }],
  );
  assert.deepEqual(computeTelepathicReveal(session), []);
});

test('computeTelepathicReveal: KO enemy NOT in revealed', () => {
  const player = makeUnit({
    id: 'p_scout',
    position: { x: 1, y: 1 },
    status: { telepatic_link: 2 },
  });
  const deadEnemy = makeUnit({
    id: 'e_dead',
    hp: 0,
    controlled_by: 'sistema',
    position: { x: 2, y: 1 },
  });
  const session = makeSession(
    [player, deadEnemy],
    [{ unit_id: 'e_dead', action: { type: 'attack', target_id: 'p_scout' } }],
  );
  assert.deepEqual(computeTelepathicReveal(session), []);
});

test('computeTelepathicReveal: same-faction intent NOT revealed', () => {
  const player = makeUnit({
    id: 'p_scout',
    position: { x: 1, y: 1 },
    status: { telepatic_link: 2 },
  });
  const ally = makeUnit({ id: 'p_tank', position: { x: 2, y: 1 } });
  const session = makeSession(
    [player, ally],
    // ally intent (same player faction) → not revealed
    [{ unit_id: 'p_tank', action: { type: 'attack', target_id: 'e_x' } }],
  );
  assert.deepEqual(computeTelepathicReveal(session), []);
});

test('computeTelepathicReveal: multi-actor independent reveals', () => {
  const a = makeUnit({
    id: 'p_a',
    position: { x: 0, y: 0 },
    status: { telepatic_link: 2 },
  });
  const b = makeUnit({
    id: 'p_b',
    position: { x: 8, y: 8 },
    status: { telepatic_link: 1 },
  });
  const e1 = makeUnit({
    id: 'e_close_to_a',
    controlled_by: 'sistema',
    position: { x: 1, y: 0 }, // distance 1 from a, 15 from b
  });
  const e2 = makeUnit({
    id: 'e_close_to_b',
    controlled_by: 'sistema',
    position: { x: 7, y: 8 }, // distance 15 from a, 1 from b
  });
  const session = makeSession(
    [a, b, e1, e2],
    [
      { unit_id: 'e_close_to_a', action: { type: 'attack', target_id: 'p_a' } },
      { unit_id: 'e_close_to_b', action: { type: 'move', move_to: { x: 7, y: 7 } } },
    ],
  );
  const result = computeTelepathicReveal(session);
  assert.equal(result.length, 2);
  const byActor = Object.fromEntries(result.map((r) => [r.actor_id, r.revealed]));
  assert.equal(byActor.p_a.length, 1);
  assert.equal(byActor.p_a[0].enemy_id, 'e_close_to_a');
  assert.equal(byActor.p_b.length, 1);
  assert.equal(byActor.p_b[0].enemy_id, 'e_close_to_b');
});

test('computeTelepathicReveal: multiple enemies for single actor', () => {
  const player = makeUnit({
    id: 'p_scout',
    position: { x: 0, y: 0 },
    status: { telepatic_link: 3 },
  });
  const e1 = makeUnit({
    id: 'e_1',
    controlled_by: 'sistema',
    position: { x: 1, y: 0 },
  });
  const e2 = makeUnit({
    id: 'e_2',
    controlled_by: 'sistema',
    position: { x: 0, y: 2 },
  });
  const session = makeSession(
    [player, e1, e2],
    [
      { unit_id: 'e_1', action: { type: 'attack', target_id: 'p_scout' } },
      { unit_id: 'e_2', action: { type: 'skip' } },
    ],
  );
  const result = computeTelepathicReveal(session);
  assert.equal(result.length, 1);
  assert.equal(result[0].revealed.length, 2);
  const byEnemy = Object.fromEntries(result[0].revealed.map((r) => [r.enemy_id, r]));
  assert.equal(byEnemy.e_1.intent_type, 'attack');
  assert.equal(byEnemy.e_1.target_id, 'p_scout');
  assert.equal(byEnemy.e_2.intent_type, 'skip');
  assert.equal(byEnemy.e_2.target_id, null);
});

test('computeTelepathicReveal: zero/negative status value → skip', () => {
  const player = makeUnit({
    id: 'p_scout',
    position: { x: 0, y: 0 },
    status: { telepatic_link: 0 },
  });
  const enemy = makeUnit({
    id: 'e_nomad_1',
    controlled_by: 'sistema',
    position: { x: 1, y: 0 },
  });
  const session = makeSession(
    [player, enemy],
    [{ unit_id: 'e_nomad_1', action: { type: 'attack', target_id: 'p_scout' } }],
  );
  assert.deepEqual(computeTelepathicReveal(session), []);
});
