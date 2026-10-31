// N2 roster-display -- per-run party-roster persistence (campaignId == run.id)
// -> party_rosters rows. Mirror of creatureEpigenomeStore: DI factory,
// Prisma-gated, best-effort. When the partyRoster model is absent (in-memory
// stub / no DATABASE_URL) or a query throws, reads return [] and upsert is a
// no-op. Persistence failure must NEVER block character submit.

'use strict';

function _parseJsonArray(s) {
  if (Array.isArray(s)) return s;
  try {
    const v = JSON.parse(s == null ? '[]' : String(s));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// charSpec = coopOrchestrator normalized spec (player_id, species_id, job_id,
// traits, ...). party_rosters has no name column; unit_id is the handle.
function _specToRow(charSpec) {
  const s = charSpec || {};
  return {
    unitId: s.unit_id || `pg_${s.player_id}`,
    species: s.species_id || 'unknown',
    job: s.job_id || 'guerriero',
    tier: 'base',
    hpBase: s.hp || s.hp_max || 22,
    traits: JSON.stringify(Array.isArray(s.traits) ? s.traits : []),
    acquiredTraits: '[]',
    xpTotal: 0,
    level: 1,
  };
}

function _toClean(r) {
  return {
    unit_id: r.unitId,
    species: r.species,
    job: r.job,
    tier: r.tier,
    hp_base: r.hpBase,
    traits: _parseJsonArray(r.traits),
    acquired_traits: _parseJsonArray(r.acquiredTraits),
    xp_total: r.xpTotal,
    level: r.level,
  };
}

function createRosterStore(prisma) {
  const model = prisma && prisma.partyRoster ? prisma.partyRoster : null;

  async function get(campaignId) {
    if (!model || !campaignId) return [];
    try {
      const rows = await model.findMany({ where: { campaignId } });
      return (rows || []).map(_toClean);
    } catch {
      return [];
    }
  }

  async function upsert(campaignId, charSpec) {
    if (!model || !campaignId) return;
    const row = _specToRow(charSpec);
    try {
      await model.upsert({
        where: { campaignId_unitId: { campaignId, unitId: row.unitId } },
        update: {
          species: row.species,
          job: row.job,
          tier: row.tier,
          hpBase: row.hpBase,
          traits: row.traits,
          acquiredTraits: row.acquiredTraits,
          xpTotal: row.xpTotal,
          level: row.level,
        },
        create: { campaignId, ...row },
      });
    } catch (err) {
      console.warn('[rosterStore] upsert failed (best-effort):', err.message);
    }
  }

  return { get, upsert };
}

module.exports = { createRosterStore };
