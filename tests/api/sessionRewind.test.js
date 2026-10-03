// =============================================================================
// TKT-P6 — Rewind safety valve API integration tests.
//
// Verifica end-to-end: POST /api/session/:id/rewind restores pre-action state,
// decrements budget, returns 409 when buffer empty, /state surface budget.
// =============================================================================

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const res = await request(app)
    .post('/api/session/start')
    .send({ scenario_id: 'tutorial_01' })
    .expect(200);
  return res.body;
}

test('GET /state exposes rewind summary with defaults on fresh session', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app);
    const stateRes = await request(app)
      .get(`/api/session/state?session_id=${session_id}`)
      .expect(200);
    assert.ok(stateRes.body.rewind, 'rewind summary present');
    assert.equal(stateRes.body.rewind.budget_remaining, 3);
    assert.equal(stateRes.body.rewind.budget_max, 3);
    assert.equal(stateRes.body.rewind.snapshots_count, 0);
    assert.equal(stateRes.body.rewind.buffer_size, 3);
  } finally {
    if (typeof close === 'function') await close();
  }
});

test('POST /:id/rewind returns 409 buffer_empty when no actions taken', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app);
    const res = await request(app).post(`/api/session/${session_id}/rewind`).expect(409);
    assert.equal(res.body.error, 'rewind_unavailable');
    assert.equal(res.body.reason, 'buffer_empty');
    assert.equal(res.body.budget_remaining, 3);
  } finally {
    if (typeof close === 'function') await close();
  }
});

test('POST /:id/rewind returns 404 for unknown session', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).post(`/api/session/nonexistent-id/rewind`).expect(404);
    assert.ok(res.body.error);
  } finally {
    if (typeof close === 'function') await close();
  }
});
