// tests/services/combat/nucleiWeakPoint.test.js
//
// nuclei_di_controllo weak-point (creature-trait mechanics slice 2, trait 8).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   intact = +1 atk; a MoS>=5 hit breaks a nucleus -> danno_nucleo (lose the atk
//   aura, gain DR). Targetable weak-point (XCOM MEC). v1 = 2-state (intact->danno).
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyNucleoHit,
  NUCLEO_INTATTO,
  DANNO_NUCLEO,
  NUCLEO_MOS_THRESHOLD,
} = require('../../../apps/backend/services/combat/nucleiWeakPoint');

test('constants are the canonical names + threshold', () => {
  assert.equal(NUCLEO_INTATTO, 'nucleo_intatto');
  assert.equal(DANNO_NUCLEO, 'danno_nucleo');
  assert.equal(NUCLEO_MOS_THRESHOLD, 5);
});

test('a MoS>=5 hit on an intact nucleus -> danno_nucleo (loses intact)', () => {
  const target = { id: 'golem', status: { [NUCLEO_INTATTO]: 99 } };
  const ev = applyNucleoHit(target, { mos: 5 });
  assert.ok(ev, 'should return a transition event');
  assert.equal(ev.from, NUCLEO_INTATTO);
  assert.equal(ev.to, DANNO_NUCLEO);
  assert.ok(!(Number(target.status[NUCLEO_INTATTO]) > 0), 'intact cleared');
  assert.ok(Number(target.status[DANNO_NUCLEO]) > 0, 'danno_nucleo set');
});

test('a MoS<5 hit does NOT break the nucleus', () => {
  const target = { id: 'golem', status: { [NUCLEO_INTATTO]: 99 } };
  assert.equal(applyNucleoHit(target, { mos: 4 }), null);
  assert.ok(Number(target.status[NUCLEO_INTATTO]) > 0, 'still intact');
});

test('a hit on a unit WITHOUT an intact nucleus -> no-op', () => {
  const noNuclei = { id: 'x', status: {} };
  assert.equal(applyNucleoHit(noNuclei, { mos: 8 }), null);
  const alreadyBroken = { id: 'y', status: { [DANNO_NUCLEO]: 99 } };
  assert.equal(applyNucleoHit(alreadyBroken, { mos: 8 }), null, 'no second break in v1');
  assert.ok(Number(alreadyBroken.status[DANNO_NUCLEO]) > 0);
});

test('tolerant of missing status / attackResult', () => {
  assert.equal(applyNucleoHit(null, { mos: 9 }), null);
  assert.equal(applyNucleoHit({ id: 'z' }, { mos: 9 }), null);
  assert.equal(applyNucleoHit({ id: 'z', status: { [NUCLEO_INTATTO]: 1 } }, null), null);
});
