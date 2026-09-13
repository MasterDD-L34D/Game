'use strict';

const test = require('node:test');
const assert = require('node:assert');

const ppTracker = require('../../apps/backend/services/combat/ppTracker');

// PP tracker (26-ECONOMY §PP): pool 0..3, +1 crit, +1 kill, per-encounter.

test('POOL_MAX = 3 (canon)', () => {
  assert.strictEqual(ppTracker.POOL_MAX, 3);
});

test('earnKill: +1 pp; undefined pp -> 1', () => {
  const u = {};
  assert.strictEqual(ppTracker.earnKill(u), 1);
  assert.strictEqual(u.pp, 1);
});

test('earnCrit: +1 pp', () => {
  const u = { pp: 1 };
  assert.strictEqual(ppTracker.earnCrit(u), 1);
  assert.strictEqual(u.pp, 2);
});

test('earn caps at POOL_MAX (3); no gain at cap', () => {
  const u = { pp: 3 };
  assert.strictEqual(ppTracker.earnKill(u), 0);
  assert.strictEqual(u.pp, 3);
});

test('crit + kill stack toward cap', () => {
  const u = { pp: 1 };
  ppTracker.earnCrit(u); // 2
  ppTracker.earnKill(u); // 3
  ppTracker.earnKill(u); // capped 3
  assert.strictEqual(u.pp, 3);
});

test('earn ignores null unit / non-positive amount', () => {
  assert.strictEqual(ppTracker.earn(null, 1), 0);
  assert.strictEqual(ppTracker.earn({}, 0), 0);
  assert.strictEqual(ppTracker.earn({}, -2), 0);
});
