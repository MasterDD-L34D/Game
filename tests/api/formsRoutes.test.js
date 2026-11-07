// M12 Phase A — Forms REST route contract tests.
// ADR-2026-04-23-m12-phase-a.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/v1/forms/registry lists all MBTI forms', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/forms/registry').expect(200);
    assert.ok(Array.isArray(res.body.forms));
    assert.ok(res.body.forms.length >= 16);
    const intj = res.body.forms.find((f) => f.id === 'INTJ');
    assert.ok(intj, 'INTJ present');
    assert.equal(intj.label, 'Stratega');
    assert.equal(intj.temperament, 'NT');
  } finally {
    await close();
  }
});

test('GET /api/forms/:id returns single form detail', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/forms/INTJ').expect(200);
    assert.equal(res.body.id, 'INTJ');
    assert.ok(res.body.axes);
    assert.ok(Array.isArray(res.body.job_affinities));
  } finally {
    await close();
  }
});

test('GET /api/forms/:id returns 404 for unknown id', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).get('/api/forms/ZZZZ').expect(404);
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/evaluate returns eligibility report', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/forms/evaluate')
      .send({
        unit: { id: 'u1', pe: 10, current_form_id: null },
        vc_snapshot: {
          mbti_axes: {
            E_I: { value: 0.75 },
            S_N: { value: 0.35 },
            T_F: { value: 0.8 },
            J_P: { value: 0.75 },
          },
        },
        target_form_id: 'INTJ',
        current_round: 0,
      })
      .expect(200);
    assert.equal(res.body.eligible, true);
    assert.equal(res.body.target_form_id, 'INTJ');
    assert.equal(res.body.pe_cost, 8);
    assert.equal(res.body.pe_available, 10);
  } finally {
    await close();
  }
});

test('POST /api/forms/evaluate rejects missing unit', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/forms/evaluate')
      .send({ target_form_id: 'INTJ' })
      .expect(400);
    assert.match(res.body.error, /unit/);
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/options returns scored sorted list', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/forms/options')
      .send({
        unit: { id: 'u1', pe: 20, current_form_id: null },
        vc_snapshot: {
          mbti_axes: {
            E_I: { value: 0.75 },
            S_N: { value: 0.35 },
            T_F: { value: 0.8 },
            J_P: { value: 0.75 },
          },
        },
      })
      .expect(200);
    assert.ok(Array.isArray(res.body.options));
    assert.ok(res.body.options.length >= 16);
    assert.equal(res.body.options[0].target_form_id, 'INTJ');
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/evolve mutates + returns delta', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/forms/evolve')
      .send({
        unit: { id: 'u1', pe: 10, current_form_id: null, evolve_count: 0 },
        vc_snapshot: {
          mbti_axes: {
            E_I: { value: 0.75 },
            S_N: { value: 0.35 },
            T_F: { value: 0.8 },
            J_P: { value: 0.75 },
          },
        },
        target_form_id: 'INTJ',
        current_round: 3,
      })
      .expect(200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.unit.current_form_id, 'INTJ');
    assert.equal(res.body.unit.pe, 2);
    assert.equal(res.body.delta.pe_spent, 8);
    assert.equal(res.body.delta.new_form_id, 'INTJ');
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/evolve returns 409 when ineligible', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/forms/evolve')
      .send({
        unit: { id: 'u1', pe: 2, current_form_id: null },
        vc_snapshot: {
          mbti_axes: {
            E_I: { value: 0.75 },
            S_N: { value: 0.35 },
            T_F: { value: 0.8 },
            J_P: { value: 0.75 },
          },
        },
        target_form_id: 'INTJ',
      })
      .expect(409);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.reason, 'insufficient_pe');
  } finally {
    await close();
  }
});

test('POST /api/v1/forms/evolve 400 on missing target_form_id', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app)
      .post('/api/v1/forms/evolve')
      .send({ unit: { id: 'u1', pe: 10 } })
      .expect(400);
  } finally {
    await close();
  }
});
