// tests/api/sessionDeviceEventWire.test.js — SPEC-A Device Input Ledger wire.
//
// Pins the backend seam: device events POST -> ingest (validate + consent-gate)
// -> session.events; signal events are gated by profilingConsent (opt-in, with
// decision-only graceful degrade); the TV-mirror GET exposes only public +
// aggregated tiers (fail-closed). Raw events never cross the wire.
// Spec: docs/design/evo-tactics-device-input-ledger.md
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: [{ id: 'u1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 1, y: 1 } }],
    });
  return res.body.session_id;
}

test('device-event wire: decision ingested, signal consent-gated, tv-mirror filtered', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app);

  // 1. decision event is always ingested (no consent needed).
  const dec = await request(app)
    .post('/api/session/device-event')
    .send({
      session_id: sid,
      event: {
        kind: 'decision',
        type: 'route_vote',
        playerId: 'p1',
        tier: 'public',
        payload: { route: 'A' },
      },
    });
  assert.equal(dec.status, 200, JSON.stringify(dec.body).slice(0, 200));
  assert.equal(dec.body.accepted, true);

  // 2. signal event dropped when profiling consent absent (decision-only mode).
  const sigNo = await request(app)
    .post('/api/session/device-event')
    .send({
      session_id: sid,
      event: { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 900 },
    });
  assert.equal(sigNo.body.accepted, false);
  assert.equal(sigNo.body.reason, 'profiling-opt-out');

  // 3. signal event ingested once consent is granted (persists on session).
  const sigYes = await request(app)
    .post('/api/session/device-event')
    .send({
      session_id: sid,
      profilingConsent: true,
      event: { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 900 },
    });
  assert.equal(sigYes.body.accepted, true);
  assert.equal(sigYes.body.profiling_consent, true);

  // 4. TV-mirror exposes only public/aggregated tiers (secret signal hidden).
  const tv = await request(app).get('/api/session/tv-mirror').query({ session_id: sid });
  assert.equal(tv.status, 200);
  const types = tv.body.events.map((e) => e.type);
  assert.ok(types.includes('route_vote'), 'public decision visible on TV');
  assert.ok(!types.includes('commit_latency'), 'secret behavioral signal hidden from TV');
});

test('device-event wire: raw events are rejected at the route (edge-first)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);
  const res = await request(app)
    .post('/api/session/device-event')
    .send({ session_id: sid, event: { kind: 'raw', type: 'tap', playerId: 'p1' } });
  assert.equal(res.body.accepted, false);
  assert.match(res.body.reason, /raw|invalid/i);
});
