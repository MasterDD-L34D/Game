// tests/api/previewRoundWire.test.js — SPEC-C G5 preview v2 surface.
//
// Exposes the existing engine fn roundOrchestrator.previewRound (server LIVE,
// route DEAD). POST /api/session/preview-round returns a non-canonical round
// estimate (neutral rng = expected outcome, never the round's real rng per G5)
// WITHOUT mutating the real session state. Spec: SPEC-C G5
// (docs/design/evo-tactics-phone-wego-composer.md).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: [
        { id: 'hero', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 1, y: 1 } },
        { id: 'foe', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 2, y: 1 } },
      ],
    });
  return res.body.session_id;
}

async function beginPlanning(app, sid) {
  return request(app).post('/api/session/round/begin-planning').send({ session_id: sid });
}

test('preview-round wire: returns a non-canonical preview during planning', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);
  await beginPlanning(app, sid);

  const res = await request(app).post('/api/session/preview-round').send({ session_id: sid });

  assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.equal(res.body.preview, true, 'flagged as a preview, not the real resolve');
  assert.ok(res.body.round_phase, 'preview carries a round_phase');
  assert.ok(Array.isArray(res.body.units), 'preview carries the resolved units snapshot');
});

test('preview-round wire: is non-mutating (idempotent — real round not consumed)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);
  await beginPlanning(app, sid);

  const first = await request(app).post('/api/session/preview-round').send({ session_id: sid });
  const second = await request(app).post('/api/session/preview-round').send({ session_id: sid });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200, 'second preview still works -> real state was not mutated');
  assert.equal(first.body.round_phase, second.body.round_phase, 'deterministic, stable');
});

test('preview-round wire: 400 when roundState not initialized', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app); // no begin-planning -> no roundState
  const res = await request(app).post('/api/session/preview-round').send({ session_id: sid });
  assert.equal(res.status, 400);
});

test('preview-round wire: 404 missing session', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/preview-round')
    .send({ session_id: 'does_not_exist' });
  assert.equal(res.status, 404);
});
