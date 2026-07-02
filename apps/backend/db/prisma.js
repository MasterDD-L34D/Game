const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

function createPrismaStub(error) {
  const missingClientError =
    error?.message || 'Prisma client non inizializzato; esegui prisma generate.';

  const notAvailable = () => {
    throw new Error(missingClientError);
  };

  const ideas = [];
  let ideaIdSeq = 1;

  function cloneWithFeedback(record, include) {
    if (!record) return null;
    const base = { ...record };
    if (include && include.feedback) {
      const feedback = Array.isArray(record.feedback) ? [...record.feedback] : [];
      if (include.feedback.orderBy && include.feedback.orderBy.createdAt === 'asc') {
        feedback.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
      base.feedback = feedback;
    }
    return base;
  }

  const idea = {
    async findMany(params = {}) {
      return ideas.map((item) => cloneWithFeedback(item, params.include));
    },
    async findUnique(params = {}) {
      const id = params?.where?.id;
      const found = ideas.find((item) => item.id === id);
      return cloneWithFeedback(found, params.include);
    },
    async count() {
      return ideas.length;
    },
    async create(params = {}) {
      const now = new Date();
      const record = {
        id: ideaIdSeq++,
        createdAt: now,
        updatedAt: now,
        feedback: [],
        ...(params.data || {}),
      };
      ideas.push(record);
      return cloneWithFeedback(record, params.include);
    },
    async update(params = {}) {
      const id = params?.where?.id;
      const record = ideas.find((item) => item.id === id);
      if (!record) {
        throw new Error('Record non trovato');
      }
      const now = new Date();
      const feedbackPayload = params?.data?.feedback?.create;
      if (feedbackPayload) {
        const entry = {
          id: record.feedback.length + 1,
          message: feedbackPayload.message,
          contact: feedbackPayload.contact || '',
          createdAt: now,
          updatedAt: now,
        };
        record.feedback.push(entry);
      }
      record.updatedAt = now;
      return cloneWithFeedback(record, params.include);
    },
  };

  const stubCollection = {
    findMany: async () => [],
    findUnique: async () => null,
    count: async () => 0,
    create: async () => notAvailable(),
    update: async () => notAvailable(),
  };

  return {
    idea,
    feedback: stubCollection,
    species: stubCollection,
    biome: stubCollection,
    speciesBiome: stubCollection,
    $connect: async () => notAvailable(),
    $disconnect: async () => {},
  };
}

let prisma;

try {
  const missingDatabaseUrl = !process.env.DATABASE_URL;
  if (missingDatabaseUrl) {
    throw new Error('DATABASE_URL non configurato');
  }

  prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.PRISMA_LOG_QUERIES ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} catch (error) {
  console.warn('[prisma] client non disponibile, uso stub in memoria', error.message);
  prisma = createPrismaStub(error);
}

module.exports = { prisma };
