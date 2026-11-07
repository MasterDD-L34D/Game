// 2026-05-30 P4 debrief wire — GET /api/session/:id/debrief.
//
// Non-destructive sibling of POST /api/session/end: returns the same
// buildDebriefSummary payload (ennea_voices / inner_voices / conviction_badges
// / ennea archetypes / narrative_event / mating_eligibles) WITHOUT deleting the
// session. A coop host fetches it to attach `debrief_payload` to /coop/combat/end
// while keeping its own session alive for the VC block + promotion accept.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200);
  return startRes.body.session_id;
}

test('GET /session/:id/debrief returns a debrief summary object', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app);
  const res = await request(app).get(`/api/session/${sid}/debrief`);

  assert.equal(res.status, 200);
  assert.ok('debrief' in res.body, 'response carries a debrief key');
  if (res.body.debrief !== null) {
    assert.equal(typeof res.body.debrief, 'object', 'debrief is an object (or null)');
  }
});

test('GET /session/:id/debrief is NON-destructive — session survives', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app);

  const first = await request(app).get(`/api/session/${sid}/debrief`);
  assert.equal(first.status, 200);

  // The whole point: the session must still resolve afterward, so the host's
  // VC block + promotion-accept buttons keep working. A destructive /end would
  // have deleted it → these would 404.
  const vc = await request(app).get(`/api/session/${sid}/vc`);
  assert.equal(vc.status, 200, 'session still alive after debrief fetch (VC resolves)');

  const second = await request(app).get(`/api/session/${sid}/debrief`);
  assert.equal(second.status, 200, 'debrief fetch is idempotent');
});

test('GET /session/:id/debrief exposes vc_per_actor (#2850 S3 telemetry harness)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app);
  const res = await request(app).get(`/api/session/${sid}/debrief`);

  assert.equal(res.status, 200);
  assert.ok('vc_per_actor' in res.body, 'response carries a vc_per_actor key');
  // null OR an object keyed by unit id; each entry carries aggregate_indices.
  if (res.body.vc_per_actor !== null) {
    assert.equal(typeof res.body.vc_per_actor, 'object');
    for (const entry of Object.values(res.body.vc_per_actor)) {
      assert.ok('aggregate_indices' in entry, 'per_actor entry carries aggregate_indices');
    }
  }
});

test('GET /session/:id/debrief echoes the ?outcome gate', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app);
  const res = await request(app).get(`/api/session/${sid}/debrief?outcome=victory`);

  assert.equal(res.status, 200);
  assert.equal(res.body.outcome, 'victory');
});

test('GET /session/:id/debrief on an unknown session → 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/session/does-not-exist/debrief');
  assert.equal(res.status, 404);
});
