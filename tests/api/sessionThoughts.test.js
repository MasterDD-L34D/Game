// P4 Thought Cabinet — integration test on /api/session/:id/thoughts.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('GET /:id/thoughts returns per_actor unlocked + newly arrays', async (t) => {
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

  const res = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(res.status, 200);
  assert.equal(res.body.session_id, sid);
  assert.ok(res.body.per_actor && typeof res.body.per_actor === 'object');
  for (const [uid, payload] of Object.entries(res.body.per_actor)) {
    assert.ok(Array.isArray(payload.unlocked), `${uid} unlocked array`);
    assert.ok(Array.isArray(payload.newly), `${uid} newly array`);
  }
});

test('GET /:id/thoughts cumulative — second call has newly=[] if axes static', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  const first = await request(app).get(`/api/session/${sid}/thoughts`);
  const second = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(second.status, 200);
  for (const uid of Object.keys(second.body.per_actor || {})) {
    // newly must be subset-empty on second call (axes unchanged → nothing new)
    assert.equal(
      second.body.per_actor[uid].newly.length,
      0,
      `${uid} second call must have newly=[]`,
    );
    // unlocked total stays the same
    assert.equal(
      second.body.per_actor[uid].unlocked.length,
      first.body.per_actor[uid].unlocked.length,
    );
  }
});

test('GET /:id/thoughts on unknown session → 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get('/api/session/not-a-real-id/thoughts');
  assert.equal(res.status, 404);
});

test('POST /end clears thoughtsStore entry (no memory leak — Codex #1702 P2)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;
  // Populate thoughtsStore
  const pre = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(pre.status, 200);
  // End session (triggers thoughtsStore.delete)
  const endRes = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(endRes.status, 200);
  // Post-end: session gone → /thoughts 404 (not stale 200 from cache)
  const post = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(post.status, 404, 'thoughtsStore entry released with session');
});

// ─────────────────────────────────────────────────────────
// Phase 2 — research + forget + tick route integration
// ─────────────────────────────────────────────────────────

async function bootstrap(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;
  return { sid, scenario };
}

function anyUnlockedActor(perActor) {
  for (const [uid, entry] of Object.entries(perActor || {})) {
    if (Array.isArray(entry.unlocked) && entry.unlocked.length > 0) {
      return { unit_id: uid, thought_id: entry.unlocked[0], entry };
    }
  }
  return null;
}

test('GET /:id/thoughts includes Phase 2 keys (researching, internalized, slots, passives)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid } = await bootstrap(app);
  const res = await request(app).get(`/api/session/${sid}/thoughts`);
  assert.equal(res.status, 200);
  for (const [uid, entry] of Object.entries(res.body.per_actor || {})) {
    assert.ok(Array.isArray(entry.unlocked), `${uid} unlocked array`);
    assert.ok(Array.isArray(entry.newly), `${uid} newly array`);
    assert.ok(Array.isArray(entry.researching), `${uid} researching array`);
    assert.ok(Array.isArray(entry.internalized), `${uid} internalized array`);
    assert.equal(typeof entry.slots_max, 'number');
    assert.equal(typeof entry.slots_used, 'number');
    assert.equal(typeof entry.passive_bonus, 'object');
    assert.equal(typeof entry.passive_cost, 'object');
  }
});

test('POST /:id/thoughts/research — happy path on an unlocked thought', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid } = await bootstrap(app);
  const snap = await request(app).get(`/api/session/${sid}/thoughts`);
  const target = anyUnlockedActor(snap.body.per_actor);
  if (!target) {
    // Tutorial 01 does not surface unlocked thoughts for every actor. Skip.
    t.skip('no unlocked thoughts in tutorial 01 seed state');
    return;
  }
  const res = await request(app)
    .post(`/api/session/${sid}/thoughts/research`)
    .send({ unit_id: target.unit_id, thought_id: target.thought_id });
  assert.equal(res.status, 200);
  assert.equal(res.body.unit_id, target.unit_id);
  assert.equal(res.body.thought_id, target.thought_id);
  assert.ok(res.body.cost_total >= 1);
  assert.equal(res.body.cabinet.slots_used, 1);
  assert.equal(res.body.cabinet.researching[0].id, target.thought_id);
});

test('POST /:id/thoughts/research — 400 when unit_id or thought_id missing', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid } = await bootstrap(app);
  const r1 = await request(app).post(`/api/session/${sid}/thoughts/research`).send({});
  assert.equal(r1.status, 400);
  const r2 = await request(app)
    .post(`/api/session/${sid}/thoughts/research`)
    .send({ unit_id: 'x' });
  assert.equal(r2.status, 400);
});

test('POST /:id/thoughts/research — 409 on not_unlocked', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid } = await bootstrap(app);
  const snap = await request(app).get(`/api/session/${sid}/thoughts`);
  const uid = Object.keys(snap.body.per_actor || {})[0];
  assert.ok(uid, 'at least one actor');
  const res = await request(app)
    .post(`/api/session/${sid}/thoughts/research`)
    .send({ unit_id: uid, thought_id: 'bogus_missing_id' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'thought_not_found');
});

test('POST /:id/thoughts/tick — advances researching + promotes when cost hits 0', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid } = await bootstrap(app);
  const snap = await request(app).get(`/api/session/${sid}/thoughts`);
  const target = anyUnlockedActor(snap.body.per_actor);
  if (!target) {
    t.skip('no unlocked thoughts in tutorial 01 seed state');
    return;
  }
  // Start research for the unlocked thought
  const start = await request(app)
    .post(`/api/session/${sid}/thoughts/research`)
    .send({ unit_id: target.unit_id, thought_id: target.thought_id });
  assert.equal(start.status, 200);
  const costTotal = start.body.cost_total;
  // Tick enough to internalize.
  const tick = await request(app)
    .post(`/api/session/${sid}/thoughts/tick`)
    .send({ delta: costTotal });
  assert.equal(tick.status, 200);
  const actor = tick.body.per_actor[target.unit_id];
  assert.ok(actor.promoted.includes(target.thought_id));
  assert.ok(actor.internalized.includes(target.thought_id));
  assert.equal(actor.researching.length, 0);
});

test('POST /:id/thoughts/forget — frees slot after internalization', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid } = await bootstrap(app);
  const snap = await request(app).get(`/api/session/${sid}/thoughts`);
  const target = anyUnlockedActor(snap.body.per_actor);
  if (!target) {
    t.skip('no unlocked thoughts in tutorial 01 seed state');
    return;
  }
  const start = await request(app)
    .post(`/api/session/${sid}/thoughts/research`)
    .send({ unit_id: target.unit_id, thought_id: target.thought_id });
  await request(app)
    .post(`/api/session/${sid}/thoughts/tick`)
    .send({ delta: start.body.cost_total });
  const forget = await request(app)
    .post(`/api/session/${sid}/thoughts/forget`)
    .send({ unit_id: target.unit_id, thought_id: target.thought_id });
  assert.equal(forget.status, 200);
  assert.equal(forget.body.freed_from, 'internalized');
  assert.equal(forget.body.cabinet.slots_used, 0);
});

test('POST /:id/thoughts/forget — 409 when thought is not active (not researching/internalized)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid } = await bootstrap(app);
  const snap = await request(app).get(`/api/session/${sid}/thoughts`);
  const uid = Object.keys(snap.body.per_actor || {})[0];
  assert.ok(uid);
  const res = await request(app)
    .post(`/api/session/${sid}/thoughts/forget`)
    .send({ unit_id: uid, thought_id: 'bogus_id' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'not_active');
});
