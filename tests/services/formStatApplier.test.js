// 2026-05-06 TKT-P3-FORM-STAT-APPLIER — formStatApplier helper tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getStatSeedForForm,
  applyStatSeed,
} = require('../../apps/backend/services/forms/formStatApplier');

test('getStatSeedForForm returns delta object for known form', () => {
  const seed = getStatSeedForForm('INTJ');
  assert.equal(typeof seed, 'object');
  assert.equal(seed.hp, -1);
  assert.equal(seed.ap, 0);
  assert.equal(seed.mod, 1);
  assert.equal(seed.guardia, 0);
});

test('getStatSeedForForm returns null for unknown/invalid', () => {
  assert.equal(getStatSeedForForm('XXXX'), null);
  assert.equal(getStatSeedForForm(''), null);
  assert.equal(getStatSeedForForm(null), null);
  assert.equal(getStatSeedForForm(42), null);
});

test('all 16 MBTI forms have stat_seed mapping with 4 stat keys', () => {
  const forms = [
    'INTJ',
    'INTP',
    'ENTJ',
    'ENTP',
    'INFJ',
    'INFP',
    'ENFJ',
    'ENFP',
    'ISTJ',
    'ISFJ',
    'ESTJ',
    'ESFJ',
    'ISTP',
    'ISFP',
    'ESTP',
    'ESFP',
  ];
  for (const form of forms) {
    const seed = getStatSeedForForm(form);
    assert.ok(seed, `form ${form} should have stat_seed`);
    for (const key of ['hp', 'ap', 'mod', 'guardia']) {
      assert.ok(typeof seed[key] === 'number', `${form}.${key} numeric`);
      assert.ok(Math.abs(seed[key]) <= 2, `${form}.${key} within ±2 conservative range`);
    }
  }
});

test('applyStatSeed adds delta to baseline unit (INTJ)', () => {
  const unit = { form_id: 'INTJ', hp: 22, max_hp: 22, ap: 2, mod: 0, guardia: 8 };
  const result = applyStatSeed(unit);
  // INTJ: hp=-1, ap=0, mod=+1, guardia=0
  assert.equal(result.hp, 21);
  assert.equal(result.max_hp, 21);
  assert.equal(result.ap, 2);
  assert.equal(result.mod, 1);
  assert.equal(result.guardia, 8);
  assert.equal(result._form_stat_applied, true);
});

test('applyStatSeed idempotent — second call no-op', () => {
  const unit = { form_id: 'ENTJ', hp: 22, max_hp: 22, ap: 2, mod: 0, guardia: 10 };
  const once = applyStatSeed(unit);
  const twice = applyStatSeed(once);
  // ENTJ: hp=0, ap=0, mod=+2, guardia=-2
  assert.equal(twice.hp, 22);
  assert.equal(twice.mod, 2);
  assert.equal(twice.guardia, 8);
  assert.strictEqual(twice, once); // same ref since flag set
});

test('applyStatSeed clamps hp to min 1', () => {
  // ESTP: hp=-1. Unit hp=1 → result hp=max(1, 1-1)=1
  const unit = { form_id: 'ESTP', hp: 1, max_hp: 1, ap: 2, mod: 0, guardia: 0 };
  const result = applyStatSeed(unit);
  assert.equal(result.hp, 1);
  assert.equal(result.max_hp, 1);
});

test('applyStatSeed clamps ap to min 0', () => {
  const unit = { form_id: 'ISTJ', hp: 22, max_hp: 22, ap: 1, mod: 0, guardia: 0 };
  // ISTJ: hp=+1, ap=-1, mod=0, guardia=0 → ap=max(0, 1-1)=0
  const result = applyStatSeed(unit);
  assert.equal(result.ap, 0);
  assert.equal(result.hp, 23);
});

test('applyStatSeed no-op when form_id missing', () => {
  const unit = { hp: 22, max_hp: 22, ap: 2, mod: 0, guardia: 8 };
  const result = applyStatSeed(unit);
  assert.equal(result.hp, 22);
  assert.equal(result._form_stat_applied, undefined);
});

test('applyStatSeed no-op when form_id unknown', () => {
  const unit = { form_id: 'UNKNOWN', hp: 22, max_hp: 22, ap: 2, mod: 0, guardia: 8 };
  const result = applyStatSeed(unit);
  assert.equal(result.hp, 22);
});

test('applyStatSeed handles null/non-object', () => {
  assert.equal(applyStatSeed(null), null);
  assert.equal(applyStatSeed(undefined), undefined);
  assert.equal(applyStatSeed('garbage'), 'garbage');
});

test('ISFP baseline form (all zero stat_seed) → no change', () => {
  // ISFP: hp=0, ap=0, mod=0, guardia=0 — flag set but values unchanged.
  const unit = { form_id: 'ISFP', hp: 22, max_hp: 22, ap: 2, mod: 0, guardia: 8 };
  const result = applyStatSeed(unit);
  assert.equal(result.hp, 22);
  assert.equal(result.ap, 2);
  assert.equal(result.mod, 0);
  assert.equal(result.guardia, 8);
  assert.equal(result._form_stat_applied, true);
});
