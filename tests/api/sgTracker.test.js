// V5 SG earn formula tests — Opzione C mixed (ADR-2026-04-26)

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initUnit,
  accumulate,
  resetEncounter,
  beginTurn,
  spend,
  DAMAGE_TAKEN_THRESHOLD,
  DAMAGE_DEALT_THRESHOLD,
  POOL_MAX,
  EARN_PER_TURN_CAP,
} = require('../../apps/backend/services/combat/sgTracker');

test('initUnit: idempotent, sets defaults', () => {
  const u = {};
  initUnit(u);
  assert.equal(u.sg, 0);
  assert.equal(u.sg_taken_acc, 0);
  assert.equal(u.sg_dealt_acc, 0);
  assert.equal(u.sg_earned_this_turn, 0);
  // Re-apply doesn't overwrite
  u.sg = 2;
  initUnit(u);
  assert.equal(u.sg, 2);
});

test('accumulate: damage_taken >= 5 → +1 SG', () => {
  const u = { sg: 0, sg_taken_acc: 0, sg_dealt_acc: 0, sg_earned_this_turn: 0 };
  const res = accumulate(u, { damage_taken: 5 });
  assert.equal(res.earned, 1);
  assert.deepEqual(res.source, ['taken']);
  assert.equal(u.sg, 1);
  assert.equal(u.sg_taken_acc, 0);
});

test('accumulate: damage_dealt >= 8 → +1 SG', () => {
  const u = initUnit({});
  const res = accumulate(u, { damage_dealt: 8 });
  assert.equal(res.earned, 1);
  assert.deepEqual(res.source, ['dealt']);
  assert.equal(u.sg, 1);
});

test('accumulate: rollover preserves residuo', () => {
  const u = initUnit({});
  accumulate(u, { damage_taken: 7 });
  assert.equal(u.sg, 1);
  assert.equal(u.sg_taken_acc, 2, 'residuo 7-5=2');
});

test('accumulate: mixed taken + dealt simultanei', () => {
  const u = initUnit({});
  const res = accumulate(u, { damage_taken: 5, damage_dealt: 8 });
  assert.equal(res.earned, 2);
  assert.deepEqual(res.source, ['taken', 'dealt']);
  assert.equal(u.sg, 2);
});

test('accumulate: cap per turn = 2 SG earn max', () => {
  const u = initUnit({});
  const res = accumulate(u, { damage_taken: 20, damage_dealt: 20 });
  // 20/5=4 taken + 20/8=2 dealt = 6 potential, capped a 2
  assert.equal(res.earned, 2);
  assert.equal(u.sg, 2);
});

test('accumulate: pool max 3', () => {
  const u = initUnit({});
  u.sg = 3;
  const res = accumulate(u, { damage_taken: 100 });
  assert.equal(res.earned, 0);
  assert.equal(u.sg, 3);
});

test('accumulate: no earn after per-turn cap reached', () => {
  const u = initUnit({});
  accumulate(u, { damage_taken: 10 }); // +2 SG
  assert.equal(u.sg, 2);
  const res = accumulate(u, { damage_dealt: 16 }); // would +2, cap blocks
  assert.equal(res.earned, 0);
  assert.equal(u.sg, 2);
});

test('beginTurn: resets per-turn earn counter', () => {
  const u = initUnit({});
  accumulate(u, { damage_taken: 10 }); // +2 SG, counter at 2
  beginTurn(u);
  assert.equal(u.sg_earned_this_turn, 0);
  const res = accumulate(u, { damage_dealt: 8 });
  assert.equal(res.earned, 1, 'new turn unlocked earn');
});

test('resetEncounter: clears pool + accumulators', () => {
  const u = initUnit({});
  accumulate(u, { damage_taken: 7, damage_dealt: 12 });
  resetEncounter(u);
  assert.equal(u.sg, 0);
  assert.equal(u.sg_taken_acc, 0);
  assert.equal(u.sg_dealt_acc, 0);
});

test('spend: consumes pool if sufficient', () => {
  const u = initUnit({});
  u.sg = 2;
  assert.equal(spend(u, 1), true);
  assert.equal(u.sg, 1);
  assert.equal(spend(u, 2), false);
  assert.equal(u.sg, 1);
});

test('constants match ADR canonical', () => {
  assert.equal(DAMAGE_TAKEN_THRESHOLD, 5);
  assert.equal(DAMAGE_DEALT_THRESHOLD, 8);
  assert.equal(POOL_MAX, 3);
  assert.equal(EARN_PER_TURN_CAP, 2);
});
