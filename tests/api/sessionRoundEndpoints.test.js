// ADR-2026-04-16 PR 2 di N — integration tests per gli endpoint
// round-based aggiunti in apps/backend/routes/session.js.
//
// Copre:
//   - guardia feature flag USE_ROUND_MODEL (503 se off)
//   - /declare-intent + /clear-intent/:id + /commit-round + /resolve-round
//     end-to-end quando flag on
//   - Phase machine error mapping (400 per violazioni di fase)
//   - Placeholder resolveAction (attack applica 3 HP di danno)
//
// Nota: il flag e' letto da process.env.USE_ROUND_MODEL via helper
// `isRoundModelEnabled()` inline in session.js. I test impostano
// esplicitamente `process.env.USE_ROUND_MODEL = 'true' | 'false'`
// prima di costruire l'app, poi lo ripristinano nel t.after().

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { withRoundFlag, startSession } = require('./sessionTestHelpers');

// ─────────────────────────────────────────────────────────────────
// M17: round endpoints always active (flag removed)
// ─────────────────────────────────────────────────────────────────

test('round endpoints are always active (M17: no flag check)', async (t) => {
  // M17: roundModelGuard removed. Endpoints return 400/404 for bad
  // input, never 503. Flag USE_ROUND_MODEL no longer checked.
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  for (const path of [
    '/api/session/declare-intent',
    '/api/session/commit-round',
    '/api/session/resolve-round',
  ]) {
    const res = await request(app).post(path).send({ session_id: 'x' });
    assert.notEqual(res.status, 503, `${path} should never return 503`);
  }
  const clearRes = await request(app)
    .post('/api/session/clear-intent/p1')
    .send({ session_id: 'x' });
  assert.notEqual(clearRes.status, 503);
});

// ─────────────────────────────────────────────────────────────────
// Flag on — happy path
// ─────────────────────────────────────────────────────────────────

test('declare-intent initializes roundState and accepts planning intent', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sessionId = await startSession(app);

  const declareRes = await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: {
        id: 'act-p1',
        type: 'attack',
        actor_id: 'p1',
        target_id: 'sis',
        ap_cost: 1,
      },
    })
    .expect(200);

  assert.equal(declareRes.body.round_phase, 'planning');
  assert.equal(declareRes.body.pending_intents.length, 1);
  assert.equal(declareRes.body.pending_intents[0].unit_id, 'p1');
  assert.equal(declareRes.body.pending_intents[0].action.type, 'attack');
});

test('declare-intent rejects missing actor_id or action', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const r1 = await request(app)
    .post('/api/session/declare-intent')
    .send({ session_id: sessionId, action: { type: 'attack' } });
  assert.equal(r1.status, 400);
  assert.match(r1.body.error, /actor_id/);

  const r2 = await request(app)
    .post('/api/session/declare-intent')
    .send({ session_id: sessionId, actor_id: 'p1' });
  assert.equal(r2.status, 400);
  assert.match(r2.body.error, /action/);
});

test('clear-intent removes pending intent', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: { id: 'a', type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: 1 },
    })
    .expect(200);

  const clearRes = await request(app)
    .post('/api/session/clear-intent/p1')
    .send({ session_id: sessionId })
    .expect(200);

  assert.equal(clearRes.body.pending_intents.length, 0);
});

test('commit-round transitions phase to committed', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: { id: 'a', type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: 1 },
    })
    .expect(200);

  const commitRes = await request(app)
    .post('/api/session/commit-round')
    .send({ session_id: sessionId })
    .expect(200);

  assert.equal(commitRes.body.round_phase, 'committed');
});

test('commit-round without declared intent still allowed (empty round)', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);
  // Trigger beginRound via declare + clear
  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: {
        id: 'a',
        type: 'move',
        actor_id: 'p1',
        ap_cost: 1,
        move_to: { x: 2, y: 3 },
      },
    })
    .expect(200);
  await request(app)
    .post('/api/session/clear-intent/p1')
    .send({ session_id: sessionId })
    .expect(200);
  const commitRes = await request(app)
    .post('/api/session/commit-round')
    .send({ session_id: sessionId })
    .expect(200);
  assert.equal(commitRes.body.round_phase, 'committed');
});

test('resolve-round executes attack intent and applies placeholder damage', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: { id: 'a', type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: 1 },
    })
    .expect(200);
  await request(app).post('/api/session/commit-round').send({ session_id: sessionId }).expect(200);

  const resolveRes = await request(app)
    .post('/api/session/resolve-round')
    .send({ session_id: sessionId })
    .expect(200);

  assert.equal(resolveRes.body.round_phase, 'resolved');
  assert.equal(resolveRes.body.turn_log_entries.length, 1);
  assert.equal(resolveRes.body.turn_log_entries[0].damage_applied, 3);
  assert.equal(resolveRes.body.resolution_queue.length, 1);
  assert.equal(resolveRes.body.resolution_queue[0].unit_id, 'p1');
  // sis ha subito 3 HP di danno (placeholder)
  const sisUnit = resolveRes.body.units.find((u) => u.id === 'sis');
  assert.equal(sisUnit.hp.current, 7);
});

test('resolve-round priority order: higher initiative resolves first', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: { id: 'p', type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: 1 },
    });
  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'sis',
      action: { id: 's', type: 'attack', actor_id: 'sis', target_id: 'p1', ap_cost: 1 },
    });
  await request(app).post('/api/session/commit-round').send({ session_id: sessionId });
  const resolveRes = await request(app)
    .post('/api/session/resolve-round')
    .send({ session_id: sessionId })
    .expect(200);

  // p1 initiative 14 > sis initiative 10 -> p1 first
  assert.equal(resolveRes.body.resolution_queue[0].unit_id, 'p1');
  assert.equal(resolveRes.body.resolution_queue[1].unit_id, 'sis');
  assert.equal(resolveRes.body.turn_log_entries.length, 2);
});

test('resolve-round rejects if phase is not committed', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: { id: 'a', type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: 1 },
    });
  // No commit
  const resolveRes = await request(app)
    .post('/api/session/resolve-round')
    .send({ session_id: sessionId });
  assert.equal(resolveRes.status, 400);
  assert.match(resolveRes.body.error, /round_phase/);
});

test('round endpoints reject unknown session_id', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: 'unknown-session',
      actor_id: 'p1',
      action: { type: 'attack' },
    });
  assert.equal(res.status, 404);
});

test('commit-round rejects if not in planning phase', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action: { id: 'a', type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: 1 },
    });
  await request(app).post('/api/session/commit-round').send({ session_id: sessionId });

  // Second commit without resolve -> phase is 'committed', not 'planning'
  const res = await request(app).post('/api/session/commit-round').send({ session_id: sessionId });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /round_phase/);
});
