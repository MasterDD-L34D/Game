'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { accumulateEpigenome } = require('../../apps/backend/services/genetics/epigenome');

test('accumulateEpigenome: EMA blends session conviction (0-100) into prev epi (0-1)', () => {
  const prev = { utility: 0.5, liberty: 0.5, morality: 0.5 };
  const session = { utility: 90, liberty: 50, morality: 10 };
  const out = accumulateEpigenome(prev, session, 0.4);
  // utility: 0.4*0.9 + 0.6*0.5 = 0.66 ; liberty: 0.5 ; morality: 0.4*0.1 + 0.6*0.5 = 0.34
  assert.ok(Math.abs(out.utility - 0.66) < 1e-9);
  assert.ok(Math.abs(out.liberty - 0.5) < 1e-9);
  assert.ok(Math.abs(out.morality - 0.34) < 1e-9);
});

test('accumulateEpigenome: null prev -> 0.5 baseline; axis value 0 is honored (not coerced)', () => {
  const out = accumulateEpigenome(null, { utility: 100, liberty: 0, morality: 50 }, 0.4);
  // utility: 0.4*1.0 + 0.6*0.5 = 0.7 ; liberty: 0.4*0 + 0.6*0.5 = 0.3 ; morality: 0.5
  assert.ok(Math.abs(out.utility - 0.7) < 1e-9);
  assert.ok(Math.abs(out.liberty - 0.3) < 1e-9);
  assert.ok(Math.abs(out.morality - 0.5) < 1e-9);
});

const { computeOffspringEpigenome } = require('../../apps/backend/services/genetics/epigenome');

const RATIFIED = {
  inheritance_weight: 0.3,
  decay_per_gen: 0.6,
  regression_to_mean: 0.3,
  bias_cap: 0.2,
};

test('computeOffspringEpigenome: gen-1 retains ~0.063 of parent deviation (ratified params)', () => {
  const epiA = { utility: 1.0, liberty: 0.5, morality: 0.5 };
  const epiB = { utility: 1.0, liberty: 0.5, morality: 0.5 };
  const mean = { utility: 0.5, liberty: 0.5, morality: 0.5 };
  const out = computeOffspringEpigenome(epiA, epiB, mean, RATIFIED);
  // deviation = (1.0-0.5)*0.7*0.3*0.6 = 0.063 -> offspring 0.563
  assert.ok(Math.abs(out.utility - 0.563) < 1e-9);
  assert.ok(Math.abs(out.liberty - 0.5) < 1e-9);
});

test('computeOffspringEpigenome: bias_cap bounds DEVIATION from species_mean', () => {
  const epiA = { utility: 1.0, liberty: 0.0, morality: 0.5 };
  const epiB = { utility: 1.0, liberty: 0.0, morality: 0.5 };
  const mean = { utility: 0.5, liberty: 0.5, morality: 0.5 };
  // inflate so raw deviation exceeds cap -> clamps to mean +/- cap
  const big = {
    inheritance_weight: 1.0,
    decay_per_gen: 1.0,
    regression_to_mean: 0.0,
    bias_cap: 0.2,
  };
  const out = computeOffspringEpigenome(epiA, epiB, mean, big);
  // utility raw dev = (1.0-0.5)*1*1*1 = 0.5 > 0.2 -> 0.5 + 0.2 = 0.7
  assert.ok(Math.abs(out.utility - 0.7) < 1e-9);
  // liberty raw dev = (0.0-0.5) = -0.5 -> -0.2 -> 0.5 - 0.2 = 0.3
  assert.ok(Math.abs(out.liberty - 0.3) < 1e-9);
});

const { deriveEpigeneticMemory } = require('../../apps/backend/services/genetics/epigenome');

const MEMORY_MAP = {
  utility: { hi: 'memoria_efficienza', lo: 'memoria_spreco' },
  liberty: { hi: 'memoria_indomita', lo: 'memoria_disciplina' },
  morality: { hi: 'memoria_protettiva', lo: 'memoria_spietata' },
};
const NEUTRAL_MEAN = { utility: 0.5, liberty: 0.5, morality: 0.5 };

test('deriveEpigeneticMemory: dominant hi-deviation axis picks hi memory tag', () => {
  const m = deriveEpigeneticMemory(
    { utility: 0.7, liberty: 0.52, morality: 0.5 },
    NEUTRAL_MEAN,
    MEMORY_MAP,
    0.05,
  );
  assert.equal(m.axis, 'utility');
  assert.equal(m.direction, 'hi');
  assert.equal(m.memory_id, 'memoria_efficienza');
  assert.ok(Math.abs(m.strength - 0.2) < 1e-9);
});

test('deriveEpigeneticMemory: lo-deviation axis picks lo memory tag', () => {
  const m = deriveEpigeneticMemory(
    { utility: 0.5, liberty: 0.5, morality: 0.25 },
    NEUTRAL_MEAN,
    MEMORY_MAP,
    0.05,
  );
  assert.equal(m.axis, 'morality');
  assert.equal(m.direction, 'lo');
  assert.equal(m.memory_id, 'memoria_spietata');
});

test('deriveEpigeneticMemory: all axes below min_bias -> pure biome (null)', () => {
  const m = deriveEpigeneticMemory(
    { utility: 0.52, liberty: 0.49, morality: 0.5 },
    NEUTRAL_MEAN,
    MEMORY_MAP,
    0.05,
  );
  assert.equal(m.memory_id, null);
  assert.equal(m.axis, null);
  assert.equal(m.strength, 0);
});

const {
  epigenomeBiasStrength,
  computeFragmentGrant,
  computeSpeciesMean,
} = require('../../apps/backend/services/genetics/epigenome');

test('epigenomeBiasStrength: max axis deviation of parent avg from species mean', () => {
  const s = epigenomeBiasStrength(
    { utility: 1.0, liberty: 0.5, morality: 0.5 },
    { utility: 1.0, liberty: 0.5, morality: 0.5 },
    { utility: 0.5, liberty: 0.5, morality: 0.5 },
  );
  assert.ok(Math.abs(s - 0.5) < 1e-9);
});

test('computeFragmentGrant: strength >= threshold grants amount', () => {
  assert.equal(computeFragmentGrant(0.2, 0.1, 1), 1);
  assert.equal(computeFragmentGrant(0.05, 0.1, 1), 0);
  assert.equal(computeFragmentGrant(0, 0.1, 1), 0);
});

test('computeSpeciesMean: averages stored epigenomes; defaults 0.5 when empty', () => {
  assert.deepEqual(computeSpeciesMean([]), { utility: 0.5, liberty: 0.5, morality: 0.5 });
  const mean = computeSpeciesMean([
    { epigenome: { utility: 0.6, liberty: 0.4, morality: 0.5 } },
    { epigenome: { utility: 0.8, liberty: 0.6, morality: 0.5 } },
    { epigenome: null }, // skipped
  ]);
  assert.ok(Math.abs(mean.utility - 0.7) < 1e-9);
  assert.ok(Math.abs(mean.liberty - 0.5) < 1e-9);
  assert.ok(Math.abs(mean.morality - 0.5) < 1e-9);
});

const { loadEpigenomeConfig } = require('../../apps/backend/services/genetics/epigenome');

test('loadEpigenomeConfig: reads ratified params + memory map from mating.yaml', () => {
  const cfg = loadEpigenomeConfig();
  assert.equal(cfg.inheritance_weight, 0.3);
  assert.equal(cfg.decay_per_gen, 0.6);
  assert.equal(cfg.regression_to_mean, 0.3);
  assert.equal(cfg.bias_cap, 0.2);
  assert.equal(cfg.accumulation_alpha, 0.4);
  assert.equal(cfg.min_bias_expression, 0.05);
  assert.equal(cfg.fragment_grant_threshold, 0.1);
  assert.equal(cfg.fragment_grant_amount, 1);
  assert.equal(cfg.speciation_divergence_threshold, 0.15);
  assert.equal(cfg.axis_memory_map.morality.hi, 'memoria_protettiva');
});
