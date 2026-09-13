// =============================================================================
// TKT-M15 — Promotion API integration tests.
//
// Coverage: GET /:id/promotion-eligibility, POST /:id/promote, eligibility gate.
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

test('GET /:id/promotion-eligibility returns array with player units at base tier', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app);
    const res = await request(app)
      .get(`/api/session/${session_id}/promotion-eligibility`)
      .expect(200);
    assert.equal(res.body.session_id, session_id);
    assert.ok(Array.isArray(res.body.eligibility));
    // Tutorial_01 should have at least 1 player unit.
    assert.ok(res.body.eligibility.length >= 1);
    for (const ent of res.body.eligibility) {
      assert.ok(ent.unit_id);
      assert.equal(ent.current_tier, 'base');
      assert.equal(ent.eligible, false); // No kills yet
      assert.ok(ent.metrics);
    }
  } finally {
    if (typeof close === 'function') await close();
  }
});

test('POST /:id/promote rejects when missing fields', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app);
    const res = await request(app).post(`/api/session/${session_id}/promote`).send({}).expect(400);
    assert.equal(res.body.error, 'missing_fields');
  } finally {
    if (typeof close === 'function') await close();
  }
});

test('POST /:id/promote rejects unknown unit with 404', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app);
    const res = await request(app)
      .post(`/api/session/${session_id}/promote`)
      .send({ unit_id: 'phantom-unit', target_tier: 'veteran' })
      .expect(404);
    assert.equal(res.body.error, 'unit_not_found');
  } finally {
    if (typeof close === 'function') await close();
  }
});

test('POST /:id/promote rejects when not eligible (no kills accumulated)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app);
    const eligRes = await request(app)
      .get(`/api/session/${session_id}/promotion-eligibility`)
      .expect(200);
    const firstUnit = eligRes.body.eligibility[0];
    const res = await request(app)
      .post(`/api/session/${session_id}/promote`)
      .send({ unit_id: firstUnit.unit_id, target_tier: 'veteran' })
      .expect(400);
    assert.equal(res.body.error, 'not_eligible');
    assert.ok(res.body.eligibility);
  } finally {
    if (typeof close === 'function') await close();
  }
});

test('POST /:id/promote returns 404 unknown session', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post(`/api/session/nonexistent/promote`)
      .send({ unit_id: 'x', target_tier: 'veteran' })
      .expect(404);
    assert.ok(res.body.error);
  } finally {
    if (typeof close === 'function') await close();
  }
});
