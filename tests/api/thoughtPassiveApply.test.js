// thoughtPassiveApply — unit tests for the stat-delta engine.
// Tests mirror the progressionApply pattern: stat mutations are additive,
// reverted cleanly on re-call, floored at minimum values.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  updateThoughtPassives,
} = require('../../apps/backend/services/thoughts/thoughtPassiveApply');

function makeUnit(overrides = {}) {
  return { id: 'u1', mod: 2, dc: 12, hp: 10, hp_max: 10, ap: 2, attack_range: 2, ...overrides };
}

test('updateThoughtPassives: applies attack_mod bonus to unit.mod', () => {
  const unit = makeUnit();
  updateThoughtPassives(unit, { attack_mod: 2 }, {});
  assert.equal(unit.mod, 4); // 2 + 2
  assert.deepEqual(unit._thought_passive_delta, {
    mod: 2,
    dc: 0,
    hp_max: 0,
    attack_range: 0,
    ap: 0,
  });
});

test('updateThoughtPassives: applies defense_dc cost as penalty to unit.dc', () => {
  const unit = makeUnit();
  updateThoughtPassives(unit, {}, { defense_dc: 1 });
  assert.equal(unit.dc, 11); // 12 - 1
});

test('updateThoughtPassives: net delta = bonus - cost for same stat', () => {
  const unit = makeUnit();
  // bonus defense_dc +2, cost defense_dc +1 → net +1 to unit.dc
  updateThoughtPassives(unit, { defense_dc: 2 }, { defense_dc: 1 });
  assert.equal(unit.dc, 13); // 12 + 1
});

test('updateThoughtPassives: hp_max bonus raises both hp_max and hp', () => {
  const unit = makeUnit({ hp: 8, hp_max: 10 });
  updateThoughtPassives(unit, { hp_max: 2 }, {});
  assert.equal(unit.hp_max, 12);
  assert.equal(unit.hp, 10); // 8 + 2
});

test('updateThoughtPassives: ap cost floored at 1 (cannot go below 1)', () => {
  const unit = makeUnit({ ap: 1 });
  // cost ap: 3 would make ap = 1 - 3 = -2; floored at 1
  updateThoughtPassives(unit, {}, { ap: 3 });
  assert.equal(unit.ap, 1);
});

test('updateThoughtPassives: re-apply reverts previous delta then applies new one', () => {
  const unit = makeUnit();
  // First apply: attack_mod +1
  updateThoughtPassives(unit, { attack_mod: 1 }, {});
  assert.equal(unit.mod, 3); // 2 + 1
  // Re-apply with different values (e.g. after a thought was forgotten and re-internalized)
  updateThoughtPassives(unit, { attack_mod: 3 }, {});
  assert.equal(unit.mod, 5); // 2 + 3 (previous +1 reverted, new +3 applied)
});

test('updateThoughtPassives: empty bonus/cost leaves unit unchanged', () => {
  const unit = makeUnit();
  const { ok } = updateThoughtPassives(unit, {}, {});
  assert.equal(ok, true);
  assert.equal(unit.mod, 2);
  assert.equal(unit.dc, 12);
});

test('updateThoughtPassives: null unit returns ok=false without throwing', () => {
  const { ok, error } = updateThoughtPassives(null, { attack_mod: 1 }, {});
  assert.equal(ok, false);
  assert.equal(error, 'no_unit');
});
