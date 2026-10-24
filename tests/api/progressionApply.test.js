// M13 P3 Phase B — progressionApply unit tests (apply + passive bonus + XP grant).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  applyProgressionToUnits,
  computePerkDamageBonus,
  grantXpToSurvivors,
  resetDefaults,
} = require('../../apps/backend/services/progression/progressionApply');
const { ProgressionEngine } = require('../../apps/backend/services/progression/progressionEngine');
const {
  createProgressionStore,
} = require('../../apps/backend/services/progression/progressionStore');

function freshCtx() {
  resetDefaults();
  const engine = new ProgressionEngine();
  const store = createProgressionStore();
  return { engine, store };
}

test('applyProgressionToUnits: no progression state → skip', () => {
  const { engine, store } = freshCtx();
  const units = [
    { id: 'u1', controlled_by: 'player', hp: 10, mod: 2, dc: 12, ap: 2 },
    { id: 'e1', controlled_by: 'sistema', hp: 8, mod: 3, dc: 13, ap: 2 },
  ];
  const r = applyProgressionToUnits(units, { engine, store });
  assert.equal(r.applied.length, 0);
  assert.equal(r.skipped, 2);
  assert.equal(units[0]._progression_applied, undefined);
});

test('applyProgressionToUnits: stat_bonus AP applied additively', () => {
  const { engine, store } = freshCtx();
  // Seed + level-up + pick level 3 perk_a (skirmisher: +1 AP, -1 HP)
  let s = engine.seed('u1', 'skirmisher', { xpTotal: 25 });
  const r1 = engine.pickPerk(s, 3, 'a');
  store.set(null, 'u1', r1.unit);

  const units = [{ id: 'u1', controlled_by: 'player', hp: 10, hp_max: 10, mod: 2, dc: 12, ap: 2 }];
  applyProgressionToUnits(units, { engine, store });
  assert.equal(units[0].ap, 3); // base 2 + perk 1
  assert.equal(units[0].hp_max, 9); // base 10 - 1
  assert.equal(units[0].hp, 9);
  assert.equal(units[0]._progression_applied, true);
});

test('applyProgressionToUnits: idempotent (double call no-op)', () => {
  const { engine, store } = freshCtx();
  let s = engine.seed('u1', 'skirmisher', { xpTotal: 10 });
  const r1 = engine.pickPerk(s, 2, 'a'); // flank_specialist (passive only)
  store.set(null, 'u1', r1.unit);
  const units = [{ id: 'u1', controlled_by: 'player', hp: 10, mod: 2 }];
  applyProgressionToUnits(units, { engine, store });
  const modAfter1 = units[0].mod;
  applyProgressionToUnits(units, { engine, store });
  assert.equal(units[0].mod, modAfter1); // unchanged second call
});

test('applyProgressionToUnits: attaches _perk_passives + _perk_ability_mods', () => {
  const { engine, store } = freshCtx();
  let s = engine.seed('u1', 'skirmisher', { xpTotal: 10 });
  const r1 = engine.pickPerk(s, 2, 'a'); // flank_bonus passive
  store.set(null, 'u1', r1.unit);
  const units = [{ id: 'u1', controlled_by: 'player', hp: 10 }];
  applyProgressionToUnits(units, { engine, store });
  assert.ok(Array.isArray(units[0]._perk_passives));
  assert.equal(units[0]._perk_passives[0].tag, 'flank_bonus');
  assert.ok(Array.isArray(units[0]._perk_ability_mods));
});

test('applyProgressionToUnits: sistema units skipped', () => {
  const { engine, store } = freshCtx();
  let s = engine.seed('e1', 'skirmisher', { xpTotal: 25 });
  const r1 = engine.pickPerk(s, 3, 'a');
  store.set(null, 'e1', r1.unit);
  const units = [{ id: 'e1', controlled_by: 'sistema', hp: 10, ap: 2 }];
  const r = applyProgressionToUnits(units, { engine, store });
  assert.equal(r.applied.length, 0);
  assert.equal(units[0].ap, 2); // untouched
});

test('computePerkDamageBonus: flank_bonus fires when ally adjacent to target', () => {
  const actor = {
    id: 'u1',
    controlled_by: 'player',
    position: { x: 1, y: 1 },
    _perk_passives: [
      { tag: 'flank_bonus', payload: { damage: 2 }, source_perk_id: 'sk_r1_flank_specialist' },
    ],
  };
  const target = { id: 'e1', controlled_by: 'sistema', position: { x: 3, y: 3 }, hp: 10 };
  const ally = { id: 'u2', controlled_by: 'player', hp: 10, position: { x: 3, y: 2 } };
  const res = computePerkDamageBonus(actor, target, { units: [actor, target, ally] });
  assert.equal(res.bonus, 2);
  assert.equal(res.applied.length, 1);
  assert.equal(res.applied[0].tag, 'flank_bonus');
});

test('computePerkDamageBonus: flank_bonus skips when no ally adjacent', () => {
  const actor = {
    id: 'u1',
    controlled_by: 'player',
    position: { x: 1, y: 1 },
    _perk_passives: [{ tag: 'flank_bonus', payload: { damage: 2 } }],
  };
  const target = { id: 'e1', controlled_by: 'sistema', position: { x: 3, y: 3 }, hp: 10 };
  const res = computePerkDamageBonus(actor, target, { units: [actor, target] });
  assert.equal(res.bonus, 0);
});

test('computePerkDamageBonus: first_strike_bonus only on first strike', () => {
  const actor = {
    id: 'u1',
    controlled_by: 'player',
    position: { x: 1, y: 1 },
    _perk_passives: [{ tag: 'first_strike_bonus', payload: { damage: 2 } }],
  };
  const target = { id: 'e1', controlled_by: 'sistema', position: { x: 2, y: 1 }, hp: 10 };
  const res1 = computePerkDamageBonus(actor, target, { units: [], isFirstStrike: true });
  assert.equal(res1.bonus, 2);
  const res2 = computePerkDamageBonus(actor, target, { units: [], isFirstStrike: false });
  assert.equal(res2.bonus, 0);
});

test('computePerkDamageBonus: execution_bonus fires when target < threshold HP', () => {
  const actor = {
    _perk_passives: [{ tag: 'execution_bonus', payload: { threshold: 0.25, damage: 4 } }],
    position: { x: 1, y: 1 },
  };
  const targetLow = { id: 'e1', hp: 2, hp_max: 10, position: { x: 2, y: 1 } };
  const targetHigh = { id: 'e2', hp: 8, hp_max: 10, position: { x: 2, y: 1 } };
  assert.equal(computePerkDamageBonus(actor, targetLow, { units: [] }).bonus, 4);
  assert.equal(computePerkDamageBonus(actor, targetHigh, { units: [] }).bonus, 0);
});

test('computePerkDamageBonus: isolated_target_bonus when target alone', () => {
  const actor = {
    id: 'u1',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    _perk_passives: [{ tag: 'isolated_target_bonus', payload: { damage: 3 } }],
  };
  const target = { id: 'e1', controlled_by: 'sistema', position: { x: 5, y: 5 }, hp: 10 };
  const allyOfTarget = {
    id: 'e2',
    controlled_by: 'sistema',
    hp: 10,
    position: { x: 5, y: 6 },
  };
  const resAlone = computePerkDamageBonus(actor, target, { units: [actor, target] });
  const resNotAlone = computePerkDamageBonus(actor, target, {
    units: [actor, target, allyOfTarget],
  });
  assert.equal(resAlone.bonus, 3);
  assert.equal(resNotAlone.bonus, 0);
});

test('computePerkDamageBonus: long_range_bonus when distance >= min_distance', () => {
  const actor = {
    position: { x: 0, y: 0 },
    _perk_passives: [{ tag: 'long_range_bonus', payload: { min_distance: 3, damage: 1 } }],
  };
  const near = { position: { x: 1, y: 1 }, hp: 10 };
  const far = { position: { x: 3, y: 3 }, hp: 10 };
  assert.equal(computePerkDamageBonus(actor, near, { units: [] }).bonus, 0);
  assert.equal(computePerkDamageBonus(actor, far, { units: [] }).bonus, 1);
});

test('computePerkDamageBonus: zero passives returns 0 bonus', () => {
  const actor = {};
  const target = { hp: 10 };
  const res = computePerkDamageBonus(actor, target, { units: [] });
  assert.equal(res.bonus, 0);
  assert.equal(res.applied.length, 0);
});

test('grantXpToSurvivors: grants XP to alive players, skips dead + sistema', () => {
  const { engine, store } = freshCtx();
  // Pre-seed u1, u2 in store
  store.set(null, 'u1', engine.seed('u1', 'skirmisher'));
  store.set(null, 'u2', engine.seed('u2', 'vanguard'));
  const units = [
    { id: 'u1', job: 'skirmisher', controlled_by: 'player', hp: 8 },
    { id: 'u2', job: 'vanguard', controlled_by: 'player', hp: 0 }, // dead
    { id: 'e1', job: 'skirmisher', controlled_by: 'sistema', hp: 5 },
  ];
  const grants = grantXpToSurvivors(units, 10, { engine, store });
  assert.equal(grants.length, 1);
  assert.equal(grants[0].unit_id, 'u1');
  assert.equal(grants[0].level_after, 2);
  assert.equal(grants[0].leveled_up, true);
});

test('grantXpToSurvivors: auto-seed when unit not in store', () => {
  const { engine, store } = freshCtx();
  const units = [{ id: 'u1', job: 'warden', controlled_by: 'player', hp: 10 }];
  const grants = grantXpToSurvivors(units, 10, { engine, store });
  assert.equal(grants.length, 1);
  const state = store.get(null, 'u1');
  assert.ok(state);
  assert.equal(state.job, 'warden');
  assert.equal(state.level, 2);
});

test('grantXpToSurvivors: zero amount → no-op', () => {
  const { engine, store } = freshCtx();
  store.set(null, 'u1', engine.seed('u1', 'skirmisher'));
  const units = [{ id: 'u1', job: 'skirmisher', controlled_by: 'player', hp: 10 }];
  const grants = grantXpToSurvivors(units, 0, { engine, store });
  assert.equal(grants.length, 0);
});

test('grantXpToSurvivors: campaignId scopes grant', () => {
  const { engine, store } = freshCtx();
  const units = [{ id: 'u1', job: 'ranger', controlled_by: 'player', hp: 10 }];
  grantXpToSurvivors(units, 25, { engine, store, campaignId: 'cA' });
  const sA = store.get('cA', 'u1');
  const sGlobal = store.get(null, 'u1');
  assert.ok(sA);
  assert.equal(sA.xp_total, 25);
  assert.equal(sGlobal, null);
});
