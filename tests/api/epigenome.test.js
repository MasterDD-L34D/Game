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
