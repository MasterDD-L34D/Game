// tests/services/combat/voloGradePercreature.test.js
//
// Per-creature volo grade (move terrain-cost substrate gap-fix). The grade lives on
// the unit (`unit.volo_grade`), survives session-start (normaliseUnit whitelist), and
// is read registry-free so player/AI/minion all pick it up. Gate = trait presence.
// Spec: docs/superpowers/specs/2026-06-23-volo-grade-percreature-design.md

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateVoloGrade } = require('../../../apps/backend/services/combat/movementResolver');
const { normaliseUnit } = require('../../../apps/backend/routes/sessionHelpers');

test('per-unit volo_grade overrides the registry base grade', () => {
  const reg = { adattamento_volo: { effect: { grade: 1 } } };
  assert.equal(evaluateVoloGrade(reg, { traits: ['adattamento_volo'], volo_grade: 3 }), 3);
});

test('per-unit volo_grade works registry-free (minion path closes for free)', () => {
  assert.equal(evaluateVoloGrade(null, { traits: ['adattamento_volo'], volo_grade: 2 }), 2);
});

test('volo_grade clamps to the [1,3] design range', () => {
  assert.equal(evaluateVoloGrade(null, { traits: ['adattamento_volo'], volo_grade: 5 }), 3);
  // 0 / negative are not a valid override -> fall back to base (null registry -> 1)
  assert.equal(evaluateVoloGrade(null, { traits: ['adattamento_volo'], volo_grade: 0 }), 1);
  assert.equal(evaluateVoloGrade(null, { traits: ['adattamento_volo'], volo_grade: -2 }), 1);
});

test('volo_grade 2.5 truncates to 2 (integer grade)', () => {
  assert.equal(evaluateVoloGrade(null, { traits: ['adattamento_volo'], volo_grade: 2.5 }), 2);
});

test('carrier without volo_grade falls back to the registry base grade', () => {
  const reg = { adattamento_volo: { effect: { grade: 2 } } };
  assert.equal(evaluateVoloGrade(reg, { traits: ['adattamento_volo'] }), 2);
});

test('carrier with neither volo_grade nor a registry grade -> 1', () => {
  assert.equal(evaluateVoloGrade(null, { traits: ['adattamento_volo'] }), 1);
});

test('volo_grade on a NON-carrier is ignored (gate is trait presence)', () => {
  assert.equal(evaluateVoloGrade(null, { traits: [], volo_grade: 3 }), 0);
});

test('object-form trait {id} is recognized as a carrier', () => {
  assert.equal(evaluateVoloGrade(null, { traits: [{ id: 'adattamento_volo' }], volo_grade: 2 }), 2);
});

test('normaliseUnit preserves a finite volo_grade (whitelist, like speed/morale_mod)', () => {
  assert.equal(normaliseUnit({ id: 'u', volo_grade: 3 }, 0).volo_grade, 3);
});

test('normaliseUnit defaults volo_grade to null when absent or non-finite', () => {
  assert.equal(normaliseUnit({ id: 'u' }, 0).volo_grade, null);
  assert.equal(normaliseUnit({ id: 'u', volo_grade: 'nope' }, 0).volo_grade, null);
  assert.equal(normaliseUnit({ id: 'u', volo_grade: null }, 0).volo_grade, null);
});
