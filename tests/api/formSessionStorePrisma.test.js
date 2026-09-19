// M12 Phase D — formSessionStore Prisma write-through adapter tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  createFormSessionStore,
  prismaSupportsForms,
} = require('../../apps/backend/services/forms/formSessionStore');

function createMockPrisma() {
  const rows = new Map(); // `${sid}:${uid}` → row
  const silentLogger = { warn: () => {} };
  const client = {
    formSessionState: {
      async upsert({ where, create, update }) {
        const { sessionId, unitId } = where.sessionId_unitId;
        const key = `${sessionId}:${unitId}`;
        const existing = rows.get(key);
        const now = new Date();
        if (existing) {
          const merged = { ...existing, ...update, updatedAt: now };
          rows.set(key, merged);
          return merged;
        }
        const fresh = {
          id: `row-${rows.size + 1}`,
          sessionId,
          unitId,
          createdAt: now,
          updatedAt: now,
          ...create,
        };
        rows.set(key, fresh);
        return fresh;
      },
      async findMany({ where }) {
        return Array.from(rows.values()).filter((r) => r.sessionId === where.sessionId);
      },
      async deleteMany({ where }) {
        let n = 0;
        for (const [k, v] of rows.entries()) {
          if (v.sessionId === where.sessionId) {
            rows.delete(k);
            n += 1;
          }
        }
        return { count: n };
      },
    },
  };
  return { client, rows, logger: silentLogger };
}

test('prismaSupportsForms: detects compatible client', () => {
  const { client } = createMockPrisma();
  assert.equal(prismaSupportsForms(client), true);
  assert.equal(prismaSupportsForms(null), false);
  assert.equal(prismaSupportsForms({ formSessionState: {} }), false);
});

test('store._mode reports prisma when adapter detected', () => {
  const { client, logger } = createMockPrisma();
  const store = createFormSessionStore({ prisma: client, logger });
  assert.equal(store._mode, 'prisma');
  const mem = createFormSessionStore();
  assert.equal(mem._mode, 'in-memory');
});

test('seedUnit + applyDelta write-through to prisma', async () => {
  const { client, rows, logger } = createMockPrisma();
  const store = createFormSessionStore({ prisma: client, logger });
  store.seedUnit('sess1', 'u1', { pe: 10, current_form_id: 'ESTP' });
  store.applyDelta('sess1', 'u1', { new_form_id: 'INTJ', pe_after: 2, round: 3 });
  // Writes are fire-and-forget; wait a tick for microtasks to flush.
  await new Promise((r) => setImmediate(r));
  const row = rows.get('sess1:u1');
  assert.ok(row);
  assert.equal(row.currentFormId, 'INTJ');
  assert.equal(row.pe, 2);
  assert.equal(row.lastEvolveRound, 3);
  assert.equal(row.evolveCount, 1);
  const parsed = JSON.parse(row.lastDelta);
  assert.equal(parsed.new_form_id, 'INTJ');
});

test('hydrate populates in-memory map from prisma rows', async () => {
  const { client, rows, logger } = createMockPrisma();
  // Pre-seed DB outside the store.
  rows.set('sess2:uA', {
    id: 'rowA',
    sessionId: 'sess2',
    unitId: 'uA',
    currentFormId: 'ENFP',
    pe: 7,
    lastEvolveRound: 2,
    evolveCount: 1,
    lastDelta: JSON.stringify({ new_form_id: 'ENFP' }),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const store = createFormSessionStore({ prisma: client, logger });
  assert.equal(store.getUnitState('sess2', 'uA'), null);
  const n = await store.hydrate('sess2');
  assert.equal(n, 1);
  const state = store.getUnitState('sess2', 'uA');
  assert.equal(state.current_form_id, 'ENFP');
  assert.equal(state.pe, 7);
  assert.equal(state.evolve_count, 1);
  assert.equal(state.last_delta.new_form_id, 'ENFP');
});

test('clearSession deletes prisma rows + in-memory entries', async () => {
  const { client, rows, logger } = createMockPrisma();
  const store = createFormSessionStore({ prisma: client, logger });
  store.seedUnit('sess3', 'u1', { pe: 5 });
  store.seedUnit('sess3', 'u2', { pe: 5 });
  store.seedUnit('sess4', 'uX', { pe: 5 });
  await new Promise((r) => setImmediate(r));
  assert.equal(rows.size, 3);
  const removed = store.clearSession('sess3');
  assert.equal(removed, 2);
  await new Promise((r) => setImmediate(r));
  assert.equal(rows.size, 1);
  assert.ok(rows.has('sess4:uX'));
});

test('prisma upsert failure does not throw; in-memory still updated', async () => {
  const failingClient = {
    formSessionState: {
      upsert: () => Promise.reject(new Error('db down')),
      findMany: async () => [],
      deleteMany: async () => ({ count: 0 }),
    },
  };
  const store = createFormSessionStore({ prisma: failingClient, logger: { warn: () => {} } });
  const state = store.seedUnit('sess5', 'u1', { pe: 4 });
  assert.equal(state.pe, 4);
  await new Promise((r) => setImmediate(r));
  // In-memory cache kept consistent even when prisma upsert fails.
  const again = store.getUnitState('sess5', 'u1');
  assert.equal(again.pe, 4);
});
