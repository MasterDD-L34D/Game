// V4 PI-Pacchetti recommender tests

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadBias,
  getFormPacks,
  recommendPacks,
  resolveD12Pack,
  resolveD20Pack,
  _resetCache,
} = require('../../apps/backend/services/forms/formPackRecommender');

test('loadBias: loads YAML with 16 forms + NEUTRA', () => {
  _resetCache();
  const bias = loadBias();
  assert.ok(bias);
  assert.ok(bias.forms.INTJ);
  assert.ok(bias.forms.ENFJ);
  assert.ok(bias.forms.NEUTRA);
  assert.equal(Object.keys(bias.forms).length, 17); // 16 + NEUTRA
});

test('getFormPacks: returns 3 packs + d12_bias per form', () => {
  const p = getFormPacks('INTJ');
  assert.equal(p.form_id, 'INTJ');
  assert.ok(p.pack_a);
  assert.ok(p.pack_b);
  assert.ok(p.pack_c);
  assert.ok(p.d12_bias);
  assert.ok(p.pack_a.combo.includes('invoker'));
});

test('getFormPacks: unknown form falls back NEUTRA', () => {
  const p = getFormPacks('XXXX');
  assert.ok(p);
  assert.ok(p.pack_a);
});

test('resolveD20Pack: table correctness', () => {
  assert.deepEqual(resolveD20Pack(1), { pack: 'A', type: 'universal' });
  assert.deepEqual(resolveD20Pack(5), { pack: 'C', type: 'universal' });
  assert.deepEqual(resolveD20Pack(11), { pack: 'F', type: 'universal' });
  assert.deepEqual(resolveD20Pack(16), { pack: null, type: 'bias_forma' });
  assert.deepEqual(resolveD20Pack(18), { pack: null, type: 'bias_job' });
  assert.deepEqual(resolveD20Pack(20), { pack: null, type: 'scelta' });
});

test('resolveD12Pack: INTJ d12 = 10 → pack_c', () => {
  const form = { d12_bias: { a: [1, 6], b: [7, 9], c: [10, 12] } };
  assert.equal(resolveD12Pack(form, 5), 'pack_a');
  assert.equal(resolveD12Pack(form, 8), 'pack_b');
  assert.equal(resolveD12Pack(form, 11), 'pack_c');
});

test('recommendPacks: no d20 → static form recommendation', () => {
  const r = recommendPacks({ form_id: 'INTJ', job_id: 'invoker' });
  assert.equal(r.type, 'static_form_recommendation');
  assert.equal(r.form_packs.length, 3);
  assert.deepEqual(r.job_bias, ['A', 'J']);
});

test('recommendPacks: d20=5 → universal pack C', () => {
  const r = recommendPacks({ form_id: 'INTJ', job_id: 'invoker', d20_roll: 5 });
  assert.equal(r.type, 'universal');
  assert.equal(r.pack_key, 'C');
  assert.ok(r.combo.includes('job_ability'));
});

test('recommendPacks: d20=16 + d12=11 → Bias Forma pack_c', () => {
  const r = recommendPacks({ form_id: 'INTJ', job_id: 'invoker', d20_roll: 16, d12_roll: 11 });
  assert.equal(r.type, 'bias_forma');
  assert.equal(r.pack_key, 'pack_c');
  assert.ok(Array.isArray(r.tags));
});

test('recommendPacks: d20=18 Bias Job invoker → A/J', () => {
  const r = recommendPacks({ form_id: 'INTJ', job_id: 'invoker', d20_roll: 18 });
  assert.equal(r.type, 'bias_job');
  assert.equal(r.pack_key, 'A');
  assert.equal(r.alternatives[0].key, 'J');
});

test('recommendPacks: d20=20 Scelta → all packs', () => {
  const r = recommendPacks({ form_id: 'INTJ', job_id: 'invoker', d20_roll: 20 });
  assert.equal(r.type, 'scelta');
  assert.ok(Array.isArray(r.all_packs));
  assert.ok(r.all_packs.length >= 10);
});

test('recommendPacks: ISTP reversed bias d12 {a:[6,8], b:[1,5]}', () => {
  const r = recommendPacks({ form_id: 'ISTP', job_id: 'skirmisher', d20_roll: 16, d12_roll: 3 });
  assert.equal(r.type, 'bias_forma');
  assert.equal(r.pack_key, 'pack_b', 'ISTP d12=3 falls in b[1,5]');
});

test('all 16 MBTI forms have valid combo strings', () => {
  const forms = [
    'ISTJ',
    'ISFJ',
    'INFJ',
    'INTJ',
    'ISTP',
    'ISFP',
    'INFP',
    'INTP',
    'ESTP',
    'ESFP',
    'ENFP',
    'ENTP',
    'ESTJ',
    'ESFJ',
    'ENFJ',
    'ENTJ',
  ];
  for (const f of forms) {
    const p = getFormPacks(f);
    assert.ok(p.pack_a.combo, `${f} pack_a combo`);
    assert.ok(p.pack_b.combo, `${f} pack_b combo`);
    assert.ok(p.pack_c.combo, `${f} pack_c combo`);
  }
});
