// tests/ai/stepTowardsGridWire.test.js
// Seam regression: the AI factories must pass the session's effectiveGrid to
// stepTowards (as they already do for stepAway). With the REAL sessionHelpers
// stepTowards injected, an approach step on a 16x12 board that lands beyond
// x=5 must NOT collapse into the legacy 6x6 clamp box (5-tile "teleport"
// charged at full Manhattan ap_cost, or a null move for units at x<=5).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const {
  stepTowards,
  pickLowestHpEnemy,
  manhattanDistance,
} = require('../../apps/backend/routes/sessionHelpers');

function makeBigBoardSession() {
  return {
    session_id: 'test-16x12',
    turn: 1,
    grid: { width: 16, height: 12 },
    // High pressure -> Apex tier, all intents emitted.
    sistema_pressure: 100,
    units: [
      {
        id: 'p1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 2, y: 5 },
        controlled_by: 'player',
        status: {},
      },
      {
        id: 'sis',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 10, y: 5 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  };
}

test('sistemaTurnRunner: approach on 16x12 moves one tile (no 6x6 clamp teleport)', async () => {
  const { createSistemaTurnRunner } = require('../../apps/backend/services/ai/sistemaTurnRunner');
  const runner = createSistemaTurnRunner({
    pickLowestHpEnemy,
    manhattanDistance,
    stepTowards,
    performAttack: () => {
      throw new Error('unexpected attack: sis is out of range and must approach');
    },
    buildAttackEvent: () => ({}),
    buildMoveEvent: ({ actor, positionFrom }) => ({
      action_type: 'move',
      position_from: { ...positionFrom },
      position_to: { ...actor.position },
    }),
    emitKillAndAssists: async () => {},
    appendEvent: async (session, event) => {
      session.events.push(event);
    },
    gridSize: 6,
  });

  const session = {
    ...makeBigBoardSession(),
    active_unit: 'sis',
    events: [],
    damage_taken: {},
    action_counter: 0,
  };
  const actions = await runner(session);

  const firstMove = actions.find((a) => a.unit_id === 'sis');
  assert.ok(firstMove, `expected a sis action, got: ${JSON.stringify(actions)}`);
  assert.equal(firstMove.type, 'move');
  assert.deepEqual(
    firstMove.position_to,
    { x: 9, y: 5 },
    'one step toward the player, not a clamp',
  );
});

test('declareSistemaIntents: approach on 16x12 steps one tile (no 6x6 clamp teleport)', () => {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 6,
  });
  const { intents, decisions } = declare(makeBigBoardSession());

  const move = intents.find((i) => i.unit_id === 'sis');
  assert.ok(move, `expected a move intent for sis, got decisions: ${JSON.stringify(decisions)}`);
  assert.deepEqual(move.action.move_to, { x: 9, y: 5 }, 'one step toward the player, not a clamp');
  assert.equal(move.action.ap_cost, 1, 'single-tile step must cost 1 AP');
});
