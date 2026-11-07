'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  computePerkCombatModifiers,
} = require('../../apps/backend/services/progression/progressionApply');

// Category A (TKT-JOB-PHASEC) — multiplicative / DR-bypass perk modifiers.
// computePerkCombatModifiers(actor, target, ctx) → { multiplier, ignoreDr, applied }

test('computePerkCombatModifiers: random_double_dmg_chance doubles when rng below chance', () => {
  const actor = {
    id: 'ab',
    controlled_by: 'player',
    _perk_passives: [
      {
        tag: 'random_double_dmg_chance',
        payload: { chance: 0.25 },
        source_perk_id: 'ab_r3_chaos_attack',
      },
    ],
  };
  const target = { id: 'foe', controlled_by: 'enemy' };
  const res = computePerkCombatModifiers(actor, target, { rng: () => 0.1 });
  assert.strictEqual(res.multiplier, 2);
  assert.strictEqual(res.applied.length, 1);
  assert.strictEqual(res.applied[0].tag, 'random_double_dmg_chance');
});

test('computePerkCombatModifiers: random_double_dmg_chance no-op when rng above chance', () => {
  const actor = {
    id: 'ab',
    controlled_by: 'player',
    _perk_passives: [
      {
        tag: 'random_double_dmg_chance',
        payload: { chance: 0.25 },
        source_perk_id: 'ab_r3_chaos_attack',
      },
    ],
  };
  const target = { id: 'foe', controlled_by: 'enemy' };
  const res = computePerkCombatModifiers(actor, target, { rng: () => 0.9 });
  assert.strictEqual(res.multiplier, 1);
  assert.strictEqual(res.applied.length, 0);
});

test('computePerkCombatModifiers: apex_first_strike sets ignoreDr on first strike', () => {
  const actor = {
    id: 'st',
    controlled_by: 'player',
    _perk_passives: [
      {
        tag: 'apex_first_strike',
        payload: { ignore_dr: true },
        source_perk_id: 'st_r6_apex_predator',
      },
    ],
  };
  const target = { id: 'foe', controlled_by: 'enemy' };
  const res = computePerkCombatModifiers(actor, target, { isFirstStrike: true });
  assert.strictEqual(res.ignoreDr, true);
  assert.strictEqual(res.applied.length, 1);
  assert.strictEqual(res.applied[0].tag, 'apex_first_strike');
});

test('computePerkCombatModifiers: apex_first_strike no-op when not first strike', () => {
  const actor = {
    id: 'st',
    controlled_by: 'player',
    _perk_passives: [
      {
        tag: 'apex_first_strike',
        payload: { ignore_dr: true },
        source_perk_id: 'st_r6_apex_predator',
      },
    ],
  };
  const target = { id: 'foe', controlled_by: 'enemy' };
  const res = computePerkCombatModifiers(actor, target, { isFirstStrike: false });
  assert.strictEqual(res.ignoreDr, false);
  assert.strictEqual(res.applied.length, 0);
});

test('computePerkCombatModifiers: no passives = neutral modifiers', () => {
  const actor = { id: 'plain', controlled_by: 'player' };
  const target = { id: 'foe', controlled_by: 'enemy' };
  const res = computePerkCombatModifiers(actor, target, { isFirstStrike: true, rng: () => 0.1 });
  assert.strictEqual(res.multiplier, 1);
  assert.strictEqual(res.ignoreDr, false);
  assert.strictEqual(res.applied.length, 0);
});

test('computePerkCombatModifiers: double + apex stack (multiplier and ignoreDr together)', () => {
  const actor = {
    id: 'hybrid',
    controlled_by: 'player',
    _perk_passives: [
      { tag: 'random_double_dmg_chance', payload: { chance: 0.25 }, source_perk_id: 'd1' },
      { tag: 'apex_first_strike', payload: { ignore_dr: true }, source_perk_id: 'a1' },
    ],
  };
  const target = { id: 'foe', controlled_by: 'enemy' };
  const res = computePerkCombatModifiers(actor, target, { isFirstStrike: true, rng: () => 0.1 });
  assert.strictEqual(res.multiplier, 2);
  assert.strictEqual(res.ignoreDr, true);
  assert.strictEqual(res.applied.length, 2);
});

test('computePerkCombatModifiers: chance 0 never doubles even with low rng', () => {
  const actor = {
    id: 'ab',
    controlled_by: 'player',
    _perk_passives: [
      { tag: 'random_double_dmg_chance', payload: { chance: 0 }, source_perk_id: 'd1' },
    ],
  };
  const res = computePerkCombatModifiers(actor, { id: 'foe' }, { rng: () => 0 });
  assert.strictEqual(res.multiplier, 1);
  assert.strictEqual(res.applied.length, 0);
});
