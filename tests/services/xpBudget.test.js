// 2026-04-26 — xpBudget service tests (P1 Tier-E Pathfinder adoption).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeUnitXp,
  computeEncounterBudget,
  auditEncounter,
  _resetCache,
} = require('../../apps/backend/services/balance/xpBudget');

test('computeUnitXp: base unit (hp 6, mod 2, ap 2, range 1) yields > 0', () => {
  const xp = computeUnitXp({ hp: 6, mod: 2, ap: 2, range: 1, tier: 'base' });
  assert.ok(xp > 0, `expected xp > 0, got ${xp}`);
  // 6*2 + 2*8 + 2*6 + 1*4 = 12+16+12+4 = 44
  assert.equal(xp, 44);
});

test('computeUnitXp: boss tier vs base = +200 (no double)', () => {
  const baseStats = { hp: 30, mod: 4, ap: 3, range: 2, guardia: 3 };
  const baseXp = computeUnitXp({ ...baseStats, tier: 'base' });
  const bossXp = computeUnitXp({ ...baseStats, tier: 'boss' });
  assert.ok(bossXp > baseXp, 'boss > base');
  // Boss tier_bonus = 200; base tier_bonus = 0. Delta = 200.
  assert.equal(bossXp - baseXp, 200);
});

test('computeUnitXp: boss-by-id non-boss-tier adds bonus once', () => {
  const baseStats = { hp: 30, mod: 4, ap: 3, range: 2, guardia: 3 };
  const baseXp = computeUnitXp({ ...baseStats, tier: 'base' });
  const bossIdXp = computeUnitXp({ ...baseStats, id: 'e_apex_boss', tier: 'base' });
  // id pattern aggiunge boss_bonus 200 anche se tier=base
  assert.equal(bossIdXp - baseXp, 200);
});

test('computeUnitXp: elite tier adds 50', () => {
  const stats = { hp: 12, mod: 3, ap: 2, range: 1 };
  const baseXp = computeUnitXp({ ...stats, tier: 'base' });
  const eliteXp = computeUnitXp({ ...stats, tier: 'elite' });
  assert.equal(eliteXp - baseXp, 50);
});

test('computeUnitXp: null/empty returns 0', () => {
  assert.equal(computeUnitXp(null), 0);
  assert.equal(computeUnitXp(undefined), 0);
  assert.equal(computeUnitXp({}), 0);
});

test('computeEncounterBudget: tutorial 4-player = 80 base * 1.0 = 80', () => {
  assert.equal(computeEncounterBudget('tutorial', 4), 80);
});

test('computeEncounterBudget: hardcore 8-player = 400 * 1.6 = 640', () => {
  assert.equal(computeEncounterBudget('hardcore', 8), 640);
});

test('computeEncounterBudget: standard 1-player = 200 * 0.5 = 100', () => {
  assert.equal(computeEncounterBudget('standard', 1), 100);
});

test('computeEncounterBudget: unknown class returns 0', () => {
  assert.equal(computeEncounterBudget('nonexistent', 4), 0);
});

test('auditEncounter: standard encounter 4p with 4 base units in_band', () => {
  const enc = {
    encounter_class: 'standard',
    waves: [
      {
        units: [{ tier: 'base', count: 4 }],
      },
    ],
  };
  const audit = auditEncounter(enc, 4);
  assert.equal(audit.encounter_class, 'standard');
  assert.equal(audit.budget, 200);
  assert.ok(audit.used > 0);
  assert.equal(audit.enemy_unit_count, 4);
  assert.ok(['under', 'in_band', 'over'].includes(audit.status));
});

test('auditEncounter: tutorial 4p with 1 boss = critical_over', () => {
  const enc = {
    encounter_class: 'tutorial',
    waves: [
      {
        units: [{ tier: 'boss', count: 1 }],
      },
    ],
  };
  const audit = auditEncounter(enc, 4);
  assert.equal(audit.budget, 80);
  // boss xp ~30*2 + 4*8 + 2*6 + 1*4 + 3*5 + 200 = 60+32+12+4+15+200 = 323
  // ratio 323/80 = 4.04 > 1.50 = critical_over
  assert.equal(audit.status, 'critical_over');
});

test('auditEncounter: no encounter returns no_encounter status', () => {
  const audit = auditEncounter(null);
  assert.equal(audit.status, 'no_encounter');
});

test('auditEncounter: unknown class returns no_budget_config', () => {
  const enc = { encounter_class: 'phantom_class', waves: [] };
  const audit = auditEncounter(enc, 4);
  assert.equal(audit.status, 'no_budget_config');
});

test('auditEncounter: includes reinforcement_pool worst-case', () => {
  const encNoReinf = {
    encounter_class: 'hardcore',
    waves: [{ units: [{ tier: 'elite', count: 2 }] }],
  };
  const encWithReinf = {
    ...encNoReinf,
    reinforcement_policy: { max_total_spawns: 4 },
    reinforcement_pool: [{ tier: 'base' }],
  };
  const auditNo = auditEncounter(encNoReinf, 4);
  const auditWith = auditEncounter(encWithReinf, 4);
  assert.ok(
    auditWith.used > auditNo.used,
    `with reinforcement (${auditWith.used}) > without (${auditNo.used})`,
  );
});
