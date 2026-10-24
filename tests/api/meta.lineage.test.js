// Sprint D — Lineage chain + Tribe emergent endpoints.
// GET /api/meta/lineage/:id · GET /api/meta/tribes · GET /api/meta/tribe/unit/:id.
//
// Mounted via pluginLoader at /api/meta and /api/v1/meta (shared store).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const {
  recordOffspring,
  _resetLineageRegistry,
} = require('../../apps/backend/services/metaProgression');

function seedTribe(lineageId, count, biome = 'savana') {
  _resetLineageRegistry();
  for (let i = 1; i <= count; i++) {
    recordOffspring({
      unit_id: `${lineageId}_u${i}`,
      lineage_id: lineageId,
      parents: i === 1 ? [] : [`${lineageId}_u1`, 'partner_x'],
      generation: i === 1 ? 0 : 1,
      born_at_session: 'sess_test',
      born_at_biome: biome,
    });
  }
}

test('GET /api/meta/lineage/:id returns chain shape', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    seedTribe('lin_e2e', 3, 'palude');
    const res = await request(app).get('/api/meta/lineage/lin_e2e').expect(200);
    assert.equal(res.body.lineage_id, 'lin_e2e');
    assert.equal(res.body.members_count, 3);
    assert.ok(Array.isArray(res.body.chain));
    assert.equal(res.body.chain.length, 3);
    // Generation ascending check
    assert.equal(res.body.chain[0].generation, 0);
  } finally {
    _resetLineageRegistry();
    await close();
  }
});

test('GET /api/meta/lineage/:id returns empty chain for unknown lineage', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    _resetLineageRegistry();
    const res = await request(app).get('/api/meta/lineage/lin_phantom').expect(200);
    assert.equal(res.body.members_count, 0);
    assert.deepEqual(res.body.chain, []);
  } finally {
    await close();
  }
});

test('GET /api/meta/tribes returns tribe list with threshold meta', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    seedTribe('lin_t_alpha', 4, 'foresta_pluviale');
    const res = await request(app).get('/api/meta/tribes').expect(200);
    assert.ok(Array.isArray(res.body.tribes));
    assert.equal(res.body.threshold, 3);
    const t = res.body.tribes.find((x) => x.tribe_id === 'lin_t_alpha');
    assert.ok(t);
    assert.equal(t.members_count, 4);
    assert.equal(t.primary_biome, 'foresta_pluviale');
  } finally {
    _resetLineageRegistry();
    await close();
  }
});

test('GET /api/meta/tribes excludes lineage <3 members', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    seedTribe('lin_pair', 2);
    const res = await request(app).get('/api/meta/tribes').expect(200);
    const found = res.body.tribes.find((x) => x.tribe_id === 'lin_pair');
    assert.equal(found, undefined);
  } finally {
    _resetLineageRegistry();
    await close();
  }
});

test('GET /api/meta/tribe/unit/:id returns lone_wolf=true when no tribe', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    _resetLineageRegistry();
    recordOffspring({ unit_id: 'u_solo', lineage_id: 'lin_solo', parents: [], generation: 0 });
    const res = await request(app).get('/api/meta/tribe/unit/u_solo').expect(200);
    assert.equal(res.body.unit_id, 'u_solo');
    assert.equal(res.body.lone_wolf, true);
    assert.equal(res.body.tribe, null);
  } finally {
    _resetLineageRegistry();
    await close();
  }
});

test('GET /api/meta/tribe/unit/:id returns tribe info when qualified', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    seedTribe('lin_packed', 5, 'caverna_umida');
    const res = await request(app).get('/api/meta/tribe/unit/lin_packed_u3').expect(200);
    assert.equal(res.body.lone_wolf, false);
    assert.equal(res.body.tribe.tribe_id, 'lin_packed');
    assert.equal(res.body.tribe.members_count, 5);
  } finally {
    _resetLineageRegistry();
    await close();
  }
});

test('Sprint D endpoints also mounted at /api/v1/meta', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    seedTribe('lin_v1', 3);
    const a = await request(app).get('/api/v1/meta/tribes').expect(200);
    assert.ok(Array.isArray(a.body.tribes));
    const b = await request(app).get('/api/v1/meta/lineage/lin_v1').expect(200);
    assert.equal(b.body.members_count, 3);
  } finally {
    _resetLineageRegistry();
    await close();
  }
});
