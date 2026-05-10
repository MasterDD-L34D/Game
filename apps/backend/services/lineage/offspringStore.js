// 2026-05-10 sera Sprint Q+ Q-2/Q-3 — Offspring Prisma write-through adapter.
//
// Pattern canonico (vedi reference_prisma_write_through_adapter.md memory):
// - Prisma persistence quando DATABASE_URL set
// - In-memory fallback graceful quando DATABASE_URL unset (dev/demo/tests)
// - Public API: create(offspring), getByLineageId(lineageId), getById(id),
//   getBySessionId(sessionId), clearSession(sessionId), _resetMemory()
//
// Schema offspring (Prisma model 0008_offspring + lineage_ritual.schema.json):
// { id, lineageId, sessionId, parentAId, parentBId, mutations, traitInherited,
//   biomeOrigin, bornAt, createdAt }

'use strict';

let prisma = null;
function getPrismaClient() {
  if (prisma !== null) return prisma;
  try {
    const { PrismaClient } = require('@prisma/client');
    if (!process.env.DATABASE_URL) {
      prisma = false; // sentinel "unavailable"
      return false;
    }
    prisma = new PrismaClient();
    return prisma;
  } catch (err) {
    console.warn('[offspringStore] prisma client unavailable, using in-memory:', err.message);
    prisma = false;
    return false;
  }
}

const _memory = new Map(); // id → offspring entry

async function create(offspring) {
  if (!offspring || !offspring.id || !offspring.lineage_id) {
    throw new Error('offspringStore.create: id + lineage_id required');
  }
  // Always update in-memory map.
  _memory.set(offspring.id, { ...offspring });

  const client = getPrismaClient();
  if (!client) return offspring;

  try {
    await client.offspring.create({
      data: {
        id: offspring.id,
        lineageId: offspring.lineage_id,
        sessionId: offspring.session_id,
        parentAId: offspring.parent_a_id,
        parentBId: offspring.parent_b_id,
        mutations: offspring.mutations || [],
        traitInherited: offspring.trait_inherited || [],
        biomeOrigin: offspring.biome_origin || null,
        bornAt: new Date(offspring.born_at),
      },
    });
  } catch (err) {
    console.warn('[offspringStore] prisma create failed (in-memory still updated):', err.message);
  }
  return offspring;
}

async function getById(id) {
  const memEntry = _memory.get(String(id));
  if (memEntry) return { ...memEntry };

  const client = getPrismaClient();
  if (!client) return null;

  try {
    const row = await client.offspring.findUnique({ where: { id: String(id) } });
    return row ? _rowToOffspring(row) : null;
  } catch (err) {
    console.warn('[offspringStore] prisma getById failed:', err.message);
    return null;
  }
}

async function getByLineageId(lineageId) {
  const memEntries = Array.from(_memory.values()).filter((e) => e.lineage_id === lineageId);

  const client = getPrismaClient();
  if (!client) return memEntries.sort((a, b) => new Date(a.born_at) - new Date(b.born_at));

  try {
    const rows = await client.offspring.findMany({
      where: { lineageId: String(lineageId) },
      orderBy: { bornAt: 'asc' },
    });
    if (rows.length > 0) return rows.map(_rowToOffspring);
    return memEntries.sort((a, b) => new Date(a.born_at) - new Date(b.born_at));
  } catch (err) {
    console.warn('[offspringStore] prisma getByLineageId failed:', err.message);
    return memEntries.sort((a, b) => new Date(a.born_at) - new Date(b.born_at));
  }
}

async function getBySessionId(sessionId) {
  const memEntries = Array.from(_memory.values()).filter((e) => e.session_id === sessionId);

  const client = getPrismaClient();
  if (!client) return memEntries;

  try {
    const rows = await client.offspring.findMany({ where: { sessionId: String(sessionId) } });
    if (rows.length > 0) return rows.map(_rowToOffspring);
    return memEntries;
  } catch (err) {
    console.warn('[offspringStore] prisma getBySessionId failed:', err.message);
    return memEntries;
  }
}

async function clearSession(sessionId) {
  for (const [id, e] of _memory.entries()) {
    if (e.session_id === sessionId) _memory.delete(id);
  }
  const client = getPrismaClient();
  if (!client) return;
  try {
    await client.offspring.deleteMany({ where: { sessionId: String(sessionId) } });
  } catch (err) {
    console.warn('[offspringStore] prisma clearSession failed:', err.message);
  }
}

function _rowToOffspring(row) {
  return {
    id: row.id,
    lineage_id: row.lineageId,
    session_id: row.sessionId,
    parent_a_id: row.parentAId,
    parent_b_id: row.parentBId,
    mutations: row.mutations || [],
    trait_inherited: row.traitInherited || [],
    biome_origin: row.biomeOrigin,
    born_at: row.bornAt instanceof Date ? row.bornAt.toISOString() : row.bornAt,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function _resetMemory() {
  _memory.clear();
}

module.exports = {
  create,
  getById,
  getByLineageId,
  getBySessionId,
  clearSession,
  _resetMemory,
};
