const express = require('express');

function mapSpecies(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    name: entry.name,
    classification: entry.classification || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
    updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
  };
}

function mapBiome(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    name: entry.name,
    climate: entry.climate || null,
    region: entry.region || null,
    createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
    updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
  };
}

function mapRelation(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    speciesId: entry.speciesId,
    biomeId: entry.biomeId,
    strength: entry.strength || null,
    note: entry.note || null,
    createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
    updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
    species: mapSpecies(entry.species),
    biome: mapBiome(entry.biome),
  };
}

function createSpeciesBiomesRouter({ prisma }) {
  if (!prisma) {
    throw new Error('prisma client richiesto per il router specie-biomi');
  }

  const router = express.Router();

  router.get('/species', async (req, res) => {
    try {
      const species = await prisma.species.findMany({
        include: { biomes: { include: { biome: true } } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
      res.json({
        species: species.map((entry) => ({
          ...mapSpecies(entry),
          biomes: Array.isArray(entry.biomes) ? entry.biomes.map((link) => mapRelation(link)) : [],
        })),
        requestedBy: req.get('x-user') || null,
      });
    } catch (error) {
      res.status(500).json({ error: 'Errore caricamento specie' });
    }
  });

  router.get('/biomes', async (req, res) => {
    try {
      const biomes = await prisma.biome.findMany({
        include: { species: { include: { species: true } } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
      res.json({
        biomes: biomes.map((entry) => ({
          ...mapBiome(entry),
          species: Array.isArray(entry.species)
            ? entry.species.map((link) => mapRelation(link))
            : [],
        })),
        requestedBy: req.get('x-user') || null,
      });
    } catch (error) {
      res.status(500).json({ error: 'Errore caricamento biomi' });
    }
  });

  router.get('/species-biomes', async (req, res) => {
    try {
      const links = await prisma.speciesBiome.findMany({
        include: { species: true, biome: true },
        orderBy: [{ speciesId: 'asc' }, { biomeId: 'asc' }],
      });
      res.json({
        links: links.map((entry) => mapRelation(entry)),
        requestedBy: req.get('x-user') || null,
      });
    } catch (error) {
      res.status(500).json({ error: 'Errore caricamento relazioni specie-biomi' });
    }
  });

  return router;
}

module.exports = { createSpeciesBiomesRouter };
