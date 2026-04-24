// M13 P3 — Progression store (in-memory + optional Prisma write-through).
// Mirrors formSessionStore M12 Phase D adapter pattern.
//
// Key: `${campaignId}:${unitId}` (campaignId null → global scope for tests).

'use strict';

function makeKey(campaignId, unitId) {
  return `${campaignId || '__global__'}:${unitId}`;
}

function prismaSupports(prisma) {
  return Boolean(
    prisma &&
      prisma.unitProgression &&
      typeof prisma.unitProgression.upsert === 'function' &&
      typeof prisma.unitProgression.findMany === 'function',
  );
}

function createProgressionStore({ prisma = null, logger = null } = {}) {
  const states = new Map();
  const usePrisma = prismaSupports(prisma);
  const log = logger || console;

  function persistAsync(campaignId, unitId, next) {
    if (!usePrisma) return;
    const pickedJson = JSON.stringify(next.picked_perks || []);
    prisma.unitProgression
      .upsert({
        where: {
          campaignId_unitId: { campaignId: campaignId || null, unitId },
        },
        create: {
          campaignId: campaignId || null,
          unitId,
          job: next.job,
          xpTotal: Number(next.xp_total || 0),
          level: Number(next.level || 1),
          pickedPerks: pickedJson,
        },
        update: {
          job: next.job,
          xpTotal: Number(next.xp_total || 0),
          level: Number(next.level || 1),
          pickedPerks: pickedJson,
        },
      })
      .catch((err) => {
        log.warn?.(
          `[progressionStore] prisma upsert failed for ${campaignId || '__global__'}:${unitId}:`,
          err?.message || err,
        );
      });
  }

  function fromRow(row) {
    let picked = [];
    if (row.pickedPerks) {
      try {
        picked = JSON.parse(row.pickedPerks);
      } catch {
        picked = [];
      }
    }
    return {
      unit_id: row.unitId,
      job: row.job,
      xp_total: row.xpTotal || 0,
      level: row.level || 1,
      picked_perks: Array.isArray(picked) ? picked : [],
      updated_at: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
    };
  }

  function get(campaignId, unitId) {
    const state = states.get(makeKey(campaignId, unitId));
    return state ? { ...state, picked_perks: [...(state.picked_perks || [])] } : null;
  }

  function set(campaignId, unitId, state) {
    if (!unitId) throw new Error('unit_id required');
    const next = {
      ...state,
      unit_id: unitId,
      updated_at: Date.now(),
    };
    states.set(makeKey(campaignId, unitId), next);
    persistAsync(campaignId, unitId, next);
    return { ...next, picked_perks: [...(next.picked_perks || [])] };
  }

  function list(campaignId) {
    const prefix = `${campaignId || '__global__'}:`;
    const out = [];
    for (const [key, val] of states.entries()) {
      if (key.startsWith(prefix)) out.push({ ...val });
    }
    return out;
  }

  function clearCampaign(campaignId) {
    const prefix = `${campaignId || '__global__'}:`;
    let removed = 0;
    for (const key of Array.from(states.keys())) {
      if (key.startsWith(prefix)) {
        states.delete(key);
        removed += 1;
      }
    }
    if (usePrisma) {
      prisma.unitProgression
        .deleteMany({ where: { campaignId: campaignId || null } })
        .catch((err) => log.warn?.('[progressionStore] deleteMany failed:', err?.message || err));
    }
    return removed;
  }

  async function hydrate(campaignId) {
    if (!usePrisma) return 0;
    try {
      const rows = await prisma.unitProgression.findMany({
        where: { campaignId: campaignId || null },
      });
      for (const row of rows) {
        states.set(makeKey(campaignId, row.unitId), fromRow(row));
      }
      return rows.length;
    } catch (err) {
      log.warn?.(`[progressionStore] hydrate failed:`, err?.message || err);
      return 0;
    }
  }

  function size() {
    return states.size;
  }

  function clearAll() {
    const n = states.size;
    states.clear();
    return n;
  }

  return {
    get,
    set,
    list,
    clearCampaign,
    hydrate,
    size,
    clearAll,
    _mode: usePrisma ? 'prisma' : 'in-memory',
  };
}

module.exports = { createProgressionStore, prismaSupports };
