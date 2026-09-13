// tests/services/combat/movementResolver.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveMovementProfile,
  deriveProfile,
  applyVoloGrade,
  evaluateVoloGrade,
  HAZARD_TERRAIN,
} = require('../../../apps/backend/services/combat/movementResolver');

test('explicit species movement_profile wins', () => {
  const p = resolveMovementProfile({ morphotype: 'corazzato' }, { movement_profile: 'light' });
  assert.equal(p.terrain_cost_multiplier.roccia ?? 1.0, 1.0); // light => no roccia penalty
});

test('derives heavy from a heavy morphotype when no explicit field', () => {
  const p = resolveMovementProfile({ morphotype: 'corazzato' }, null);
  assert.equal(p.terrain_cost_multiplier.roccia, 2.0);
});

test('derives light from a flyer morphotype', () => {
  assert.equal(deriveProfile('volante', null), 'light');
  assert.equal(deriveProfile('alato', null), 'light');
});

test('orphan with no morphotype/form falls back to medium', () => {
  assert.equal(deriveProfile(null, null), 'medium');
  const p = resolveMovementProfile({}, null);
  assert.equal(p.terrain_cost_multiplier.roccia, 1.5); // medium roccia
});

test('form nudges toward light when morphotype is absent', () => {
  assert.equal(deriveProfile(null, 'agile'), 'light');
});

test('volo grade 1 frees normal terrain but not hazard', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, lava: 2.0, default: 1.0 } };
  const g1 = applyVoloGrade(heavy, 1);
  assert.equal(g1.terrain_cost_multiplier.roccia, 1.0);
  assert.equal(g1.terrain_cost_multiplier.lava, 2.0); // hazard unchanged
});

test('volo grade 2 reduces hazard but keeps it >=1', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, lava: 2.0, default: 1.0 } };
  const g2 = applyVoloGrade(heavy, 2);
  assert.equal(g2.terrain_cost_multiplier.roccia, 1.0);
  assert.equal(g2.terrain_cost_multiplier.lava, 1.5);
});

test('volo grade 3 frees everything incl. hazard', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, lava: 2.0, default: 1.0 } };
  const g3 = applyVoloGrade(heavy, 3);
  assert.equal(g3.terrain_cost_multiplier.roccia, 1.0);
  assert.equal(g3.terrain_cost_multiplier.lava, 1.0);
});

test('volo grade 0 / no trait leaves the profile unchanged', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, default: 1.0 } };
  assert.deepEqual(applyVoloGrade(heavy, 0), heavy);
  assert.equal(evaluateVoloGrade({}, { traits: [] }), 0);
});

test('evaluateVoloGrade reads grade from the registry, default 1 when present', () => {
  const registry = { adattamento_volo: { effect: { grade: 3 } } };
  assert.equal(evaluateVoloGrade(registry, { traits: ['adattamento_volo'] }), 3);
  assert.equal(evaluateVoloGrade({ adattamento_volo: {} }, { traits: ['adattamento_volo'] }), 1);
});

test('HAZARD_TERRAIN is the lava/acqua_profonda set', () => {
  assert.ok(HAZARD_TERRAIN.has('lava'));
  assert.ok(HAZARD_TERRAIN.has('acqua_profonda'));
});
