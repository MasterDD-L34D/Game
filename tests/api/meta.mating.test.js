// Sprint C — Mating roll API endpoint tests.
// POST /api/meta/mating/roll, GET /api/meta/nest/offspring,
// POST /api/meta/nest/add_offspring.
//
// In-memory fallback (no DATABASE_URL).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('POST /api/meta/mating/roll 400 on missing parents', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/meta/mating/roll').send({}).expect(400);
    await request(app)
      .post('/api/meta/mating/roll')
      .send({ parent_a: { id: 'pa' } })
      .expect(400);
    await request(app)
      .post('/api/meta/mating/roll')
      .send({ parent_a: {}, parent_b: {} })
      .expect(400);
  } finally {
    await close();
  }
});

test('POST /api/meta/mating/roll returns offspring + tier + visual_hints', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/mating/roll')
      .send({
        parent_a: {
          id: 'skiv_alpha',
          trait_ids: ['t1'],
          gene_slots: [{ slot_id: 'corpo', value: 'agile' }],
        },
        parent_b: {
          id: 'echo_beta',
          trait_ids: ['t2'],
          gene_slots: [{ slot_id: 'arti', value: 'forti' }],
        },
        biome_id: 'savana',
      })
      .expect(200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.offspring);
    assert.equal(res.body.offspring.parent_a_id, 'skiv_alpha');
    assert.equal(res.body.offspring.parent_b_id, 'echo_beta');
    assert.equal(res.body.offspring.biome_id_at_mating, 'savana');
    assert.match(res.body.offspring.lineage_id, /^lineage_[0-9a-f]{8}$/);
    assert.ok(['no-glow', 'gold', 'rainbow'].includes(res.body.tier));
    assert.ok(res.body.visual_hints);
    assert.equal(typeof res.body.visual_hints.glow, 'boolean');
  } finally {
    await close();
  }
});

test('POST /api/meta/mating/roll prevents self-mate', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/meta/mating/roll')
      .send({
        parent_a: { id: 'self', trait_ids: [] },
        parent_b: { id: 'self', trait_ids: [] },
        biome_id: 'savana',
      })
      .expect(200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.reason, 'self_mate_prevented');
  } finally {
    await close();
  }
});

test('GET /api/meta/nest/offspring + POST /api/meta/nest/add_offspring roundtrip', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Initially empty.
    const empty = await request(app).get('/api/meta/nest/offspring').expect(200);
    assert.deepEqual(empty.body.offspring, []);

    // Add one offspring.
    const add = await request(app)
      .post('/api/meta/nest/add_offspring')
      .send({
        offspring: {
          lineage_id: 'lineage_deadbeef',
          gene_slots: [],
          tier: 'no-glow',
        },
      })
      .expect(200);
    assert.ok(add.body.added);
    assert.equal(add.body.added.lineage_id, 'lineage_deadbeef');

    // List shows entry.
    const list = await request(app).get('/api/meta/nest/offspring').expect(200);
    assert.equal(list.body.offspring.length, 1);
    assert.equal(list.body.offspring[0].lineage_id, 'lineage_deadbeef');
  } finally {
    await close();
  }
});

test('POST /api/meta/nest/add_offspring 400 on invalid body', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).post('/api/meta/nest/add_offspring').send({}).expect(400);
    await request(app)
      .post('/api/meta/nest/add_offspring')
      .send({ offspring: 'not-an-object' })
      .expect(400);
  } finally {
    await close();
  }
});
