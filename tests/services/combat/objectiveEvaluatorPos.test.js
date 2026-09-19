'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  _internals,
  evaluateObjective,
} = require('../../../apps/backend/services/combat/objectiveEvaluator');

// Regression: pointInBox did `const [x, y] = pos` (array-destructure), but unit positions
// are `{x, y}` objects throughout the engine (session.js, encounter_to_units, etc.). That
// threw `TypeError: pos is not iterable` -> in /turn/end it surfaced as a 500 (blocking the
// non-elim calibration tool); in the /objective route it was caught -> evaluation=null ->
// zone objectives (capture/escort/escape) could NEVER complete. Accept BOTH shapes.
test('pointInBox accepts {x,y} object positions (the real engine shape)', () => {
  assert.equal(_internals.pointInBox({ x: 4, y: 4 }, [4, 4, 5, 5]), true);
  assert.equal(_internals.pointInBox({ x: 9, y: 9 }, [4, 4, 5, 5]), false);
  // array form still works (defensive / back-compat)
  assert.equal(_internals.pointInBox([4, 4], [4, 4, 5, 5]), true);
  assert.equal(_internals.pointInBox([9, 9], [4, 4, 5, 5]), false);
});

test('capture_point evaluation does not throw with {x,y} player positions', () => {
  const session = {
    units: [
      { id: 'p1', controlled_by: 'player', hp: 10, position: { x: 4, y: 4 } },
      { id: 's1', controlled_by: 'sistema', hp: 7, position: { x: 9, y: 9 } },
    ],
    turn: 1,
  };
  const encounter = {
    objective: { type: 'capture_point', target_zone: [4, 4, 5, 5], hold_turns: 3 },
  };
  // before the fix this threw (pos not iterable); now it must return a clean evaluation.
  const ev = evaluateObjective(session, encounter);
  assert.equal(ev.failed, false);
  assert.equal(ev.progress.units_in_zone, 1);
});
