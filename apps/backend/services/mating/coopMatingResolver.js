'use strict';
// S22-B Task 8 -- server-side offspring roll for a resolved coop mating vote.
// Additive: reuses metaStore.rollOffspring + best-effort epigenome hydration
// (creatureEpigenomeStore), mirroring routes/meta.js /mating/roll WITHOUT
// touching that endpoint. Prisma-gated: degrades to a bare roll on failure.
// All extra context is OPTIONAL -- the roll must work with an empty context.

async function resolveCoopMatingOffspring({
  store,
  parentAId,
  parentBId,
  biomeId,
  campaignId,
  prisma,
} = {}) {
  if (!store || typeof store.rollOffspring !== 'function')
    return { success: false, error: 'store_required' };
  if (!parentAId || !parentBId) return { success: false, error: 'parent_ids_required' };
  const parentA = { id: parentAId };
  const parentB = { id: parentBId };
  const context = {};
  // Best-effort epigenome hydration (Fase-3), prisma-gated; any failure is swallowed.
  try {
    if (campaignId && prisma) {
      // eslint-disable-next-line global-require
      const { createCreatureEpigenomeStore } = require('../genetics/creatureEpigenomeStore');
      const epiStore = createCreatureEpigenomeStore(prisma);
      const ea = await epiStore.get(campaignId, parentAId);
      if (ea) parentA.epigenome = ea;
      const eb = await epiStore.get(campaignId, parentBId);
      if (eb) parentB.epigenome = eb;
    }
  } catch {
    /* best-effort hydration */
  }
  try {
    const result = await store.rollOffspring({
      parentA,
      parentB,
      biomeId: biomeId || null,
      context,
    });
    return result && result.success
      ? { success: true, offspring: result.offspring }
      : { success: false, error: (result && result.reason) || 'roll_failed' };
  } catch (err) {
    return { success: false, error: err.message || 'roll_threw' };
  }
}

module.exports = { resolveCoopMatingOffspring };
