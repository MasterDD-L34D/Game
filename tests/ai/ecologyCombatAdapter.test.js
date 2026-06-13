// TKT-ADAPTER-ECO-COMBAT (keystone Wave 3, spec 2026-05-30) — adapter unit tests.
//
// Deterministic ecology->combat stat adapter: threat_tier x role_class -> base
// hp/mod/dc/guardia/ap/attack_range, genetic_traits.core + jobs_bias passthrough.
// Base stats only (downstream damageCurves applies encounter-class multipliers).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  deriveCombatStats,
  roleClassFor,
  speedForMorphotype,
  DEFAULT_KNOBS,
} = require('../../apps/backend/services/worldgen/ecologyCombatAdapter');

// --- fixtures (realistic species inputs) ---
const T1_PREDATOR = {
  id: 'predoni_nomadi',
  threat_tier: 'T1',
  role_trofico: 'predatore_tutorial_secondario',
  genetic_traits: { core: [] },
  jobs_bias: ['skirmisher'],
};
const T2_TANK = {
  id: 'cacciatore_corazzato',
  threat_tier: 'T2',
  role_trofico: 'predatore_tutorial_tank',
  genetic_traits: { core: [] },
  jobs_bias: ['vanguard'],
};
const T3_APEX = {
  id: 'dune_stalker',
  threat_tier: 'T3',
  role_trofico: 'predatore_terziario_apex',
  genetic_traits: { core: ['artigli_sette_vie', 'scheletro_idro_regolante'] },
  jobs_bias: ['vanguard', 'warden'],
  morphotype: 'cursoriale_quadrupede',
};

test('roleClassFor: maps known role_trofico to role_class', () => {
  assert.equal(roleClassFor('predatore_apex_boss'), 'APEX');
  assert.equal(roleClassFor('predatore_terziario_apex'), 'APEX');
  assert.equal(roleClassFor('difensore_territoriale'), 'TANK');
  assert.equal(roleClassFor('erbivoro_primario'), 'PREY');
  assert.equal(roleClassFor('ingegneri_ecosistema'), 'SUPPORT');
  assert.equal(roleClassFor('minaccia_microbica'), 'HAZARD');
});

test('roleClassFor: unknown/missing role_trofico defaults to PREDATOR', () => {
  assert.equal(roleClassFor('boh_sconosciuto'), 'PREDATOR');
  assert.equal(roleClassFor(null), 'PREDATOR');
  assert.equal(roleClassFor(undefined), 'PREDATOR');
});

test('deriveCombatStats: hp = HP_BASE[tier] * role hp_mult (rounded)', () => {
  // T1 PREDATOR: round(4 * 1.00) = 4
  assert.equal(deriveCombatStats(T1_PREDATOR).hp, 4);
  // T2 TANK: round(7 * 1.30) = 9
  assert.equal(deriveCombatStats(T2_TANK).hp, 9);
  // T3 APEX: round(11 * 1.15) = 13
  assert.equal(deriveCombatStats(T3_APEX).hp, 13);
});

test('deriveCombatStats: hp monotonic by tier for same role_class', () => {
  const base = { role_trofico: 'predatore_tutorial_secondario', genetic_traits: { core: [] } };
  const h1 = deriveCombatStats({ ...base, threat_tier: 'T1' }).hp;
  const h2 = deriveCombatStats({ ...base, threat_tier: 'T2' }).hp;
  const h3 = deriveCombatStats({ ...base, threat_tier: 'T3' }).hp;
  assert.ok(h1 < h2 && h2 < h3, `expected ${h1} < ${h2} < ${h3}`);
});

test('deriveCombatStats: mod = MOD_BASE[tier] (base, pre-trait)', () => {
  assert.equal(deriveCombatStats(T1_PREDATOR).mod, 2);
  assert.equal(deriveCombatStats(T3_APEX).mod, 3);
});

test('deriveCombatStats: dc = DC_BASE[tier] + role dc_adj (APEX +1)', () => {
  assert.equal(deriveCombatStats(T1_PREDATOR).dc, 11); // PREDATOR adj 0
  assert.equal(deriveCombatStats(T3_APEX).dc, 14); // 13 + 1 (APEX)
});

test('deriveCombatStats: guardia = GUARDIA_BASE[tier] + role guardia_adj (TANK +1)', () => {
  assert.equal(deriveCombatStats(T1_PREDATOR).guardia, 0); // base 0, PREDATOR adj 0
  assert.equal(deriveCombatStats(T2_TANK).guardia, 1); // base 0 + TANK 1
  assert.equal(deriveCombatStats(T3_APEX).guardia, 1); // base 1 + APEX 0
});

test('deriveCombatStats: ap is constant 2 (boss override = encounter staging)', () => {
  assert.equal(deriveCombatStats(T1_PREDATOR).ap, 2);
  assert.equal(deriveCombatStats(T3_APEX).ap, 2);
});

test('deriveCombatStats: attack_range from morphotype (volatore -> 2, else 1)', () => {
  assert.equal(deriveCombatStats(T3_APEX).attack_range, 1); // cursoriale = melee
  const flyer = { ...T1_PREDATOR, morphotype: 'volatore_planatore' };
  assert.equal(deriveCombatStats(flyer).attack_range, 2);
  const noMorpho = { ...T1_PREDATOR };
  delete noMorpho.morphotype;
  assert.equal(deriveCombatStats(noMorpho).attack_range, 1); // default melee
});

test('speedForMorphotype: archetype -> 1..6 band (#2691 agile_robust input)', () => {
  assert.equal(speedForMorphotype('volatore_planatore'), 6); // flyer
  assert.equal(speedForMorphotype('cursoriale_quadrupede'), 5); // cursorial
  assert.equal(speedForMorphotype('bipede_agile'), 5);
  assert.equal(speedForMorphotype('anfibio_agile'), 5);
  assert.equal(speedForMorphotype('predatore_apex_bipede'), 4); // mobile predator
  assert.equal(speedForMorphotype('umanoide_lanciatore'), 3); // average ground
  assert.equal(speedForMorphotype('bipede_armato'), 3);
  assert.equal(speedForMorphotype('scavenger_corazzato'), 2); // slow armored
  assert.equal(speedForMorphotype('bipede_corazzato'), 2);
  assert.equal(speedForMorphotype('ingegnere_radicante'), 1); // rooted
  assert.equal(speedForMorphotype(null), 3); // unknown/missing -> average
  assert.equal(speedForMorphotype(undefined), 3);
  assert.equal(speedForMorphotype('boh_sconosciuto'), 3);
});

test('deriveCombatStats: speed derived from morphotype (band-neutral new field)', () => {
  assert.equal(deriveCombatStats(T3_APEX).speed, 5); // cursoriale_quadrupede
  const flyer = { ...T1_PREDATOR, morphotype: 'volatore_planatore' };
  assert.equal(deriveCombatStats(flyer).speed, 6);
  const noMorpho = { ...T1_PREDATOR };
  delete noMorpho.morphotype;
  assert.equal(deriveCombatStats(noMorpho).speed, 3); // default average
});

test('deriveCombatStats: traits passthrough from genetic_traits.core', () => {
  assert.deepEqual(deriveCombatStats(T3_APEX).traits, [
    'artigli_sette_vie',
    'scheletro_idro_regolante',
  ]);
  assert.deepEqual(deriveCombatStats(T1_PREDATOR).traits, []);
});

test('deriveCombatStats: job passthrough from jobs_bias[0]', () => {
  assert.equal(deriveCombatStats(T3_APEX).job, 'vanguard');
  assert.equal(deriveCombatStats(T1_PREDATOR).job, 'skirmisher');
  const noJobs = { ...T1_PREDATOR, jobs_bias: [] };
  assert.equal(deriveCombatStats(noJobs).job, null);
});

test('deriveCombatStats: deterministic (same input -> deep-equal output)', () => {
  const a = deriveCombatStats(T3_APEX);
  const b = deriveCombatStats(T3_APEX);
  assert.deepEqual(a, b);
});

test('deriveCombatStats: output has full schema, all stats numeric integers', () => {
  const out = deriveCombatStats(T3_APEX);
  for (const f of ['hp', 'ap', 'mod', 'dc', 'guardia', 'attack_range']) {
    assert.ok(Number.isInteger(out[f]), `${f} should be integer, got ${out[f]}`);
    assert.ok(out[f] >= 0, `${f} should be >= 0`);
  }
  assert.equal(out.id, 'dune_stalker');
  assert.equal(out.species, 'dune_stalker');
  assert.ok(Array.isArray(out.traits));
});

test('deriveCombatStats: missing threat_tier -> defaults T1 + records warning', () => {
  const noTier = {
    id: 'x',
    role_trofico: 'predatore_tutorial_secondario',
    genetic_traits: { core: [] },
  };
  const out = deriveCombatStats(noTier);
  assert.equal(out.hp, 4); // T1 PREDATOR baseline
  assert.ok(out._adapter && Array.isArray(out._adapter.warnings));
  assert.ok(out._adapter.warnings.some((w) => /threat_tier/i.test(w)));
});

test('deriveCombatStats: accepts numeric threat_tier (3 -> T3)', () => {
  const numeric = { ...T3_APEX, threat_tier: 3 };
  assert.equal(deriveCombatStats(numeric).hp, deriveCombatStats(T3_APEX).hp);
});

test('DEFAULT_KNOBS: exposes tier tables for all T0-T5', () => {
  for (const t of ['T0', 'T1', 'T2', 'T3', 'T4', 'T5']) {
    assert.ok(Number.isFinite(DEFAULT_KNOBS.HP_BASE[t]), `HP_BASE.${t}`);
    assert.ok(Number.isFinite(DEFAULT_KNOBS.MOD_BASE[t]), `MOD_BASE.${t}`);
    assert.ok(Number.isFinite(DEFAULT_KNOBS.DC_BASE[t]), `DC_BASE.${t}`);
  }
});
