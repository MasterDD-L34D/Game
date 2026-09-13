// M1 -- sistemaStateStore DI boundary tests (fake prisma, no DB).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSistemaStateStore } = require('../../apps/backend/services/ai/sistemaStateStore');

function fakePrisma() {
  const rows = {};
  return {
    _rows: rows,
    sistemaState: {
      async findUnique({ where }) {
        return rows[where.campaignId] || null;
      },
      async upsert({ where, update, create }) {
        rows[where.campaignId] = rows[where.campaignId]
          ? { ...rows[where.campaignId], ...update }
          : { ...create };
        return rows[where.campaignId];
      },
    },
  };
}

test('get returns {} for absent campaign', async () => {
  const store = createSistemaStateStore(fakePrisma());
  assert.deepEqual(await store.get('c1'), { units_observed: {} });
});

test('upsert then get roundtrip', async () => {
  const store = createSistemaStateStore(fakePrisma());
  await store.upsert('c1', {
    p1: { kills_vs_sistema: 3, sightings: 4, threat_level: 'high' },
  });
  const got = await store.get('c1');
  assert.equal(got.units_observed.p1.kills_vs_sistema, 3);
});

test('get null campaignId -> {} (no crash)', async () => {
  const store = createSistemaStateStore(fakePrisma());
  assert.deepEqual(await store.get(null), { units_observed: {} });
});

test('absent prisma.sistemaState model -> get {} / upsert no-op (stub safety)', async () => {
  const store = createSistemaStateStore({}); // no sistemaState key (in-memory stub case)
  assert.deepEqual(await store.get('c1'), { units_observed: {} });
  await store.upsert('c1', { p1: {} }); // must not throw
});

test('prisma throwing is swallowed (best-effort)', async () => {
  const throwing = {
    sistemaState: {
      findUnique: async () => {
        throw new Error('db down');
      },
      upsert: async () => {
        throw new Error('db down');
      },
    },
  };
  const store = createSistemaStateStore(throwing);
  assert.deepEqual(await store.get('c1'), { units_observed: {} });
  await store.upsert('c1', {}); // swallowed
});
