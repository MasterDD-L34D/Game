// Fase-2 (Spore S5) — hybrid fusion engine (mechanism-only, content deferred).
//
// mating.yaml `hybrid_rules` was display-only (consumed ONLY by
// validate_datasets.py; runtime offspring ignored it). The 3 current rules use
// placeholder trait names (spring_legs/glide/echolocate/thermo) that do NOT
// exist as real trait ids -> CONTENT is master-dd authoring debt (deferred).
//
// This ticket wires the ENGINE only: a pure helper that, given a flat trait-id
// array + a hybrid_rules map, fuses any present "A + B" pair into its result
// trait. Non-destructive at the offspring level (surfaced as metadata, does NOT
// mutate tier_bonus_traits -> zero interaction with RECON-04b complexity-budget).
// Inert until real rules are authored + injected via context.hybridRules.
//
// Placed tests/api/ (CI-globbed; tests/services/ not in any runner glob).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  applyHybridFusion,
  rollMatingOffspring,
} = require('../../apps/backend/services/metaProgression');

test('applyHybridFusion: matching trait pair fuses into result, removing the pair', () => {
  const rules = {
    locomotion: { 'spring_legs + glide': 'spring_glide' },
    senses: { 'echolocate + thermo': 'echo_thermo' },
  };
  const { traits, fusions } = applyHybridFusion(['spring_legs', 'glide', 'denti_x'], rules);
  assert.deepEqual(
    traits.sort(),
    ['denti_x', 'spring_glide'],
    'pair replaced by result, others kept',
  );
  assert.equal(fusions.length, 1);
  assert.deepEqual(fusions[0], {
    category: 'locomotion',
    pair: ['spring_legs', 'glide'],
    result: 'spring_glide',
  });
});

test('applyHybridFusion: inert when no pair matches OR no rules', () => {
  const rules = { locomotion: { 'spring_legs + glide': 'spring_glide' } };
  // only one of the pair present -> no fusion
  const r1 = applyHybridFusion(['spring_legs', 'x'], rules);
  assert.deepEqual(r1.traits.sort(), ['spring_legs', 'x']);
  assert.equal(r1.fusions.length, 0);
  // no rules -> traits unchanged
  const r2 = applyHybridFusion(['a', 'b'], null);
  assert.deepEqual(r2.traits.sort(), ['a', 'b']);
  assert.equal(r2.fusions.length, 0);
});

test('rollMatingOffspring: hybrid_fusions inert by default, populated when injected rules match', () => {
  const parents = {
    parentA: { id: 'pa', trait_ids: ['t1', 't2'], gene_slots: [{ slot_id: 'corpo', value: 'a' }] },
    parentB: { id: 'pb', trait_ids: ['t3', 't4'], gene_slots: [{ slot_id: 'arti', value: 'b' }] },
    biomeId: 'savana',
  };

  // Default: no context.hybridRules -> empty (inert).
  const base = rollMatingOffspring({ ...parents, context: { rng: () => 0 } });
  assert.deepEqual(base.offspring.hybrid_fusions, [], 'inert when no rules injected');

  // Injected rule matching the 2 bonus traits (rainbow tier -> 2 bonus = [t1,t2]).
  const catalog = {
    byId: { env_rare: { tier: 2, mp_cost: 8, biome_boost: ['savana'], name_it: 'R' } },
  };
  const rules = { fusion_test: { 't1 + t2': 't1_t2_hybrid' } };
  const res = rollMatingOffspring({
    ...parents,
    context: { mutationCatalog: catalog, hybridRules: rules, rng: () => 0 },
  });
  assert.equal(res.offspring.hybrid_fusions.length, 1, 'fusion logged when rule matches');
  assert.equal(res.offspring.hybrid_fusions[0].result, 't1_t2_hybrid');
  // Non-destructive: tier_bonus_traits NOT mutated by fusion (engine-only metadata).
  assert.deepEqual(res.offspring.tier_bonus_traits.sort(), ['t1', 't2'], 'bonus traits unchanged');
});
