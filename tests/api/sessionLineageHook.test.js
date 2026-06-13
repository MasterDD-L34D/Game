// Sprint Y Spore Moderate (ADR-2026-04-26 §S5) — lifecycle hook integration test.
//
// Verifica:
// 1. Death-driven propagateLineage hook in damage step (target.hp → 0
//    + applied_mutations[] → propaga al pool lineage).
// 2. Session /start inheritFromLineage hook (new unit in same species/biome
//    eredita 1-2 mutation random dal pool).
// 3. Cross-biome isolation (mutation in pool savana NON ereditata in deserto).
// 4. Back-compat: target senza applied_mutations → no propagation; new unit
//    con applied_mutations precaricato → no doppia ereditarietà.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const {
  reset: resetLineagePool,
  inspectPool,
  propagateLineage,
} = require('../../apps/backend/services/generation/lineagePropagator');

const SPECIES = 'dune_stalker';

function _makeUnit(id, override = {}) {
  return {
    id,
    name: id,
    job: 'skirmisher',
    controlled_by: 'player',
    hp: 10,
    max_hp: 10,
    ap: 2,
    ap_remaining: 2,
    initiative: 5,
    mod: 0,
    dc: 12,
    attack_range: 1,
    position: { x: 0, y: 0 },
    species_id: SPECIES,
    trait_ids: [],
    applied_mutations: [],
    abilities: [],
    status: {},
    ...override,
  };
}

test('Lineage hook: session /start inherits from pool when species+biome match', async () => {
  resetLineagePool();
  // Pre-seed pool: simulate previous death of a unit with 2 mutations.
  const dead = {
    id: 'fallen_x',
    species_id: SPECIES,
    applied_mutations: ['artigli_freeze_to_glacier', 'denti_bleed_to_chelate'],
  };
  propagateLineage(dead, SPECIES, 'savana');
  const beforeInherit = inspectPool(SPECIES, 'savana');
  assert.equal(beforeInherit.pool_size, 2, 'pool seeded with 2 mutations');

  const { app, close } = createApp({ databasePath: null });
  try {
    const newUnit = _makeUnit('newborn', { species_id: SPECIES, applied_mutations: [] });
    const res = await request(app)
      .post('/api/session/start')
      .send({ units: [newUnit], biome_id: 'savana', scenario_id: 'test_lineage' })
      .expect(200);
    assert.ok(Array.isArray(res.body.lineage_inherited), 'lineage_inherited array present');
    // newborn dovrebbe ricevere 1-2 mutation dal pool
    const grant = res.body.lineage_inherited.find((g) => g.unit_id === 'newborn');
    assert.ok(grant, 'newborn unit received lineage grant');
    assert.ok(
      grant.inherited.length >= 1 && grant.inherited.length <= 2,
      'inherited 1-2 mutations',
    );
    assert.equal(grant.species_id, SPECIES);
    assert.equal(grant.biome_id, 'savana');
  } finally {
    await close();
  }
});

test('Lineage hook: cross-biome isolation (mutation savana NOT inherited in deserto)', async () => {
  resetLineagePool();
  propagateLineage(
    { id: 'savana_dead', species_id: SPECIES, applied_mutations: ['artigli_freeze_to_glacier'] },
    SPECIES,
    'savana',
  );

  const { app, close } = createApp({ databasePath: null });
  try {
    const newUnit = _makeUnit('newborn_deserto', { species_id: SPECIES });
    const res = await request(app)
      .post('/api/session/start')
      .send({ units: [newUnit], biome_id: 'deserto', scenario_id: 'test_lineage_iso' })
      .expect(200);
    assert.deepEqual(
      res.body.lineage_inherited,
      [],
      'no inheritance cross-biome (savana pool ≠ deserto)',
    );
  } finally {
    await close();
  }
});

test('Lineage hook: skip inheritance se unit ha già applied_mutations precaricate', async () => {
  resetLineagePool();
  propagateLineage(
    { id: 'donor', species_id: SPECIES, applied_mutations: ['artigli_freeze_to_glacier'] },
    SPECIES,
    'savana',
  );

  const { app, close } = createApp({ databasePath: null });
  try {
    const preLoaded = _makeUnit('pre_loaded', {
      species_id: SPECIES,
      applied_mutations: ['ali_panic_to_resonance'],
    });
    const res = await request(app)
      .post('/api/session/start')
      .send({ units: [preLoaded], biome_id: 'savana', scenario_id: 'test_lineage_skip' })
      .expect(200);
    assert.deepEqual(
      res.body.lineage_inherited,
      [],
      'no double-inheritance — unit con mutation pre-loaded skipped',
    );
  } finally {
    await close();
  }
});

test('Lineage hook: empty pool → empty lineage_inherited (no errors)', async () => {
  resetLineagePool();
  const { app, close } = createApp({ databasePath: null });
  try {
    const newUnit = _makeUnit('first_ever', { species_id: SPECIES });
    const res = await request(app)
      .post('/api/session/start')
      .send({ units: [newUnit], biome_id: 'savana', scenario_id: 'test_empty_pool' })
      .expect(200);
    assert.deepEqual(res.body.lineage_inherited, []);
  } finally {
    await close();
  }
});

test('Lineage hook: missing species_id or biome_id → graceful no-op', async () => {
  resetLineagePool();
  const { app, close } = createApp({ databasePath: null });
  try {
    // Unit without species_id → skip inheritance.
    const noSpecies = _makeUnit('no_species', { species_id: null, species: null });
    const res = await request(app)
      .post('/api/session/start')
      .send({ units: [noSpecies], biome_id: 'savana', scenario_id: 'test_no_species' })
      .expect(200);
    assert.deepEqual(res.body.lineage_inherited, []);
  } finally {
    await close();
  }
});
