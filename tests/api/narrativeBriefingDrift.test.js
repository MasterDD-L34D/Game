// Bundle B.1 — Citizen Sleeper drift briefing endpoint integration test.
//
// Endpoint: POST /api/v1/narrative/briefing/drift
// Gating:
//   - mbti_axes.T_F.value > 0.65 → variant 'tech'
//   - mbti_axes.T_F.value < 0.35 → variant 'empatic'
//   - else (or missing snapshot) → variant 'neutral'
//
// Pack source: data/core/narrative/briefings/drift_briefings.yaml (3 scenarios).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function makeSnapshot(tfValue) {
  return {
    session_id: 'test-session',
    per_actor: {
      u_alpha: {
        mbti_axes: {
          T_F: { value: tfValue, coverage: 'full' },
        },
      },
    },
  };
}

test('POST /api/v1/narrative/briefing/drift — T_F > 0.65 → tech variant', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/v1/narrative/briefing/drift')
    .send({
      session_id: 'sess-1',
      scenario_id: 'enc_tutorial_01',
      vc_snapshot: makeSnapshot(0.8),
    });
  assert.equal(r.status, 200);
  assert.equal(r.body.variant, 'tech');
  assert.equal(r.body.scenario_id, 'enc_tutorial_01');
  assert.equal(r.body.session_id, 'sess-1');
  assert.equal(r.body.source, 'drift');
  assert.match(r.body.text, /Rapporto sintetico|Range medio|sopravento/i);
});

test('POST /api/v1/narrative/briefing/drift — T_F < 0.35 → empatic variant', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/v1/narrative/briefing/drift')
    .send({
      session_id: 'sess-2',
      scenario_id: 'enc_tutorial_02',
      vc_snapshot: makeSnapshot(0.15),
    });
  assert.equal(r.status, 200);
  assert.equal(r.body.variant, 'empatic');
  assert.match(r.body.text, /anziano|paura|spera/i);
});

test('POST /api/v1/narrative/briefing/drift — T_F mid-range → neutral variant', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/v1/narrative/briefing/drift')
    .send({
      session_id: 'sess-3',
      scenario_id: 'enc_tutorial_03',
      vc_snapshot: makeSnapshot(0.5),
    });
  assert.equal(r.status, 200);
  assert.equal(r.body.variant, 'neutral');
  assert.match(r.body.text, /caverna|fumarole|combo/i);
});

test('POST /api/v1/narrative/briefing/drift — missing vc_snapshot → neutral fallback', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app).post('/api/v1/narrative/briefing/drift').send({
    scenario_id: 'enc_tutorial_01',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.variant, 'neutral');
  assert.equal(r.body.session_id, null);
  assert.ok(r.body.text.length > 0);
});

test('POST /api/v1/narrative/briefing/drift — missing scenario_id → 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/v1/narrative/briefing/drift')
    .send({ session_id: 'sess-x' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /scenario_id/);
});

test('POST /api/v1/narrative/briefing/drift — unknown scenario → 404 (no fallback)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/v1/narrative/briefing/drift')
    .send({
      scenario_id: 'enc_unknown_99',
      vc_snapshot: makeSnapshot(0.5),
    });
  assert.equal(r.status, 404);
  assert.match(r.body.error, /no briefing pack/i);
});

test('POST /api/v1/narrative/briefing/drift — malformed vc_snapshot (array) → 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const r = await request(app)
    .post('/api/v1/narrative/briefing/drift')
    .send({
      scenario_id: 'enc_tutorial_01',
      vc_snapshot: [1, 2, 3],
    });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /vc_snapshot/);
});
