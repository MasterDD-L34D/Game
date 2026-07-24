// 2026-05-06 TKT-P3-INNATA-TRAIT-GRANT — formInnataTrait helper tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getInnataTraitForForm,
  applyInnataTraitGrant,
} = require('../../apps/backend/services/forms/formInnataTrait');

test('getInnataTraitForForm returns trait_id for known form', () => {
  // 16 form × 1 trait mapping in mbti_forms.yaml (2026-05-06).
  // Verified via grep: 16 innata_trait_id entries.
  const traitId = getInnataTraitForForm('INTJ');
  assert.equal(typeof traitId, 'string');
  assert.ok(traitId.length > 0);
});

test('getInnataTraitForForm returns null for unknown form', () => {
  assert.equal(getInnataTraitForForm('XXXX'), null);
  assert.equal(getInnataTraitForForm(''), null);
  assert.equal(getInnataTraitForForm(null), null);
  assert.equal(getInnataTraitForForm(undefined), null);
  assert.equal(getInnataTraitForForm(42), null);
});

test('all 16 MBTI forms have innata_trait_id mapping', () => {
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
    const trait = getInnataTraitForForm(form);
    assert.ok(trait, `form ${form} should have innata_trait_id`);
    assert.ok(typeof trait === 'string' && trait.length > 0);
  }
});

test('applyInnataTraitGrant adds innata trait to empty traits array', () => {
  const spec = { form_id: 'ISTJ', traits: [] };
  const result = applyInnataTraitGrant(spec);
  assert.equal(result.form_id, 'ISTJ');
  assert.ok(Array.isArray(result.traits));
  assert.equal(result.traits.length, 1);
  // ISTJ → pelle_elastomera per mapping canonical onboarding alignment
  assert.equal(result.traits[0], 'pelle_elastomera');
});

test('applyInnataTraitGrant preserves existing traits', () => {
  const spec = { form_id: 'ESTP', traits: ['ferocia', 'martello_osseo'] };
  const result = applyInnataTraitGrant(spec);
  assert.equal(result.traits.length, 3);
  assert.ok(result.traits.includes('ferocia'));
  assert.ok(result.traits.includes('martello_osseo'));
  // ESTP → zampe_a_molla
  assert.ok(result.traits.includes('zampe_a_molla'));
});

test('applyInnataTraitGrant skip duplicate (idempotent)', () => {
  // ESTP innata = zampe_a_molla; already in traits → no duplicate.
  const spec = { form_id: 'ESTP', traits: ['zampe_a_molla'] };
  const result = applyInnataTraitGrant(spec);
  assert.equal(result.traits.length, 1);
  assert.equal(result.traits[0], 'zampe_a_molla');
});

test('applyInnataTraitGrant returns spec unchanged when form_id missing', () => {
  const spec = { traits: ['x', 'y'] };
  const result = applyInnataTraitGrant(spec);
  assert.deepEqual(result, spec);
});

test('applyInnataTraitGrant returns spec unchanged when form_id unknown', () => {
  const spec = { form_id: 'UNKNOWN', traits: ['x'] };
  const result = applyInnataTraitGrant(spec);
  assert.deepEqual(result.traits, ['x']);
});

test('applyInnataTraitGrant handles null/undefined gracefully', () => {
  assert.equal(applyInnataTraitGrant(null), null);
  assert.equal(applyInnataTraitGrant(undefined), undefined);
  assert.equal(applyInnataTraitGrant('garbage'), 'garbage');
});

test('applyInnataTraitGrant handles missing traits array', () => {
  const spec = { form_id: 'INFJ' };
  const result = applyInnataTraitGrant(spec);
  assert.ok(Array.isArray(result.traits));
  assert.equal(result.traits.length, 1);
  // INFJ → pelle_piezo_satura
  assert.equal(result.traits[0], 'pelle_piezo_satura');
});
