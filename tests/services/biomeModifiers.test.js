// QW1 (M-018) — biomeModifiers unit tests.
//
// Verifies:
//   - savana baseline (diff_base=2) → no-op modifiers
//   - hardcore biome (abisso_vulcanico diff_base=5) → escalation
//   - missing biome / missing yaml → safe defaults (back-compat)
//   - explicit YAML stress_modifiers override formula
//   - applyEnemyHpMultiplier mutates only sistema units, idempotent

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadBiomesConfig,
  getBiomeModifiers,
  applyEnemyHpMultiplier,
  _resetCache,
  SAFE_DEFAULTS,
} = require('../../apps/backend/services/combat/biomeModifiers');

test('loadBiomesConfig: parses biomes block from real data/core/biomes.yaml', () => {
  _resetCache();
  const biomes = loadBiomesConfig();
  assert.ok(biomes && typeof biomes === 'object', 'biomes block returned');
  assert.ok(biomes.savana, 'savana shipping biome present');
  assert.ok(biomes.abisso_vulcanico, 'abisso_vulcanico shipping biome present');
  assert.equal(typeof biomes.savana.diff_base, 'number');
});

test('loadBiomesConfig: cache singleton; reset re-reads', () => {
  _resetCache();
  const a = loadBiomesConfig();
  const b = loadBiomesConfig();
  assert.equal(a, b, 'same reference when cached');
  _resetCache();
  const c = loadBiomesConfig();
  assert.deepEqual(a, c, 'reload yields equal content');
});

test('loadBiomesConfig: ENOENT soft-fails to empty registry, no throw', () => {
  _resetCache();
  const noisy = { warn: () => {} };
  const result = loadBiomesConfig('/definitely/missing/path-qw1.yaml', noisy);
  assert.deepEqual(result, {});
  _resetCache();
});

test('getBiomeModifiers(savana): baseline diff_base=2 → all multipliers neutral', () => {
  _resetCache();
  const m = getBiomeModifiers('savana');
  // savana diff_base=2 → 1+(2-2)*0.05 = 1.0 hp_mult
  assert.equal(m.diff_base, 2);
  assert.equal(m.hp_mult, 1.0);
  assert.equal(m.pressure_mult, 0);
  assert.equal(m.pressure_initial_bonus, 0);
});

test('getBiomeModifiers(abisso_vulcanico): hardcore diff_base=5 → escalation', () => {
  _resetCache();
  const m = getBiomeModifiers('abisso_vulcanico');
  assert.equal(m.diff_base, 5);
  // 1 + (5-2)*0.05 = 1.15
  assert.ok(Math.abs(m.hp_mult - 1.15) < 1e-9, `hp_mult ${m.hp_mult} ~ 1.15`);
  // max(0, 5-2) = 3
  assert.equal(m.pressure_mult, 3);
  // (5-2)*5 = 15
  assert.equal(m.pressure_initial_bonus, 15);
});

test('getBiomeModifiers(unknown_biome): safe defaults, no-op', () => {
  _resetCache();
  const m = getBiomeModifiers('not_a_real_biome_xyz');
  assert.deepEqual(m, SAFE_DEFAULTS);
});

test('getBiomeModifiers(null/undefined/""): safe defaults', () => {
  _resetCache();
  assert.deepEqual(getBiomeModifiers(null), SAFE_DEFAULTS);
  assert.deepEqual(getBiomeModifiers(undefined), SAFE_DEFAULTS);
  assert.deepEqual(getBiomeModifiers(''), SAFE_DEFAULTS);
});

test('getBiomeModifiers: explicit YAML stress_modifiers override formula', () => {
  _resetCache();
  const stubRegistry = {
    custom_biome: {
      diff_base: 4,
      hazard: {
        stress_modifiers: {
          enemy_hp_multiplier: 1.5,
          pressure_initial: 25,
          pressure_per_round: 2,
        },
      },
    },
  };
  const m = getBiomeModifiers('custom_biome', stubRegistry);
  assert.equal(m.diff_base, 4);
  assert.equal(m.hp_mult, 1.5, 'explicit hp override wins');
  assert.equal(m.pressure_initial_bonus, 25, 'explicit pressure_initial wins');
  assert.equal(m.pressure_mult, 2, 'explicit pressure_per_round wins');
});

test('getBiomeModifiers: missing diff_base → SAFE_DEFAULTS.diff_base (1.0)', () => {
  _resetCache();
  const stubRegistry = {
    sparse_biome: {
      hazard: { stress_modifiers: {} },
    },
  };
  const m = getBiomeModifiers('sparse_biome', stubRegistry);
  assert.equal(m.diff_base, 1.0);
  // 1 + (1-2)*0.05 = 0.95 — under-baseline biome eases enemies (rare)
  assert.ok(Math.abs(m.hp_mult - 0.95) < 1e-9);
  assert.equal(m.pressure_mult, 0, 'max(0, 1-2)=0');
  assert.equal(m.pressure_initial_bonus, -5, '(1-2)*5 = -5');
});

test('applyEnemyHpMultiplier: scales sistema units only, idempotent', () => {
  const units = [
    { id: 'p1', controlled_by: 'player', max_hp: 10, hp: 10 },
    { id: 'e1', controlled_by: 'sistema', max_hp: 10, hp: 10 },
    { id: 'e2', controlled_by: 'sistema', max_hp: 20, hp: 20 },
  ];
  applyEnemyHpMultiplier(units, 1.5);
  assert.equal(units[0].hp, 10, 'player untouched');
  assert.equal(units[0].max_hp, 10);
  assert.equal(units[1].hp, 15, 'sistema scaled 10→15');
  assert.equal(units[1].max_hp, 15);
  assert.equal(units[2].hp, 30, 'sistema scaled 20→30');
  assert.equal(units[2].max_hp, 30);
  // idempotent: second call no-ops
  applyEnemyHpMultiplier(units, 1.5);
  assert.equal(units[1].hp, 15, 'still 15, not 22 (idempotent)');
  assert.equal(units[2].hp, 30, 'still 30');
});

test('applyEnemyHpMultiplier: hp_mult=1.0 short-circuits (no marker)', () => {
  const units = [{ id: 'e1', controlled_by: 'sistema', max_hp: 10, hp: 10 }];
  applyEnemyHpMultiplier(units, 1.0);
  assert.equal(units[0]._biome_hp_applied, undefined, 'no marker set');
  // subsequent call with non-1.0 still applies
  applyEnemyHpMultiplier(units, 1.5);
  assert.equal(units[0].hp, 15);
});

test('applyEnemyHpMultiplier: invalid input → no-op', () => {
  assert.doesNotThrow(() => applyEnemyHpMultiplier(null, 1.5));
  assert.doesNotThrow(() => applyEnemyHpMultiplier([], 1.5));
  const units = [{ id: 'e1', controlled_by: 'sistema', max_hp: 10, hp: 10 }];
  applyEnemyHpMultiplier(units, NaN);
  assert.equal(units[0].hp, 10, 'NaN multiplier no-op');
});
