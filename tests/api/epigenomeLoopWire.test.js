'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  accumulateEpigenome,
  loadEpigenomeConfig,
} = require('../../apps/backend/services/genetics/epigenome');
const {
  createCreatureEpigenomeStore,
} = require('../../apps/backend/services/genetics/creatureEpigenomeStore');

function fakePrisma() {
  const rows = new Map();
  return {
    creatureEpigenome: {
      async findUnique({
        where: {
          campaignId_unitId: { campaignId, unitId },
        },
      }) {
        return rows.get(`${campaignId}:${unitId}`) || null;
      },
      async findMany({ where: { campaignId } }) {
        return [...rows.values()].filter((r) => r.campaignId === campaignId);
      },
      async upsert({
        where: {
          campaignId_unitId: { campaignId, unitId },
        },
        update,
        create,
      }) {
        const key = `${campaignId}:${unitId}`;
        const existing = rows.get(key);
        const row = existing ? { ...existing, ...update } : { campaignId, unitId, ...create };
        rows.set(key, row);
        return row;
      },
    },
  };
}

// Mirrors the exact session-end accumulation logic (Task 3 step 3) so we pin
// the contract: survivors' conviction_axis EMA-accumulated into the store.
async function accumulateSurvivors(store, campaignId, survivors, perActor, alpha) {
  for (const unitId of survivors) {
    const conv = perActor[unitId] && perActor[unitId].conviction_axis;
    if (!conv) continue;
    const prev = await store.get(campaignId, unitId);
    const next = accumulateEpigenome(prev, conv, alpha);
    await store.upsert(campaignId, unitId, next);
  }
}

test('session-end accumulation: survivor conviction EMA-accumulates into store', async () => {
  const store = createCreatureEpigenomeStore(fakePrisma());
  const alpha = loadEpigenomeConfig().accumulation_alpha; // 0.4
  const perActor = { u1: { conviction_axis: { utility: 90, liberty: 50, morality: 10 } } };
  await accumulateSurvivors(store, 'c1', ['u1'], perActor, alpha);
  // first accumulate from baseline 0.5: utility 0.4*0.9+0.6*0.5=0.66
  const after1 = await store.get('c1', 'u1');
  assert.ok(Math.abs(after1.utility - 0.66) < 1e-9);
  // second session reinforces toward high utility
  await accumulateSurvivors(store, 'c1', ['u1'], perActor, alpha);
  const after2 = await store.get('c1', 'u1');
  assert.ok(after2.utility > after1.utility);
});

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const meta = require('../../apps/backend/services/metaProgression');

test('mating/roll: records offspring into lineage registry with epigenome (bridge)', async () => {
  meta._resetLineageRegistry();
  const { app, close } = createApp({ databasePath: null });
  try {
    // 3 rolls of the SAME parents (same lineage_id) -> tribe emerges
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/meta/mating/roll')
        .send({
          campaign_id: 'cL',
          parent_a: { id: 'pa', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
          parent_b: { id: 'pb', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
          biome_id: 'dune',
        });
      assert.equal(res.status, 200);
      assert.ok(res.body.offspring.epigenome, 'offspring carries epigenome when parents do');
    }
    const entries = meta.listLineageEntries().filter((e) => e.epigenome);
    assert.ok(entries.length >= 3, 'offspring recorded with epigenome');
  } finally {
    close();
  }
});

test('GET /api/meta/tribes: uses config threshold + registry species-mean -> is_distinct_form', async () => {
  meta._resetLineageRegistry();
  // baseline population near 0.5 + one diverged lineage at high utility
  for (let i = 0; i < 3; i++) {
    meta.recordOffspring({
      unit_id: `base${i}`,
      lineage_id: 'BASE',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.5, liberty: 0.5, morality: 0.5 },
    });
  }
  for (let i = 0; i < 3; i++) {
    meta.recordOffspring({
      unit_id: `div${i}`,
      lineage_id: 'DIV',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.95, liberty: 0.5, morality: 0.5 },
    });
  }
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/meta/tribes');
    assert.equal(res.status, 200);
    const div = res.body.tribes.find((t) => t.tribe_id === 'DIV');
    assert.ok(div, 'DIV tribe present');
    assert.equal(typeof div.epigenetic_divergence, 'number');
    assert.equal(div.is_distinct_form, true); // diverged far from population mean, > 0.15 threshold
  } finally {
    close();
  }
});
