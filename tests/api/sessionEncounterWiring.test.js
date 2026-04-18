// Integration test per ADR-2026-04-19 (reinforcementSpawner) + ADR-2026-04-20
// (objectiveEvaluator) wiring in sessionRoundBridge.handleTurnEndViaRound.
//
// Copre 3 casi feature-flag OFF default:
//   1. session senza encounter payload → entrambi moduli no-op
//   2. encounter senza reinforcement_policy → reinforcement_spawned=[] skipped
//   3. encounter con objective.type='elimination' → objective_state popolato

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createFlaggedApp, startSession, turnEnd, twoUnits } = require('./sessionTestHelpers');

test('turn/end: session senza encounter → reinforcement + objective no-op', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const sessionId = await startSession(handle.app, twoUnits());
  const res = await turnEnd(handle.app, sessionId);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.reinforcement_spawned, []);
  assert.equal(res.body.objective_state.reason, 'no_objective');
  assert.equal(res.body.objective_state.completed, false);
  assert.equal(res.body.objective_state.failed, false);
});

test('turn/end: encounter senza reinforcement_policy → skipped policy_disabled', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const res = await request(handle.app)
    .post('/api/session/start')
    .send({
      units: twoUnits(),
      encounter: {
        id: 'enc_test',
        objective: { type: 'elimination' },
        // no reinforcement_policy
      },
    })
    .expect(200);
  const sessionId = res.body.session_id;

  const endRes = await turnEnd(handle.app, sessionId);
  assert.equal(endRes.status, 200);
  assert.deepEqual(endRes.body.reinforcement_spawned, []);
  // objective elimination: SIS alive → not completed
  assert.equal(endRes.body.objective_state.reason !== 'no_objective', true);
});

test('turn/end: encounter.objective.type=elimination valuta alive SIS', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const res = await request(handle.app)
    .post('/api/session/start')
    .send({
      units: twoUnits(),
      encounter: {
        id: 'enc_test_elim',
        objective: { type: 'elimination' },
      },
    })
    .expect(200);
  const sessionId = res.body.session_id;

  const endRes = await turnEnd(handle.app, sessionId);
  assert.equal(endRes.status, 200);
  assert.equal(endRes.body.objective_state.completed, false);
  // Progress include sistema/player alive counts
  assert.ok(endRes.body.objective_state.progress);
});
