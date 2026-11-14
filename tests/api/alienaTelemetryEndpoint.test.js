// §21 ALIENA-D — consumer endpoint GET /api/session/:id/aliena-telemetry.
'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

async function startSession(app, body = { scenario_id: 'tutorial_01' }) {
  const res = await request(app).post('/api/session/start').send(body).expect(200);
  return res.body;
}

test('GET /:id/aliena-telemetry 404 on unknown session', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/session/bogus_session_xyz/aliena-telemetry');
    assert.equal(res.status, 404);
  } finally {
    if (close) await close();
  }
});

test('GET /:id/aliena-telemetry returns empty buffer by default (flag off)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app);
    const res = await request(app).get(`/api/session/${session_id}/aliena-telemetry`).expect(200);
    assert.equal(res.body.session_id, session_id);
    assert.ok(Array.isArray(res.body.telemetry));
    assert.equal(res.body.telemetry.length, 0);
    assert.equal(res.body.count, 0);
    assert.equal(res.body.capped, false);
  } finally {
    if (close) await close();
  }
});

test('GET /:id/aliena-telemetry surfaces ALIENA-C round=0 baseline when flag on', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const { session_id } = await startSession(app, {
      scenario_id: 'tutorial_01',
      encounter: {
        biome_id: 'dune',
        affixes: ['sabbia'],
        reinforcement_pool: [
          { unit_id: 'dune_stalker', weight: 1, tags: ['sand'], role: 'apex' },
          { unit_id: 'mire_husk', weight: 1, tags: ['wet'], role: 'support' },
        ],
        reinforcement_policy: { aliena_coherence_telemetry: true },
      },
    });
    const res = await request(app).get(`/api/session/${session_id}/aliena-telemetry`).expect(200);
    assert.equal(res.body.count, 2);
    for (const s of res.body.telemetry) {
      assert.equal(s.round, 0);
      assert.equal(s.biome_id, 'dune');
      assert.ok(Number.isFinite(s.aggregate));
    }
  } finally {
    if (close) await close();
  }
});
