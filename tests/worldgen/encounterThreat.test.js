'use strict';

// TKT-WORLDGEN-GAPC preview-threat-resolver (decoupled from live combat).
// Resolves an encounter's THREAT METADATA (difficulty_rating + encounter_class + peak
// enemy tier + initial spawn count) for the Into-the-Breach route-choice telegraph, reading
// the encounter YAML from docs/planning/encounters/ (live) UNION docs/planning/encounters-draft/
// (node-encounter proposals not promoted to live combat). Read-only metadata: it does NOT make
// the drafts live combat (combat's encounterLoader stays encounters/-only -> band-safe).

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  encounterThreat,
  enrichCandidatesWithThreat,
  _resetCache,
} = require('../../apps/backend/services/worldgen/encounterThreat');

test('encounterThreat: reads a live encounters/ encounter (savana_01)', () => {
  _resetCache();
  const t = encounterThreat('enc_savana_01');
  assert.ok(t, 'resolved');
  assert.equal(t.difficulty_rating, 2);
  assert.equal(t.encounter_class, 'standard');
  assert.equal(t.max_tier, 'elite', 'wave2 custode_basalto is elite = peak tier');
  assert.equal(t.wave1_count, 2);
});

test('encounterThreat: reads a draft-dir encounter (boss apex) without promoting it to combat', () => {
  _resetCache();
  const t = encounterThreat('enc_tutorial_06_hardcore');
  assert.ok(t, 'resolved from encounters-draft/');
  assert.equal(t.difficulty_rating, 5);
  assert.equal(t.encounter_class, 'hardcore');
  assert.equal(t.max_tier, 'apex');
  assert.equal(t.wave1_count, 3);
});

test('encounterThreat: graceful null on missing id / bad input', () => {
  _resetCache();
  assert.equal(encounterThreat('enc_does_not_exist_xyz'), null);
  assert.equal(encounterThreat(null), null);
  assert.equal(encounterThreat(''), null);
});

test('enrichCandidatesWithThreat: adds threat per candidate by encounter_id, null when unknown, additive', () => {
  _resetCache();
  const candidates = [
    { node_id: 'DESERTO_CALDO', encounter_id: 'enc_savana_01', weight: 0.4 },
    { node_id: 'ROVINE_PLANARI', encounter_id: 'enc_tutorial_06_hardcore', weight: 0.5 },
    { node_id: 'GHOST', encounter_id: null, weight: 0 },
  ];
  const out = enrichCandidatesWithThreat(candidates);
  assert.equal(out[0].threat.difficulty_rating, 2);
  assert.equal(out[1].threat.max_tier, 'apex');
  assert.equal(out[2].threat, null, 'unknown/absent encounter_id -> null threat');
  // additive: original candidate fields preserved
  assert.equal(out[0].node_id, 'DESERTO_CALDO');
  assert.equal(out[0].weight, 0.4);
});

test('enrichCandidatesWithThreat: non-array input -> returns as-is (back-compat)', () => {
  assert.deepEqual(enrichCandidatesWithThreat(null), null);
  assert.deepEqual(enrichCandidatesWithThreat(undefined), undefined);
});
