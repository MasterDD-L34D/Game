// Chronicle route integration -- SPEC-Q M-7 (per-branco narrative event-store).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function tmpBaseDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-route-test-'));
}

function mkApp(t, baseDir) {
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  return app;
}

test('GET /api/chronicle/:run_id -- empty returns 200 zero events', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  const r = await request(app).get('/api/chronicle/run1');
  assert.equal(r.status, 200);
  assert.equal(r.body.run_id, 'run1');
  assert.equal(r.body.count, 0);
  assert.deepEqual(r.body.events, []);
});

test('POST /api/chronicle/:run_id -- happy path appends + 201 (tier defaults public)', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  const r = await request(app)
    .post('/api/chronicle/run1')
    .send({ type: 'creature_named', actor_id: 'skiv', payload: { name: 'Vega' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.event.type, 'creature_named');
  assert.equal(r.body.event.tier, 'public');
  assert.equal(r.body.event.run_id, 'run1');
});

test('POST /api/chronicle/:run_id -- invalid type -> 409 + allowed list', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  const r = await request(app).post('/api/chronicle/run1').send({ type: 'spurious' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'invalid_event_type');
  assert.ok(Array.isArray(r.body.allowed_event_types));
  assert.ok(r.body.allowed_event_types.includes('creature_named'));
});

test('POST /api/chronicle/:run_id -- invalid tier -> 409', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  const r = await request(app)
    .post('/api/chronicle/run1')
    .send({ type: 'creature_named', tier: 'cosmic' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'invalid_tier');
});

test('POST /api/chronicle/:run_id -- invalid run_id -> 400', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  const r = await request(app).post('/api/chronicle/..%2Fbad').send({ type: 'creature_named' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'invalid_run_id');
});

test('GET /api/chronicle/:run_id?type=&actor_id= -- filters', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  await request(app).post('/api/chronicle/run1').send({ type: 'creature_named', actor_id: 'skiv' });
  await request(app).post('/api/chronicle/run1').send({ type: 'scar_earned', actor_id: 'skiv' });
  await request(app).post('/api/chronicle/run1').send({ type: 'creature_named', actor_id: 'vega' });
  const byType = await request(app).get('/api/chronicle/run1?type=creature_named');
  assert.equal(byType.body.count, 2);
  const byActor = await request(app).get('/api/chronicle/run1?actor_id=skiv');
  assert.equal(byActor.body.count, 2);
});

test('GET /api/chronicle/:run_id/summary -- aggregates by_type + by_tier', async (t) => {
  const app = mkApp(t, tmpBaseDir());
  await request(app).post('/api/chronicle/run1').send({ type: 'creature_named', tier: 'public' });
  await request(app).post('/api/chronicle/run1').send({ type: 'scar_earned', tier: 'private' });
  const r = await request(app).get('/api/chronicle/run1/summary');
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 2);
  assert.equal(r.body.by_type.creature_named, 1);
  assert.equal(r.body.by_tier.private, 1);
});
