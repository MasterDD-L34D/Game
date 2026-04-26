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

// ===========================================================================
// QW2 / M-017: starter bioma route surface
// ===========================================================================

test('GET /api/forms/starter-biomas: returns 16 form -> bioma map', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/forms/starter-biomas');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 16);
  assert.equal(res.body.items.length, 16);
  const intj = res.body.items.find((x) => x.form_id === 'INTJ');
  assert.ok(intj);
  assert.equal(intj.trait_id, 'starter_bioma_intj');
  assert.equal(intj.biome_id, 'rovine_planari');
});

test('GET /api/forms/INTJ/starter-bioma: resolves single form', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/forms/INTJ/starter-bioma');
  assert.equal(res.status, 200);
  assert.equal(res.body.form_id, 'INTJ');
  assert.equal(res.body.trait_id, 'starter_bioma_intj');
  assert.equal(res.body.biome_id, 'rovine_planari');
});

test('GET /api/forms/XXXX/starter-bioma: 404 for unknown form', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/forms/XXXX/starter-bioma');
  assert.equal(res.status, 404);
});

test('GET /api/forms/INTJ/packs: payload includes starter_bioma resolved field', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/forms/INTJ/packs');
  assert.equal(res.status, 200);
  assert.ok(res.body.starter_bioma);
  assert.equal(res.body.starter_bioma.trait_id, 'starter_bioma_intj');
});

test('POST /api/forms/INTJ/recommend: payload includes starter_bioma', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).post('/api/forms/INTJ/recommend').send({ job_id: 'invoker' });
  assert.equal(res.status, 200);
  assert.ok(res.body.starter_bioma);
  assert.equal(res.body.starter_bioma.biome_id, 'rovine_planari');
});
