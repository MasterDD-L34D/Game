// tests/api/sessionCumulativeWire.test.js — TKT-ORPHAN-CUMSTATE regression guard.
//
// Proves the ROUND-BRIDGE → cumulativeStateTracker wire stays live end-to-end:
//   sessionRoundBridge.applyEndOfRoundSideEffects() loops session.units and calls
//   updateCumulativeState(unit, session) at end of round, which writes
//   unit.cumulative_ally_adjacent_turns — the exact field the Phase-6
//   mutationTriggerEvaluator reads (case 'ally_adjacent_turns'). The module +
//   evaluator have their own unit tests; this guards the WIRE between them
//   (anti-pattern #10: a future rewrite that drops the sessionRoundBridge hook
//   turns the cumulative-trigger mutations silently dead again — this goes red).
//
// Scenario: enc_tutorial_01 spawns p_scout (1,2) + p_tank (1,3), Manhattan
// distance 1 (adjacent). With no player intents the units stay put, so the
// end-of-round adjacency counter must increment for both.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  return { sid: startRes.body.session_id };
}

test('CUMSTATE wire: end-of-round populates cumulative_ally_adjacent_turns', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);

  // No player intents → units hold position; ai_auto=true fires the end-of-round
  // side-effects (where updateCumulativeState runs).
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({ session_id: sid, player_intents: [], ai_auto: true });
  assert.equal(res.status, 200, `round/execute ok: ${JSON.stringify(res.body).slice(0, 200)}`);

  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const scout = stateRes.body.units.find((u) => u.id === 'p_scout');
  const tank = stateRes.body.units.find((u) => u.id === 'p_tank');
  assert.ok(scout, 'p_scout present in state');
  assert.ok(tank, 'p_tank present in state');

  // p_scout(1,2) + p_tank(1,3) are adjacent → counter incremented this round.
  // If the round-bridge wire is dropped, these fields stay undefined → red.
  assert.ok(
    Number(scout.cumulative_ally_adjacent_turns) >= 1,
    `scout adjacency counted (got ${scout.cumulative_ally_adjacent_turns})`,
  );
  assert.ok(
    Number(tank.cumulative_ally_adjacent_turns) >= 1,
    `tank adjacency counted (got ${tank.cumulative_ally_adjacent_turns})`,
  );
});
