'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const {
  _resetStore,
  getFragments,
} = require('../../apps/backend/services/rewards/skipFragmentStore');

test('POST /api/meta/mating/roll: strong parent epigenetic bias grants Frammento at birth', async (t) => {
  _resetStore();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/meta/mating/roll')
    .send({
      campaign_id: 'camp1',
      parent_a: { id: 'pa', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
      parent_b: { id: 'pb', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
      biome_id: 'dune',
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.offspring.epigenome_fragment_grant, 1);
  assert.equal(getFragments('camp1').count, 1);
});

test('POST /api/meta/mating/roll: neutral parents grant nothing (no fragment)', async (t) => {
  _resetStore();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/meta/mating/roll')
    .send({
      campaign_id: 'camp2',
      parent_a: { id: 'pa', epigenome: { utility: 0.5, liberty: 0.5, morality: 0.5 } },
      parent_b: { id: 'pb', epigenome: { utility: 0.5, liberty: 0.5, morality: 0.5 } },
      biome_id: 'dune',
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.offspring.epigenome_fragment_grant, 0);
  assert.equal(getFragments('camp2').count, 0);
});
