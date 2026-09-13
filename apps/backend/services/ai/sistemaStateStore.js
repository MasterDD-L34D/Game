// M1 ADR-2026-05-18 Option B pilot -- SistemaState Prisma boundary.
// DI factory so tests inject a fake prisma. Defensive: when the sistema_state
// model is absent (in-memory stub / no DATABASE_URL) or any query throws,
// get() returns an empty map and upsert() is a no-op. All callers treat this
// as best-effort -- persistence failure never blocks combat.

'use strict';

function createSistemaStateStore(prisma) {
  const model = prisma && prisma.sistemaState ? prisma.sistemaState : null;

  async function get(campaignId) {
    const empty = { units_observed: {} };
    if (!model || !campaignId) return empty;
    try {
      const row = await model.findUnique({ where: { campaignId } });
      if (!row) return empty;
      // unitsObserved is the Prisma camelCase field; units_observed fallback
      // guards raw-SQL rows / test fixtures. Both map to the units_observed column.
      const uo = row.unitsObserved || row.units_observed || {};
      return { units_observed: typeof uo === 'object' && uo !== null ? uo : {} };
    } catch {
      return empty;
    }
  }

  async function upsert(campaignId, unitsObserved) {
    if (!model || !campaignId) return;
    const uo = unitsObserved && typeof unitsObserved === 'object' ? unitsObserved : {};
    try {
      await model.upsert({
        where: { campaignId },
        update: { unitsObserved: uo },
        create: { campaignId, unitsObserved: uo },
      });
    } catch (err) {
      // best-effort — never block combat; surface for observability.
      console.warn('[sistemaStateStore] upsert failed (best-effort):', err.message);
    }
  }

  return { get, upsert };
}

module.exports = { createSistemaStateStore };
