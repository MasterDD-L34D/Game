// ADR-2026-05-29-ermes-runtime-bridge TKT-BR-06 -- applyErmesBiomeTraitCosts guard.
//
// Characterization + invariant tests su shipped behavior (worker BR-06 689e59c6
// non aveva test dedicato; questo fill chiude il test-gap per ADR Test coverage).
//
// Invarianti chiave (da sot-drift-verifier preliminary verdict + ADR sezione C/G):
//   - idempotent (marker _ermes_biome_costs_applied previene double-apply)
//   - soft-fail su biome/unit assenti o report mancante (ADR-21c precedent)
//   - bucket DISCRETI cap +/-2 (anti-ref Creatures)
//   - NO write su unit.creature_epigenome.bias (gate sot-drift-verifier R6)
//   - delta su chiavi ADR-21c (attack_mod_bonus / defense_mod_bonus / mobility)
//
// Test runner: node:test (scripts/run-test-api.cjs glob -- NB questo e' tests/ai/,
// verificare glob includa tests/ai/ oppure spostare in tests/api/ se orphan).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const te = require(path.resolve(__dirname, '../../apps/backend/services/traitEffects'));

// Synthetic bucketed payloads (inietta via opts.bucketed per evitare dipendenza
// dal report fisico + bucket file -- isola la logica di apply).
function bucketedHigh() {
  return {
    buckets: {
      eco_pressure_score: { band: 'high', def: { delta_mod: 1 } },
      'mutation_bias.heat_resistance': { band: 'high', def: { delta: { defense_mod: 2 } } },
    },
    caps: { max_delta_any_stat: 2, max_buckets_active_per_unit: 3 },
  };
}

function bucketedMed() {
  return {
    buckets: {
      eco_pressure_score: { band: 'med', def: { delta_mod: 0 } },
    },
    caps: { max_delta_any_stat: 2, max_buckets_active_per_unit: 3 },
  };
}

test('no-op when biomeId missing', () => {
  const unit = { id: 'u1', attack_mod_bonus: 0 };
  const applied = te.applyErmesBiomeTraitCosts(unit, null);
  assert.deepEqual(applied, []);
  assert.equal(unit._ermes_biome_costs_applied, undefined);
});

test('no-op when unit missing', () => {
  const applied = te.applyErmesBiomeTraitCosts(null, 'savana');
  assert.deepEqual(applied, []);
});

test('soft-fail returns [] when no bucketed + no exporter (ADR-21c precedent)', () => {
  const unit = { id: 'u1' };
  // opts.bucketed undefined + opts.ermesExporter stub without getErmesBucketed.
  const applied = te.applyErmesBiomeTraitCosts(unit, 'savana', {
    ermesExporter: {},
  });
  assert.deepEqual(applied, []);
});

test('high band applies delta_mod to attack+defense + delta defense_mod', () => {
  const unit = { id: 'u1', attack_mod_bonus: 0, defense_mod_bonus: 0, mobility: 0 };
  const applied = te.applyErmesBiomeTraitCosts(unit, 'high_biome', { bucketed: bucketedHigh() });
  assert.ok(applied.length >= 1, 'expected at least 1 bucket applied');
  // eco delta_mod +1 -> attack +1, defense +1. heat_resistance delta defense +2.
  // defense clamped at cap 2 -> defense = clamp(1+2)=2. attack = 1.
  assert.equal(unit.attack_mod_bonus, 1, 'attack_mod_bonus should be +1');
  assert.equal(unit.defense_mod_bonus, 2, 'defense_mod_bonus clamped to cap +2');
  assert.equal(unit._ermes_biome_costs_applied, true);
});

test('med band applies zero delta (neutral)', () => {
  const unit = { id: 'u1', attack_mod_bonus: 0, defense_mod_bonus: 0 };
  te.applyErmesBiomeTraitCosts(unit, 'med_biome', { bucketed: bucketedMed() });
  assert.equal(unit.attack_mod_bonus, 0);
  assert.equal(unit.defense_mod_bonus, 0);
  assert.equal(unit._ermes_biome_costs_applied, true, 'marker set even when delta 0');
});

test('idempotent: re-apply does not double-charge', () => {
  const unit = { id: 'u1', attack_mod_bonus: 0, defense_mod_bonus: 0 };
  te.applyErmesBiomeTraitCosts(unit, 'high_biome', { bucketed: bucketedHigh() });
  const a1 = unit.attack_mod_bonus;
  const d1 = unit.defense_mod_bonus;
  te.applyErmesBiomeTraitCosts(unit, 'high_biome', { bucketed: bucketedHigh() });
  assert.equal(unit.attack_mod_bonus, a1, 'attack unchanged on re-apply');
  assert.equal(unit.defense_mod_bonus, d1, 'defense unchanged on re-apply');
});

test('cap max_delta_any_stat enforced (no runaway)', () => {
  const unit = { id: 'u1', defense_mod_bonus: 0 };
  const overcap = {
    buckets: {
      a: { band: 'high', def: { delta: { defense_mod: 2 } } },
      b: { band: 'high', def: { delta: { defense_mod: 2 } } },
    },
    caps: { max_delta_any_stat: 2, max_buckets_active_per_unit: 3 },
  };
  te.applyErmesBiomeTraitCosts(unit, 'b', { bucketed: overcap });
  assert.ok(unit.defense_mod_bonus <= 2, `defense capped at 2, got ${unit.defense_mod_bonus}`);
});

test('cap max_buckets_active_per_unit limits applied count', () => {
  const unit = { id: 'u1' };
  const many = {
    buckets: {
      a: { band: 'high', def: { delta: { attack_mod: 1 } } },
      b: { band: 'high', def: { delta: { defense_mod: 1 } } },
      c: { band: 'high', def: { delta: { mobility: 1 } } },
      d: { band: 'high', def: { delta: { rest_recovery: 1 } } },
    },
    caps: { max_delta_any_stat: 2, max_buckets_active_per_unit: 3 },
  };
  const applied = te.applyErmesBiomeTraitCosts(unit, 'b', { bucketed: many });
  assert.ok(applied.length <= 3, `max 3 buckets active, got ${applied.length}`);
});

test('R6 gate: NEVER writes unit.creature_epigenome.bias (sot-drift-verifier)', () => {
  const unit = { id: 'u1', attack_mod_bonus: 0, defense_mod_bonus: 0 };
  te.applyErmesBiomeTraitCosts(unit, 'high_biome', { bucketed: bucketedHigh() });
  assert.equal(unit.creature_epigenome, undefined, 'must NOT touch creature_epigenome (D-HEIR substrate)');
});

test('writes to ADR-21c keys only (attack_mod_bonus/defense_mod_bonus/mobility)', () => {
  const unit = { id: 'u1' };
  te.applyErmesBiomeTraitCosts(unit, 'high_biome', { bucketed: bucketedHigh() });
  const allowed = new Set([
    'id', 'attack_mod_bonus', 'defense_mod_bonus', 'mobility', 'rest_recovery',
    '_ermes_biome_costs_applied', '_ermes_biome_costs_log',
  ]);
  for (const k of Object.keys(unit)) {
    assert.ok(allowed.has(k), `unexpected field written: ${k}`);
  }
});
