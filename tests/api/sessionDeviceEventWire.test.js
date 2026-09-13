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

test('device-event wire: forged combat keys are stripped (no scoring injection)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app); // unit u1 controlled_by 'player' (not 'p1')
  await request(app)
    .post('/api/session/device-event')
    .send({
      session_id: sid,
      event: {
        kind: 'decision',
        type: 'forged',
        playerId: 'p1',
        tier: 'public',
        actor_id: 'u1',
        action_type: 'attack',
        result: 'hit',
        damage_dealt: 9999,
        first_blood: true,
      },
    });
  const replay = await request(app).get(`/api/session/${sid}/replay`);
  const injected = replay.body.events.find((e) => e.type === 'forged');
  assert.ok(injected, 'event ingested');
  assert.equal(injected.action_type, undefined, 'forged action_type stripped');
  assert.equal(injected.damage_dealt, undefined, 'forged damage_dealt stripped');
  assert.equal(injected.result, undefined, 'forged result stripped');
  // client actor_id is not trusted; p1 controls no unit here, so none is bound.
  assert.equal(injected.actor_id, undefined, 'client actor_id not honored (no roster match)');
});

test('device-event wire: a consented decision flag reaches conviction (server actor binding)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // unit controlled_by matches the device playerId -> server binds actor_id.
  const startRes = await request(app)
    .post('/api/session/start')
    .send({
      units: [{ id: 'hero', controlled_by: 'p1', hp: 10, max_hp: 10, position: { x: 1, y: 1 } }],
    });
  const sid = startRes.body.session_id;

  const dec = await request(app)
    .post('/api/session/device-event')
    .send({
      session_id: sid,
      event: {
        kind: 'decision',
        type: 'moral_choice',
        playerId: 'p1',
        tier: 'public',
        flags: { sacrifice: true },
      },
    });
  assert.equal(dec.body.accepted, true);

  const vc = await request(app).get(`/api/session/${sid}/vc`);
  assert.equal(vc.status, 200);
  const axis =
    vc.body.per_actor && vc.body.per_actor.hero && vc.body.per_actor.hero.conviction_axis;
  assert.ok(axis, 'hero conviction_axis present');
  assert.ok(
    axis.morality > 50,
    `sacrifice flag lifted morality above baseline (got ${axis.morality})`,
  );
});
