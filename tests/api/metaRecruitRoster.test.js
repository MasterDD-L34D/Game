// link-2 — recruit success persists the recruited NPC into party_rosters via
// rosterStore.upsert. DB-free: DI a fake store + fake rosterStore into
// createMetaRouter, mount on a bare express app, assert upsert call gating.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createMetaRouter } = require('../../apps/backend/routes/meta');

function makeApp({ recruitResult, rosterCalls }) {
  const fakeStore = {
    recruit: async (npc_id) => recruitResult(npc_id),
    updateAffinity: async () => {},
    updateTrust: async () => {},
  };
  const fakeRoster = {
    upsert: async (campaignId, spec) => {
      rosterCalls.push({ campaignId, spec });
    },
    get: async () => [],
  };
  const app = express();
  app.use(express.json());
  app.use('/api/meta', createMetaRouter({ store: fakeStore, rosterStore: fakeRoster }));
  return app;
}

const SUCCESS = (npc_id) => ({
  success: true,
  npc: { npc_id, recruited: true, trait_ids: ['t_a'] },
});
const FAIL = () => ({ success: false, reason: 'gate_not_met' });

test('recruit success + campaign_id → rosterStore.upsert called with unit_id+traits', async () => {
  const rosterCalls = [];
  const app = makeApp({ recruitResult: SUCCESS, rosterCalls });
  const res = await request(app)
    .post('/api/meta/recruit')
    .send({ npc_id: 'npc_1', campaign_id: 'run-1' })
    .expect(200);
  assert.equal(res.body.success, true);
  assert.equal(rosterCalls.length, 1);
  assert.equal(rosterCalls[0].campaignId, 'run-1');
  assert.equal(rosterCalls[0].spec.unit_id, 'npc_1');
  assert.deepEqual(rosterCalls[0].spec.traits, ['t_a']);
});

test('recruit success + NO campaign_id → upsert NOT called', async () => {
  const rosterCalls = [];
  const app = makeApp({ recruitResult: SUCCESS, rosterCalls });
  await request(app).post('/api/meta/recruit').send({ npc_id: 'npc_2' }).expect(200);
  assert.equal(rosterCalls.length, 0);
});

test('recruit FAIL (gate_not_met) + campaign_id → upsert NOT called', async () => {
  const rosterCalls = [];
  const app = makeApp({ recruitResult: FAIL, rosterCalls });
  const res = await request(app)
    .post('/api/meta/recruit')
    .send({ npc_id: 'npc_3', campaign_id: 'run-1' })
    .expect(200);
  assert.equal(res.body.success, false);
  assert.equal(rosterCalls.length, 0);
});

test('no rosterStore (DI absent) → recruit success, no throw', async () => {
  const fakeStore = {
    recruit: async (id) => SUCCESS(id),
    updateAffinity: async () => {},
    updateTrust: async () => {},
  };
  const app = express();
  app.use(express.json());
  app.use('/api/meta', createMetaRouter({ store: fakeStore })); // no rosterStore, no prisma
  const res = await request(app)
    .post('/api/meta/recruit')
    .send({ npc_id: 'npc_4', campaign_id: 'run-1' })
    .expect(200);
  assert.equal(res.body.success, true);
});

test('recruit same npc_id in two campaigns — both succeed (campaign-scoped gate)', async () => {
  const factoryCalls = [];
  const perCampaign = {};
  const metaStoreFactory = (cid) => {
    factoryCalls.push(cid);
    if (!perCampaign[cid]) {
      const recruited = new Set();
      perCampaign[cid] = {
        updateAffinity: async () => {},
        updateTrust: async () => {},
        recruit: async (npc) => {
          if (recruited.has(npc)) return { success: false, reason: 'gate_not_met' };
          recruited.add(npc);
          return { success: true, npc: { npc_id: npc, recruited: true, trait_ids: [] } };
        },
      };
    }
    return perCampaign[cid];
  };
  const rosterCalls = [];
  const fakeRoster = {
    upsert: async (cid, spec) => {
      rosterCalls.push({ cid, spec });
    },
    get: async () => [],
  };
  const globalStore = {
    recruit: async () => {
      throw new Error('global store must NOT be used when campaign_id present');
    },
    updateAffinity: async () => {},
    updateTrust: async () => {},
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/api/meta',
    createMetaRouter({ store: globalStore, metaStoreFactory, rosterStore: fakeRoster }),
  );
  const a = await request(app)
    .post('/api/meta/recruit')
    .send({ npc_id: 'npc_X', campaign_id: 'A' })
    .expect(200);
  assert.equal(a.body.success, true);
  const b = await request(app)
    .post('/api/meta/recruit')
    .send({ npc_id: 'npc_X', campaign_id: 'B' })
    .expect(200);
  assert.equal(
    b.body.success,
    true,
    'campaign B not blocked by campaign A recruiting the same npc',
  );
  assert.equal(rosterCalls.length, 2);
  assert.ok(factoryCalls.includes('A') && factoryCalls.includes('B'));
});

test('recruit with NO campaign_id — falls back to shared store (factory not called)', async () => {
  let factoryCalled = false;
  const sharedStore = {
    recruit: async (id) => ({ success: true, npc: { npc_id: id, trait_ids: [] } }),
    updateAffinity: async () => {},
    updateTrust: async () => {},
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/api/meta',
    createMetaRouter({
      store: sharedStore,
      metaStoreFactory: () => {
        factoryCalled = true;
      },
      rosterStore: { upsert: async () => {}, get: async () => [] },
    }),
  );
  await request(app).post('/api/meta/recruit').send({ npc_id: 'npc_Y' }).expect(200);
  assert.equal(factoryCalled, false);
});

test('recruit with species_id → store.recruit gets it AND roster spec carries it', async () => {
  const rosterCalls = [];
  let recruitArgs = null;
  const fakeStore = {
    recruit: async (npc_id, species_id) => {
      recruitArgs = { npc_id, species_id };
      return { success: true, npc: { npc_id, recruited: true, trait_ids: [], species_id } };
    },
    updateAffinity: async () => {},
    updateTrust: async () => {},
  };
  const fakeRoster = {
    upsert: async (campaignId, spec) => {
      rosterCalls.push({ campaignId, spec });
    },
    get: async () => [],
  };
  const app = express();
  app.use(express.json());
  app.use('/api/meta', createMetaRouter({ store: fakeStore, rosterStore: fakeRoster }));
  const res = await request(app)
    .post('/api/meta/recruit')
    .send({ npc_id: 'npc_sp', campaign_id: 'run-1', species_id: 'dune_stalker' })
    .expect(200);
  assert.equal(res.body.success, true);
  assert.equal(recruitArgs.species_id, 'dune_stalker');
  assert.equal(rosterCalls.length, 1);
  assert.equal(rosterCalls[0].spec.species_id, 'dune_stalker');
});

test('recruit without species_id → roster spec has no species_id (back-compat)', async () => {
  const rosterCalls = [];
  const app = makeApp({ recruitResult: SUCCESS, rosterCalls });
  await request(app)
    .post('/api/meta/recruit')
    .send({ npc_id: 'npc_ns', campaign_id: 'run-1' })
    .expect(200);
  assert.equal(rosterCalls.length, 1);
  assert.equal(rosterCalls[0].spec.species_id, undefined);
});
