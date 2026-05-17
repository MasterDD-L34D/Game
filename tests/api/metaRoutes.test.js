// Contract tests /api/meta/* post Prisma adapter swap.
// ADR-2026-04-21-meta-progression-prisma.
//
// Verify API shape unchanged after adapter refactor. Uses in-memory fallback
// (no DATABASE_URL) so tests hit the same legacy code path validated by the
// baseline metaProgression.test.js 37/37.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/meta/npg returns npcs + nest shape', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/meta/npg').expect(200);
    assert.ok(Array.isArray(res.body.npcs));
    assert.ok(res.body.nest);
    assert.equal(typeof res.body.nest.level, 'number');
    assert.equal(res.body.nest.level, 0);
    assert.equal(res.body.nest.requirements_met, false);
  } finally {
    await close();
  }
});

test('POST /api/meta/affinity updates + returns can_recruit flag', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/affinity')
      .send({ npc_id: 'npc_test_01', delta: 1 })
      .expect(200);
    assert.equal(res.body.npc.npc_id, 'npc_test_01');
    assert.equal(res.body.npc.affinity, 1);
    assert.equal(typeof res.body.can_recruit, 'boolean');
  } finally {
    await close();
  }
});

test('POST /api/meta/affinity 400 on missing body', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/meta/affinity').send({}).expect(400);
    await request(app).post('/api/meta/affinity').send({ npc_id: 'npc_x' }).expect(400);
  } finally {
    await close();
  }
});

test('recruit gate — denied until affinity>=0 AND trust>=2', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Initial attempt → gate_not_met (trust 0)
    let res = await request(app)
      .post('/api/meta/recruit')
      .send({ npc_id: 'npc_gate_01' })
      .expect(200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.reason, 'gate_not_met');

    // Bump trust to 2
    await request(app)
      .post('/api/meta/trust')
      .send({ npc_id: 'npc_gate_01', delta: 2 })
      .expect(200);

    // Retry → success
    res = await request(app).post('/api/meta/recruit').send({ npc_id: 'npc_gate_01' }).expect(200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.npc.recruited, true);
  } finally {
    await close();
  }
});

test('POST /api/meta/nest/setup + GET /api/meta/nest roundtrip', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const setup = await request(app)
      .post('/api/meta/nest/setup')
      .send({ biome: 'savana', requirements_met: true })
      .expect(200);
    assert.equal(setup.body.level, 1);
    assert.equal(setup.body.biome, 'savana');
    assert.equal(setup.body.requirements_met, true);

    const nest = await request(app).get('/api/meta/nest').expect(200);
    assert.equal(nest.body.level, 1);
    assert.equal(nest.body.biome, 'savana');
  } finally {
    await close();
  }
});

test('POST /api/meta/mating 400 on missing party_member', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/meta/mating').send({ npc_id: 'npc_x' }).expect(400);
  } finally {
    await close();
  }
});

test('adapter mode falls back to in-memory when no DATABASE_URL', async () => {
  const { createMetaStore } = require('../../apps/backend/services/metaProgression');
  const { prisma } = require('../../apps/backend/db/prisma');
  const store = createMetaStore({ prisma, campaignId: null });
  // Without a real DATABASE_URL, db/prisma.js returns the stub (no npcRelation)
  // → store falls back to in-memory tracker.
  assert.equal(store._mode, 'in-memory');

  // Smoke: async API works through fallback
  const npc = await store.updateAffinity('npc_fallback_01', 1);
  assert.equal(npc.affinity, 1);
});
