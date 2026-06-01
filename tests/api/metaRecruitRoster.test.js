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
