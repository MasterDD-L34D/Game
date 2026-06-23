// tests/services/combat/moveTerrainWire.test.js
//
// Phase 1: flag + AP-distance integration helper for the move terrain-cost wire.
// The flag MUST default OFF (band-neutral) and only flip ON for the literal string "true"
// (mirror staminaFatigue.isFatigueEnabled). moveApDistance = ceil(moveCost), Infinity if unreachable.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isMoveTerrainCostEnabled,
  moveApDistance,
  terrainAtFromFeatures,
} = require('../../../apps/backend/services/combat/moveCost');

test('flag is OFF by default and ON only when "true"', () => {
  assert.equal(isMoveTerrainCostEnabled({}), false);
  assert.equal(isMoveTerrainCostEnabled({ MOVE_TERRAIN_COST_ENABLED: 'true' }), true);
  assert.equal(isMoveTerrainCostEnabled({ MOVE_TERRAIN_COST_ENABLED: '1' }), false);
  assert.equal(isMoveTerrainCostEnabled(undefined), false);
});

test('moveApDistance returns ceil(moveCost) with terrain', () => {
  const profile = { terrain_cost_multiplier: { roccia: 1.5, default: 1.0 } };
  const terrainAt = terrainAtFromFeatures([{ x: 1, y: 0, type: 'roccia' }]);
  const d = moveApDistance(
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { profile, terrainAt, bounds: { width: 6, height: 6 } },
  );
  assert.equal(d, 2); // ceil(1.5)
});

test('moveApDistance on all-default terrain equals Manhattan (band-neutral)', () => {
  const profile = { terrain_cost_multiplier: { default: 1.0 } };
  const d = moveApDistance(
    { x: 0, y: 0 },
    { x: 2, y: 1 },
    { profile, terrainAt: () => null, bounds: { width: 6, height: 6 } },
  );
  assert.equal(d, 3);
});

test('moveApDistance returns Infinity when unreachable', () => {
  const d = moveApDistance(
    { x: 0, y: 0 },
    { x: 9, y: 9 },
    {
      profile: { terrain_cost_multiplier: { default: 1.0 } },
      terrainAt: () => null,
      bounds: { width: 6, height: 6 },
    },
  );
  assert.equal(d, Infinity);
});
