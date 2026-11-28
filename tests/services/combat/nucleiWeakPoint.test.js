// tests/services/combat/nucleiWeakPoint.test.js
//
// nuclei_di_controllo weak-point (creature-trait mechanics slice 2+3, trait 8).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   intact = +1 atk; a MoS>=5 hit breaks a nucleus -> danno_nucleo (lose the atk
//   aura, gain DR). Targetable weak-point (XCOM MEC). v2 (slice 3) = 3-state: a
//   second MoS>=5 hit on a damaged nucleus destroys it -> nucleo_distrutto + a
//   one-time +2 burst (the control node detonates). Destroyed = terminal.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyNucleoHit,
  NUCLEO_INTATTO,
  DANNO_NUCLEO,
  NUCLEO_DISTRUTTO,
  NUCLEO_MOS_THRESHOLD,
  NUCLEO_BURST,
} = require('../../../apps/backend/services/combat/nucleiWeakPoint');

test('constants are the canonical names + threshold + burst', () => {
  assert.equal(NUCLEO_INTATTO, 'nucleo_intatto');
  assert.equal(DANNO_NUCLEO, 'danno_nucleo');
  assert.equal(NUCLEO_DISTRUTTO, 'nucleo_distrutto');
  assert.equal(NUCLEO_MOS_THRESHOLD, 5);
  assert.equal(NUCLEO_BURST, 2);
});

test('a MoS>=5 hit on an intact nucleus -> danno_nucleo (loses intact), no burst', () => {
  const target = { id: 'golem', status: { [NUCLEO_INTATTO]: 99 } };
  const ev = applyNucleoHit(target, { mos: 5 });
  assert.ok(ev, 'should return a transition event');
  assert.equal(ev.from, NUCLEO_INTATTO);
  assert.equal(ev.to, DANNO_NUCLEO);
  assert.equal(ev.burst, 0, 'breaking the nucleus does not burst -- only destroying it does');
  assert.ok(!(Number(target.status[NUCLEO_INTATTO]) > 0), 'intact cleared');
  assert.ok(Number(target.status[DANNO_NUCLEO]) > 0, 'danno_nucleo set');
});

test('a 2nd MoS>=5 hit on a damaged nucleus -> nucleo_distrutto + burst', () => {
  const target = { id: 'golem', status: { [DANNO_NUCLEO]: 99 } };
  const ev = applyNucleoHit(target, { mos: 6 });
  assert.ok(ev, 'damaged nucleus can be destroyed by a second precise hit');
  assert.equal(ev.from, DANNO_NUCLEO);
  assert.equal(ev.to, NUCLEO_DISTRUTTO);
  assert.equal(ev.burst, NUCLEO_BURST, 'the destroyed control node detonates for +2');
  assert.ok(!(Number(target.status[DANNO_NUCLEO]) > 0), 'danno_nucleo cleared');
  assert.ok(Number(target.status[NUCLEO_DISTRUTTO]) > 0, 'nucleo_distrutto set');
});

test('a MoS<5 hit on a damaged nucleus does NOT destroy it', () => {
  const target = { id: 'golem', status: { [DANNO_NUCLEO]: 99 } };
  assert.equal(applyNucleoHit(target, { mos: 4 }), null);
  assert.ok(Number(target.status[DANNO_NUCLEO]) > 0, 'still merely damaged');
});

test('a destroyed nucleus is terminal -> no further transition', () => {
  const target = { id: 'golem', status: { [NUCLEO_DISTRUTTO]: 99 } };
  assert.equal(applyNucleoHit(target, { mos: 9 }), null, 'cannot destroy twice');
  assert.ok(Number(target.status[NUCLEO_DISTRUTTO]) > 0);
});

test('a MoS<5 hit does NOT break the nucleus', () => {
  const target = { id: 'golem', status: { [NUCLEO_INTATTO]: 99 } };
  assert.equal(applyNucleoHit(target, { mos: 4 }), null);
  assert.ok(Number(target.status[NUCLEO_INTATTO]) > 0, 'still intact');
});

test('a hit on a unit WITHOUT any nucleus state -> no-op', () => {
  const noNuclei = { id: 'x', status: {} };
  assert.equal(applyNucleoHit(noNuclei, { mos: 8 }), null);
});

test('tolerant of missing status / attackResult', () => {
  assert.equal(applyNucleoHit(null, { mos: 9 }), null);
  assert.equal(applyNucleoHit({ id: 'z' }, { mos: 9 }), null);
  assert.equal(applyNucleoHit({ id: 'z', status: { [NUCLEO_INTATTO]: 1 } }, null), null);
});
