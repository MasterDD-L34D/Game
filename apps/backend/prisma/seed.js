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

async function seedTaxonomy() {
  const speciesCatalog = [
    {
      id: 'gryphon-strider',
      name: 'Gryphon Strider',
      classification: 'Aerial Vanguard',
      tags: ['skirmisher', 'recon'],
    },
    {
      id: 'tidal-warden',
      name: 'Tidal Warden',
      classification: 'Littoral Guardian',
      tags: ['support', 'amphibious'],
    },
    {
      id: 'emberclaw',
      name: 'Emberclaw',
      classification: 'Volcanic Stalker',
      tags: ['assault'],
    },
  ];

  const biomeCatalog = [
    { id: 'badlands', name: 'Badlands Expanse', climate: 'arid', region: 'Frontier' },
    { id: 'tidal-reef', name: 'Tidal Reef', climate: 'humid', region: 'Pelagic Corridor' },
    { id: 'volcanic-rim', name: 'Volcanic Rim', climate: 'hot', region: 'Anomaly Belt' },
  ];

  const relations = [
    { speciesId: 'gryphon-strider', biomeId: 'badlands', strength: 'primary' },
    { speciesId: 'tidal-warden', biomeId: 'tidal-reef', strength: 'primary' },
    { speciesId: 'emberclaw', biomeId: 'volcanic-rim', strength: 'primary' },
    { speciesId: 'tidal-warden', biomeId: 'badlands', strength: 'secondary' },
  ];

  for (const entry of speciesCatalog) {
    await prisma.species.upsert({
      where: { id: entry.id },
      update: { ...entry },
      create: entry,
    });
  }

  for (const entry of biomeCatalog) {
    await prisma.biome.upsert({
      where: { id: entry.id },
      update: { ...entry },
      create: entry,
    });
  }

  let created = 0;
  for (const relation of relations) {
    await prisma.speciesBiome.upsert({
      where: { speciesId_biomeId: { speciesId: relation.speciesId, biomeId: relation.biomeId } },
      update: { strength: relation.strength },
      create: relation,
    });
    created += 1;
  }

  return { species: speciesCatalog.length, biomes: biomeCatalog.length, relations: created };
}

async function main() {
  const ideaResult = await seedIdeas();
  const taxonomyResult = await seedTaxonomy();
  console.log(
    `Prisma seed completato (idee create: ${ideaResult.created}, skip: ${ideaResult.skipped}, ` +
      `specie: ${taxonomyResult.species}, biomi: ${taxonomyResult.biomes}, relazioni: ${taxonomyResult.relations})`,
  );
}

main()
  .catch((error) => {
    console.error('Errore durante il seed Prisma', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
