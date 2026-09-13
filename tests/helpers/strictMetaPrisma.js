// G4 #2746 — faithful Prisma mock for meta-progression tests.
//
// The real Prisma client REJECTS `findUnique` when a unique-key member is
// null (NestState.campaignId String? @unique; NpcRelation
// @@unique([campaignId, npcId]) with campaignId String?). The lenient mocks
// used before this fix accepted null and hid the 500
// PrismaClientValidationError on the global store (campaignId null).
// This mock reproduces the real-client semantics: findUnique throws on null
// unique-key members, findFirst accepts null in `where` (IS NULL filter).

'use strict';

function prismaValidationError(message) {
  const err = new Error(message);
  err.name = 'PrismaClientValidationError';
  return err;
}

function applyOrderBy(rows, orderBy) {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      const [field, dir] = Object.entries(spec)[0];
      if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
      if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
    }
    return 0;
  });
}

function makeStrictMetaPrisma() {
  const relations = [];
  const nests = [];
  let seq = 1;
  const calls = {
    npcFindUnique: 0,
    npcFindFirst: 0,
    nestFindUnique: 0,
    nestFindFirst: 0,
  };
  // Monotonic createdAt so orderBy createdAt is deterministic in tests.
  const nextCreatedAt = () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, seq));

  return {
    _rows: { relations, nests },
    _calls: calls,
    npcRelation: {
      findUnique: async ({ where } = {}) => {
        const key = where && where.campaignId_npcId;
        if (!key || key.campaignId == null || key.npcId == null) {
          throw prismaValidationError(
            'Argument `campaignId`: Invalid value provided. Expected String, provided null. (npcRelation.findUnique)',
          );
        }
        calls.npcFindUnique += 1;
        return (
          relations.find((r) => r.campaignId === key.campaignId && r.npcId === key.npcId) || null
        );
      },
      findFirst: async ({ where, orderBy } = {}) => {
        calls.npcFindFirst += 1;
        const w = where || {};
        const matches = relations.filter(
          (r) =>
            (!('campaignId' in w) || r.campaignId === w.campaignId) &&
            (!('npcId' in w) || r.npcId === w.npcId),
        );
        return applyOrderBy(matches, orderBy)[0] || null;
      },
      findMany: async ({ where } = {}) => {
        const w = where || {};
        return relations.filter((r) => !('campaignId' in w) || r.campaignId === w.campaignId);
      },
      create: async ({ data }) => {
        const row = {
          id: `rel_${seq}`,
          createdAt: nextCreatedAt(),
          affinity: 0,
          trust: 0,
          recruited: false,
          mated: false,
          matingCooldown: 0,
          traitIds: '[]',
          speciesId: null,
          mbtiType: null,
          ...data,
        };
        seq += 1;
        relations.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = relations.find((r) => r.id === where.id);
        if (!row) throw new Error(`npcRelation.update: no row ${where.id}`);
        // Strip nested-write blocks (affinityLogs/trustLogs/matingEvents create).
        const { affinityLogs, trustLogs, matingEvents, ...scalar } = data;
        Object.assign(row, scalar);
        return row;
      },
      updateMany: async () => ({ count: 0 }),
      upsert: async () => {
        throw new Error('npcRelation.upsert: not exercised by these tests');
      },
    },
    nestState: {
      findUnique: async ({ where } = {}) => {
        if (!where || where.campaignId == null) {
          throw prismaValidationError(
            'Argument `campaignId`: Invalid value provided. Expected String, provided null. (nestState.findUnique)',
          );
        }
        calls.nestFindUnique += 1;
        return nests.find((n) => n.campaignId === where.campaignId) || null;
      },
      findFirst: async ({ where, orderBy } = {}) => {
        calls.nestFindFirst += 1;
        const w = where || {};
        const matches = nests.filter((n) => !('campaignId' in w) || n.campaignId === w.campaignId);
        return applyOrderBy(matches, orderBy)[0] || null;
      },
      create: async ({ data }) => {
        const row = {
          id: `nest_${seq}`,
          createdAt: nextCreatedAt(),
          level: 0,
          biome: null,
          requirementsMet: false,
          ...data,
        };
        seq += 1;
        nests.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = nests.find((n) => n.id === where.id);
        if (!row) throw new Error(`nestState.update: no row ${where.id}`);
        Object.assign(row, data);
        return row;
      },
    },
  };
}

module.exports = { makeStrictMetaPrisma };
