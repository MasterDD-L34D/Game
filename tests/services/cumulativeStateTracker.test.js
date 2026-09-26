// TKT-ORPHAN-CUMSTATE — unit tests for the cumulative-state engine wired into
// sessionRoundBridge.applyEndOfRoundSideEffects (Phase 7 wire 2026-05-22).
// The engine was orphan (zero callers) before the wire; these tests close the
// test gap + lock the behavior the round loop now depends on.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  updateAllyAdjacentTurns,
  updateTraitActiveCumulative,
  updateCumulativeState,
} = require('../../apps/backend/services/combat/cumulativeStateTracker');

test('updateAllyAdjacentTurns increments when an ally is within distance 1', () => {
  const unit = { id: 'a', team: 'players', position: { x: 1, y: 1 } };
  const allUnits = [unit, { id: 'b', team: 'players', position: { x: 1, y: 2 } }];
  const r = updateAllyAdjacentTurns(unit, allUnits);
  assert.equal(r.incremented, true);
  assert.equal(r.newValue, 1);
  assert.equal(unit.cumulative_ally_adjacent_turns, 1);
});

test('updateAllyAdjacentTurns does NOT increment when alone or ally too far', () => {
  const unit = { id: 'a', team: 'players', position: { x: 0, y: 0 } };
  const r1 = updateAllyAdjacentTurns(unit, [unit]);
  assert.equal(r1.incremented, false);
  const r2 = updateAllyAdjacentTurns(unit, [
    unit,
    { id: 'b', team: 'players', position: { x: 5, y: 5 } },
  ]);
  assert.equal(r2.incremented, false);
});

test('updateAllyAdjacentTurns ignores enemies + honors speciesFilter=same', () => {
  const unit = { id: 'a', team: 'players', species: 'wolf', position: { x: 1, y: 1 } };
  const enemyAdjacent = [unit, { id: 'e', team: 'sistema', position: { x: 1, y: 2 } }];
  assert.equal(updateAllyAdjacentTurns(unit, enemyAdjacent).incremented, false);
  const otherSpecies = [
    unit,
    { id: 'b', team: 'players', species: 'cat', position: { x: 1, y: 2 } },
  ];
  assert.equal(
    updateAllyAdjacentTurns(unit, otherSpecies, { speciesFilter: 'same' }).incremented,
    false,
  );
});

test('updateTraitActiveCumulative counts this unit trait_fire events in window', () => {
  const unit = { id: 'a' };
  const session = {
    turn: 2,
    events: [
      { action_type: 'trait_fire', actor_id: 'a', trait_id: 'claws', turn: 2 },
      { action_type: 'trait_fire', actor_id: 'a', trait_id: 'claws', turn: 2 },
      { action_type: 'trait_fire', actor_id: 'b', trait_id: 'claws', turn: 2 }, // other actor
      { action_type: 'attack', actor_id: 'a', turn: 2 }, // not a trait_fire
    ],
  };
  const r = updateTraitActiveCumulative(unit, session);
  assert.equal(unit.cumulative_trait_active.claws, 2);
  assert.deepEqual(r.updated, ['claws', 'claws']);
});

test('updateCumulativeState aggregates both + tolerates empty session', () => {
  const unit = { id: 'a', team: 'players', position: { x: 1, y: 1 } };
  const session = {
    turn: 1,
    units: [unit, { id: 'b', team: 'players', position: { x: 1, y: 2 } }],
    events: [{ action_type: 'trait_fire', actor_id: 'a', trait_id: 'spore', turn: 1 }],
  };
  const r = updateCumulativeState(unit, session);
  assert.equal(r.ally_adjacent_turns.incremented, true);
  assert.equal(unit.cumulative_trait_active.spore, 1);
  // empty/garbage inputs do not throw
  assert.doesNotThrow(() => updateCumulativeState(null, null));
  assert.doesNotThrow(() => updateCumulativeState({ id: 'x' }, { units: [], events: [] }));
});
