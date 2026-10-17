// Diary route integration — Skiv ticket #7 (Sprint C tail).

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'diary-route-test-'));
}

test('GET /api/diary/:unit_id — empty diary returns 200 with zero entries', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app).get('/api/diary/skiv');
  assert.equal(r.status, 200);
  assert.equal(r.body.unit_id, 'skiv');
  assert.equal(r.body.count, 0);
  assert.deepEqual(r.body.entries, []);
});

test('POST /api/diary/:unit_id — happy path appends + returns 201', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/diary/skiv')
    .send({ event_type: 'defy_used', turn: 5, payload: { relief: 25 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.unit_id, 'skiv');
  assert.equal(r.body.entry.event_type, 'defy_used');
  assert.equal(r.body.entry.turn, 5);
});

test('POST /api/diary/:unit_id — invalid event_type → 409 with allowed list', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app).post('/api/diary/skiv').send({ event_type: 'spurious' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'invalid_event_type');
  assert.ok(Array.isArray(r.body.allowed_event_types));
  assert.ok(r.body.allowed_event_types.includes('defy_used'));
});

test('POST /api/diary/:unit_id — invalid unit_id → 400', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app).post('/api/diary/..%2Fbad').send({ event_type: 'defy_used' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'invalid_unit_id');
});

test('GET /api/diary/:unit_id — returns appended entries chronologically', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  await request(app).post('/api/diary/skiv').send({ event_type: 'defy_used', turn: 1 });
  await request(app).post('/api/diary/skiv').send({ event_type: 'synergy_triggered', turn: 2 });
  const r = await request(app).get('/api/diary/skiv');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 2);
  assert.equal(r.body.entries[0].event_type, 'defy_used');
  assert.equal(r.body.entries[1].event_type, 'synergy_triggered');
});

test('GET /api/diary/:unit_id?limit=1&reverse=true — applies query params', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  await request(app).post('/api/diary/skiv').send({ event_type: 'defy_used', turn: 1 });
  await request(app).post('/api/diary/skiv').send({ event_type: 'defy_used', turn: 2 });
  await request(app).post('/api/diary/skiv').send({ event_type: 'defy_used', turn: 3 });
  const r = await request(app).get('/api/diary/skiv?limit=1&reverse=true');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 1);
  assert.equal(r.body.entries[0].turn, 3);
});

test('GET /api/diary/:unit_id/summary — aggregates counts', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  await request(app).post('/api/diary/skiv').send({ event_type: 'defy_used', turn: 1 });
  await request(app).post('/api/diary/skiv').send({ event_type: 'defy_used', turn: 2 });
  await request(app).post('/api/diary/skiv').send({ event_type: 'synergy_triggered', turn: 3 });
  const r = await request(app).get('/api/diary/skiv/summary');
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 3);
  assert.equal(r.body.by_event_type.defy_used, 2);
  assert.equal(r.body.by_event_type.synergy_triggered, 1);
  assert.ok(r.body.first_seen);
  assert.ok(r.body.last_seen);
});

test('GET /api/diary/:unit_id/summary — empty diary → total 0', async (t) => {
  const baseDir = tmpBaseDir();
  const { app, close } = createApp({ databasePath: null, diary: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app).get('/api/diary/never/summary');
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 0);
});
