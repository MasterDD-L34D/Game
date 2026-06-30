'use strict';

// C2-imprint STEP 2 -- imprintBiomeWeights producer (pure, read-only, non-binding).
// Plan: docs/planning/2026-06-22-aa01-c2-imprint-build-spec.md

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeImprintBiomeWeights,
  topBiome,
  brancoTendencyHint,
  tupleKey,
} = require('../../apps/backend/services/imprint/imprintBiomeWeights');

// All 16 combos -> expected base biome (from data/core/imprint/biome_resolution.yaml).
const EXPECTED = {
  V_P_D_L: 'savana',
  V_P_F_L: 'savana',
  V_R_D_L: 'badlands',
  V_R_F_L: 'badlands',
  S_P_D_A: 'caverna_risonante',
  S_P_F_A: 'caverna_risonante',
  S_R_D_A: 'rovine_planari',
  S_R_F_A: 'rovine_planari',
  V_P_D_A: 'rovine_planari',
  V_R_D_A: 'badlands',
  S_P_D_L: 'palude_tossica',
  S_R_D_L: 'palude_tossica',
  V_P_F_A: 'canopia_ionica',
  V_R_F_A: 'canopia_ionica',
  S_P_F_L: 'reef_luminescente',
  S_R_F_L: 'reef_luminescente',
};

const LOCO = { V: 'VELOCE', S: 'SILENZIOSA' };
const OFF = { P: 'PROFONDA', R: 'RAPIDA' };
const DEF = { D: 'DURA', F: 'FLESSIBILE' };
const SEN = { L: 'LONTANO', A: 'ACUTO' };

function tupleFromKey(key) {
  const [l, o, d, s] = key.split('_');
  return { locomotion: LOCO[l], offense: OFF[o], defense: DEF[d], senses: SEN[s] };
}

test('all 16 combos: single tuple -> { expectedBiome: 1 }', () => {
  for (const [key, biome] of Object.entries(EXPECTED)) {
    const w = computeImprintBiomeWeights([tupleFromKey(key)]);
    assert.deepEqual(w, { [biome]: 1 }, `combo ${key}`);
    assert.equal(topBiome(w), biome, `topBiome ${key}`);
  }
});

test('tupleKey encodes first letters; invalid axis -> null (no throw)', () => {
  assert.equal(
    tupleKey({ locomotion: 'VELOCE', offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' }),
    'V_P_D_L',
  );
  assert.equal(
    tupleKey({ locomotion: 'veloce', offense: 'profonda', defense: 'dura', senses: 'lontano' }),
    'V_P_D_L',
  ); // case-insensitive
  assert.equal(
    tupleKey({ locomotion: 'BOGUS', offense: 'PROFONDA', defense: 'DURA', senses: 'LONTANO' }),
    null,
  );
  assert.equal(tupleKey({ locomotion: 'VELOCE', offense: 'PROFONDA', defense: 'DURA' }), null); // missing senses
  assert.equal(tupleKey(null), null);
  assert.equal(tupleKey('nope'), null);
});

test('multi-tuple aggregation normalizes to sum = 1', () => {
  // 2x savana + 1x badlands + 1x canopia_ionica -> 0.5 / 0.25 / 0.25
  const tuples = [
    tupleFromKey('V_P_D_L'), // savana
    tupleFromKey('V_P_F_L'), // savana
    tupleFromKey('V_R_D_L'), // badlands
    tupleFromKey('V_P_F_A'), // canopia_ionica
  ];
  const w = computeImprintBiomeWeights(tuples);
  assert.equal(w.savana, 0.5);
  assert.equal(w.badlands, 0.25);
  assert.equal(w.canopia_ionica, 0.25);
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `sum=${sum}`);
  assert.equal(topBiome(w), 'savana');
});

test('empty / all-invalid input -> {} (never throws)', () => {
  assert.deepEqual(computeImprintBiomeWeights([]), {});
  assert.deepEqual(computeImprintBiomeWeights(null), {});
  assert.deepEqual(computeImprintBiomeWeights(undefined), {});
  assert.deepEqual(computeImprintBiomeWeights([{ locomotion: 'X' }, null, 42]), {});
});

test('partial-valid input: invalid tuples skipped, valid ones counted', () => {
  const w = computeImprintBiomeWeights([
    tupleFromKey('V_P_D_L'), // savana (valid)
    { locomotion: 'VELOCE' }, // invalid -> skipped
    null, // skipped
  ]);
  assert.deepEqual(w, { savana: 1 });
});

test('accepts a single tuple object (not wrapped in array)', () => {
  const w = computeImprintBiomeWeights(tupleFromKey('S_R_F_L'));
  assert.deepEqual(w, { reef_luminescente: 1 });
});

test('output is weights-only: no biome_id key, values in [0,1], no input mutation', () => {
  const tuple = tupleFromKey('V_P_D_L');
  const snapshot = JSON.stringify(tuple);
  const w = computeImprintBiomeWeights([tuple]);
  assert.ok(!('biome_id' in w), 'must not expose a biome_id assignment');
  for (const v of Object.values(w)) {
    assert.ok(v > 0 && v <= 1, `weight ${v} out of (0,1]`);
  }
  assert.equal(JSON.stringify(tuple), snapshot, 'input tuple must not be mutated');
});

test('topBiome: null/empty -> null', () => {
  assert.equal(topBiome({}), null);
  assert.equal(topBiome(null), null);
  assert.equal(topBiome('nope'), null);
});

test('does NOT collide with species biomeAffinity export surface', () => {
  const mod = require('../../apps/backend/services/imprint/imprintBiomeWeights');
  assert.equal(typeof mod.computeImprintBiomeWeights, 'function');
  assert.ok(
    !('getBiomeAffinityModifier' in mod),
    'must not re-export the species combat-affinity name',
  );
});

const {
  IMPRINT_AXES,
  IMPRINT_AXIS_DEFAULTS,
  isImprintEnabled,
  isValidAxisValue,
} = require('../../apps/backend/services/imprint/imprintBiomeWeights');

test('IMPRINT_AXES = the 4 body-part axes', () => {
  assert.deepEqual(IMPRINT_AXES, ['locomotion', 'offense', 'defense', 'senses']);
});

test('IMPRINT_AXIS_DEFAULTS covers all 4 axes with valid values', () => {
  for (const axis of IMPRINT_AXES) {
    assert.ok(isValidAxisValue(axis, IMPRINT_AXIS_DEFAULTS[axis]), `${axis} default valid`);
  }
});

test('isValidAxisValue: case-insensitive, rejects bad axis/value, never throws', () => {
  assert.equal(isValidAxisValue('locomotion', 'VELOCE'), true);
  assert.equal(isValidAxisValue('locomotion', 'veloce'), true);
  assert.equal(isValidAxisValue('locomotion', 'BOGUS'), false);
  assert.equal(isValidAxisValue('bogus_axis', 'VELOCE'), false);
  assert.equal(isValidAxisValue('senses', null), false);
  assert.equal(isValidAxisValue('senses', undefined), false);
});

test('isImprintEnabled: OFF by default, ON only when env flag === "true"', () => {
  assert.equal(isImprintEnabled({}), false);
  assert.equal(isImprintEnabled({ IMPRINT_BEAT_ENABLED: 'false' }), false);
  assert.equal(isImprintEnabled({ IMPRINT_BEAT_ENABLED: '1' }), false);
  assert.equal(isImprintEnabled({ IMPRINT_BEAT_ENABLED: 'true' }), true);
  assert.equal(isImprintEnabled(null), false);
});

// D7 -- diegetic tendency descriptor scaffold (structure only; prose = client HITL).
test('brancoTendencyHint: structured descriptor for a non-empty lean', () => {
  assert.deepEqual(brancoTendencyHint('palude'), {
    leans_toward: 'palude',
    i18n_key: 'imprint.branco_tendency',
    vars: { biome: 'palude' },
    placeholder: 'TODO_IMPRINT_TENDENCY_PROSE',
  });
});

test('brancoTendencyHint: the var tracks the lean (different biome)', () => {
  const t = brancoTendencyHint('reef');
  assert.equal(t.vars.biome, 'reef');
  assert.equal(t.leans_toward, 'reef');
  assert.equal(t.i18n_key, 'imprint.branco_tendency');
});

test('brancoTendencyHint: ships NO player-facing prose (boundary)', () => {
  // The backend must never embed the Italian sentence; only a neutral marker.
  assert.equal(brancoTendencyHint('savana').placeholder, 'TODO_IMPRINT_TENDENCY_PROSE');
});

test('brancoTendencyHint: null/empty/invalid lean -> null', () => {
  assert.equal(brancoTendencyHint(null), null);
  assert.equal(brancoTendencyHint(''), null);
  assert.equal(brancoTendencyHint(undefined), null);
  assert.equal(brancoTendencyHint(42), null);
});
