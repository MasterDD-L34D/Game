// tests/services/worldgen/desertoCaldoHazardScenario.test.js
// Move terrain-cost substrate (2026-06-29): the mixed volo-graded roster + lava-wall
// terrain for the "bocche vulcaniche" hazard scenario. Path B (explicit volo_grade).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUnits,
  TERRAIN,
  SCENARIO,
} = require('../../../apps/backend/services/worldgen/desertoCaldoHazardScenario');

test('SCENARIO carries the loadable encounter_id + 8x8 grid', () => {
  assert.equal(SCENARIO.encounter_id, 'enc_deserto_caldo_bocche_vulcaniche_01');
  assert.equal(SCENARIO.grid_size, 8);
});

test('TERRAIN is the full-height lava(x=3)+roccia(x=4) wall', () => {
  const lava = TERRAIN.filter((t) => t.type === 'lava');
  const roccia = TERRAIN.filter((t) => t.type === 'roccia');
  assert.equal(lava.length, 8);
  assert.equal(roccia.length, 8);
  assert.ok(lava.every((t) => t.x === 3));
  assert.ok(roccia.every((t) => t.x === 4));
});

test('flyers carry an explicit volo_grade + adattamento_volo; grades cover g1/g2/g3', () => {
  const units = buildUnits();
  const flyers = units.filter(
    (u) => Array.isArray(u.traits) && u.traits.includes('adattamento_volo'),
  );
  assert.equal(flyers.length, 3);
  for (const f of flyers) {
    assert.ok([1, 2, 3].includes(f.volo_grade), `bad grade ${f.volo_grade}`);
  }
  const grades = flyers.map((f) => f.volo_grade).sort();
  assert.deepEqual(grades, [1, 2, 3]);
});

test('roster is mixed on both factions (player + sistema each have a flyer and a ground unit)', () => {
  const units = buildUnits();
  for (const side of ['player', 'sistema']) {
    const sideUnits = units.filter((u) => u.controlled_by === side);
    const hasFlyer = sideUnits.some((u) => (u.traits || []).includes('adattamento_volo'));
    const hasGround = sideUnits.some((u) => !(u.traits || []).includes('adattamento_volo'));
    assert.ok(hasFlyer, `${side} has no flyer`);
    assert.ok(hasGround, `${side} has no ground unit`);
  }
});

test('ground units are heavy-profile (morphotype corazzato) and carry no volo_grade', () => {
  const units = buildUnits();
  const ground = units.filter((u) => !(u.traits || []).includes('adattamento_volo'));
  assert.ok(ground.length >= 2);
  for (const g of ground) {
    assert.equal(g.morphotype, 'corazzato');
    assert.equal(g.volo_grade, undefined);
  }
});
