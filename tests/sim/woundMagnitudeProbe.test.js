// OD-058 D2 N=40 magnitude probe (issue #2531) -- arm construction. Each wound arm
// seeds a SINGLE location wound on every player unit via /start status passthrough
// (normaliseUnit copies status objects verbatim); the wound entry must carry the
// stat/malus pair derived by woundSystem.woundEffect, never hand-rolled numbers.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { ARMS, armWoundEntries } = require('../../tools/sim/wound-magnitude-probe');

test('control arms seed NO wounds and leave the flag off', () => {
  assert.equal(armWoundEntries(ARMS.control), null);
  assert.equal(armWoundEntries(ARMS.control2), null);
  assert.equal(ARMS.control.flag, false);
  assert.equal(ARMS.control2.flag, false);
});

test('atk_grave arm -> arti_anteriori grave = attack_mod -2 on the wound entry', () => {
  const entries = armWoundEntries(ARMS.atk_grave);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    location: 'arti_anteriori',
    severity: 'grave',
    stat: 'attack_mod',
    malus: -2,
  });
  assert.equal(ARMS.atk_grave.flag, true);
});

test('ap_grave arm -> testa grave maps to ap -1 (SPEC-D2 §8.4 graduato)', () => {
  const entries = armWoundEntries(ARMS.ap_grave);
  assert.deepEqual(entries[0], { location: 'testa', severity: 'grave', stat: 'ap', malus: -1 });
});

test('every wound arm has flag true (wounds without the flag would measure nothing)', () => {
  for (const [name, arm] of Object.entries(ARMS)) {
    if (armWoundEntries(arm)) {
      assert.equal(arm.flag, true, `${name} must enable WOUND_LOCATION_V2`);
    }
  }
});
