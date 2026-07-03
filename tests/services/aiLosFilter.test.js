// tests/services/aiLosFilter.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { losClearForAi } = require('../../apps/backend/services/ai/policy');

test('flag OFF: AI LOS filter is a no-op (allows all)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losClearForAi(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
});

test('flag ON: AI cannot target through a rock', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losClearForAi(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: AI can target with a clear line', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [] };
  assert.equal(losClearForAi(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
  delete process.env.COMBAT_LOS_ENABLED;
});
