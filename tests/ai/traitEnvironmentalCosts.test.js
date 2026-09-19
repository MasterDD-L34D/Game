// M11 pilot (ADR-2026-04-21c, issue #1674) — trait environmental costs tests.
//
// Pilot scope: 4 trait × 3 biomi = 12 cell.
// Verifica loader + applyBiomeTraitCosts mutations + idempotency + wire.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadTraitEnvironmentalCosts,
  applyBiomeTraitCosts,
  _resetBiomeCostCache,
} = require('../../apps/backend/services/traitEffects');

test('loadTraitEnvironmentalCosts: carica YAML reale con 4 trait × 3 biomi', () => {
  _resetBiomeCostCache();
  const data = loadTraitEnvironmentalCosts();
  assert.ok(data, 'YAML deve caricare');
  assert.ok(data.trait_costs, 'trait_costs presente');
  const traits = Object.keys(data.trait_costs);
  assert.equal(traits.length, 4, 'esattamente 4 trait pilot');
  assert.ok(traits.includes('thermal_armor'));
  assert.ok(traits.includes('zampe_a_molla'));
  assert.ok(traits.includes('pelle_elastomera'));
  assert.ok(traits.includes('denti_seghettati'));
  // Ogni trait ha 3 biomi
  for (const tid of traits) {
    const biomes = Object.keys(data.trait_costs[tid]);
    assert.equal(biomes.length, 3, `${tid} deve avere 3 biomi`);
    assert.ok(biomes.includes('savana'));
    assert.ok(biomes.includes('caverna_risonante'));
    assert.ok(biomes.includes('rovine_planari'));
  }
});

test('loadTraitEnvironmentalCosts: soft-fail su path missing → registry vuoto', () => {
  _resetBiomeCostCache();
  const data = loadTraitEnvironmentalCosts('/nonexistent/path.yaml', {
    warn: () => {},
    log: () => {},
  });
  assert.deepEqual(data, {}, 'registry vuoto su ENOENT');
  _resetBiomeCostCache();
});

// ─── Scenario 1: thermal_armor × savana — penalty doppio ────────────
test('Scenario 1: thermal_armor × savana → defense_mod_bonus -1, mobility -1', () => {
  _resetBiomeCostCache();
  const unit = {
    id: 'u1',
    traits: ['thermal_armor'],
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    mobility: 3,
  };
  const applied = applyBiomeTraitCosts(unit, 'savana');
  assert.equal(applied.length, 1);
  assert.equal(applied[0].trait, 'thermal_armor');
  assert.equal(applied[0].biome, 'savana');
  assert.equal(applied[0].delta.defense_mod, -1);
  assert.equal(applied[0].delta.mobility, -1);
  assert.equal(unit.defense_mod_bonus, -1);
  assert.equal(unit.mobility, 2);
  assert.equal(unit.attack_mod_bonus, 0, 'attack non toccato');
});

// ─── Scenario 2: thermal_armor × caverna → bonus +2 ─────────────────
test('Scenario 2: thermal_armor × caverna_risonante → defense_mod_bonus +2', () => {
  _resetBiomeCostCache();
  const unit = {
    id: 'u2',
    traits: ['thermal_armor'],
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    mobility: 3,
  };
  const applied = applyBiomeTraitCosts(unit, 'caverna_risonante');
  assert.equal(applied.length, 1);
  assert.equal(applied[0].delta.defense_mod, 2);
  assert.equal(unit.defense_mod_bonus, 2);
  assert.equal(unit.mobility, 3, 'mobility non toccata');
});

// ─── Scenario 3: denti_seghettati × savana → attack +1 ──────────────
test('Scenario 3: denti_seghettati × savana → attack_mod_bonus +1', () => {
  _resetBiomeCostCache();
  const unit = {
    id: 'u3',
    traits: ['denti_seghettati'],
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    mobility: 3,
  };
  const applied = applyBiomeTraitCosts(unit, 'savana');
  assert.equal(applied.length, 1);
  assert.equal(applied[0].delta.attack_mod, 1);
  assert.equal(unit.attack_mod_bonus, 1);
});

// ─── Scenario 4: qualsiasi trait × rovine_planari → no-op (neutral) ──
test('Scenario 4: rovine_planari è neutral per tutti i 4 trait pilot', () => {
  _resetBiomeCostCache();
  for (const traitId of [
    'thermal_armor',
    'zampe_a_molla',
    'pelle_elastomera',
    'denti_seghettati',
  ]) {
    const unit = {
      id: `u-${traitId}`,
      traits: [traitId],
      attack_mod_bonus: 0,
      defense_mod_bonus: 0,
      mobility: 3,
    };
    const applied = applyBiomeTraitCosts(unit, 'rovine_planari');
    assert.equal(applied.length, 0, `${traitId} × rovine_planari è neutral`);
    assert.equal(unit.attack_mod_bonus, 0);
    assert.equal(unit.defense_mod_bonus, 0);
    assert.equal(unit.mobility, 3);
  }
});

// ─── Extra coverage: zampe_a_molla × savana vs caverna ──────────────
test('zampe_a_molla: savana +1 mobility, caverna -1 mobility', () => {
  _resetBiomeCostCache();
  const u1 = { id: 'u', traits: ['zampe_a_molla'], mobility: 3 };
  applyBiomeTraitCosts(u1, 'savana');
  assert.equal(u1.mobility, 4);

  const u2 = { id: 'u', traits: ['zampe_a_molla'], mobility: 3 };
  applyBiomeTraitCosts(u2, 'caverna_risonante');
  assert.equal(u2.mobility, 2);
});

// ─── Extra coverage: pelle_elastomera caverna +1 def ────────────────
test('pelle_elastomera × caverna_risonante → defense_mod_bonus +1', () => {
  _resetBiomeCostCache();
  const unit = {
    id: 'u',
    traits: ['pelle_elastomera'],
    defense_mod_bonus: 0,
  };
  applyBiomeTraitCosts(unit, 'caverna_risonante');
  assert.equal(unit.defense_mod_bonus, 1);
});

// ─── Multi-trait aggregation ────────────────────────────────────────
test('multi-trait: thermal_armor + denti_seghettati × savana aggregano delta', () => {
  _resetBiomeCostCache();
  const unit = {
    id: 'u',
    traits: ['thermal_armor', 'denti_seghettati'],
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    mobility: 3,
  };
  const applied = applyBiomeTraitCosts(unit, 'savana');
  assert.equal(applied.length, 2);
  // thermal: -1 def, -1 mob; denti: +1 atk
  assert.equal(unit.defense_mod_bonus, -1);
  assert.equal(unit.mobility, 2);
  assert.equal(unit.attack_mod_bonus, 1);
});

// ─── Idempotency guard ───────────────────────────────────────────────
test('idempotent: chiamate ripetute non accumulano delta', () => {
  _resetBiomeCostCache();
  const unit = {
    id: 'u',
    traits: ['thermal_armor'],
    defense_mod_bonus: 0,
    mobility: 3,
  };
  applyBiomeTraitCosts(unit, 'savana');
  applyBiomeTraitCosts(unit, 'savana');
  applyBiomeTraitCosts(unit, 'savana');
  assert.equal(unit.defense_mod_bonus, -1, 'delta applicato una sola volta');
  assert.equal(unit.mobility, 2);
  assert.equal(unit._biome_costs_applied, true);
});

// ─── Unknown trait / unknown biome → skip silently ──────────────────
test('unknown trait → no-op senza throw', () => {
  _resetBiomeCostCache();
  const unit = { id: 'u', traits: ['trait_inesistente'], mobility: 3 };
  const applied = applyBiomeTraitCosts(unit, 'savana');
  assert.equal(applied.length, 0);
  assert.equal(unit.mobility, 3);
});

test('unknown biome → no-op (fuori scope pilot)', () => {
  _resetBiomeCostCache();
  const unit = {
    id: 'u',
    traits: ['thermal_armor'],
    defense_mod_bonus: 0,
  };
  const applied = applyBiomeTraitCosts(unit, 'bioma_sconosciuto_mXX');
  assert.equal(applied.length, 0);
  assert.equal(unit.defense_mod_bonus, 0);
});

test('biomeId null/undefined → no-op', () => {
  _resetBiomeCostCache();
  const unit = { id: 'u', traits: ['thermal_armor'], defense_mod_bonus: 0 };
  assert.deepEqual(applyBiomeTraitCosts(unit, null), []);
  assert.deepEqual(applyBiomeTraitCosts(unit, undefined), []);
  assert.deepEqual(applyBiomeTraitCosts(unit, ''), []);
  assert.equal(unit.defense_mod_bonus, 0);
});

// ─── Validation: YAML cell delta range ±1/±2 ────────────────────────
test('validation: tutti i delta YAML in range [-2, 2]', () => {
  _resetBiomeCostCache();
  const data = loadTraitEnvironmentalCosts();
  assert.ok(data.trait_costs);
  for (const [traitId, biomeMap] of Object.entries(data.trait_costs)) {
    for (const [biomeId, cell] of Object.entries(biomeMap)) {
      for (const [stat, value] of Object.entries(cell)) {
        if (stat === 'rationale') continue;
        const n = Number(value);
        assert.ok(
          n >= -2 && n <= 2 && n !== 0,
          `${traitId}×${biomeId}.${stat}=${value} fuori range pilot ±1/±2`,
        );
      }
    }
  }
});
