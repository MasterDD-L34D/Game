// tests/services/combat/moveCost.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  moveCost,
  terrainAtFromFeatures,
} = require('../../../apps/backend/services/combat/moveCost');

const bounds = { width: 6, height: 6 };
const flat = () => null; // no terrain anywhere -> all default

const medium = { terrain_cost_multiplier: { roccia: 1.5, default: 1.0 } };

test('all-default terrain: cost equals Manhattan distance', () => {
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 3, y: 0 }, medium, flat, bounds), 3);
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 2, y: 2 }, medium, flat, bounds), 4);
});

test('routes around a costly tile when cheaper', () => {
  // roccia (mult 1.5) at (1,0); going (0,0)->(2,0). Straight enters (1,0)+(2,0)=1.5+1=2.5.
  // Detour via y=1 = 4 default tiles = 4. Straight is cheaper -> 2.5.
  const terrainAt = terrainAtFromFeatures([{ x: 1, y: 0, type: 'roccia' }]);
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 2, y: 0 }, medium, terrainAt, bounds), 2.5);
});

test('detours around an expensive wall of tiles', () => {
  // lava (mult 5) at (1,0); (0,0)->(2,0): straight enters lava(5)+default(1)=6; detour via y=1 = 4.
  const lavaProfile = { terrain_cost_multiplier: { lava: 5, default: 1.0 } };
  const terrainAt = terrainAtFromFeatures([{ x: 1, y: 0, type: 'lava' }]);
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 2, y: 0 }, lavaProfile, terrainAt, bounds), 4);
});

test('source equals dest -> cost 0', () => {
  assert.equal(moveCost({ x: 2, y: 2 }, { x: 2, y: 2 }, medium, flat, bounds), 0);
});

test('out-of-bounds dest -> Infinity', () => {
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 9, y: 9 }, medium, flat, bounds), Infinity);
});

test('terrainAtFromFeatures returns type at coords, null elsewhere', () => {
  const at = terrainAtFromFeatures([{ x: 4, y: 3, type: 'vegetazione_densa' }]);
  assert.equal(at(4, 3), 'vegetazione_densa');
  assert.equal(at(0, 0), null);
});
