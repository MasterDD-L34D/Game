// Unit test for Wesnoth time-of-day modifier.
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #5 Wesnoth.
// Sprint 1 §I (autonomous plan 2026-04-27).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getTimeModifier,
  isValidTimeOfDay,
  _resetCache,
} = require('../../apps/backend/services/combat/timeOfDayModifier');

test('isValidTimeOfDay accepts canonical states', () => {
  _resetCache();
  assert.equal(isValidTimeOfDay('dawn'), true);
  assert.equal(isValidTimeOfDay('day'), true);
  assert.equal(isValidTimeOfDay('dusk'), true);
  assert.equal(isValidTimeOfDay('night'), true);
  assert.equal(isValidTimeOfDay('foo'), false);
  assert.equal(isValidTimeOfDay(null), false);
});

test('lawful creature gets +1 atk +1 dmg in day', () => {
  _resetCache();
  const mods = getTimeModifier({ alignment: 'lawful' }, 'day');
  assert.equal(mods.attack_mod, 1);
  assert.equal(mods.damage_mod, 1);
  assert.match(mods.log, /lawful.*atk\+1.*dmg\+1/);
});

test('chaotic creature gets +1 atk +1 dmg in night', () => {
  _resetCache();
  const mods = getTimeModifier({ alignment: 'chaotic' }, 'night');
  assert.equal(mods.attack_mod, 1);
  assert.equal(mods.damage_mod, 1);
});

test('lawful creature gets -1 atk in night', () => {
  _resetCache();
  const mods = getTimeModifier({ alignment: 'lawful' }, 'night');
  assert.equal(mods.attack_mod, -1);
  assert.equal(mods.damage_mod, 0);
});

test('chaotic creature gets -1 atk in day', () => {
  _resetCache();
  const mods = getTimeModifier({ alignment: 'chaotic' }, 'day');
  assert.equal(mods.attack_mod, -1);
});

test('neutral creature unaffected by time', () => {
  _resetCache();
  for (const t of ['dawn', 'day', 'dusk', 'night']) {
    const mods = getTimeModifier({ alignment: 'neutral' }, t);
    assert.equal(mods.attack_mod, 0, `neutral in ${t} → atk 0`);
    assert.equal(mods.damage_mod, 0, `neutral in ${t} → dmg 0`);
  }
});

test('dawn and dusk are midpoint (0 modifier all alignments)', () => {
  _resetCache();
  for (const align of ['lawful', 'chaotic', 'neutral']) {
    for (const t of ['dawn', 'dusk']) {
      const mods = getTimeModifier({ alignment: align }, t);
      assert.equal(mods.attack_mod, 0, `${align} in ${t}`);
      assert.equal(mods.damage_mod, 0, `${align} in ${t}`);
    }
  }
});

test('default to day when timeOfDay invalid', () => {
  _resetCache();
  const mods = getTimeModifier({ alignment: 'lawful' }, 'invalid_xyz');
  assert.equal(mods.attack_mod, 1, 'fallback day');
});

test('missing alignment defaults to neutral', () => {
  _resetCache();
  const mods = getTimeModifier({}, 'day');
  assert.equal(mods.attack_mod, 0);
});
