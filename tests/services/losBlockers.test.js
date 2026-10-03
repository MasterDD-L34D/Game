// tests/services/losBlockers.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  terrainBlocksLos,
  unitsBlockLos,
  _normalizeConfig,
} = require('../../apps/backend/services/combat/losBlockers');

test('rock, dense vegetation, obstacle block LOS', () => {
  assert.equal(terrainBlocksLos('roccia'), true);
  assert.equal(terrainBlocksLos('vegetazione_densa'), true);
  assert.equal(terrainBlocksLos('obstacle'), true);
});

test('elevation, lava, deep water, null do NOT block LOS', () => {
  assert.equal(terrainBlocksLos('elevation'), false);
  assert.equal(terrainBlocksLos('lava'), false);
  assert.equal(terrainBlocksLos('acqua_profonda'), false);
  assert.equal(terrainBlocksLos(null), false);
  assert.equal(terrainBlocksLos(undefined), false);
});

test('units do not block LOS in slice 1', () => {
  assert.equal(unitsBlockLos(), false);
});

test('config drives the blocker set and units flag', () => {
  const cfg = _normalizeConfig({
    blocker_terrain_types: ['roccia', 'obstacle'],
    units_block_los: true,
  });
  assert.equal(cfg.blockers.has('roccia'), true);
  assert.equal(cfg.blockers.has('obstacle'), true);
  assert.equal(cfg.unitsBlock, true);
});

test('malformed blocker_terrain_types (non-array scalar) falls back to no blockers', () => {
  const cfg = _normalizeConfig({ blocker_terrain_types: 'roccia' });
  assert.equal(cfg.blockers.size, 0);
  assert.equal(cfg.blockers.has('r'), false);
});

test('empty/missing config yields no blockers and units do not block', () => {
  const cfg = _normalizeConfig({});
  assert.equal(cfg.blockers.size, 0);
  assert.equal(cfg.unitsBlock, false);
});
