'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  computePerkDefenseBonus,
} = require('../../apps/backend/services/progression/progressionApply');
const { resolveAttack } = require('../../apps/backend/routes/sessionHelpers');

// TKT-JOB-PHASEC slice 1 — defensive passive aggregation.
// computePerkDefenseBonus(defender, ctx) → { bonus, applied }
// Mirror sibling of computePerkDamageBonus but for the defender side (raises DC).

function unit(id, x, y, passives = [], extra = {}) {
  return {
    id,
    controlled_by: extra.controlled_by || 'player',
    hp: extra.hp ?? 10,
    position: { x, y },
    _perk_passives: passives,
    ...extra,
  };
}

test('aura_defense_2tile: ally symbiont within Manhattan range grants +defense_mod', () => {
  const defender = unit('hero', 2, 2);
  const symbiont = unit('sym', 3, 2, [
    { tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'sy_r3' },
  ]);
  const res = computePerkDefenseBonus(defender, { units: [defender, symbiont] });
  assert.strictEqual(res.bonus, 1);
  assert.strictEqual(res.applied.length, 1);
  assert.strictEqual(res.applied[0].tag, 'aura_defense_2tile');
});

test('aura_defense_2tile: ally out of range (Manhattan 3 > range 2) grants nothing', () => {
  const defender = unit('hero', 0, 0);
  const symbiont = unit('sym', 2, 1, [
    { tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'sy_r3' },
  ]);
  const res = computePerkDefenseBonus(defender, { units: [defender, symbiont] });
  assert.strictEqual(res.bonus, 0);
  assert.strictEqual(res.applied.length, 0);
});

test('aura_defense_2tile: enemy carrier does NOT buff a player defender', () => {
  const defender = unit('hero', 2, 2);
  const enemySym = unit(
    'foe',
    3,
    2,
    [{ tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'x' }],
    { controlled_by: 'enemy' },
  );
  const res = computePerkDefenseBonus(defender, { units: [defender, enemySym] });
  assert.strictEqual(res.bonus, 0);
});

test('aura_defense_2tile: dead carrier (hp 0) grants nothing', () => {
  const defender = unit('hero', 2, 2);
  const deadSym = unit(
    'sym',
    3,
    2,
    [{ tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'x' }],
    { hp: 0 },
  );
  const res = computePerkDefenseBonus(defender, { units: [defender, deadSym] });
  assert.strictEqual(res.bonus, 0);
});

test('aura_defense_2tile: two symbionts in range stack', () => {
  const defender = unit('hero', 2, 2);
  const s1 = unit('s1', 3, 2, [
    { tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'a' },
  ]);
  const s2 = unit('s2', 1, 2, [
    { tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'b' },
  ]);
  const res = computePerkDefenseBonus(defender, { units: [defender, s1, s2] });
  assert.strictEqual(res.bonus, 2);
  assert.strictEqual(res.applied.length, 2);
});

test('no defensive passives anywhere = neutral', () => {
  const defender = unit('hero', 2, 2);
  const ally = unit('ally', 3, 2);
  const res = computePerkDefenseBonus(defender, { units: [defender, ally] });
  assert.strictEqual(res.bonus, 0);
  assert.strictEqual(res.applied.length, 0);
});

test('defender carries its own aura but does not buff itself', () => {
  const defender = unit('hero', 2, 2, [
    { tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'self' },
  ]);
  const res = computePerkDefenseBonus(defender, { units: [defender] });
  assert.strictEqual(res.bonus, 0);
});

// --- defense_after_silent: exact round-window (set by silent_step use-hook) ---
// Window armed as [_camo_silent_from, _camo_silent_to] = [useRound+1, useRound+duration].
const CAMO = {
  tag: 'defense_after_silent',
  payload: { defense_mod: 2, duration: 1 },
  source_perk_id: 'st_r2',
};

test('defense_after_silent: granted while ctx.round is inside the camo window', () => {
  const defender = unit('hero', 2, 2, [CAMO], { _camo_silent_from: 2, _camo_silent_to: 2 });
  const res = computePerkDefenseBonus(defender, { units: [defender], round: 2 });
  assert.strictEqual(res.bonus, 2);
  assert.strictEqual(res.applied[0].tag, 'defense_after_silent');
});

test('defense_after_silent: no bonus on the silent_step turn itself (round < from)', () => {
  const defender = unit('hero', 2, 2, [CAMO], { _camo_silent_from: 2, _camo_silent_to: 2 });
  const res = computePerkDefenseBonus(defender, { units: [defender], round: 1 });
  assert.strictEqual(res.bonus, 0);
});

test('defense_after_silent: no bonus after the window expires (round > to)', () => {
  const defender = unit('hero', 2, 2, [CAMO], { _camo_silent_from: 2, _camo_silent_to: 2 });
  const res = computePerkDefenseBonus(defender, { units: [defender], round: 3 });
  assert.strictEqual(res.bonus, 0);
});

test('defense_after_silent: no bonus when the window was never armed', () => {
  const defender = unit('hero', 2, 2, [CAMO]);
  const res = computePerkDefenseBonus(defender, { units: [defender], round: 2 });
  assert.strictEqual(res.bonus, 0);
});

test('defense_after_silent: no bonus when ctx.round is absent', () => {
  const defender = unit('hero', 2, 2, [CAMO], { _camo_silent_from: 2, _camo_silent_to: 2 });
  const res = computePerkDefenseBonus(defender, { units: [defender] });
  assert.strictEqual(res.bonus, 0);
});

test('defense_after_silent + aura stack on the same defender', () => {
  const defender = unit('hero', 2, 2, [CAMO], { _camo_silent_from: 2, _camo_silent_to: 2 });
  const sym = unit('sym', 3, 2, [
    { tag: 'aura_defense_2tile', payload: { defense_mod: 1, range: 2 }, source_perk_id: 'sy_r3' },
  ]);
  const res = computePerkDefenseBonus(defender, { units: [defender, sym], round: 2 });
  assert.strictEqual(res.bonus, 3);
  assert.strictEqual(res.applied.length, 2);
});

// --- wire: resolveAttack honors the stashed perk defense bonus (raises DC) ---

test('resolveAttack adds target._perk_defense_bonus to the effective DC', () => {
  const actor = { id: 'a', mod: 0 };
  const base = resolveAttack({ actor, target: { id: 't', dc: 10 }, rng: () => 0 });
  const buffed = resolveAttack({
    actor,
    target: { id: 't', dc: 10, _perk_defense_bonus: 3 },
    rng: () => 0,
  });
  assert.strictEqual(buffed.dc - base.dc, 3);
});

test('resolveAttack: missing _perk_defense_bonus = zero delta (back-compat)', () => {
  const actor = { id: 'a', mod: 0 };
  const r = resolveAttack({ actor, target: { id: 't', dc: 12 }, rng: () => 0.5 });
  assert.strictEqual(r.dc, 12);
});
