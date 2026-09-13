// Sprint δ Meta Systemic — Pattern 3 tests (MYZ mutation tree swap).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { swapAppliedMutation } = require('../../../apps/backend/services/meta/mutationTreeSwap');

function buildCatalog() {
  return {
    byId: {
      mut_claws: {
        body_slot: 'appendage',
        category: 'physiological',
        mp_cost: 2,
        trait_swap: { add: ['trait_claws'], remove: [] },
        derived_ability_id: 'ability_claw_strike',
        irreversible: false,
      },
      mut_blades: {
        body_slot: 'appendage',
        category: 'physiological',
        mp_cost: 3,
        trait_swap: { add: ['trait_blades'], remove: [] },
        derived_ability_id: null,
        irreversible: false,
      },
      mut_tongue: {
        body_slot: 'mouth',
        category: 'physiological',
        mp_cost: 1,
        trait_swap: { add: ['trait_tongue'], remove: [] },
        irreversible: false,
      },
      mut_locked: {
        body_slot: 'back',
        category: 'physiological',
        mp_cost: 5,
        trait_swap: { add: ['trait_wings'], remove: [] },
        irreversible: true,
      },
    },
  };
}

test('swapAppliedMutation: basic swap succeeds', () => {
  const unit = {
    id: 'u1',
    mp: 5,
    trait_ids: ['trait_claws'],
    applied_mutations: ['mut_claws'],
    abilities: ['ability_claw_strike'],
  };
  const result = swapAppliedMutation(unit, 'mut_claws', 'mut_blades', buildCatalog());
  assert.equal(result.ok, true);
  assert.ok(result.unit.applied_mutations.includes('mut_blades'));
  assert.equal(result.unit.applied_mutations.includes('mut_claws'), false);
  assert.ok(result.unit.trait_ids.includes('trait_blades'));
  assert.equal(result.unit.trait_ids.includes('trait_claws'), false);
  assert.equal(result.swap_event.type, 'mutation_swapped');
  // refunded 2 (claws), spent 3 (blades) → mp 5+2-3=4
  assert.equal(result.unit.mp, 4);
});

test('swapAppliedMutation: slot conflict — swap targeting occupied alt slot fails', () => {
  // Apply both claws (appendage) AND tongue (mouth), then try swapping tongue → blades (also appendage)
  // claws still occupies appendage → conflict
  const unit = {
    mp: 5,
    trait_ids: ['trait_claws', 'trait_tongue'],
    applied_mutations: ['mut_claws', 'mut_tongue'],
  };
  const result = swapAppliedMutation(unit, 'mut_tongue', 'mut_blades', buildCatalog());
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'slot_conflict');
  assert.equal(result.conflicting_mutation_id, 'mut_claws');
});

test('swapAppliedMutation: mp insufficient fails', () => {
  // claws costs 2, blades costs 3 → after refund mp=0+2=2 < 3
  const unit = {
    mp: 0,
    trait_ids: ['trait_claws'],
    applied_mutations: ['mut_claws'],
  };
  const result = swapAppliedMutation(unit, 'mut_claws', 'mut_blades', buildCatalog());
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'mp_insufficient');
});

test('swapAppliedMutation: irreversible old mutation rejected', () => {
  const unit = {
    mp: 10,
    trait_ids: ['trait_wings'],
    applied_mutations: ['mut_locked'],
  };
  const result = swapAppliedMutation(unit, 'mut_locked', 'mut_blades', buildCatalog());
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'old_mutation_irreversible');
});

test('swapAppliedMutation: idempotent — same id rejected', () => {
  const unit = {
    mp: 5,
    trait_ids: ['trait_claws'],
    applied_mutations: ['mut_claws'],
  };
  const result = swapAppliedMutation(unit, 'mut_claws', 'mut_claws', buildCatalog());
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'noop_same_id');
});
