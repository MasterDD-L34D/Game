// tests/api/losAttackGate.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { losGateBlocks } = require('../../apps/backend/routes/session');

// Pure exported helper (added in Step 3) so we can unit-test the gate without a full HTTP session.
test('flag OFF: gate never blocks (band-neutral)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losGateBlocks(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
});

test('flag ON: ranged shot through a rock is blocked', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losGateBlocks(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: clear shot is allowed', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [] };
  assert.equal(losGateBlocks(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: a non-blocker terrain (lava) between does NOT block', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'lava' }] };
  assert.equal(losGateBlocks(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
  delete process.env.COMBAT_LOS_ENABLED;
});
