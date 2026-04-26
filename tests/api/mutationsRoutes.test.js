// M14 Path A — Mutation REST routes contract tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/v1/mutations/registry returns 30 mutations + indexes', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/mutations/registry').expect(200);
    assert.equal(res.body.count, 30);
    assert.ok(Array.isArray(res.body.mutations));
    assert.equal(res.body.mutations.length, 30);
    assert.equal(res.body.schema_version, '0.1.0');
    assert.ok(res.body.by_category && typeof res.body.by_category === 'object');
    assert.ok(res.body.by_tier && typeof res.body.by_tier === 'object');
    // Spot-check entry shape.
    const sample = res.body.mutations.find((m) => m.id === 'artigli_freeze_to_glacier');
    assert.ok(sample, 'artigli_freeze_to_glacier present');
    assert.equal(sample.category, 'physiological');
    assert.equal(sample.tier, 2);
  } finally {
    await close();
  }
});

test('GET /api/v1/mutations/:id returns single mutation 200, 404 for unknown', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const ok = await request(app).get('/api/v1/mutations/artigli_freeze_to_glacier').expect(200);
    assert.equal(ok.body.id, 'artigli_freeze_to_glacier');
    assert.equal(ok.body.pe_cost, 12);

    await request(app).get('/api/v1/mutations/does_not_exist').expect(404);
  } finally {
    await close();
  }
});

test('POST /api/v1/mutations/eligible filters by unit traits', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Empty unit → 0 eligible (every mutation has ≥1 trait prereq).
    const empty = await request(app)
      .post('/api/v1/mutations/eligible')
      .send({ unit: { id: 'u0', trait_ids: [] } })
      .expect(200);
    assert.equal(empty.body.count, 0);

    // Unit con denti_seghettati → denti_bleed_to_chelate eligible.
    const res = await request(app)
      .post('/api/v1/mutations/eligible')
      .send({ unit: { id: 'u1', trait_ids: ['denti_seghettati'] } })
      .expect(200);
    const ids = res.body.eligible.map((e) => e.id);
    assert.ok(ids.includes('denti_bleed_to_chelate'));
    assert.equal(res.body.cost_charging, 'deferred_m13_p3');

    // Missing unit body → 400.
    await request(app).post('/api/v1/mutations/eligible').send({}).expect(400);
  } finally {
    await close();
  }
});

test('POST /api/v1/mutations/apply mutates trait_ids + appends applied_mutations', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const unit = {
      id: 'u1',
      trait_ids: ['denti_seghettati', 'extra_filler_trait'],
      applied_mutations: [],
    };
    const res = await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'denti_bleed_to_chelate', session_id: 'sess-test' })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.applied, 'denti_bleed_to_chelate');
    assert.ok(!res.body.new_traits.includes('denti_seghettati'), 'old trait removed');
    assert.ok(res.body.new_traits.includes('denti_chelatanti'), 'new trait added');
    assert.ok(res.body.new_traits.includes('extra_filler_trait'), 'unrelated trait preserved');
    assert.deepEqual(res.body.unit.applied_mutations, ['denti_bleed_to_chelate']);
    assert.equal(res.body.event.type, 'mutation_applied');
    assert.equal(res.body.event.session_id, 'sess-test');
    assert.equal(res.body.cost_charging, 'deferred_m13_p3');

    // Ineligible apply → 409.
    const ineligibleUnit = { id: 'u2', trait_ids: [], applied_mutations: [] };
    await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit: ineligibleUnit, mutation_id: 'denti_bleed_to_chelate' })
      .expect(409);

    // Unknown mutation id → 404.
    await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'does_not_exist' })
      .expect(404);

    // Missing body → 400.
    await request(app).post('/api/v1/mutations/apply').send({}).expect(400);
  } finally {
    await close();
  }
});
