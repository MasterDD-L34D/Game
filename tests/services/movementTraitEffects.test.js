'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { evaluateMovementTraits } = require('../../apps/backend/services/traitEffects');

// Minimal buff_stat trait definition (move_bonus, T1)
const MOVE_BONUS_T1 = {
  tier: 'T1',
  category: 'neurologico',
  applies_to: 'actor',
  trigger: { action_type: 'movement' },
  effect: { kind: 'buff_stat', stat: 'move_bonus', amount: 1, log_tag: 'test_move_bonus' },
};

const ATTACK_TRAIT = {
  trigger: { action_type: 'attack' },
  effect: { kind: 'extra_damage', amount: 2 },
};

const STATUS_TRAIT = {
  trigger: { action_type: 'passive' },
  effect: { kind: 'apply_status', stato: 'linked', turns: 3 },
};

test('evaluateMovementTraits — no traits returns zero bonus', () => {
  const result = evaluateMovementTraits({ registry: {}, actor: { traits: [] } });
  assert.equal(result.move_bonus, 0);
  assert.deepEqual(result.trait_effects, []);
});

test('evaluateMovementTraits — single move_bonus trait', () => {
  const registry = { move_t1: MOVE_BONUS_T1 };
  const actor = { traits: ['move_t1'] };
  const result = evaluateMovementTraits({ registry, actor });
  assert.equal(result.move_bonus, 1);
  assert.equal(result.trait_effects.length, 1);
  assert.equal(result.trait_effects[0].trait, 'move_t1');
  assert.equal(result.trait_effects[0].stat, 'move_bonus');
  assert.equal(result.trait_effects[0].amount, 1);
  assert.equal(result.trait_effects[0].triggered, true);
});

test('evaluateMovementTraits — stacks multiple move_bonus traits', () => {
  const def2 = {
    ...MOVE_BONUS_T1,
    effect: { ...MOVE_BONUS_T1.effect, amount: 1, log_tag: 'test_move_bonus_2' },
  };
  const registry = { move_t1: MOVE_BONUS_T1, move_t2: def2 };
  const actor = { traits: ['move_t1', 'move_t2'] };
  const result = evaluateMovementTraits({ registry, actor });
  assert.equal(result.move_bonus, 2);
  assert.equal(result.trait_effects.length, 2);
});

test('evaluateMovementTraits — ignores attack and passive traits', () => {
  const registry = { atk: ATTACK_TRAIT, stat: STATUS_TRAIT, mov: MOVE_BONUS_T1 };
  const actor = { traits: ['atk', 'stat', 'mov'] };
  const result = evaluateMovementTraits({ registry, actor });
  assert.equal(result.move_bonus, 1);
  assert.equal(result.trait_effects.length, 1);
});

test('evaluateMovementTraits — ignores unknown trait IDs', () => {
  const registry = { move_t1: MOVE_BONUS_T1 };
  const actor = { traits: ['move_t1', 'unknown_trait_xyz'] };
  const result = evaluateMovementTraits({ registry, actor });
  assert.equal(result.move_bonus, 1);
});

test('evaluateMovementTraits — tolerates missing actor', () => {
  const result = evaluateMovementTraits({ registry: {}, actor: null });
  assert.equal(result.move_bonus, 0);
});

test('evaluateMovementTraits — tolerates missing registry', () => {
  const result = evaluateMovementTraits({ registry: null, actor: { traits: ['x'] } });
  assert.equal(result.move_bonus, 0);
});

test('evaluateMovementTraits — skips buff_stat with wrong stat name', () => {
  const wrongStat = {
    trigger: { action_type: 'movement' },
    effect: { kind: 'buff_stat', stat: 'attack_bonus', amount: 2 },
  };
  const registry = { ws: wrongStat };
  const actor = { traits: ['ws'] };
  const result = evaluateMovementTraits({ registry, actor });
  assert.equal(result.move_bonus, 0);
  assert.equal(result.trait_effects.length, 0);
});

test('evaluateMovementTraits — skips zero or negative amount', () => {
  const zeroDef = {
    trigger: { action_type: 'movement' },
    effect: { kind: 'buff_stat', stat: 'move_bonus', amount: 0 },
  };
  const registry = { z: zeroDef };
  const actor = { traits: ['z'] };
  const result = evaluateMovementTraits({ registry, actor });
  assert.equal(result.move_bonus, 0);
});
