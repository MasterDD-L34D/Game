// tests/services/combat/membraneOsmotiche.test.js
//
// membrane_osmotiche (creature-trait mechanics slice 5 + terrain-heal -- otyugh).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   duration_absorb: incoming status durations -1 on apply (slice 5).
//   terrain-heal: heal 1 at end-of-round when adjacent to water/bog terrain --
//   unblocked once the move terrain-cost substrate (phase 1, #3012) carries
//   grid.terrain_features at runtime.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  absorbStatusDuration,
  applyTerrainHeal,
  hasTrait,
  MEMBRANE_TRAIT,
  ABSORB,
  TERRAIN_HEAL,
  WATER_BOG_TERRAIN,
} = require('../../../apps/backend/services/combat/membraneOsmotiche');

const { terrainAtFromFeatures } = require('../../../apps/backend/services/combat/moveCost');

test('a membrane carrier absorbs 1 turn off an incoming status duration', () => {
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 3 }), 2);
  assert.equal(absorbStatusDuration({ target: u, turns: 2 }), 1);
});

test('a 1-turn status is fully absorbed (reduced to 0 -> does not land)', () => {
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 1 }), 0);
});

test('absorb never goes negative', () => {
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 0 }), 0);
});

test('a non-carrier passes the duration through unchanged', () => {
  const u = { traits: ['other'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 3 }), 3);
  assert.equal(absorbStatusDuration({ target: { traits: [] }, turns: 3 }), 3);
});

test('tolerant of null target / non-numeric turns', () => {
  assert.equal(absorbStatusDuration({ target: null, turns: 3 }), 3);
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 'x' }), 'x', 'non-numeric returned as-is');
});

test('tolerates object-shaped traits {id}', () => {
  const u = { traits: [{ id: 'membrane_osmotiche' }] };
  assert.equal(absorbStatusDuration({ target: u, turns: 2 }), 1);
});

test('hasTrait + constants', () => {
  assert.equal(hasTrait({ traits: ['membrane_osmotiche'] }, MEMBRANE_TRAIT), true);
  assert.equal(MEMBRANE_TRAIT, 'membrane_osmotiche');
  assert.equal(ABSORB, 1);
});

// --- terrain-heal (heal 1 when adjacent to water/bog) ---------------------------------

function carrier(overrides = {}) {
  return {
    traits: ['membrane_osmotiche'],
    position: { x: 2, y: 2 },
    hp: 5,
    max_hp: 10,
    ...overrides,
  };
}

test('a membrane carrier adjacent to deep water heals 1 (capped at max_hp)', () => {
  const u = carrier({ hp: 5, max_hp: 10 });
  const terrainAt = terrainAtFromFeatures([{ x: 3, y: 2, type: 'acqua_profonda' }]);
  const r = applyTerrainHeal(u, { terrainAt });
  assert.deepEqual(r, { healed: 1 });
  assert.equal(u.hp, 6);
});

test('heals only up to max_hp (9/10 -> 10, healed 1)', () => {
  const u = carrier({ hp: 9, max_hp: 10 });
  const terrainAt = terrainAtFromFeatures([{ x: 1, y: 2, type: 'acqua_profonda' }]);
  const r = applyTerrainHeal(u, { terrainAt });
  assert.deepEqual(r, { healed: 1 });
  assert.equal(u.hp, 10);
});

test('a carrier already at full HP does not over-heal (null)', () => {
  const u = carrier({ hp: 10, max_hp: 10 });
  const terrainAt = terrainAtFromFeatures([{ x: 3, y: 2, type: 'acqua_profonda' }]);
  assert.equal(applyTerrainHeal(u, { terrainAt }), null);
  assert.equal(u.hp, 10);
});

test('no adjacent water/bog -> null (no heal)', () => {
  const u = carrier({ hp: 5 });
  const terrainAt = terrainAtFromFeatures([{ x: 5, y: 5, type: 'acqua_profonda' }]);
  assert.equal(applyTerrainHeal(u, { terrainAt }), null);
  assert.equal(u.hp, 5);
});

test('diagonal water does NOT trigger (4-neighbour adjacency only)', () => {
  const u = carrier({ hp: 5, position: { x: 2, y: 2 } });
  const terrainAt = terrainAtFromFeatures([{ x: 3, y: 3, type: 'acqua_profonda' }]);
  assert.equal(applyTerrainHeal(u, { terrainAt }), null);
});

test('bog/water synonyms (palude, acqua) also trigger the heal', () => {
  const palude = terrainAtFromFeatures([{ x: 2, y: 3, type: 'palude' }]);
  assert.deepEqual(applyTerrainHeal(carrier({ hp: 5 }), { terrainAt: palude }), { healed: 1 });
  const acqua = terrainAtFromFeatures([{ x: 2, y: 1, type: 'acqua' }]);
  assert.deepEqual(applyTerrainHeal(carrier({ hp: 5 }), { terrainAt: acqua }), { healed: 1 });
});

test('a non-carrier adjacent to water does NOT heal (null)', () => {
  const u = { traits: ['other'], position: { x: 2, y: 2 }, hp: 5, max_hp: 10 };
  const terrainAt = terrainAtFromFeatures([{ x: 3, y: 2, type: 'acqua_profonda' }]);
  assert.equal(applyTerrainHeal(u, { terrainAt }), null);
  assert.equal(u.hp, 5);
});

test('a downed carrier (hp<=0) does not heal', () => {
  const u = carrier({ hp: 0, max_hp: 10 });
  const terrainAt = terrainAtFromFeatures([{ x: 3, y: 2, type: 'acqua_profonda' }]);
  assert.equal(applyTerrainHeal(u, { terrainAt }), null);
  assert.equal(u.hp, 0);
});

test('non-water adjacent terrain (roccia) does not trigger', () => {
  const u = carrier({ hp: 5 });
  const terrainAt = terrainAtFromFeatures([{ x: 3, y: 2, type: 'roccia' }]);
  assert.equal(applyTerrainHeal(u, { terrainAt }), null);
});

test('tolerant of a carrier with no position / no terrainAt', () => {
  assert.equal(applyTerrainHeal({ traits: ['membrane_osmotiche'], hp: 5, max_hp: 10 }, {}), null);
  assert.equal(applyTerrainHeal(null, { terrainAt: () => 'acqua_profonda' }), null);
});

test('TERRAIN_HEAL constant + WATER_BOG_TERRAIN set', () => {
  assert.equal(TERRAIN_HEAL, 1);
  assert.ok(WATER_BOG_TERRAIN.has('acqua_profonda'));
});
