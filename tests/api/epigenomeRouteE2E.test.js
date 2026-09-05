'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createMetaRouter } = require('../../apps/backend/routes/meta');
const meta = require('../../apps/backend/services/metaProgression');

function fakePrisma(seed = {}) {
  const rows = new Map(Object.entries(seed)); // `${c}:${u}` -> { campaignId, unitId, epigenome }
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
      async upsert() {
        return null;
      },
    },
  };
}

function appWith(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api/meta', createMetaRouter({ prisma }));
  return app;
}

test('mating/roll hydrates parent epigenome from injected prisma (e2e route)', async () => {
  meta._resetLineageRegistry();
  const prisma = fakePrisma({
    'cE:pa': {
      campaignId: 'cE',
      unitId: 'pa',
      epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 },
    },
    'cE:pb': {
      campaignId: 'cE',
      unitId: 'pb',
      epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 },
    },
  });
  const app = appWith(prisma);
  // NOTE: parents passed WITHOUT inline epigenome -> route must hydrate from prisma.
  const res = await request(app)
    .post('/api/meta/mating/roll')
    .send({
      campaign_id: 'cE',
      parent_a: { id: 'pa' },
      parent_b: { id: 'pb' },
      biome_id: 'dune',
    });
  assert.equal(res.status, 200);
  // hydrated utility 1.0 both -> offspring epigenome biased on utility (deviation > 0)
  assert.ok(res.body.offspring.epigenome, 'offspring carries epigenome from hydrated parents');
  assert.ok(res.body.offspring.epigenome.utility > 0.5, 'utility-biased from hydrated parents');
  // bridge recorded with campaign_id
  const entries = meta.listLineageEntries('cE');
  assert.ok(entries.length >= 1, 'offspring recorded scoped to campaign cE');
});
