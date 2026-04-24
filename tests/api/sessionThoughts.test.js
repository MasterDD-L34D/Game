// P4 Thought Cabinet — integration test on /api/session/:id/thoughts.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('GET /:id/thoughts returns per_actor unlocked + newly arrays', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);

  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200);
  const sid = startRes.body.session_id;

  const res = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(res.status, 200);
  assert.equal(res.body.session_id, sid);
  assert.ok(res.body.per_actor && typeof res.body.per_actor === 'object');
  for (const [uid, payload] of Object.entries(res.body.per_actor)) {
    assert.ok(Array.isArray(payload.unlocked), `${uid} unlocked array`);
    assert.ok(Array.isArray(payload.newly), `${uid} newly array`);
  }
});

test('GET /:id/thoughts cumulative — second call has newly=[] if axes static', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  const first = await request(app).get(`/api/session/${sid}/thoughts`);
  const second = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(second.status, 200);
  for (const uid of Object.keys(second.body.per_actor || {})) {
    // newly must be subset-empty on second call (axes unchanged → nothing new)
    assert.equal(
      second.body.per_actor[uid].newly.length,
      0,
      `${uid} second call must have newly=[]`,
    );
    // unlocked total stays the same
    assert.equal(
      second.body.per_actor[uid].unlocked.length,
      first.body.per_actor[uid].unlocked.length,
    );
  }
});

test('GET /:id/thoughts on unknown session → 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/session/not-a-real-id/thoughts');
  assert.equal(res.status, 404);
});

test('POST /end clears thoughtsStore entry (no memory leak — Codex #1702 P2)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;
  // Populate thoughtsStore
  const pre = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(pre.status, 200);
  // End session (triggers thoughtsStore.delete)
  const endRes = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(endRes.status, 200);
  // Post-end: session gone → /thoughts 404 (not stale 200 from cache)
  const post = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(post.status, 404, 'thoughtsStore entry released with session');
});
