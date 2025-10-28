const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { IdeaRepository } = require('./storage');
const { buildCodexReport } = require('./report');

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
  return '';
}

function createApp(options = {}) {
  const databasePath = options.databasePath || path.resolve(__dirname, '..', 'data', 'idea_engine.db');
  const repo = options.repo || new IdeaRepository(databasePath);
  const app = express();

  app.use(cors({ origin: options.corsOrigin || '*' }));
  app.use(express.json({ limit: '1mb' }));

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

  return { app, repo };
}

module.exports = { createApp };
