const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { IdeaRepository } = require('./storage');
const { buildCodexReport } = require('./report');
const { createBiomeSynthesizer } = require('../services/generation/biomeSynthesizer');
const ideaTaxonomy = require('../config/idea_engine_taxonomy.json');

const IDEA_CATEGORIES = new Set((ideaTaxonomy && Array.isArray(ideaTaxonomy.categories)) ? ideaTaxonomy.categories : []);

function validateIdeaPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Payload mancante o non valido';
  }
  if (!payload.title || !payload.title.trim()) {
    return 'Titolo richiesto';
  }
  if (!payload.category || !payload.category.trim()) {
    return 'Categoria richiesta';
  }
  const normalizedCategory = payload.category.trim();
  if (IDEA_CATEGORIES.size > 0 && !IDEA_CATEGORIES.has(normalizedCategory)) {
    return 'Categoria non valida';
  }
  payload.category = normalizedCategory;
  return '';
}

function createApp(options = {}) {
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', 'data');
  const databasePath = options.databasePath || path.resolve(dataRoot, 'idea_engine.db');
  const repo = options.repo || new IdeaRepository(databasePath);
  const biomeSynthesizer =
    options.biomeSynthesizer || createBiomeSynthesizer({ dataRoot });
  const app = express();

  app.use(cors({ origin: options.corsOrigin || '*' }));
  app.use(express.json({ limit: '1mb' }));

  if (biomeSynthesizer && typeof biomeSynthesizer.load === 'function') {
    biomeSynthesizer.load().catch((error) => {
      console.warn('[biome-generator] impossibile precaricare i pool di tratti', error);
    });
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'idea-engine' });
  });

  app.get('/api/ideas', async (req, res) => {
    try {
      const ideas = await repo.list();
      res.json({ ideas });
    } catch (error) {
      res.status(500).json({ error: 'Errore caricamento idee' });
    }
  });

  app.get('/api/ideas/:id', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'ID non valido' });
      return;
    }
    try {
      const idea = await repo.getById(id);
      if (!idea) {
        res.status(404).json({ error: 'Idea non trovata' });
        return;
      }
      res.json({ idea });
    } catch (error) {
      res.status(500).json({ error: 'Errore caricamento idea' });
    }
  });

  app.get('/api/ideas/:id/report', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'ID non valido' });
      return;
    }
    try {
      const idea = await repo.getById(id);
      if (!idea) {
        res.status(404).json({ error: 'Idea non trovata' });
        return;
      }
      const report = buildCodexReport(idea);
      res.json({ idea, report });
    } catch (error) {
      res.status(500).json({ error: 'Errore generazione report' });
    }
  });

  app.post('/api/ideas', async (req, res) => {
    const payload = req.body || {};
    const validationError = validateIdeaPayload(payload);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    try {
      const idea = await repo.create(payload);
      const report = buildCodexReport(idea);
      res.status(201).json({ idea, report });
    } catch (error) {
      res.status(400).json({ error: error.message || 'Errore salvataggio idea' });
    }
  });

  app.post('/api/biomes/generate', async (req, res) => {
    const payload = req.body || {};
    const requestedCount = Number.parseInt(payload.count, 10);
    const count = Number.isFinite(requestedCount) ? Math.max(1, Math.min(requestedCount, 6)) : 1;
    const constraints = payload.constraints && typeof payload.constraints === 'object'
      ? payload.constraints
      : {};
    try {
      const response = await biomeSynthesizer.generate({
        count,
        seed: payload.seed ?? null,
        constraints: {
          hazard: typeof constraints.hazard === 'string' ? constraints.hazard : undefined,
          climate: typeof constraints.climate === 'string' ? constraints.climate : undefined,
          minSize: Number.isFinite(constraints.minSize) ? constraints.minSize : undefined,
          requiredRoles: Array.isArray(constraints.requiredRoles) ? constraints.requiredRoles : undefined,
          preferredTags: Array.isArray(constraints.preferredTags) ? constraints.preferredTags : undefined,
        },
      });
      res.json({ biomes: response.biomes, meta: response.constraints });
    } catch (error) {
      console.error('[biome-generator] errore durante la generazione', error);
      res.status(500).json({
        error: 'Errore generazione biomi',
        details: error instanceof Error ? error.message : String(error ?? ''),
      });
    }
  });

  return { app, repo, biomeSynthesizer };
}

module.exports = { createApp };
