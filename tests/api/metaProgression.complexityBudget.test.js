// RECON-04b (Fase-1 Spore) — complexity-budget Sigma c <= C_max enforce (G2).
//
// ADR-2026-04-26 locks "offspring complexity must not exceed C_max regardless of
// inherited parts". rollMatingOffspring did NOT enforce this (verified MISSING).
// RECON-04b adds the enforce hook at offspring materialization.
//
// Formula (master-dd ratified 2026-05-26, Option A):
//   computeOffspringComplexity = Sigma mp_cost over applied = [env_mutation.id,
//   ...tier_bonus_traits]. Ids resolving in mutation_catalog use mp_cost;
//   non-catalog ids (bonus trait ids) use FALLBACK_BONUS_COST = 8 (modal mp_cost).
//   Inherited gene slots are structural (preserved, NOT counted).
//   C_max = 30 (env OFFSPRING_C_MAX). Over-budget -> drop random bonus trait
//   (preserve inherited slots) until <= C_max, hard cap 5 iters.
//
// Placed tests/api/ (CI-globbed); tests/services/ not in any runner glob
// (RECON-04a §3.3). Imports the service directly.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  rollMatingOffspring,
  computeOffspringComplexity,
} = require('../../apps/backend/services/metaProgression');

// Tier-2 env mutation (rainbow trigger) with high mp_cost matching test biome.
const overBudgetCatalog = {
  byId: {
    env_rare: {
      tier: 2,
      mp_cost: 15,
      biome_boost: ['testbiome'],
      name_it: 'Env Rara',
    },
  },
};

test('rollMatingOffspring: over-budget offspring drops bonus until complexity <= C_max (G2)', () => {
  const result = rollMatingOffspring({
    parentA: { id: 'pa', trait_ids: ['t1', 't2'], gene_slots: [{ slot_id: 'corpo', value: 'a' }] },
    parentB: { id: 'pb', trait_ids: ['t3', 't4'], gene_slots: [{ slot_id: 'arti', value: 'b' }] },
    biomeId: 'testbiome',
    context: { mutationCatalog: overBudgetCatalog, rng: () => 0 },
  });

  assert.equal(result.success, true);
  const o = result.offspring;
  // Rainbow tier (env tier 2) -> would seed 2 bonus traits.
  // env(15) + 2 bonus(8 each) = 31 > C_max(30) -> drop 1 bonus -> 23.
  assert.ok(o.complexity <= 30, `complexity ${o.complexity} must be <= C_max 30`);
  assert.equal(o.complexity, 23, 'env 15 + 1 surviving bonus 8 = 23');
  assert.equal(o.tier_bonus_traits.length, 1, 'one bonus dropped (was 2)');
  assert.ok(o.complexity_budget, 'complexity_budget metadata present');
  assert.equal(o.complexity_budget.c_max, 30);
  assert.equal(o.complexity_budget.dropped.length, 1, 'one bonus trait recorded as dropped');
  // Inherited gene slots preserved (not dropped to meet budget).
  assert.equal(o.gene_slots.length, 2, 'inherited slots preserved');

  // Helper direct: complexity of env + 2 bonus on this catalog = 31.
  assert.equal(
    computeOffspringComplexity(
      { environmental_mutation: { id: 'env_rare' }, tier_bonus_traits: ['t1', 't2'] },
      overBudgetCatalog,
    ),
    31,
  );
});

test('rollMatingOffspring: under-budget offspring keeps all bonus (no drop)', () => {
  // env tier 1 (not rare) -> no-glow tier -> 0 bonus. complexity = env(8) only.
  const underCatalog = {
    byId: {
      env_common: { tier: 1, mp_cost: 8, biome_boost: ['testbiome'], name_it: 'Env Comune' },
    },
  };
  const result = rollMatingOffspring({
    parentA: { id: 'pa', trait_ids: ['t1', 't2'], gene_slots: [{ slot_id: 'corpo', value: 'a' }] },
    parentB: { id: 'pb', trait_ids: ['t3', 't4'], gene_slots: [{ slot_id: 'arti', value: 'b' }] },
    biomeId: 'testbiome',
    context: { mutationCatalog: underCatalog, rng: () => 0 },
  });
  const o = result.offspring;
  assert.equal(o.complexity, 8, 'env 8, no bonus (no-glow tier)');
  assert.ok(o.complexity <= 30);
  assert.equal(o.complexity_budget.dropped.length, 0, 'nothing dropped under budget');
});

test('rollMatingOffspring: at-budget exact (complexity === C_max) keeps all bonus', () => {
  // env tier 2 (rainbow -> 2 bonus), mp_cost 14: 14 + 8 + 8 = 30 === C_max -> NOT over.
  const exactCatalog = {
    byId: {
      env_exact: { tier: 2, mp_cost: 14, biome_boost: ['testbiome'], name_it: 'Env Esatta' },
    },
  };
  const result = rollMatingOffspring({
    parentA: { id: 'pa', trait_ids: ['t1', 't2'], gene_slots: [{ slot_id: 'corpo', value: 'a' }] },
    parentB: { id: 'pb', trait_ids: ['t3', 't4'], gene_slots: [{ slot_id: 'arti', value: 'b' }] },
    biomeId: 'testbiome',
    context: { mutationCatalog: exactCatalog, rng: () => 0 },
  });
  const o = result.offspring;
  assert.equal(o.complexity, 30, 'env 14 + 2 bonus 8 = 30 (boundary)');
  assert.equal(o.tier_bonus_traits.length, 2, 'at-budget keeps both bonus');
  assert.equal(o.complexity_budget.dropped.length, 0, 'no drop at exact budget');
});
