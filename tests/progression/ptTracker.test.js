'use strict';

const test = require('node:test');
const assert = require('node:assert');

const ptTracker = require('../../apps/backend/services/combat/ptTracker');

// PT tracker (26-ECONOMY §PT, P0 Q51 B): pool 0..12, per-ROUND reset, earn the
// per-attack technique roll (nat 15-19 +1 / nat 20 +2 / +5 MoS +1, computed in
// resolveAttack), spend on cost_pt abilities + maneuvers. Mirrors ppTracker but
// cap 12 + resetRound (NOT resetEncounter) + numeric earn (accumulate the roll).

test('POOL_MAX = 12 (PT_POOL_CAP, canon)', () => {
  assert.strictEqual(ptTracker.POOL_MAX, 12);
});

test('earn accumulates the roll value; undefined pt -> amount', () => {
  const u = {};
  assert.strictEqual(ptTracker.earn(u, 3), 3);
  assert.strictEqual(u.pt, 3);
  assert.strictEqual(ptTracker.earn(u, 2), 2);
  assert.strictEqual(u.pt, 5);
});

test('earn caps at POOL_MAX (12); partial gain at the cap, none past it', () => {
  const u = { pt: 10 };
  assert.strictEqual(ptTracker.earn(u, 5), 2); // 10 -> 12, only +2 counted
  assert.strictEqual(u.pt, 12);
  assert.strictEqual(ptTracker.earn(u, 3), 0); // already capped
  assert.strictEqual(u.pt, 12);
});

test('earn ignores null unit / non-positive amount', () => {
  assert.strictEqual(ptTracker.earn(null, 1), 0);
  assert.strictEqual(ptTracker.earn({}, 0), 0);
  assert.strictEqual(ptTracker.earn({}, -2), 0);
});

test('resetRound clears the pool to 0 (per-round, NOT per-encounter)', () => {
  const u = { pt: 7 };
  ptTracker.resetRound(u);
  assert.strictEqual(u.pt, 0);
});

test('spend decrements when sufficient, returns true', () => {
  const u = { pt: 5 };
  assert.strictEqual(ptTracker.spend(u, 3), true);
  assert.strictEqual(u.pt, 2);
});

test('spend returns false when insufficient, pool unchanged', () => {
  const u = { pt: 2 };
  assert.strictEqual(ptTracker.spend(u, 3), false);
  assert.strictEqual(u.pt, 2);
});

test('initUnit seeds pt=0 idempotently (preserves an existing value)', () => {
  const u = {};
  ptTracker.initUnit(u);
  assert.strictEqual(u.pt, 0);
  u.pt = 4;
  ptTracker.initUnit(u);
  assert.strictEqual(u.pt, 4);
});
