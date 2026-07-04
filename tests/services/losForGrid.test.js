// tests/services/losForGrid.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { losClearOnGrid, _unitBlocker } = require('../../apps/backend/services/combat/losForGrid');
const { lineOfSightClear } = require('../../apps/backend/services/grid/squareLos');

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

test('_unitBlocker disabled: no cell blocks (no-op)', () => {
  const blk = _unitBlocker([{ position: { x: 2, y: 0 }, hp: 5 }], false);
  assert.equal(blk(2, 0), false);
});

test('_unitBlocker enabled: a live unit occupies its cell', () => {
  const blk = _unitBlocker([{ position: { x: 2, y: 0 }, hp: 5 }], true);
  assert.equal(blk(2, 0), true);
  assert.equal(blk(3, 0), false);
});

test('_unitBlocker enabled: a dead unit (hp<=0) does not block', () => {
  const blk = _unitBlocker([{ position: { x: 2, y: 0 }, hp: 0 }], true);
  assert.equal(blk(2, 0), false);
});

test('_unitBlocker enabled: a unit with missing hp is treated as not-live (house `?? 0`)', () => {
  const blk = _unitBlocker([{ position: { x: 2, y: 0 } }], true);
  assert.equal(blk(2, 0), false);
});

test('unit-blocking geometry: interposed live unit blocks the ray (via squareLos)', () => {
  const units = [{ position: { x: 2, y: 0 }, hp: 5 }];
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 4, y: 0 }, _unitBlocker(units, true)), false);
});

test('unit-blocking endpoint-exclusion: a unit ON the target does NOT block', () => {
  const units = [{ position: { x: 4, y: 0 }, hp: 5 }];
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 4, y: 0 }, _unitBlocker(units, true)), true);
});

test('losClearOnGrid dormant: flag ON but units_block_los config false => unit does NOT block (band-neutral)', () => {
  // los.yaml ships units_block_los:false, so even with the LOS flag ON and a unit
  // between, the shared rule stays terrain-only (byte-identical to slice-1).
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [] };
  const units = [{ position: { x: 2, y: 0 }, hp: 5 }];
  assert.equal(losClearOnGrid(grid, { x: 0, y: 0 }, { x: 4, y: 0 }, units), true);
  delete process.env.COMBAT_LOS_ENABLED;
});
