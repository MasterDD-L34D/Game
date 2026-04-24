// V4 PI-Pacchetti route tests

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/forms/INTJ/packs: returns 3 form packs', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/forms/INTJ/packs');
  assert.equal(res.status, 200);
  assert.ok(res.body.pack_a);
  assert.ok(res.body.pack_b);
  assert.ok(res.body.pack_c);
  assert.ok(res.body.d12_bias);
});

test('POST /api/forms/ISTP/recommend: d20=16 d12=3 → pack_b', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/forms/ISTP/recommend')
    .send({ job_id: 'skirmisher', d20_roll: 16, d12_roll: 3 });
  assert.equal(res.status, 200);
  assert.equal(res.body.type, 'bias_forma');
  assert.equal(res.body.pack_key, 'pack_b');
});

test('POST /api/forms/INTJ/recommend: no d20 → static recommendation', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).post('/api/forms/INTJ/recommend').send({ job_id: 'invoker' });
  assert.equal(res.status, 200);
  assert.equal(res.body.type, 'static_form_recommendation');
  assert.equal(res.body.form_packs.length, 3);
});
