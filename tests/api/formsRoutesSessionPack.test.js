// M12 Phase B — Forms session + pack REST integration tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function vcAxes({ E_I = 0.5, S_N = 0.5, T_F = 0.5, J_P = 0.5 } = {}) {
  return {
    mbti_axes: {
      E_I: { value: E_I },
      S_N: { value: S_N },
      T_F: { value: T_F },
      J_P: { value: J_P },
    },
  };
}

test('GET /api/v1/forms/session/:sid returns empty list initially', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/forms/session/sess_new').expect(200);
    assert.equal(res.body.session_id, 'sess_new');
    assert.deepEqual(res.body.units, []);
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/session/:sid/:uid/seed + GET retrieves state', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app)
      .post('/api/v1/forms/session/sess1/u1/seed')
      .send({ pe: 12, current_form_id: null })
      .expect(201);
    const res = await request(app).get('/api/v1/forms/session/sess1/u1').expect(200);
    assert.equal(res.body.id, 'u1');
    assert.equal(res.body.pe, 12);
    assert.equal(res.body.current_form_id, null);
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/session/:sid/:uid/evolve persists mutation', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/v1/forms/session/sess2/u1/seed').send({ pe: 10 }).expect(201);
    const evo = await request(app)
      .post('/api/v1/forms/session/sess2/u1/evolve')
      .send({
        vc_snapshot: vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
        target_form_id: 'INTJ',
        current_round: 2,
      })
      .expect(200);
    assert.equal(evo.body.ok, true);
    assert.equal(evo.body.state.current_form_id, 'INTJ');
    assert.equal(evo.body.state.pe, 2);
    assert.equal(evo.body.state.evolve_count, 1);
    // Verify persisted via GET.
    const after = await request(app).get('/api/v1/forms/session/sess2/u1').expect(200);
    assert.equal(after.body.current_form_id, 'INTJ');
    assert.equal(after.body.pe, 2);
  } finally {
    await close();
  }
});

test('POST .../evolve auto-seeds when unit state missing + seed_pe provided', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const evo = await request(app)
      .post('/api/v1/forms/session/sess3/u_new/evolve')
      .send({
        vc_snapshot: vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
        target_form_id: 'INTJ',
        current_round: 2,
        seed_pe: 15,
      })
      .expect(200);
    assert.equal(evo.body.ok, true);
    assert.equal(evo.body.state.pe, 7);
  } finally {
    await close();
  }
});

test('POST .../evolve 409 when ineligible + persists nothing', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/v1/forms/session/sess4/u1/seed').send({ pe: 2 }).expect(201);
    const evo = await request(app)
      .post('/api/v1/forms/session/sess4/u1/evolve')
      .send({
        vc_snapshot: vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
        target_form_id: 'INTJ',
      })
      .expect(409);
    assert.equal(evo.body.reason, 'insufficient_pe');
    const after = await request(app).get('/api/v1/forms/session/sess4/u1').expect(200);
    // Unit state unchanged.
    assert.equal(after.body.pe, 2);
    assert.equal(after.body.current_form_id, null);
    assert.equal(after.body.evolve_count, 0);
  } finally {
    await close();
  }
});

test('DELETE /api/v1/forms/session/:sid clears all unit states', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/v1/forms/session/sess5/u1/seed').send({ pe: 5 }).expect(201);
    await request(app).post('/api/v1/forms/session/sess5/u2/seed').send({ pe: 7 }).expect(201);
    const del = await request(app).delete('/api/v1/forms/session/sess5').expect(200);
    assert.equal(del.body.removed, 2);
    const after = await request(app).get('/api/v1/forms/session/sess5').expect(200);
    assert.deepEqual(after.body.units, []);
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/pack/roll returns combo + cost with seed', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/forms/pack/roll')
      .send({ form_id: 'INTJ', job_id: 'vanguard', seed: 42 })
      .expect(200);
    assert.equal(res.body.ok, true);
    assert.ok(typeof res.body.dice.d20 === 'number');
    assert.ok(Array.isArray(res.body.combo) || res.body.requires_choice);
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/pack/roll deterministic on same seed', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const a = await request(app)
      .post('/api/v1/forms/pack/roll')
      .send({ form_id: 'INTJ', job_id: 'vanguard', seed: 12345 })
      .expect(200);
    const b = await request(app)
      .post('/api/v1/forms/pack/roll')
      .send({ form_id: 'INTJ', job_id: 'vanguard', seed: 12345 })
      .expect(200);
    assert.deepEqual(a.body, b.body);
  } finally {
    await close();
  }
});

test('GET /api/v1/forms/pack/costs exposes pi_shop.costs + caps + budget_curve', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/forms/pack/costs').expect(200);
    assert.ok(res.body.costs);
    assert.equal(res.body.costs.trait_T1, 3);
    assert.equal(res.body.costs.sigillo_forma, 2);
    assert.ok(res.body.budget_curve.baseline);
  } finally {
    await close();
  }
});

test("Session isolation: sess A and sess B don't share state", async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/v1/forms/session/iso_a/u1/seed').send({ pe: 100 }).expect(201);
    await request(app).post('/api/v1/forms/session/iso_b/u1/seed').send({ pe: 5 }).expect(201);
    const a = await request(app).get('/api/v1/forms/session/iso_a/u1').expect(200);
    const b = await request(app).get('/api/v1/forms/session/iso_b/u1').expect(200);
    assert.equal(a.body.pe, 100);
    assert.equal(b.body.pe, 5);
  } finally {
    await close();
  }
});
