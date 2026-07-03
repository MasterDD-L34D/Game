// tests/services/losForGrid.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { losClearOnGrid } = require('../../apps/backend/services/combat/losForGrid');

test('flag OFF: always visible (band-neutral) even with a blocker', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losClearOnGrid(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
});

test('flag ON: blocker between => not visible', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losClearOnGrid(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: clear line => visible', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  assert.equal(losClearOnGrid({ terrain_features: [] }, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
  delete process.env.COMBAT_LOS_ENABLED;
});
