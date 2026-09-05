// M1 sub-proj 2 — read-only Sistema-memory route. Store is a stub no-op
// in tests (no DATABASE_URL) → units_observed is always {} here; assertions
// target route shape (200 envelope, empty-safe, 400 guard).
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('GET /api/campaign/sistema-state returns 200 with empty-safe state', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app)
    .get('/api/campaign/sistema-state')
    .query({ campaign_id: 'camp_mirror_test' });
  assert.equal(res.status, 200, 'returns 200');
  assert.ok(res.body.state, 'state present');
  assert.deepEqual(res.body.state.units_observed, {}, 'units_observed empty (stub no-op)');
});

test('GET /api/campaign/sistema-state 400 when campaign_id missing', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/campaign/sistema-state');
  assert.equal(res.status, 400, 'missing campaign_id → 400');
});
