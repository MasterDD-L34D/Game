'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runLineageSim } = require('../../tools/sim/epigenome_lineage_sim');

test('determinism: same seed -> identical report', () => {
  const a = runLineageSim({
    profile: 'strong_utility',
    generations: 4,
    sessionsPerGen: 5,
    lineages: 10,
    seed: 42,
  });
  const b = runLineageSim({
    profile: 'strong_utility',
    generations: 4,
    sessionsPerGen: 5,
    lineages: 10,
    seed: 42,
  });
  assert.deepEqual(a.by_gen, b.by_gen);
});

const { PROFILES } = require('../../tools/sim/epigenome_lineage_sim');

test('neutral control: no false bias (expression ~0, deviation ~0)', () => {
  const r = runLineageSim({
    profile: 'neutral',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
  });
  assert.equal(r.by_gen[0].expression_rate, 0, 'neutral play must not express a bias');
  assert.ok(r.by_gen[0].deviation_avg < 1e-6, 'neutral deviation must be ~0');
  assert.equal(r.checks.all_gens_under_cap, true);
});

test('perceptibility: strong play expresses a bias at gen-1 (dominant memoria_efficienza)', () => {
  const r = runLineageSim({
    profile: 'strong_utility',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
  });
  assert.ok(
    r.checks.gen1_deviation > r.params.min_bias_expression - 1e-9,
    'gen-1 deviation must reach the expression threshold',
  );
  assert.ok(r.by_gen[0].expression_rate > 0, 'strong play must express at gen-1');
  const hist = r.by_gen[0].memory_hist;
  const dominant = Object.entries(hist).sort((a, b) => b[1] - a[1])[0];
  assert.equal(dominant[0], 'memoria_efficienza', 'utility-high must map to memoria_efficienza');
});

test('anti-snowball: strong play converges to a bounded fixed point (plateau, under cap)', () => {
  const r = runLineageSim({
    profile: 'strong_utility',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
  });
  assert.equal(r.checks.all_gens_under_cap, true, 'no generation may exceed bias_cap');
  assert.equal(
    r.checks.converged,
    true,
    'late-gen deviation delta must be < 0.01 (fixed point reached)',
  );
  assert.ok(
    r.checks.genG_deviation < r.params.bias_cap,
    'plateau must sit well under cap (no runaway)',
  );
  assert.equal(r.checks.anti_snowball, true);
});

test('paramOverrides: higher inheritance_weight raises gen-1 deviation (tuning sweep)', () => {
  const base = runLineageSim({
    profile: 'strong_utility',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
    paramOverrides: { inheritance_weight: 0.3 },
  });
  const bumped = runLineageSim({
    profile: 'strong_utility',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
    paramOverrides: { inheritance_weight: 0.6 },
  });
  // deviation is linear in weight: 0.6 vs ratified 0.3 -> ~2x gen-1 deviation.
  assert.equal(bumped.params.weight, 0.6, 'override must apply to reported params');
  assert.ok(
    bumped.checks.gen1_deviation > base.checks.gen1_deviation * 1.8,
    'doubling weight must ~double gen-1 deviation',
  );
  assert.equal(bumped.checks.all_gens_under_cap, true, 'still bounded under cap at weight 0.6');
});
