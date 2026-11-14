// OD-025-B2 Phase B3 ai-station 2026-05-14 — job_archetype_bias engine consumption.
//
// promotions.yaml v0.2.0 surface job_archetype_bias schema anchor for
// per-Job tier overrides (guerriero/esploratore/tessitore/custode).
// Phase B3: engine reads + merges override onto base reward (override wins).
//
// Closes Pillar P3 Identità Specie × Job depth — different Jobs now get
// distinct rewards at elite/master tier.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  applyPromotion,
  evaluatePromotion,
  _mergeJobBias,
  FALLBACK_CONFIG,
} = require('../../apps/backend/services/progression/promotionEngine');

// Synthetic config matching promotions.yaml v0.2.0 job_archetype_bias schema.
const CFG_WITH_BIAS = {
  ...FALLBACK_CONFIG,
  job_archetype_bias: {
    guerriero: {
      elite: { hp_bonus: 18, attack_mod_bonus: 4 },
      master: { hp_bonus: 30, attack_mod_bonus: 5 },
    },
    esploratore: {
      elite: { initiative_bonus: 5, defense_mod_bonus: 1 },
      master: { initiative_bonus: 6, crit_chance_bonus: 8 },
    },
    tessitore: {
      elite: { ability_unlock_tier: 'r4', ability_id_override: 'weave_mastery' },
      master: { ability_unlock_tier: 'r5', ability_id_override: 'weave_apex' },
    },
    custode: {
      elite: { hp_bonus: 20, defense_mod_bonus: 4 },
      master: { hp_bonus: 35, defense_mod_bonus: 5 },
    },
  },
};

function _unit(jobId, promotion_tier = 'captain') {
  return {
    id: `pg-${jobId}`,
    job_id: jobId,
    promotion_tier,
    hp: 20,
    max_hp: 20,
    attack_mod: 0,
    defense_mod: 0,
    initiative: 0,
    crit_chance: 0,
  };
}

describe('Phase B3 — _mergeJobBias helper', () => {
  test('returns base reward when cfg has no job_archetype_bias', () => {
    const base = { hp_bonus: 15, attack_mod_bonus: 3 };
    const cfg = { rewards: {} };
    assert.deepEqual(_mergeJobBias(base, cfg, { job_id: 'guerriero' }, 'elite'), base);
  });

  test('returns base when unit has no job_id', () => {
    const base = { hp_bonus: 15 };
    assert.deepEqual(_mergeJobBias(base, CFG_WITH_BIAS, {}, 'elite'), base);
  });

  test('returns base when job_id unrecognized', () => {
    const base = { hp_bonus: 15 };
    assert.deepEqual(_mergeJobBias(base, CFG_WITH_BIAS, { job_id: 'demigod' }, 'elite'), base);
  });

  test('merges override on top of base (override wins per-key)', () => {
    const base = {
      hp_bonus: 15,
      attack_mod_bonus: 3,
      defense_mod_bonus: 2,
      ability_unlock_tier: 'r4',
    };
    const merged = _mergeJobBias(base, CFG_WITH_BIAS, { job_id: 'guerriero' }, 'elite');
    assert.equal(merged.hp_bonus, 18, 'guerriero hp override +3');
    assert.equal(merged.attack_mod_bonus, 4, 'guerriero atk override +1');
    assert.equal(merged.defense_mod_bonus, 2, 'base preserved when not overridden');
    assert.equal(merged.ability_unlock_tier, 'r4', 'base preserved when not overridden');
  });

  test('tier without override returns base (e.g. veteran/captain not in bias)', () => {
    const base = { hp_bonus: 10 };
    assert.deepEqual(_mergeJobBias(base, CFG_WITH_BIAS, { job_id: 'guerriero' }, 'captain'), base);
  });
});

describe('Phase B3 — applyPromotion consumes job_archetype_bias', () => {
  test('guerriero elite: hp_bonus=18 (override), atk=4', () => {
    const u = _unit('guerriero');
    const r = applyPromotion(u, 'elite', CFG_WITH_BIAS);
    assert.equal(r.ok, true);
    assert.equal(u.max_hp, 20 + 18, 'guerriero hp:18 override applied');
    assert.equal(u.attack_mod, 4, 'guerriero atk:4 override');
    assert.equal(u.defense_mod, 2, 'base defense_mod_bonus preserved');
  });

  test('esploratore elite: initiative=5 (override) + defense=1 (override)', () => {
    const u = _unit('esploratore');
    const r = applyPromotion(u, 'elite', CFG_WITH_BIAS);
    assert.equal(r.ok, true);
    assert.equal(u.initiative, 5, 'esploratore init:5 override');
    assert.equal(u.defense_mod, 1, 'esploratore def:1 override (-1 from base)');
    assert.equal(u.max_hp, 20 + 15, 'base hp_bonus preserved');
  });

  test('tessitore elite: ability_id_override applied', () => {
    const u = _unit('tessitore');
    const r = applyPromotion(u, 'elite', CFG_WITH_BIAS);
    assert.equal(r.ok, true);
    assert.equal(u.ability_id_unlocked, 'weave_mastery', 'ability_id_override propagated');
    assert.equal(u.ability_tier_unlocked, 'r4');
    assert.equal(r.deltas.ability_id_override, 'weave_mastery');
  });

  test('custode elite: hp:20 + def:4 (override stack)', () => {
    const u = _unit('custode');
    const r = applyPromotion(u, 'elite', CFG_WITH_BIAS);
    assert.equal(r.ok, true);
    assert.equal(u.max_hp, 20 + 20);
    assert.equal(u.defense_mod, 4);
  });

  test('guerriero master: hp:30 + atk:5 (override) + crit:5 (base preserved)', () => {
    const u = _unit('guerriero', 'elite');
    const r = applyPromotion(u, 'master', CFG_WITH_BIAS);
    assert.equal(r.ok, true);
    assert.equal(u.max_hp, 20 + 30);
    assert.equal(u.attack_mod, 5);
    assert.equal(u.crit_chance, 5, 'base crit_chance_bonus preserved');
  });

  test('esploratore master: crit:8 override', () => {
    const u = _unit('esploratore', 'elite');
    const r = applyPromotion(u, 'master', CFG_WITH_BIAS);
    assert.equal(r.ok, true);
    assert.equal(u.crit_chance, 8, 'esploratore crit:8 override (+3 over base)');
    assert.equal(u.initiative, 6, 'esploratore init:6 override');
  });

  test('unknown job_id (mascalzone) gets base reward (graceful)', () => {
    const u = _unit('mascalzone');
    const r = applyPromotion(u, 'elite', CFG_WITH_BIAS);
    assert.equal(r.ok, true);
    assert.equal(u.max_hp, 20 + 15, 'base hp_bonus (no override)');
    assert.equal(u.attack_mod, 3, 'base atk_bonus');
  });
});

describe('Phase B3 — evaluatePromotion surfaces Job-biased reward preview', () => {
  test('guerriero next_tier=elite preview shows override reward', () => {
    const u = _unit('guerriero');
    const events = [];
    // No metrics → not eligible, but reward preview still surfaced.
    const r = evaluatePromotion(u, events, CFG_WITH_BIAS);
    assert.equal(r.next_tier, 'elite');
    assert.equal(r.reward.hp_bonus, 18, 'guerriero override surfaced in preview');
    assert.equal(r.reward.attack_mod_bonus, 4);
  });

  test('unknown job preview shows base reward', () => {
    const u = _unit('mascalzone');
    const r = evaluatePromotion(u, [], CFG_WITH_BIAS);
    assert.equal(r.reward.hp_bonus, 15, 'base hp_bonus');
  });

  test('null reward when no rewards block defined', () => {
    const cfg = { tier_ladder: ['base', 'veteran'], thresholds: { veteran: {} }, rewards: {} };
    const u = _unit('guerriero', 'base');
    const r = evaluatePromotion(u, [], cfg);
    assert.equal(r.reward, null);
  });
});
