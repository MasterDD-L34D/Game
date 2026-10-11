// Fase-3 Epigenome -- per-creature persistence (campaignId, unitId) -> epigenome.
// Mirror of sistemaStateStore: DI factory, Prisma-gated, best-effort. When the
// creatureEpigenome model is absent (in-memory stub / no DATABASE_URL) or any
// query throws, reads return empty and upsert is a no-op. Persistence failure
// must NEVER block session end or mating.

'use strict';

function createCreatureEpigenomeStore(prisma) {
  const model = prisma && prisma.creatureEpigenome ? prisma.creatureEpigenome : null;

  async function get(campaignId, unitId) {
    if (!model || !campaignId || !unitId) return null;
    try {
      const row = await model.findUnique({
        where: { campaignId_unitId: { campaignId, unitId } },
      });
      if (!row) return null;
      const epi = row.epigenome;
      return epi && typeof epi === 'object' ? epi : null;
    } catch {
      return null;
    }
  }

  async function getMany(campaignId) {
    if (!model || !campaignId) return {};
    try {
      const rows = await model.findMany({ where: { campaignId } });
      const out = {};
      for (const r of rows || []) {
        if (r && r.unitId && r.epigenome && typeof r.epigenome === 'object') {
          out[r.unitId] = r.epigenome;
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  async function upsert(campaignId, unitId, epigenome) {
    if (!model || !campaignId || !unitId) return;
    const epi = epigenome && typeof epigenome === 'object' ? epigenome : {};
    try {
      await model.upsert({
        where: { campaignId_unitId: { campaignId, unitId } },
        update: { epigenome: epi },
        create: { campaignId, unitId, epigenome: epi },
      });
    } catch (err) {
      console.warn('[creatureEpigenomeStore] upsert failed (best-effort):', err.message);
    }
  }

  return { get, getMany, upsert };
}

module.exports = { createCreatureEpigenomeStore };
