// Sprint B Spore S5 — lineage REST routes contract tests.

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { reset } = require('../../apps/backend/services/generation/lineagePropagator');

// Pool è module-level singleton; reset prima di ogni test per isolation.
beforeEach(() => {
  reset();
});

// --- propagate happy ----------------------------------------------------

test('POST /api/v1/lineage/propagate writes legacy mutations to pool (200)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/lineage/propagate')
      .send({
        legacyUnit: { id: 'u-skiv', applied_mutations: ['mut_a', 'mut_b'] },
        species_id: 'dune_stalker',
        biome_id: 'savana',
      })
      .expect(200);
    assert.equal(res.body.pool_size, 2);
    assert.deepEqual(res.body.written_traits.sort(), ['mut_a', 'mut_b']);
    assert.equal(res.body.species_id, 'dune_stalker');
    assert.equal(res.body.biome_id, 'savana');
  } finally {
    await close();
  }
});

// --- propagate bad path -------------------------------------------------

test('POST /propagate missing legacyUnit → 400', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app)
      .post('/api/v1/lineage/propagate')
      .send({ species_id: 'x', biome_id: 'y' })
      .expect(400);
  } finally {
    await close();
  }
});

test('POST /propagate missing species_id → 400', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app)
      .post('/api/v1/lineage/propagate')
      .send({ legacyUnit: { id: 'u' }, biome_id: 'y' })
      .expect(400);
  } finally {
    await close();
  }
});

// --- inherit happy ------------------------------------------------------

test('POST /api/v1/lineage/inherit grants random mutation from pool (200)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Seed pool first.
    await request(app)
      .post('/api/v1/lineage/propagate')
      .send({
        legacyUnit: { id: 'src', applied_mutations: ['mut_x', 'mut_y', 'mut_z'] },
        species_id: 'dune_stalker',
        biome_id: 'savana',
      })
      .expect(200);

    const res = await request(app)
      .post('/api/v1/lineage/inherit')
      .send({
        newUnit: { id: 'newborn', applied_mutations: [], trait_ids: [] },
        species_id: 'dune_stalker',
        biome_id: 'savana',
        lineage_id: 'lineage-pup',
      })
      .expect(200);
    assert.ok(res.body.inherited.length >= 1 && res.body.inherited.length <= 2);
    assert.equal(res.body.pool_consumed, false);
    assert.equal(res.body.pool_size, 3);
    assert.equal(res.body.lineage_id, 'lineage-pup');
    // Each inherited mut is in unit.applied_mutations + trait_ids.
    for (const mid of res.body.inherited) {
      assert.ok(res.body.unit.applied_mutations.includes(mid));
      assert.ok(res.body.unit.trait_ids.includes(mid));
    }
  } finally {
    await close();
  }
});

test('POST /inherit empty pool → inherited [] (200)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/lineage/inherit')
      .send({
        newUnit: { id: 'newborn', applied_mutations: [], trait_ids: ['innate'] },
        species_id: 'dune_stalker',
        biome_id: 'tundra',
      })
      .expect(200);
    assert.deepEqual(res.body.inherited, []);
    assert.equal(res.body.pool_size, 0);
    assert.deepEqual(res.body.unit.trait_ids, ['innate']);
  } finally {
    await close();
  }
});

// --- inherit bad path ---------------------------------------------------

test('POST /inherit missing newUnit → 400', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app)
      .post('/api/v1/lineage/inherit')
      .send({ species_id: 'x', biome_id: 'y' })
      .expect(400);
  } finally {
    await close();
  }
});

// --- pool inspection ----------------------------------------------------

test('GET /api/v1/lineage/pool/:species/:biome read-only (200)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Empty pool → 200 con array vuoto.
    const empty = await request(app).get('/api/v1/lineage/pool/dune_stalker/savana').expect(200);
    assert.equal(empty.body.pool_size, 0);
    assert.deepEqual(empty.body.mutations, []);

    // Populate.
    await request(app)
      .post('/api/v1/lineage/propagate')
      .send({
        legacyUnit: { id: 'u', applied_mutations: ['m1', 'm2'] },
        species_id: 'dune_stalker',
        biome_id: 'savana',
      })
      .expect(200);

    const pop = await request(app).get('/api/v1/lineage/pool/dune_stalker/savana').expect(200);
    assert.equal(pop.body.pool_size, 2);
    assert.deepEqual(pop.body.mutations.sort(), ['m1', 'm2']);
  } finally {
    await close();
  }
});

test('GET /pool cross-biome isolation (savana pool ≠ deserto pool)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app)
      .post('/api/v1/lineage/propagate')
      .send({
        legacyUnit: { id: 'u', applied_mutations: ['savana_only'] },
        species_id: 'dune_stalker',
        biome_id: 'savana',
      })
      .expect(200);

    const deserto = await request(app).get('/api/v1/lineage/pool/dune_stalker/deserto').expect(200);
    assert.equal(deserto.body.pool_size, 0);

    const savana = await request(app).get('/api/v1/lineage/pool/dune_stalker/savana').expect(200);
    assert.equal(savana.body.pool_size, 1);
  } finally {
    await close();
  }
});

// --- alias mount --------------------------------------------------------

test('Alias mount /api/lineage/* parity with /api/v1/lineage/*', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/lineage/propagate')
      .send({
        legacyUnit: { id: 'u', applied_mutations: ['alias_mut'] },
        species_id: 'dune_stalker',
        biome_id: 'savana',
      })
      .expect(200);
    assert.equal(res.body.pool_size, 1);
  } finally {
    await close();
  }
});
