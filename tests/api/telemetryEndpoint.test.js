// V1 sprint telemetry endpoint — POST /api/session/telemetry
//
// Validates:
//  - accepts batch events array
//  - rejects missing/empty events
//  - rejects oversized batch (>200)
//  - appends JSONL line per event
//  - returns appended count

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function yyyymmdd() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

test('POST /api/session/telemetry: appends batch JSONL', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/telemetry')
    .send({
      session_id: 'sess_test_1',
      player_id: 'p1',
      events: [
        { ts: '2026-04-26T12:00:00Z', type: 'ui_error', payload: { msg: 'form stuck' } },
        { ts: '2026-04-26T12:00:01Z', type: 'input_latency', payload: { ms: 420 } },
      ],
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.appended, 2);
  // Verify file exists
  const logPath = path.join(process.cwd(), 'logs', `telemetry_${yyyymmdd()}.jsonl`);
  assert.ok(fs.existsSync(logPath), 'JSONL log should exist');
  const content = fs.readFileSync(logPath, 'utf8');
  assert.ok(content.includes('sess_test_1'), 'session_id captured');
  assert.ok(content.includes('ui_error'), 'event type captured');
});

test('POST /api/session/telemetry: missing events = 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).post('/api/session/telemetry').send({});
  assert.equal(res.status, 400);
});

test('POST /api/session/telemetry: empty events array = 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).post('/api/session/telemetry').send({ events: [] });
  assert.equal(res.status, 400);
});

test('POST /api/session/telemetry: batch >200 = 413', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const events = Array.from({ length: 201 }, (_, i) => ({ type: 'x', payload: { i } }));
  const res = await request(app).post('/api/session/telemetry').send({ events });
  assert.equal(res.status, 413);
});

test('POST /api/session/telemetry: anonymous event (no session/player)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/telemetry')
    .send({
      events: [{ type: 'anon', payload: null }],
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.appended, 1);
});
