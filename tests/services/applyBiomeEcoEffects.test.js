'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyBiomeEcoEffects,
  _resetBiomeCostCache,
} = require('../../apps/backend/services/traitEffects');

const REG = { trait_costs: { t_neg: { b: { attack_mod: -2 } } } };
const ERMES_LOW = {
  buckets: { eco_pressure_score: { band: 'low', def: { delta_mod: -1 } } },
  caps: { max_delta_any_stat: 2, max_buckets_active_per_unit: 3 },
};
const ERMES_HIGH = {
  buckets: { eco_pressure_score: { band: 'high', def: { delta_mod: 1 } } },
  caps: { max_delta_any_stat: 2, max_buckets_active_per_unit: 3 },
};
function unit(extra = {}) {
  return { id: 'u1', traits: ['t_neg'], attack_mod_bonus: 0, defense_mod_bonus: 0, ...extra };
}

test('unified cap: 21c -2 + ermes -1 on attack clamps to -2 (not -3)', () => {
  _resetBiomeCostCache();
  const u = unit();
  const log = applyBiomeEcoEffects(u, 'b', { biomeCostsRegistry: REG, bucketed: ERMES_LOW });
  assert.equal(u.attack_mod_bonus, -2, 'attack combined clamped to -2');
  assert.equal(u.defense_mod_bonus, -1, 'defense only ermes -1 (no 21c defense)');
  assert.equal(log.capped, true);
  assert.equal(log.combined_delta.attack_mod_bonus, -2);
  assert.equal(log.band, 'low');
});

test('base-snapshot non-clobber: pre-existing bonus preserved', () => {
  _resetBiomeCostCache();
  const u = unit({ attack_mod_bonus: 5 });
  applyBiomeEcoEffects(u, 'b', { biomeCostsRegistry: REG, bucketed: ERMES_LOW });
  assert.equal(u.attack_mod_bonus, 3); // base 5 + clamped -2
});

test('idempotent: re-apply does not double-charge', () => {
  _resetBiomeCostCache();
  const u = unit();
  applyBiomeEcoEffects(u, 'b', { biomeCostsRegistry: REG, bucketed: ERMES_LOW });
  const after1 = u.attack_mod_bonus;
  applyBiomeEcoEffects(u, 'b', { biomeCostsRegistry: REG, bucketed: ERMES_LOW });
  assert.equal(u.attack_mod_bonus, after1);
});

test('soft-fail: no unit or no biomeId -> empty log, no throw', () => {
  assert.deepEqual(applyBiomeEcoEffects(null, 'b', {}).combined_delta, {});
  assert.deepEqual(applyBiomeEcoEffects(unit(), null, {}).combined_delta, {});
});

test('symmetric: positive band applies to a plain unit (both pools)', () => {
  _resetBiomeCostCache();
  const enemy = { id: 'e1', traits: [], attack_mod_bonus: 0, defense_mod_bonus: 0 };
  applyBiomeEcoEffects(enemy, 'b', { biomeCostsRegistry: REG, bucketed: ERMES_HIGH });
  assert.equal(enemy.attack_mod_bonus, 1);
  assert.equal(enemy.defense_mod_bonus, 1);
});

test('R6 gate: never writes creature_epigenome.bias', () => {
  _resetBiomeCostCache();
  const u = unit();
  applyBiomeEcoEffects(u, 'b', { biomeCostsRegistry: REG, bucketed: ERMES_LOW });
  assert.equal(u.creature_epigenome, undefined);
});

// SPEC-P A13 read-side: a wounded biome harshens the eco effect, within the ER2 cap.
test('A13 woundedStep: wounded biome debuffs eco bonuses (within ER2 cap)', () => {
  _resetBiomeCostCache();
  const u = unit();
  applyBiomeEcoEffects(u, 'b', { woundedStep: 1 });
  assert.equal(u.attack_mod_bonus, -1); // wounded -1
  assert.equal(u.defense_mod_bonus, -1);
});

test('A13 woundedStep: stacks with eco debuff but stays clamped at ER2 (-2)', () => {
  _resetBiomeCostCache();
  const u = unit();
  const log = applyBiomeEcoEffects(u, 'b', {
    biomeCostsRegistry: REG,
    bucketed: ERMES_LOW,
    woundedStep: 1,
  });
  // attack: 21c -2 + ermes -1 + wounded -1 = -4 raw -> clamped to -2 (ER2)
  assert.equal(u.attack_mod_bonus, -2);
  assert.equal(log.capped, true);
});

test('A13 woundedStep: absent/0 -> no-op (backward compat)', () => {
  _resetBiomeCostCache();
  const u = unit();
  applyBiomeEcoEffects(u, 'b', {});
  assert.equal(u.attack_mod_bonus, 0);
  assert.equal(u.defense_mod_bonus, 0);
});
