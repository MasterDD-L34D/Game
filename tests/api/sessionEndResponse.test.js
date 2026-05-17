// Session /end response smoke test — VC snapshot must be returned pre-delete
// so harness scripts don't need a separate GET /:id/vc before /end.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('/end response includes vc_snapshot for harness consumers', async (t) => {
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

  const endRes = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(endRes.status, 200);
  assert.ok(endRes.body.finalized, 'finalized flag set');
  assert.ok('vc_snapshot' in endRes.body, 'vc_snapshot key present in response');
  if (endRes.body.vc_snapshot !== null) {
    assert.equal(typeof endRes.body.vc_snapshot, 'object', 'vc_snapshot is object or null');
  }
});

test('/end on already-ended session returns 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  const first = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(first.status, 200);

  const second = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(second.status, 404, 'second /end returns 404 (session deleted)');
});
