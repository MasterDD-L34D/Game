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
  resolveStarterBioma,
  listStarterBiomas,
  STARTER_BIOMA_MAP,
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

// ===========================================================================
// QW2 / M-017: starter_bioma resolution per Form
// ===========================================================================

const ALL_16_FORMS = [
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

test('STARTER_BIOMA_MAP: 16 entries exactly (no NEUTRA)', () => {
  assert.equal(Object.keys(STARTER_BIOMA_MAP).length, 16);
  for (const f of ALL_16_FORMS) {
    assert.ok(STARTER_BIOMA_MAP[f], `${f} present`);
  }
});

test('resolveStarterBioma: 16 forms map to {biome_id, trait_id}', () => {
  for (const f of ALL_16_FORMS) {
    const r = resolveStarterBioma(f);
    assert.ok(r, `${f} resolves`);
    assert.equal(typeof r.biome_id, 'string');
    assert.equal(typeof r.trait_id, 'string');
    assert.equal(r.trait_id, `starter_bioma_${f.toLowerCase()}`);
  }
});

test('resolveStarterBioma: unknown / NEUTRA returns null', () => {
  assert.equal(resolveStarterBioma('XXXX'), null);
  assert.equal(resolveStarterBioma('NEUTRA'), null);
  assert.equal(resolveStarterBioma(null), null);
  assert.equal(resolveStarterBioma(''), null);
  assert.equal(resolveStarterBioma(undefined), null);
});

test('listStarterBiomas: returns 16 items with form_id+biome_id+trait_id', () => {
  const list = listStarterBiomas();
  assert.equal(list.length, 16);
  for (const item of list) {
    assert.ok(ALL_16_FORMS.includes(item.form_id));
    assert.ok(item.biome_id.length > 0);
    assert.ok(item.trait_id.startsWith('starter_bioma_'));
  }
});

test('starter_bioma biome_ids are unique across 16 forms', () => {
  const biomes = listStarterBiomas().map((x) => x.biome_id);
  const uniq = new Set(biomes);
  assert.equal(biomes.length, uniq.size, 'no duplicate biome_id assignments');
});

test('starter_bioma trait_ids are unique across 16 forms', () => {
  const traits = listStarterBiomas().map((x) => x.trait_id);
  const uniq = new Set(traits);
  assert.equal(traits.length, uniq.size, 'no duplicate trait_id assignments');
});

test('getFormPacks: includes starter_bioma resolved field', () => {
  const p = getFormPacks('INTJ');
  assert.ok(p.starter_bioma);
  assert.equal(p.starter_bioma.biome_id, 'rovine_planari');
  assert.equal(p.starter_bioma.trait_id, 'starter_bioma_intj');
});

test('getFormPacks: NEUTRA fallback has starter_bioma=null', () => {
  const p = getFormPacks('NEUTRA');
  assert.equal(p.starter_bioma, null);
});

test('recommendPacks: static recommendation includes starter_bioma', () => {
  const r = recommendPacks({ form_id: 'ENFP', job_id: 'invoker' });
  assert.ok(r.starter_bioma);
  assert.equal(r.starter_bioma.biome_id, 'canopia_ionica');
  assert.equal(r.starter_bioma.trait_id, 'starter_bioma_enfp');
});

test('recommendPacks: universal pack includes starter_bioma for known form', () => {
  const r = recommendPacks({ form_id: 'INTJ', job_id: 'invoker', d20_roll: 5 });
  assert.equal(r.type, 'universal');
  assert.ok(r.starter_bioma);
  assert.equal(r.starter_bioma.trait_id, 'starter_bioma_intj');
});

test('recommendPacks: bias_forma includes starter_bioma', () => {
  const r = recommendPacks({ form_id: 'ISTP', job_id: 'skirmisher', d20_roll: 16, d12_roll: 3 });
  assert.equal(r.type, 'bias_forma');
  assert.ok(r.starter_bioma);
  assert.equal(r.starter_bioma.biome_id, 'caverna');
});

test('recommendPacks: NEUTRA caller -> starter_bioma null', () => {
  const r = recommendPacks({ form_id: 'NEUTRA', job_id: 'any' });
  assert.equal(r.starter_bioma, null);
});

test('all 16 starter_bioma trait ids present in active_effects.yaml', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const yaml = require('js-yaml');
  const file = path.join(process.cwd(), 'data', 'core', 'traits', 'active_effects.yaml');
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  for (const f of ALL_16_FORMS) {
    const id = `starter_bioma_${f.toLowerCase()}`;
    assert.ok(doc.traits[id], `${id} defined in active_effects.yaml`);
    assert.equal(doc.traits[id].tier, 'T1');
    assert.equal(doc.traits[id].effect.kind, 'extra_damage');
    assert.equal(doc.traits[id].effect.amount, 1);
    assert.equal(doc.traits[id].provenance.form_id, f);
  }
});

test('all 16 starter_bioma trait ids cross-referenced in glossary.json', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const file = path.join(process.cwd(), 'data', 'core', 'traits', 'glossary.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const f of ALL_16_FORMS) {
    const id = `starter_bioma_${f.toLowerCase()}`;
    assert.ok(doc.traits[id], `${id} present in glossary`);
    assert.ok(doc.traits[id].label_it, `${id} label_it`);
    assert.ok(doc.traits[id].label_en, `${id} label_en`);
    assert.ok(doc.traits[id].description_it, `${id} description_it`);
    assert.ok(doc.traits[id].description_en, `${id} description_en`);
  }
});

test('all 16 starter_bioma biome_ids exist in data/core/biomes.yaml', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const yaml = require('js-yaml');
  const file = path.join(process.cwd(), 'data', 'core', 'biomes.yaml');
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  const biomes = doc.biomes || {};
  for (const item of listStarterBiomas()) {
    assert.ok(biomes[item.biome_id], `biome ${item.biome_id} (${item.form_id}) exists`);
  }
});
