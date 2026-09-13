// TKT-M14-B Phase C — Session conviction endpoints integration tests.
//
// Covers:
//   - GET /:id/conviction/eligible (filter by axis_threshold + encounter scope)
//   - POST /:id/conviction/decide (apply delta + return updated axis + consequence)
//   - vcSnapshot per_actor[uid].conviction_axis surface preserved (Phase A regression)

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: [
        {
          id: 'p1',
          species: 'velox',
          job: 'skirmisher',
          hp: 10,
          ap: 2,
          attack_range: 2,
          initiative: 14,
          position: { x: 2, y: 2 },
          controlled_by: 'player',
        },
        {
          id: 'sis',
          species: 'carapax',
          job: 'vanguard',
          hp: 10,
          ap: 2,
          attack_range: 1,
          initiative: 10,
          position: { x: 3, y: 2 },
          controlled_by: 'sistema',
        },
      ],
    })
    .expect(200);
  return res.body.session_id;
}

test('GET /:id/conviction/eligible returns branches for default player actor (neutral 50/50/50)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    const res = await request(app).get(`/api/session/${sessionId}/conviction/eligible`).expect(200);
    assert.equal(res.body.actor_id, 'p1');
    assert.ok(res.body.conviction_axis);
    assert.equal(res.body.conviction_axis.utility, 50);
    assert.ok(Array.isArray(res.body.branches));
    // Neutral 50/50/50: prisoner_choice + resource_split + skiv_drift_choice eligible (3 unconditional).
    const ids = res.body.branches.map((b) => b.id);
    assert.ok(ids.includes('conv_branch_prisoner_choice'));
    assert.ok(!ids.includes('conv_branch_betrayal_offer'), 'utility threshold not met');
    assert.ok(!ids.includes('conv_branch_pack_unity'), 'morality threshold not met');
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('GET /:id/conviction/eligible 404 for unknown session', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).get('/api/session/nonexistent_id/conviction/eligible').expect(404);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('POST /:id/conviction/decide applies delta + returns updated axis + consequence', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    const res = await request(app)
      .post(`/api/session/${sessionId}/conviction/decide`)
      .send({ branch_id: 'conv_branch_prisoner_choice', choice_id: 'liberate' })
      .expect(200);
    assert.equal(res.body.actor_id, 'p1');
    assert.equal(res.body.branch_id, 'conv_branch_prisoner_choice');
    assert.equal(res.body.choice_id, 'liberate');
    assert.equal(res.body.delta_applied.liberty, 12);
    // 50 + 12 = 62
    assert.equal(res.body.conviction_axis.liberty, 62);
    // 50 - 5 = 45 (utility)
    assert.equal(res.body.conviction_axis.utility, 45);
    // 50 + 5 = 55 (morality)
    assert.equal(res.body.conviction_axis.morality, 55);
    assert.ok(res.body.consequence);
    assert.ok(res.body.consequence.includes('sabbia') || res.body.consequence.length > 0);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('POST /:id/conviction/decide round-trip: state persists between decisions', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    // Decision 1: liberate (lib +12, util -5, mor +5) → 45/62/55
    await request(app)
      .post(`/api/session/${sessionId}/conviction/decide`)
      .send({ branch_id: 'conv_branch_prisoner_choice', choice_id: 'liberate' })
      .expect(200);
    // Decision 2: split_half (lib +5, util -3, mor +6) → 42/67/61
    const res2 = await request(app)
      .post(`/api/session/${sessionId}/conviction/decide`)
      .send({ branch_id: 'conv_branch_resource_split', choice_id: 'split_half' })
      .expect(200);
    assert.equal(res2.body.conviction_axis.utility, 42);
    assert.equal(res2.body.conviction_axis.liberty, 67);
    assert.equal(res2.body.conviction_axis.morality, 61);
    assert.equal(res2.body.conviction_axis.events_classified, 2);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('POST /:id/conviction/decide 404 for invalid branch_id', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    await request(app)
      .post(`/api/session/${sessionId}/conviction/decide`)
      .send({ branch_id: 'nonexistent_branch', choice_id: 'foo' })
      .expect(404);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('POST /:id/conviction/decide 404 for invalid choice_id', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    await request(app)
      .post(`/api/session/${sessionId}/conviction/decide`)
      .send({ branch_id: 'conv_branch_prisoner_choice', choice_id: 'invalid_choice' })
      .expect(404);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('POST /:id/conviction/decide 400 for missing body fields', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    await request(app).post(`/api/session/${sessionId}/conviction/decide`).send({}).expect(400);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('GET /:id/vc still includes conviction_axis (Phase A regression preserved)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    const res = await request(app).get(`/api/session/${sessionId}/vc`).expect(200);
    assert.ok(res.body.per_actor);
    assert.ok(res.body.per_actor.p1);
    assert.ok(res.body.per_actor.p1.conviction_axis, 'conviction_axis missing in vcSnapshot');
    assert.equal(res.body.per_actor.p1.conviction_axis.utility, 50);
    assert.equal(res.body.per_actor.p1.conviction_axis.liberty, 50);
    assert.equal(res.body.per_actor.p1.conviction_axis.morality, 50);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});

test('Decision flow surfaces post-decide via eligibility threshold cross-over', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sessionId = await startSession(app);
    // baseline 50/50/50 — betrayal_offer NOT eligible (needs util>=60 + lib>=40)
    let res = await request(app).get(`/api/session/${sessionId}/conviction/eligible`).expect(200);
    assert.ok(!res.body.branches.map((b) => b.id).includes('conv_branch_betrayal_offer'));
    // Apply interrogate (util +10, lib -3, mor -2) → 60/47/48
    await request(app)
      .post(`/api/session/${sessionId}/conviction/decide`)
      .send({ branch_id: 'conv_branch_prisoner_choice', choice_id: 'interrogate' })
      .expect(200);
    // Now util=60, lib=47 → betrayal_offer eligible (util>=60 + lib>=40)
    res = await request(app).get(`/api/session/${sessionId}/conviction/eligible`).expect(200);
    const ids = res.body.branches.map((b) => b.id);
    assert.ok(
      ids.includes('conv_branch_betrayal_offer'),
      `betrayal_offer should be eligible post util=60 lib=47, got ${JSON.stringify(ids)}`,
    );
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
});
