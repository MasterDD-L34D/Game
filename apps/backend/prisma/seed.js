const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedIdeas() {
  const existing = await prisma.idea.count();
  if (existing > 0) {
    return { created: 0, skipped: existing };
  }
  const idea = await prisma.idea.create({
    data: {
      title: 'Idea Engine bootstrap',
      summary: 'Seed idea creata automaticamente per verificare il datastore Prisma.',
      category: 'Altro',
      priority: 'P2',
      tags: [],
      biomes: [],
      ecosystems: [],
      species: [],
      traits: [],
      gameFunctions: [],
      actionsNext: '',
      linkDrive: '',
      github: '',
      note: '',
      allowSlugOverride: false,
    },
  });
  return { created: 1, skipped: 0, id: idea.id };
}

async function main() {
  const result = await seedIdeas();
  console.log(`Prisma seed completato (idee create: ${result.created}, skip: ${result.skipped})`);
}

main()
  .catch((error) => {
    console.error('Errore durante il seed Prisma', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
