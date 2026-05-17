// Skiv Goal 3 — Thoughts ritual candidates endpoint tests.
//
// GET /api/session/:id/thoughts/candidates?unit_id=&top=N
// - returns ranked list of unlocked thoughts (not internalized, not researching)
// - top-N filter
// - vcSnapshot ranking (match strength × tier weight)
// - voice_preview pulled from inner_voices.yaml when axis+direction match

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function bootstrapSession() {
  const { app, close } = createApp({ databasePath: null });
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  return {
    app,
    close,
    sid: startRes.body.session_id,
    units: scenario.body.units,
  };
}

test('GET /:id/thoughts/candidates returns ranked candidates list', async (t) => {
  const ctx = await bootstrapSession();
  t.after(async () => {
    if (typeof ctx.close === 'function') await ctx.close().catch(() => {});
  });
  // Pre-warm: hit /thoughts so axes evaluate and unlock entries.
  await request(ctx.app).get(`/api/session/${ctx.sid}/thoughts`);
  const uid = ctx.units[0].id;
  const res = await request(ctx.app).get(
    `/api/session/${ctx.sid}/thoughts/candidates?unit_id=${encodeURIComponent(uid)}&top=3`,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.session_id, ctx.sid);
  assert.equal(res.body.unit_id, uid);
  assert.ok(Array.isArray(res.body.candidates), 'candidates must be array');
  assert.equal(res.body.top, 3);
  // Each candidate must carry the contract surface fields.
  for (const c of res.body.candidates) {
    assert.ok(c.thought_id, 'candidate has thought_id');
    assert.ok(['E_I', 'S_N', 'J_P', 'T_F'].includes(c.axis), 'candidate has axis');
    assert.ok(['low', 'high'].includes(c.direction), 'candidate has direction');
    assert.ok(Number.isFinite(c.tier), 'candidate has tier');
    assert.ok(Number.isFinite(c.score), 'candidate has score');
    assert.ok(typeof c.title_it === 'string', 'candidate has title_it');
    // voice_preview is optional but if present, must be an object.
    if (c.voice_preview) {
      assert.ok(typeof c.voice_preview === 'object');
    }
  }
});

test('GET /:id/thoughts/candidates respects top-N filter (top=1)', async (t) => {
  const ctx = await bootstrapSession();
  t.after(async () => {
    if (typeof ctx.close === 'function') await ctx.close().catch(() => {});
  });
  await request(ctx.app).get(`/api/session/${ctx.sid}/thoughts`);
  const uid = ctx.units[0].id;
  const resTop1 = await request(ctx.app).get(
    `/api/session/${ctx.sid}/thoughts/candidates?unit_id=${encodeURIComponent(uid)}&top=1`,
  );
  assert.equal(resTop1.status, 200);
  assert.ok(resTop1.body.candidates.length <= 1, 'top=1 yields ≤1 result');
  // Default top defaults to 3 (omitted query).
  const resDefault = await request(ctx.app).get(
    `/api/session/${ctx.sid}/thoughts/candidates?unit_id=${encodeURIComponent(uid)}`,
  );
  assert.equal(resDefault.status, 200);
  assert.equal(resDefault.body.top, 3);
  assert.ok(resDefault.body.candidates.length <= 3);
});

test('GET /:id/thoughts/candidates ranks by score desc (highest match first)', async (t) => {
  const ctx = await bootstrapSession();
  t.after(async () => {
    if (typeof ctx.close === 'function') await ctx.close().catch(() => {});
  });
  await request(ctx.app).get(`/api/session/${ctx.sid}/thoughts`);
  const uid = ctx.units[0].id;
  const res = await request(ctx.app).get(
    `/api/session/${ctx.sid}/thoughts/candidates?unit_id=${encodeURIComponent(uid)}&top=5`,
  );
  assert.equal(res.status, 200);
  // Score must be monotonically non-increasing across candidates.
  const scores = res.body.candidates.map((c) => c.score);
  for (let i = 1; i < scores.length; i += 1) {
    assert.ok(
      scores[i] <= scores[i - 1],
      `score[${i}]=${scores[i]} must be ≤ score[${i - 1}]=${scores[i - 1]}`,
    );
  }
});

test('POST /:id/thoughts/research after candidates → researching slot occupied (irreversible until forget)', async (t) => {
  const ctx = await bootstrapSession();
  t.after(async () => {
    if (typeof ctx.close === 'function') await ctx.close().catch(() => {});
  });
  await request(ctx.app).get(`/api/session/${ctx.sid}/thoughts`);
  const uid = ctx.units[0].id;
  const candRes = await request(ctx.app).get(
    `/api/session/${ctx.sid}/thoughts/candidates?unit_id=${encodeURIComponent(uid)}&top=3`,
  );
  if (candRes.body.candidates.length === 0) {
    // No candidates available for this scenario — early-out (still valid).
    return;
  }
  const pickId = candRes.body.candidates[0].thought_id;
  const pickRes = await request(ctx.app)
    .post(`/api/session/${ctx.sid}/thoughts/research`)
    .send({ unit_id: uid, thought_id: pickId, mode: 'rounds' });
  assert.equal(pickRes.status, 200);
  assert.equal(pickRes.body.thought_id, pickId);
  assert.equal(pickRes.body.mode, 'rounds');
  // Second pick of same thought must fail (already_researching).
  const dupRes = await request(ctx.app)
    .post(`/api/session/${ctx.sid}/thoughts/research`)
    .send({ unit_id: uid, thought_id: pickId, mode: 'rounds' });
  assert.equal(dupRes.status, 409);
  assert.equal(dupRes.body.error, 'already_researching');
  // Candidates no longer include this thought_id.
  const candRes2 = await request(ctx.app).get(
    `/api/session/${ctx.sid}/thoughts/candidates?unit_id=${encodeURIComponent(uid)}&top=10`,
  );
  const stillPresent = candRes2.body.candidates.some((c) => c.thought_id === pickId);
  assert.equal(stillPresent, false, 'picked thought removed from eligible pool');
});

test('GET /:id/thoughts/candidates without unit_id → 400', async (t) => {
  const ctx = await bootstrapSession();
  t.after(async () => {
    if (typeof ctx.close === 'function') await ctx.close().catch(() => {});
  });
  const res = await request(ctx.app).get(`/api/session/${ctx.sid}/thoughts/candidates`);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /unit_id/);
});

test('GET /:id/thoughts/candidates on unknown session → 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).get(
    '/api/session/not-a-real-id/thoughts/candidates?unit_id=foo&top=3',
  );
  assert.equal(res.status, 404);
});
