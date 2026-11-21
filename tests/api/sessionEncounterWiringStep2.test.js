// Integration test per step 2 wiring:
//   - /commit-round auto_resolve emits reinforcement_spawned + objective_state
//   - /end response prende outcome da objectiveEvaluator se encounter.objective presente
//
// ADR-2026-04-19 (reinforcementSpawner) + ADR-2026-04-20 (objectiveEvaluator).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createFlaggedApp, twoUnits } = require('./sessionTestHelpers');

async function startWithEncounter(app, encounter, units) {
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: units || twoUnits(), encounter })
    .expect(200);
  return res.body.session_id;
}

test('commit-round auto_resolve: response include reinforcement_spawned + objective_state', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const sessionId = await startWithEncounter(handle.app, {
    id: 'enc_test_step2',
    objective: { type: 'elimination' },
  });

  // planning → declare → commit con auto_resolve
  await request(handle.app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sessionId })
    .expect(200);

  await request(handle.app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: { type: 'move', actor_id: 'p1', move_to: { x: 2, y: 3 } },
    })
    .expect((r) => {
      if (r.status !== 200)
        throw new Error(`declare-intent status=${r.status} body=${JSON.stringify(r.body)}`);
    });

  const commitRes = await request(handle.app)
    .post('/api/session/commit-round')
    .send({ session_id: sessionId, auto_resolve: true })
    .expect(200);

  assert.ok(Array.isArray(commitRes.body.reinforcement_spawned));
  assert.ok(commitRes.body.objective_state !== undefined);
  // elimination objective in progress: SIS + player alive → not completed, not failed
  assert.equal(commitRes.body.objective_state.completed, false);
  assert.equal(commitRes.body.objective_state.failed, false);
});

test('/end: outcome prende da objective evaluator se encounter.objective presente', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  // Encounter survival con survive_turns=1 → completed subito dopo turn >= 1
  const sessionId = await startWithEncounter(handle.app, {
    id: 'enc_test_survival',
    objective: { type: 'survival', survive_turns: 1 },
  });

  // Advance turn to 1
  await request(handle.app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);

  const endRes = await request(handle.app)
    .post('/api/session/end')
    .send({ session_id: sessionId })
    .expect(200);

  // survival objective at turn >= 1 with player alive → outcome=win
  assert.equal(endRes.body.outcome, 'win');
  assert.ok(endRes.body.objective_state);
  assert.equal(endRes.body.objective_state.completed, true);
});

test('/end: fallback elimination se encounter undefined', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  // No encounter — legacy path
  const res = await request(handle.app)
    .post('/api/session/start')
    .send({ units: twoUnits() })
    .expect(200);
  const sessionId = res.body.session_id;

  const endRes = await request(handle.app)
    .post('/api/session/end')
    .send({ session_id: sessionId })
    .expect(200);

  // sistema + player alive → outcome=abandon
  assert.equal(endRes.body.outcome, 'abandon');
  assert.equal(endRes.body.objective_state, null);
});
