// tests/api/sessionVcDebriefPayload.test.js — TKT-ORPHAN-VCSNAP wire.
//
// vcSnapshotToDebriefPayload (services/coop/vcSnapshotToDebriefPayload.js) was a
// runtime orphan: the Game-side serializer that flattens a vcScoring snapshot to
// the Godot-parity debrief_payload (sentience_tier + conviction_axis +
// ennea_archetype) had ZERO callers — debrief_payload reached phones only when a
// host hand-built it client-side. These tests pin the server-side wire: the
// session /end response and the GET /:id/vc response now carry a server-derived
// `debrief_payload` so the flat 3-layer profile is reachable without the client
// re-deriving it (PR #276 cross-stack contract).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const {
  vcSnapshotToDebriefPayload,
} = require('../../apps/backend/services/coop/vcSnapshotToDebriefPayload');

async function startSession(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  return { sid: startRes.body.session_id };
}

test('VCSNAP wire: /end response carries server-derived debrief_payload', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(res.status, 200, `end ok: ${JSON.stringify(res.body).slice(0, 200)}`);

  assert.ok(res.body.debrief_payload, 'debrief_payload present in /end response');
  assert.ok(
    res.body.debrief_payload.per_actor && typeof res.body.debrief_payload.per_actor === 'object',
    'debrief_payload.per_actor is an object',
  );
  // Server computed it from the same snapshot it returned -> exact parity.
  assert.deepEqual(
    res.body.debrief_payload,
    vcSnapshotToDebriefPayload(res.body.vc_snapshot),
    'debrief_payload == serializer(vc_snapshot)',
  );
});

test('VCSNAP wire: GET /:id/vc carries server-derived debrief_payload', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).get(`/api/session/${sid}/vc`);
  assert.equal(res.status, 200, `vc ok: ${JSON.stringify(res.body).slice(0, 200)}`);

  assert.ok(res.body.debrief_payload, 'debrief_payload present in /vc response');
  // Serializer reads only per_actor, so re-deriving from the response (which has
  // the added debrief_payload sibling) must match.
  assert.deepEqual(res.body.debrief_payload, vcSnapshotToDebriefPayload(res.body));
});
