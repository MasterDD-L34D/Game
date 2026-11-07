'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCreatureEpigenomeStore,
} = require('../../apps/backend/services/genetics/creatureEpigenomeStore');

function fakePrisma() {
  const rows = new Map();
  return {
    _rows: rows,
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

test('store: get returns null epigenome when absent; upsert then get round-trips', async () => {
  const store = createCreatureEpigenomeStore(fakePrisma());
  assert.equal(await store.get('c1', 'u1'), null);
  await store.upsert('c1', 'u1', { utility: 0.7, liberty: 0.5, morality: 0.5 });
  assert.deepEqual(await store.get('c1', 'u1'), { utility: 0.7, liberty: 0.5, morality: 0.5 });
});

test('store: getMany returns { unitId: epigenome } map scoped to campaign', async () => {
  const store = createCreatureEpigenomeStore(fakePrisma());
  await store.upsert('c1', 'u1', { utility: 0.6, liberty: 0.5, morality: 0.5 });
  await store.upsert('c1', 'u2', { utility: 0.8, liberty: 0.5, morality: 0.5 });
  await store.upsert('c2', 'u3', { utility: 0.1, liberty: 0.5, morality: 0.5 });
  const many = await store.getMany('c1');
  assert.deepEqual(Object.keys(many).sort(), ['u1', 'u2']);
  assert.equal(many.u1.utility, 0.6);
});

test('store: no prisma model -> get null, getMany {}, upsert no-op (best-effort)', async () => {
  const store = createCreatureEpigenomeStore({}); // no creatureEpigenome model
  assert.equal(await store.get('c1', 'u1'), null);
  assert.deepEqual(await store.getMany('c1'), {});
  await store.upsert('c1', 'u1', { utility: 0.7, liberty: 0.5, morality: 0.5 }); // must not throw
});
