// 2026-05-10 sera Sprint Q+ Q-4 — offspring ritual REST routes contract tests.

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const offspringStore = require('../../apps/backend/services/lineage/offspringStore');

beforeEach(() => {
  offspringStore._resetMemory();
});

// --- POST /offspring-ritual happy --------------------------------------

test('POST /api/v1/lineage/offspring-ritual creates offspring (201)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-123',
        parent_a_id: 'unit-a',
        parent_b_id: 'unit-b',
        mutations: ['armatura_residua', 'cuore_doppio'],
      })
      .expect(201);
    assert.ok(res.body.id, 'offspring id assigned');
    assert.ok(res.body.lineage_id, 'lineage_id assigned');
    assert.equal(res.body.session_id, 'sess-123');
    assert.equal(res.body.parent_a_id, 'unit-a');
    assert.equal(res.body.parent_b_id, 'unit-b');
    assert.deepEqual(res.body.mutations, ['armatura_residua', 'cuore_doppio']);
    assert.ok(res.body.born_at, 'born_at timestamp');
  } finally {
    await close();
  }
});

// --- POST /offspring-ritual validation ---------------------------------

test('POST /offspring-ritual missing parent_a_id → 400', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-x',
        parent_b_id: 'unit-b',
        mutations: ['armatura_residua'],
      })
      .expect(400);
    assert.match(res.body.error, /parentA\.id required/);
  } finally {
    await close();
  }
});

test('POST /offspring-ritual same parent_a_id and parent_b_id → 400', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-x',
        parent_a_id: 'unit-x',
        parent_b_id: 'unit-x',
        mutations: ['armatura_residua'],
      })
      .expect(400);
    assert.match(res.body.error, /parent_a_id !== parent_b_id/);
  } finally {
    await close();
  }
});

test('POST /offspring-ritual unknown mutation → 400', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-x',
        parent_a_id: 'a',
        parent_b_id: 'b',
        mutations: ['fake_mutation_id'],
      })
      .expect(400);
    assert.match(res.body.error, /not in canonical_list/);
  } finally {
    await close();
  }
});

test('POST /offspring-ritual mutations.length > 3 → 400', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-x',
        parent_a_id: 'a',
        parent_b_id: 'b',
        mutations: ['armatura_residua', 'tendine_rapide', 'cuore_doppio', 'vista_predatore'],
      })
      .expect(400);
    assert.match(res.body.error, /mutations\.length must be 1-3/);
  } finally {
    await close();
  }
});

// --- GET /chain/:lineage_id --------------------------------------------

test('GET /chain/:lineage_id returns offspring chain ordered born_at ASC', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Create 2 offspring same lineage.
    const r1 = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-1',
        parent_a_id: 'a',
        parent_b_id: 'b',
        mutations: ['armatura_residua'],
      })
      .expect(201);
    await new Promise((r) => setTimeout(r, 50));
    const r2 = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-2',
        parent_a_id: r1.body.id,
        parent_b_id: 'c',
        mutations: ['cuore_doppio'],
      })
      .expect(201);
    assert.equal(r2.body.lineage_id, r1.body.lineage_id, 'lineage propagated');

    const chainRes = await request(app)
      .get(`/api/v1/lineage/chain/${r1.body.lineage_id}`)
      .expect(200);
    assert.equal(chainRes.body.count, 2);
    assert.equal(chainRes.body.offspring[0].id, r1.body.id);
    assert.equal(chainRes.body.offspring[1].id, r2.body.id);
  } finally {
    await close();
  }
});

test('GET /chain/:lineage_id unknown returns 404', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/lineage/chain/nonexistent-uuid').expect(404);
    assert.match(res.body.error, /not found/);
  } finally {
    await close();
  }
});

// --- GET /mutations/canonical ------------------------------------------

test('GET /mutations/canonical returns 6-canonical list', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/lineage/mutations/canonical').expect(200);
    assert.equal(res.body.ids.length, 6);
    assert.ok(res.body.ids.includes('armatura_residua'));
    assert.ok(res.body.ids.includes('memoria_ferita'));
    assert.ok(res.body.mutations.armatura_residua);
    assert.equal(res.body.mutations.armatura_residua.effect_kind, 'passive_buff');
  } finally {
    await close();
  }
});
