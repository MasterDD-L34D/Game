// Skiv ticket #3 — Inner Voices (Disco Elysium diegetic, 24 voices).
// Pure evaluator tests: load, threshold logic, cumulative, axes, edge cases.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadVoices,
  resetVoiceCache,
  matchesVoiceThreshold,
  evaluateVoiceTriggers,
  describeVoice,
} = require('../../apps/backend/services/narrative/innerVoice');

test('loadVoices: returns exactly 24 voices across 4 axes', () => {
  resetVoiceCache();
  const catalog = loadVoices();
  const ids = Object.keys(catalog.voices);
  assert.equal(ids.length, 24);
  const byAxis = { T_F: 0, E_I: 0, S_N: 0, J_P: 0 };
  for (const e of Object.values(catalog.voices)) {
    assert.ok(byAxis[e.axis] !== undefined, `unexpected axis ${e.axis}`);
    byAxis[e.axis]++;
  }
  assert.equal(byAxis.T_F, 6, 'T_F needs 6 voices');
  assert.equal(byAxis.E_I, 6, 'E_I needs 6 voices');
  assert.equal(byAxis.S_N, 6, 'S_N needs 6 voices');
  assert.equal(byAxis.J_P, 6, 'J_P needs 6 voices');
});

test('loadVoices: every entry has required fields', () => {
  resetVoiceCache();
  const catalog = loadVoices();
  for (const [id, e] of Object.entries(catalog.voices)) {
    assert.ok(e.axis, `${id} missing axis`);
    assert.ok(['low', 'high'].includes(e.direction), `${id} bad direction`);
    assert.equal(typeof e.threshold, 'number', `${id} bad threshold`);
    assert.ok([1, 2, 3].includes(e.tier), `${id} bad tier`);
    assert.ok(e.pole_letter, `${id} missing pole_letter`);
    assert.ok(e.voice_it, `${id} missing voice_it`);
    assert.ok(e.flavor_it, `${id} missing flavor_it`);
  }
});

test('matchesVoiceThreshold: low direction matches when value ≤ threshold', () => {
  assert.equal(matchesVoiceThreshold(0.3, 'low', 0.35), true);
  assert.equal(matchesVoiceThreshold(0.35, 'low', 0.35), true);
  assert.equal(matchesVoiceThreshold(0.4, 'low', 0.35), false);
});

test('matchesVoiceThreshold: high direction matches when value ≥ threshold', () => {
  assert.equal(matchesVoiceThreshold(0.7, 'high', 0.65), true);
  assert.equal(matchesVoiceThreshold(0.65, 'high', 0.65), true);
  assert.equal(matchesVoiceThreshold(0.6, 'high', 0.65), false);
});

test('matchesVoiceThreshold: null/undefined/NaN never match', () => {
  assert.equal(matchesVoiceThreshold(null, 'low', 0.5), false);
  assert.equal(matchesVoiceThreshold(undefined, 'high', 0.5), false);
  assert.equal(matchesVoiceThreshold(NaN, 'low', 0.5), false);
});

test('evaluateVoiceTriggers: no axes → empty result', () => {
  const res = evaluateVoiceTriggers(null);
  assert.deepEqual(res, { heard: [], newly_heard: [] });
});

test('evaluateVoiceTriggers: T_F high 0.68 unlocks tier-1 T voice only', () => {
  resetVoiceCache();
  const axes = { T_F: { value: 0.68, coverage: 'partial' } };
  const { heard, newly_heard } = evaluateVoiceTriggers(axes);
  assert.ok(newly_heard.includes('tf_pensiero_freddo'), 'tier-1 T should trigger at 0.68');
  assert.ok(!newly_heard.includes('tf_distanza_precisa'), 'tier-2 T needs 0.75');
  assert.ok(!newly_heard.includes('tf_macchina_vivente'), 'tier-3 T needs 0.85');
  assert.deepEqual(heard, newly_heard);
});

test('evaluateVoiceTriggers: T_F high 0.87 unlocks all 3 T tiers', () => {
  resetVoiceCache();
  const axes = { T_F: { value: 0.87, coverage: 'full' } };
  const { newly_heard } = evaluateVoiceTriggers(axes);
  assert.ok(newly_heard.includes('tf_pensiero_freddo'));
  assert.ok(newly_heard.includes('tf_distanza_precisa'));
  assert.ok(newly_heard.includes('tf_macchina_vivente'));
});

test('evaluateVoiceTriggers: T_F low 0.12 unlocks all 3 F tiers', () => {
  resetVoiceCache();
  const axes = { T_F: { value: 0.12, coverage: 'full' } };
  const { newly_heard } = evaluateVoiceTriggers(axes);
  assert.ok(newly_heard.includes('tf_voce_empatica'));
  assert.ok(newly_heard.includes('tf_peso_connessione'));
  assert.ok(newly_heard.includes('tf_confine_dissolto'));
});

test('evaluateVoiceTriggers: cumulative — already heard voices not in newly_heard', () => {
  resetVoiceCache();
  const axes = { T_F: { value: 0.87 } };
  const { heard: first } = evaluateVoiceTriggers(axes);
  assert.equal(first.length, 3);

  const { heard: second, newly_heard: newlySecond } = evaluateVoiceTriggers(axes, first);
  assert.deepEqual(newlySecond, []);
  assert.equal(second.length, 3);
});

test('evaluateVoiceTriggers: mixed axes trigger voices from multiple axes', () => {
  resetVoiceCache();
  const axes = {
    E_I: { value: 0.87 },
    S_N: { value: 0.12 },
  };
  const { newly_heard } = evaluateVoiceTriggers(axes);
  const eiIds = newly_heard.filter((id) => id.startsWith('ei_'));
  const snIds = newly_heard.filter((id) => id.startsWith('sn_'));
  assert.ok(eiIds.length >= 3, 'E_I extreme high: all 3 I tiers');
  assert.ok(snIds.length >= 3, 'S_N extreme low: all 3 N tiers');
});

test('describeVoice: returns full entry with id', () => {
  resetVoiceCache();
  const entry = describeVoice('tf_pensiero_freddo');
  assert.equal(entry.id, 'tf_pensiero_freddo');
  assert.equal(entry.axis, 'T_F');
  assert.equal(entry.direction, 'high');
  assert.equal(entry.tier, 1);
  assert.ok(entry.voice_it.length > 0);
});

test('describeVoice: unknown id returns null', () => {
  resetVoiceCache();
  assert.equal(describeVoice('nonexistent_id'), null);
});
