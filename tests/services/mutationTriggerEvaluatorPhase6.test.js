// Phase 6 closure tests 2026-05-11 (TKT-C4 forbidden path bundle).
// Master-dd grant batch 2026-05-11. Phase 6 residue closure:
//   - ally_adjacent_turns       ✅ Phase 6 implemented (Prisma migration 0009)
//   - trait_active_cumulative   ✅ Phase 6 implemented (Prisma migration 0009)
//
// Coverage:
//   1. ally_adjacent_turns: threshold met → triggered=true
//   2. ally_adjacent_turns: threshold not met → triggered=false
//   3. ally_adjacent_turns: min_proximity_turns alias works
//   4. trait_active_cumulative: trait counter >= threshold → triggered=true
//   5. trait_active_cumulative: missing trait_id → reason='trait_id_missing'
//   6. trait_active_cumulative: trait below threshold → triggered=false
//   7. cumulativeStateTracker: adjacency increment with ally adjacent
//   8. cumulativeStateTracker: no increment when no ally adjacent
//   9. cumulativeStateTracker: species_filter='same' rejects different species ally
//  10. cumulativeStateTracker: trait_fire event increments per-trait counter

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const evaluator = require(
  path.resolve(__dirname, '../../apps/backend/services/combat/mutationTriggerEvaluator.js'),
);
const tracker = require(
  path.resolve(__dirname, '../../apps/backend/services/combat/cumulativeStateTracker.js'),
);

function buildSession({ units = [], events = [], turn = 1 } = {}) {
  return {
    session_id: 'test-session-p6',
    turn,
    sistema_pressure: 0,
    scenario_biome_class: null,
    warning_signals: [],
    units,
    events,
  };
}

// --- ally_adjacent_turns _evaluateCondition direct tests ---

test('Phase 6 ally_adjacent_turns: triggered when cumulative counter >= threshold', () => {
  const unit = { id: 'u1', cumulative_ally_adjacent_turns: 7 };
  const session = buildSession({ units: [unit] });
  const result = evaluator._evaluateCondition(
    { kind: 'ally_adjacent_turns', threshold: 5 },
    unit,
    session,
  );
  assert.equal(result.triggered, true);
  assert.equal(result.turns, 7);
  assert.equal(result.threshold, 5);
});

test('Phase 6 ally_adjacent_turns: not triggered when threshold not met', () => {
  const unit = { id: 'u1', cumulative_ally_adjacent_turns: 3 };
  const session = buildSession({ units: [unit] });
  const result = evaluator._evaluateCondition(
    { kind: 'ally_adjacent_turns', threshold: 10 },
    unit,
    session,
  );
  assert.equal(result.triggered, false);
});

test('Phase 6 ally_adjacent_turns: min_proximity_turns alias works', () => {
  const unit = { id: 'u1', cumulative_ally_adjacent_turns: 4 };
  const session = buildSession({ units: [unit] });
  const result = evaluator._evaluateCondition(
    { kind: 'ally_adjacent_turns', min_proximity_turns: 4 },
    unit,
    session,
  );
  assert.equal(result.triggered, true);
  assert.equal(result.threshold, 4);
});

// --- trait_active_cumulative _evaluateCondition direct tests ---

test('Phase 6 trait_active_cumulative: triggered when trait fires >= threshold', () => {
  const unit = {
    id: 'u1',
    cumulative_trait_active: { artigli_sette_vie: 14, coda_frusta_cinetica: 3 },
  };
  const session = buildSession({ units: [unit] });
  const result = evaluator._evaluateCondition(
    { kind: 'trait_active_cumulative', trait_id: 'artigli_sette_vie', threshold: 10 },
    unit,
    session,
  );
  assert.equal(result.triggered, true);
  assert.equal(result.count, 14);
  assert.equal(result.traitId, 'artigli_sette_vie');
});

test('Phase 6 trait_active_cumulative: missing trait_id → trait_id_missing reason', () => {
  const unit = { id: 'u1', cumulative_trait_active: { coda_frusta_cinetica: 10 } };
  const session = buildSession({ units: [unit] });
  const result = evaluator._evaluateCondition(
    { kind: 'trait_active_cumulative', threshold: 5 },
    unit,
    session,
  );
  assert.equal(result.triggered, false);
  assert.equal(result.reason, 'trait_id_missing');
});

test('Phase 6 trait_active_cumulative: trait below threshold → not triggered', () => {
  const unit = { id: 'u1', cumulative_trait_active: { coda_frusta_cinetica: 5 } };
  const session = buildSession({ units: [unit] });
  const result = evaluator._evaluateCondition(
    { kind: 'trait_active_cumulative', trait_id: 'coda_frusta_cinetica', threshold: 20 },
    unit,
    session,
  );
  assert.equal(result.triggered, false);
  assert.equal(result.count, 5);
});

// --- cumulativeStateTracker tests ---

test('Phase 6 cumulativeStateTracker: adjacency increment when ally within Manhattan <=1', () => {
  const unit = {
    id: 'u1',
    team: 'players',
    species: 'skiv',
    position: { x: 5, y: 5 },
    cumulative_ally_adjacent_turns: 2,
  };
  const ally = { id: 'u2', team: 'players', species: 'skiv', position: { x: 5, y: 6 } };
  const result = tracker.updateAllyAdjacentTurns(unit, [unit, ally]);
  assert.equal(result.incremented, true);
  assert.equal(result.newValue, 3);
  assert.equal(unit.cumulative_ally_adjacent_turns, 3);
});

test('Phase 6 cumulativeStateTracker: no increment when no ally adjacent', () => {
  const unit = {
    id: 'u1',
    team: 'players',
    position: { x: 1, y: 1 },
    cumulative_ally_adjacent_turns: 5,
  };
  const enemy = { id: 'u2', team: 'enemies', position: { x: 1, y: 2 } };
  const result = tracker.updateAllyAdjacentTurns(unit, [unit, enemy]);
  assert.equal(result.incremented, false);
  assert.equal(result.newValue, 5);
});

test('Phase 6 cumulativeStateTracker: species_filter=same rejects different species ally', () => {
  const unit = {
    id: 'u1',
    team: 'players',
    species: 'skiv',
    position: { x: 0, y: 0 },
    cumulative_ally_adjacent_turns: 0,
  };
  const otherSpeciesAlly = {
    id: 'u2',
    team: 'players',
    species: 'pulverator',
    position: { x: 0, y: 1 },
  };
  const result = tracker.updateAllyAdjacentTurns(unit, [unit, otherSpeciesAlly], {
    speciesFilter: 'same',
  });
  assert.equal(result.incremented, false);
});

test('Phase 6 cumulativeStateTracker: trait_fire event increments per-trait counter', () => {
  const unit = { id: 'u1', cumulative_trait_active: { artigli_sette_vie: 4 } };
  const session = buildSession({
    units: [unit],
    turn: 3,
    events: [
      { action_type: 'trait_fire', actor_id: 'u1', trait_id: 'artigli_sette_vie', turn: 3 },
      { action_type: 'trait_fire', actor_id: 'u1', trait_id: 'coda_frusta_cinetica', turn: 3 },
      { action_type: 'attack', actor_id: 'u1', turn: 3 }, // non trait_fire — ignored
    ],
  });
  const result = tracker.updateTraitActiveCumulative(unit, session);
  assert.equal(unit.cumulative_trait_active.artigli_sette_vie, 5);
  assert.equal(unit.cumulative_trait_active.coda_frusta_cinetica, 1);
  assert.equal(result.updated.length, 2);
});
