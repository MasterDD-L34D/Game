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

// --- opts.budget (multi-tile lookahead within the AP move budget) ---
//
// 1-row corridor fixture (6x1): actor (0,0), enemy (4,0), single roccia at
// (2,0). No 4-neighbor step reopens LOS ((1,0) is still behind the blocker),
// but standing ON the blocker tile (2,0) -- legal: terrain blocks LOS, not
// movement -- reopens the line (endpoints excluded, only (3,0) between).
const CORRIDOR = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }], width: 6, height: 1 };
const corridorActor = () => ({ position: { x: 0, y: 0 }, attack_range: 5 });
const corridorEnemies = () => [{ position: { x: 4, y: 0 }, hp: 5 }];

test('flag ON, budget 2: reaches a firing tile two tiles away when no single step reopens LOS', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const dest = stepToRegainLos(corridorActor(), corridorEnemies(), CORRIDOR, { budget: 2 });
  assert.deepEqual(dest, { x: 2, y: 0 });
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON, default budget stays 1: same corridor -> null (byte-identical greedy)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  assert.equal(stepToRegainLos(corridorActor(), corridorEnemies(), CORRIDOR, {}), null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON, budget 2: prefers the cheaper tile when a 1-step tile already reopens LOS', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  // WALL (x=2, y=0..1) fixture: (0,2) reopens at cost 1; a bigger budget must
  // not pick a farther tile (cost-first metric preserves AP for attacks).
  const actor = { position: { x: 0, y: 1 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 1 }, hp: 5 }];
  const dest = stepToRegainLos(actor, enemies, grid(WALL), { budget: 2 });
  assert.deepEqual(dest, { x: 0, y: 2 });
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON, budget 2: excludes an occupied multi-tile destination', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const dest = stepToRegainLos(corridorActor(), corridorEnemies(), CORRIDOR, {
    budget: 2,
    occupied: new Set(['2,0']),
  });
  assert.equal(dest, null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON, budget 2: candidate must still put the enemy in attack_range', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = { ...corridorActor(), attack_range: 1 };
  // From (2,0) the enemy at (4,0) is at distance 2 > range 1 -> no valid tile.
  assert.equal(stepToRegainLos(actor, corridorEnemies(), CORRIDOR, { budget: 2 }), null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON, budget <= 0: returns null (turn-starved guard)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  assert.equal(stepToRegainLos(corridorActor(), corridorEnemies(), CORRIDOR, { budget: 0 }), null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON, budget 3: deterministic (same input -> same tile)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const a = stepToRegainLos(corridorActor(), corridorEnemies(), CORRIDOR, { budget: 3 });
  const b = stepToRegainLos(corridorActor(), corridorEnemies(), CORRIDOR, { budget: 3 });
  assert.deepEqual(a, b);
  assert.ok(a);
  delete process.env.COMBAT_LOS_ENABLED;
});

// --- COMBAT_LOS_REPOSITION_MODE (probe-only knob, read per-call) ---
// 'off'  -> repositioning disabled on BOTH seams (null), LOS gate untouched.
// 'step' -> budget clamped to 1 (shipped greedy), for step-vs-budget probe arms.
// unset  -> opts.budget honored (default 1).

test("mode 'off': returns null even when a reopening tile exists (LOS still ON)", () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  process.env.COMBAT_LOS_REPOSITION_MODE = 'off';
  const actor = { position: { x: 0, y: 1 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 1 }, hp: 5 }];
  assert.equal(stepToRegainLos(actor, enemies, grid(WALL), {}), null);
  delete process.env.COMBAT_LOS_REPOSITION_MODE;
  delete process.env.COMBAT_LOS_ENABLED;
});

test("mode 'step': clamps the budget to 1 (multi-tile candidates excluded)", () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  process.env.COMBAT_LOS_REPOSITION_MODE = 'step';
  assert.equal(stepToRegainLos(corridorActor(), corridorEnemies(), CORRIDOR, { budget: 3 }), null);
  delete process.env.COMBAT_LOS_REPOSITION_MODE;
  delete process.env.COMBAT_LOS_ENABLED;
});
