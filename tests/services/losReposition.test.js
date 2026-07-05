// tests/services/losReposition.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { stepToRegainLos } = require('../../apps/backend/services/combat/losReposition');

// A vertical wall of roccia at x=2 (y=0..1) blocks a straight horizontal shot but
// leaves the tile above the actor open to sidestep and shoot around it.
function grid(features) {
  return { terrain_features: features, width: 6, height: 6 };
}
const WALL = [
  { x: 2, y: 0, type: 'roccia' },
  { x: 2, y: 1, type: 'roccia' },
];

test('flag OFF: helper is a no-op (returns null even when a step would open LOS)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const actor = { position: { x: 0, y: 0 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 0 }, hp: 5 }];
  assert.equal(stepToRegainLos(actor, enemies, grid(WALL), {}), null);
});

test('flag ON: steps to a 4-neighbor tile that reopens LOS to an in-range enemy', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  // Actor/enemy share y=1, which the 2-tile wall (y=0..1) also blocks; stepping
  // to (0,2) -- below the wall -- is the single 4-neighbor tile that reopens LOS.
  const actor = { position: { x: 0, y: 1 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 1 }, hp: 5 }];
  const dest = stepToRegainLos(actor, enemies, grid(WALL), {});
  assert.ok(dest, 'expected a repositioning tile');
  const { losClearOnGrid } = require('../../apps/backend/services/combat/losForGrid');
  assert.equal(losClearOnGrid(grid(WALL), dest, enemies[0].position), true);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: returns null when no single 4-neighbor step reopens LOS (full wall)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const full = [
    { x: 2, y: 0, type: 'roccia' },
    { x: 2, y: 1, type: 'roccia' },
    { x: 2, y: 2, type: 'roccia' },
    { x: 2, y: 3, type: 'roccia' },
    { x: 2, y: 4, type: 'roccia' },
    { x: 2, y: 5, type: 'roccia' },
  ];
  const actor = { position: { x: 0, y: 0 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 0 }, hp: 5 }];
  assert.equal(stepToRegainLos(actor, enemies, grid(full), {}), null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: excludes occupied + off-board candidate tiles', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  // Same actor/enemy as the "reopens LOS" case, where (0,2) is the ONLY tile
  // that reopens LOS; occupying it must force a null (no other step qualifies,
  // and off-board neighbors x=-1/y=-1 are already excluded by the bounds check).
  const actor = { position: { x: 0, y: 1 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 1 }, hp: 5 }];
  const dest = stepToRegainLos(actor, enemies, grid(WALL), { occupied: new Set(['0,2']) });
  assert.equal(dest, null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: deterministic (same input -> same tile)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = { position: { x: 3, y: 3 }, attack_range: 5 };
  const enemies = [{ position: { x: 5, y: 3 }, hp: 5 }];
  const feats = [{ x: 4, y: 3, type: 'roccia' }];
  const a = stepToRegainLos(actor, enemies, grid(feats), {});
  const b = stepToRegainLos(actor, enemies, grid(feats), {});
  assert.deepEqual(a, b);
  delete process.env.COMBAT_LOS_ENABLED;
});
