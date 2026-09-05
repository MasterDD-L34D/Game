// Actor-ownership authz on the player-facing round routes (security fix 2026-07-05).
//
// Threat model: co-op MVP, LAN, trust boundary = player-client vs server. The
// HTTP round routes (/declare-intent, /declare-reaction, /clear-intent,
// /undo-action) are the PLAYER surface. Only player-controlled units may be
// driven by a client; SISTEMA (AI/enemy) intents are authored server-side by
// declareSistemaIntents and must never be injected/mutated over HTTP.
//
// Regression guard for CWE-284/CWE-639 (IDOR): before the fix, /declare-intent
// only ran validatePlayerIntent when actor.controlled_by === 'player', so a
// client could declare an arbitrary intent for a SIS unit -- bypassing the
// OUT_OF_GRID bounds check and teleporting an enemy off-grid.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { startSession, twoUnits } = require('./sessionTestHelpers');

async function declare(app, sid, actorId, action) {
  return request(app)
    .post('/api/session/declare-intent')
    .send({ session_id: sid, actor_id: actorId, action });
}

test('authz: declare-intent for a SIS actor is rejected 403 (not owned)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ sisPos: { x: 3, y: 2 } }));
  const r = await declare(app, sid, 'sis', {
    id: 'sis-mv',
    type: 'move',
    actor_id: 'sis',
    ap_cost: 1,
    move_to: { x: 3, y: 3 },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'ACTOR_NOT_OWNED');
});

test('authz: declare-intent SIS off-grid move blocked (no teleport bypass)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ sisPos: { x: 3, y: 2 } }));
  // Before the fix this returned 200 and stored an off-grid intent for 'sis'.
  const r = await declare(app, sid, 'sis', {
    id: 'sis-mv',
    type: 'move',
    actor_id: 'sis',
    ap_cost: 1,
    move_to: { x: 99, y: 99 },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'ACTOR_NOT_OWNED');
});

test('authz: declare-intent for an unknown actor is rejected 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits());
  const r = await declare(app, sid, 'ghost', {
    id: 'ghost-mv',
    type: 'move',
    actor_id: 'ghost',
    ap_cost: 1,
    move_to: { x: 2, y: 3 },
  });
  assert.equal(r.status, 404);
  assert.equal(r.body.code, 'NO_ACTOR');
});

test('authz: declare-intent for a dead player actor is rejected 400 (ACTOR_DEAD)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Hp: 0 }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 2, y: 3 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'ACTOR_DEAD');
});

test('authz regression: declare-intent for a valid player actor still 200', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 2, y: 3 },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.round_phase, 'planning');
});

test('authz: declare-reaction for a SIS actor is rejected 403', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ sisPos: { x: 3, y: 2 } }));
  const r = await request(app)
    .post('/api/session/declare-reaction')
    .send({
      session_id: sid,
      actor_id: 'sis',
      reaction_trigger: { event: 'on_hit' },
      reaction_payload: { type: 'parry' },
    });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'ACTOR_NOT_OWNED');
});

test('authz: clear-intent for a SIS actor is rejected 403', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ sisPos: { x: 3, y: 2 } }));
  // begin-planning populates a server-authored SIS intent we must not be able to drop.
  await request(app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sid })
    .expect(200);
  const r = await request(app).post('/api/session/clear-intent/sis').send({ session_id: sid });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'ACTOR_NOT_OWNED');
});

test('authz: undo-action for a SIS actor is rejected 403', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ sisPos: { x: 3, y: 2 } }));
  await request(app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sid })
    .expect(200);
  const r = await request(app)
    .post('/api/session/undo-action')
    .send({ session_id: sid, actor_id: 'sis' });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'ACTOR_NOT_OWNED');
});
