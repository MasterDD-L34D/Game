const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

function createPrismaStub(error) {
  const missingClientError =
    error?.message || 'Prisma client non inizializzato; esegui prisma generate.';

  const notAvailable = () => {
    throw new Error(missingClientError);
  };

  const stubCollection = {
    findMany: async () => [],
    findUnique: async () => null,
    count: async () => 0,
    create: async () => notAvailable(),
    update: async () => notAvailable(),
  };

  return {
    idea: stubCollection,
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
