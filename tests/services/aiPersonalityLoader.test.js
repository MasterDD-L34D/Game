// Sprint γ Tech Baseline (2026-04-28) — aiPersonalityLoader tests.
// Pattern: Total War AI personality YAML.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  loadPersonalities,
  getPersonality,
  listPersonalities,
  DEFAULT_PERSONALITY,
  _resetCache,
} = require('../../apps/backend/services/ai/aiPersonalityLoader');

const DEFAULT_YAML = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'core',
  'ai',
  'ai_profiles_extended.yaml',
);

test('loadPersonalities: registry version + 3 personalities seed', () => {
  _resetCache();
  const reg = loadPersonalities(DEFAULT_YAML, { log: () => {}, warn: () => {} });
  assert.ok(reg.version, 'version present');
  assert.equal(reg.version, '1.0.0');
  const ids = Object.keys(reg.personalities);
  assert.ok(ids.includes('aggressive_bloodthirsty'));
  assert.ok(ids.includes('cautious_defensive'));
  assert.ok(ids.includes('opportunist_flexible'));
  assert.equal(ids.length, 3);
});

test('getPersonality: aggressive_bloodthirsty has expected shape', () => {
  _resetCache();
  const reg = loadPersonalities(DEFAULT_YAML, { log: () => {}, warn: () => {} });
  const p = getPersonality('aggressive_bloodthirsty', reg);
  assert.equal(p.personality_id, 'aggressive_bloodthirsty');
  assert.ok(p.label);
  assert.ok(p.trigger_thresholds);
  assert.equal(p.trigger_thresholds.retreat_hp_pct, 0.1);
  assert.ok(p.intent_weights);
  assert.ok(p.intent_weights.execution >= 1.5);
  assert.ok(Array.isArray(p.signature_actions));
});

test('getPersonality: cautious_defensive different from aggressive', () => {
  _resetCache();
  const reg = loadPersonalities(DEFAULT_YAML, { log: () => {}, warn: () => {} });
  const cautious = getPersonality('cautious_defensive', reg);
  assert.equal(cautious.trigger_thresholds.retreat_hp_pct, 0.5);
  assert.ok(cautious.intent_weights.heal > 1.0);
  assert.ok(cautious.intent_weights.execution < 1.0);
});

test('getPersonality: opportunist_flexible has target_wounded_bonus', () => {
  _resetCache();
  const reg = loadPersonalities(DEFAULT_YAML, { log: () => {}, warn: () => {} });
  const opp = getPersonality('opportunist_flexible', reg);
  assert.ok(opp.trigger_thresholds.target_wounded_bonus);
  assert.equal(opp.intent_weights.target_low_hp, 1.5);
});

test('getPersonality: missing id returns DEFAULT fallback', () => {
  _resetCache();
  const reg = loadPersonalities(DEFAULT_YAML, { log: () => {}, warn: () => {} });
  const missing = getPersonality('nonexistent_xyz', reg);
  assert.equal(missing.personality_id, 'nonexistent_xyz');
  assert.equal(missing.label, DEFAULT_PERSONALITY.label);
  assert.deepEqual(missing.trigger_thresholds, DEFAULT_PERSONALITY.trigger_thresholds);
});

test('listPersonalities: returns 3 entries with id+label', () => {
  _resetCache();
  const reg = loadPersonalities(DEFAULT_YAML, { log: () => {}, warn: () => {} });
  const list = listPersonalities(reg);
  assert.equal(list.length, 3);
  list.forEach((entry) => {
    assert.ok(entry.id);
    assert.ok(entry.label);
  });
});

test('loadPersonalities: ENOENT graceful empty', () => {
  _resetCache();
  const reg = loadPersonalities('/nonexistent/path/no_such.yaml', {
    log: () => {},
    warn: () => {},
  });
  assert.deepEqual(reg.personalities, {});
});
