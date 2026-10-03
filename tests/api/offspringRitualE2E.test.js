// 2026-05-10 sera Sprint Q+ Q-11 — E2E test offspring ritual cross-encounter chain.
//
// Scenario: encounter1 → mating eligibili → offspring-ritual mut1+mut2 → offspring1.
//           encounter2 → offspring1 + parentC mating → offspring-ritual mut3 → offspring2.
//           Verify lineage chain cross-encounter preserves lineage_id.
//           Chain GET ordered born_at ASC restituisce offspring1 + offspring2.

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const offspringStore = require('../../apps/backend/services/lineage/offspringStore');

beforeEach(() => {
  offspringStore._resetMemory();
});

test('E2E: cross-encounter lineage chain preserved across 2 encounters', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // ─── Encounter 1: parentA + parentB → offspring1 ─────────────────────
    const encounter1Session = 'sess-encounter-1';
    const ritual1 = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: encounter1Session,
        parent_a_id: 'unit-skiv',
        parent_b_id: 'unit-pulverator',
        mutations: ['armatura_residua', 'cuore_doppio'],
      })
      .expect(201);

    assert.ok(ritual1.body.id, 'offspring1 id assigned');
    assert.ok(ritual1.body.lineage_id, 'offspring1 lineage_id assigned (new chain)');
    assert.equal(ritual1.body.session_id, encounter1Session);
    assert.equal(ritual1.body.parent_a_id, 'unit-skiv');
    assert.equal(ritual1.body.parent_b_id, 'unit-pulverator');
    assert.deepEqual(ritual1.body.mutations.sort(), ['armatura_residua', 'cuore_doppio']);
    const lineageChain = ritual1.body.lineage_id;

    // Wait per born_at ASC ordering deterministico.
    await new Promise((r) => setTimeout(r, 50));

    // ─── Encounter 2: offspring1 + parentC → offspring2 same lineage ─────
    const encounter2Session = 'sess-encounter-2';
    const ritual2 = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: encounter2Session,
        parent_a_id: ritual1.body.id, // offspring1 = parent in encounter2
        parent_b_id: 'unit-stranger',
        mutations: ['memoria_ferita'],
      })
      .expect(201);

    assert.equal(
      ritual2.body.lineage_id,
      lineageChain,
      'offspring2 inherits offspring1 lineage_id (cross-encounter chain)',
    );
    assert.equal(ritual2.body.parent_a_id, ritual1.body.id);
    assert.deepEqual(ritual2.body.mutations, ['memoria_ferita']);
    assert.equal(ritual2.body.session_id, encounter2Session);

    // ─── Chain GET: full lineage history ordered born_at ASC ─────────────
    const chainRes = await request(app).get(`/api/v1/lineage/chain/${lineageChain}`).expect(200);
    assert.equal(chainRes.body.lineage_id, lineageChain);
    assert.equal(chainRes.body.count, 2, 'chain has 2 offspring across encounters');
    assert.equal(chainRes.body.offspring[0].id, ritual1.body.id, 'first = offspring1');
    assert.equal(chainRes.body.offspring[1].id, ritual2.body.id, 'second = offspring2');

    // ─── Session GET: per-encounter offspring listing ───────────────────
    const session1Res = await request(app)
      .get(`/api/v1/lineage/session/${encounter1Session}`)
      .expect(200);
    assert.equal(session1Res.body.count, 1, 'encounter1 has 1 offspring');
    assert.equal(session1Res.body.offspring[0].id, ritual1.body.id);

    const session2Res = await request(app)
      .get(`/api/v1/lineage/session/${encounter2Session}`)
      .expect(200);
    assert.equal(session2Res.body.count, 1, 'encounter2 has 1 offspring');
    assert.equal(session2Res.body.offspring[0].id, ritual2.body.id);

    // ─── Mutations canonical: 6-of-6 enum + metadata ─────────────────────
    const mutationsRes = await request(app).get('/api/v1/lineage/mutations/canonical').expect(200);
    assert.equal(mutationsRes.body.ids.length, 6, '6 canonical mutations');
    assert.ok(mutationsRes.body.ids.includes('armatura_residua'));
    assert.ok(mutationsRes.body.ids.includes('memoria_ferita'));
  } finally {
    await close();
  }
});

test('E2E: divergent chains — 2 separate lineage IDs', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const r1 = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-A',
        parent_a_id: 'a1',
        parent_b_id: 'a2',
        mutations: ['armatura_residua'],
      })
      .expect(201);
    const r2 = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-B',
        parent_a_id: 'b1',
        parent_b_id: 'b2',
        mutations: ['vista_predatore'],
      })
      .expect(201);
    assert.notEqual(r1.body.lineage_id, r2.body.lineage_id, 'lineages distinct');
  } finally {
    await close();
  }
});

test('E2E: trait_inherited propagation parentA + parentB union dedup max 6', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Manually inject offspring with trait_inherited per simulate parents con trait
    // Create offspring1 con trait_inherited via direct store seed.
    offspringStore._resetMemory();
    await offspringStore.create({
      id: 'parent-a-seed',
      session_id: 'seed',
      lineage_id: 'lineage-seed',
      parent_a_id: 'gen0-a',
      parent_b_id: 'gen0-b',
      mutations: ['armatura_residua'],
      trait_inherited: ['t1', 't2', 't3'],
      biome_origin: 'savana',
      born_at: new Date().toISOString(),
    });
    await offspringStore.create({
      id: 'parent-b-seed',
      session_id: 'seed',
      lineage_id: 'lineage-other',
      parent_a_id: 'gen0-c',
      parent_b_id: 'gen0-d',
      mutations: ['cuore_doppio'],
      trait_inherited: ['t3', 't4', 't5', 't6', 't7'], // overlap t3
      biome_origin: 'reef',
      born_at: new Date().toISOString(),
    });

    const ritual = await request(app)
      .post('/api/v1/lineage/offspring-ritual')
      .send({
        session_id: 'sess-merge',
        parent_a_id: 'parent-a-seed',
        parent_b_id: 'parent-b-seed',
        mutations: ['memoria_ferita'],
      })
      .expect(201);

    // Lineage_id inherits parent_a (priority).
    assert.equal(ritual.body.lineage_id, 'lineage-seed');
    // Trait_inherited union dedup max 6: [t1,t2,t3,t4,t5,t6,t7] dedup → 7 → cap 6.
    assert.equal(ritual.body.trait_inherited.length, 6, 'cap 6 traits');
    // Biome parentA priority.
    assert.equal(ritual.body.biome_origin, 'savana');
  } finally {
    await close();
  }
});
