const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { IdeaRepository, normaliseList } = require('./storage');
const { buildCodexReport } = require('./report');
const { createBiomeSynthesizer } = require('../services/generation/biomeSynthesizer');
const { createRuntimeValidator } = require('../services/generation/runtimeValidator');
const { createGenerationOrchestratorBridge } = require('../services/generation/orchestratorBridge');
const { createTraitDiagnosticsSync } = require('./traitDiagnostics');
const { createGenerationSnapshotHandler } = require('./routes/generationSnapshot');
const { createNebulaRouter } = require('./routes/nebula');
const ideaTaxonomy = require('../config/idea_engine_taxonomy.json');
const slugTaxonomy = require('../docs/public/idea-taxonomy.json');

const IDEA_CATEGORIES = new Set((ideaTaxonomy && Array.isArray(ideaTaxonomy.categories)) ? ideaTaxonomy.categories : []);

function createLogEntry(scope, level, message) {
  return {
    scope,
    level,
    message,
    timestamp: new Date().toISOString(),
  };
}

function validationLogs(scope, result = {}) {
  const logs = [];
  const messages = Array.isArray(result.messages) ? result.messages : [];
  for (const entry of messages) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      logs.push(createLogEntry(scope, 'info', entry));
      continue;
    }
    const level = entry.level || entry.severity || 'info';
    const text = entry.message || entry.text || '';
    if (text) {
      logs.push(createLogEntry(scope, level, text));
    }
  }
  if (Array.isArray(result.discarded) && result.discarded.length) {
    logs.push(
      createLogEntry(
        scope,
        'warning',
        `Elementi scartati: ${result.discarded.length}`,
      ),
    );
  }
  if (Array.isArray(result.corrected) && result.corrected.length) {
    logs.push(
      createLogEntry(
        scope,
        'success',
        `Correzioni applicate: ${result.corrected.length}`,
      ),
    );
  }
  return logs;
}

function generationLogs(scope, batch = {}) {
  const logs = [];
  const results = Array.isArray(batch.results) ? batch.results : [];
  for (const result of results) {
    const meta = result && result.meta ? result.meta : {};
    const requestId = meta.request_id || meta.requestId || 'entry';
    logs.push(
      createLogEntry(
        scope,
        'success',
        `Rigenerazione completata per ${requestId}`,
      ),
    );
    const messages = result && result.validation ? result.validation.messages : [];
    if (Array.isArray(messages) && messages.length) {
      logs.push(
        createLogEntry(
          scope,
          'info',
          `${messages.length} messaggi di validazione disponibili`,
        ),
      );
    }
  }
  const errors = Array.isArray(batch.errors) ? batch.errors : [];
  for (const error of errors) {
    if (!error) continue;
    const requestId = error.request_id || error.requestId || error.index;
    logs.push(
      createLogEntry(
        scope,
        'error',
        `Rigenerazione fallita (${requestId}): ${error.error || 'errore sconosciuto'}`,
      ),
    );
  }
  if (!logs.length) {
    logs.push(createLogEntry(scope, 'info', 'Rigenerazione completata'));
  }
  return logs;
}

function slugify(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^-+|-+$/g, '');
}

function buildSlugConfig(listKey, aliasKey) {
  const taxonomy = slugTaxonomy && typeof slugTaxonomy === 'object' ? slugTaxonomy : {};
  const canonicalList = Array.isArray(taxonomy[listKey]) ? taxonomy[listKey] : [];
  const aliasSource = aliasKey ? taxonomy[aliasKey] : undefined;
  const canonicalSet = new Set();
  canonicalList.forEach((item) => {
    const slug = slugify(item);
    if (slug) {
      canonicalSet.add(slug);
    }
  });
  const aliasMap = {};
  Object.entries(aliasSource || {}).forEach(([alias, canonical]) => {
    const aliasSlug = slugify(alias);
    const canonicalSlug = slugify(canonical);
    if (aliasSlug && canonicalSlug) {
      aliasMap[aliasSlug] = canonicalSlug;
      canonicalSet.add(canonicalSlug);
    }
  });
  return { canonicalSet, aliasMap };
}

const SLUG_CONFIG = {
  biomes: buildSlugConfig('biomes', 'biomeAliases'),
  ecosystems: buildSlugConfig('ecosystems'),
  species: buildSlugConfig('species', 'speciesAliases'),
  traits: buildSlugConfig('traits'),
  game_functions: buildSlugConfig('gameFunctions')
};

function normaliseSlugList(values, config) {
  const items = normaliseList(values);
  const seen = new Set();
  const canonical = [];
  const unknown = [];
  for (const entry of items) {
    const trimmed = String(entry || '').trim();
    if (!trimmed) continue;
    const rawSlug = slugify(trimmed);
    if (!rawSlug) continue;
    const canonicalSlug = config.aliasMap[rawSlug] || rawSlug;
    if (seen.has(canonicalSlug)) continue;
    seen.add(canonicalSlug);
    canonical.push(canonicalSlug);
    if (!config.canonicalSet.has(canonicalSlug)) {
      unknown.push(trimmed);
    }
  }
  return { canonical, unknown };
}

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

  const allowOverride = Boolean(payload.allowSlugOverride || payload.allow_slug_override);
  payload.allowSlugOverride = allowOverride;
  if (Object.prototype.hasOwnProperty.call(payload, 'allow_slug_override')) {
    delete payload.allow_slug_override;
  }

  const slugIssues = [];
  const slugFields = [
    ['biomes', 'Biomi'],
    ['ecosystems', 'Ecosistemi'],
    ['species', 'Specie'],
    ['traits', 'Tratti'],
    ['game_functions', 'Funzioni di gioco']
  ];

  for (const [field, label] of slugFields) {
    const config = SLUG_CONFIG[field];
    if (!config) continue;
    const result = normaliseSlugList(payload[field], config);
    payload[field] = result.canonical;
    if (!allowOverride && result.unknown.length) {
      slugIssues.push(`${label}: ${result.unknown.join(', ')}`);
    }
  }

  if (!allowOverride && slugIssues.length) {
    return `Slug non riconosciuti — correggi oppure abilita l'override: ${slugIssues.join('; ')}`;
  }

  return '';
}

function createApp(options = {}) {
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', 'data');
  const databasePath = options.databasePath || path.resolve(dataRoot, 'idea_engine.db');
  const repo = options.repo || new IdeaRepository(databasePath);
  const runtimeValidator =
    options.runtimeValidator || createRuntimeValidator(options.runtimeValidatorOptions || {});
  const biomeSynthesizer =
    options.biomeSynthesizer || createBiomeSynthesizer({ dataRoot, runtimeValidator });
  const generationOrchestrator =
    options.generationOrchestrator ||
    createGenerationOrchestratorBridge(options.orchestratorOptions || {});
  const traitDiagnosticsSync =
    options.traitDiagnosticsSync ||
    createTraitDiagnosticsSync({
      orchestrator: generationOrchestrator,
      suppressErrors: true,
    });
  const app = express();

  app.use(cors({ origin: options.corsOrigin || '*' }));
  app.use(express.json({ limit: '1mb' }));

  if (biomeSynthesizer && typeof biomeSynthesizer.load === 'function') {
    biomeSynthesizer.load().catch((error) => {
      console.warn('[biome-generator] impossibile precaricare i pool di tratti', error);
    });
  }

  traitDiagnosticsSync.load().catch((error) => {
    console.warn('[trait-diagnostics] preload fallito', error);
  });

  const generationSnapshotHandler = createGenerationSnapshotHandler({
    orchestrator: generationOrchestrator,
    traitDiagnostics: traitDiagnosticsSync,
    datasetPath: options.generationSnapshot?.datasetPath,
  });

  app.get('/api/generation/snapshot', generationSnapshotHandler);

  const nebulaRouter = createNebulaRouter({
    telemetryPath: options?.nebula?.telemetryPath,
  });
  app.use('/api/nebula', nebulaRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'idea-engine' });
  });

  app.get('/api/traits/diagnostics', async (req, res) => {
    const refresh = String(req.query.refresh || '').toLowerCase();
    const shouldRefresh = refresh === 'true' || refresh === '1';
    try {
      if (shouldRefresh) {
        await traitDiagnosticsSync.load();
      } else {
        await traitDiagnosticsSync.ensureLoaded();
      }
      const diagnostics = traitDiagnosticsSync.getDiagnostics() || {};
      const status = traitDiagnosticsSync.getStatus();
      res.json({
        diagnostics,
        meta: {
          fetched_at: status.fetchedAt,
          loading: Boolean(status.loading),
          error: status.error,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore diagnostica tratti' });
    }
  });

  app.get('/api/ideas', async (req, res) => {
    try {
      const ideas = await repo.list();
      res.json({ ideas });
    } catch (error) {
      res.status(500).json({ error: 'Errore caricamento idee' });
    }
  });

  app.post('/api/biomes/generate', async (req, res) => {
    const payload = req.body || {};
    try {
      const result = await biomeSynthesizer.generate({
        count: payload.count,
        constraints: payload.constraints || {},
        seed: payload.seed,
      });
      res.json({ biomes: result.biomes, meta: result.constraints });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore generazione biomi' });
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

  app.post('/api/ideas/:id/feedback', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'ID non valido' });
      return;
    }
    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
    if (!message) {
      res.status(400).json({ error: 'Messaggio feedback richiesto' });
      return;
    }
    try {
      const idea = await repo.addFeedback(id, { message, contact });
      res.status(201).json({ idea });
    } catch (error) {
      if (error && error.message === 'Idea non trovata') {
        res.status(404).json({ error: 'Idea non trovata' });
      } else if (error && error.message === 'Messaggio feedback richiesto') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Errore salvataggio feedback' });
      }
    }
  });

  app.post('/api/validators/runtime', async (req, res) => {
    const { kind, payload } = req.body || {};
    if (!kind) {
      res.status(400).json({ error: "Campo 'kind' richiesto" });
      return;
    }
    try {
      let result = {};
      if (kind === 'species') {
        const entries = (payload && payload.entries) || [];
        result = await runtimeValidator.validateSpeciesBatch(entries, {
          biomeId: payload && payload.biomeId,
        });
      } else if (kind === 'biome') {
        result = await runtimeValidator.validateBiome(payload && payload.biome, {
          defaultHazard: payload && payload.defaultHazard,
        });
      } else if (kind === 'foodweb') {
        result = await runtimeValidator.validateFoodweb(payload && payload.foodweb);
      } else {
        res.status(400).json({ error: `kind non supportato: ${kind}` });
        return;
      }
      res.json({ result });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore validazione runtime' });
    }
  });

  app.post('/api/quality/suggestions/apply', async (req, res) => {
    const suggestion = req.body && req.body.suggestion;
    if (!suggestion || !suggestion.id) {
      res.status(400).json({ error: "Suggerimento richiesto per l'applicazione" });
      return;
    }
    const scope = suggestion.scope || 'general';
    const action = suggestion.action || 'fix';
    const payload = suggestion.payload || {};
    const logScope = scope === 'biomes' ? 'biome' : scope;
    try {
      let result = {};
      let logs = [];
      if (action === 'fix') {
        if (scope === 'species') {
          const entries = Array.isArray(payload.entries) ? payload.entries : [];
          result = await runtimeValidator.validateSpeciesBatch(entries, {
            biomeId: payload.biomeId,
          });
        } else if (scope === 'biome' || scope === 'biomes') {
          result = await runtimeValidator.validateBiome(payload.biome, {
            defaultHazard: payload.defaultHazard,
          });
        } else if (scope === 'foodweb') {
          result = await runtimeValidator.validateFoodweb(payload.foodweb);
        } else {
          res.status(400).json({ error: `Scope non supportato per fix: ${scope}` });
          return;
        }
        logs = validationLogs(logScope, result);
      } else if (action === 'regenerate') {
        if (scope === 'species') {
          const entries = Array.isArray(payload.entries) ? payload.entries : [];
          result = await generationOrchestrator.generateSpeciesBatch({ batch: entries });
          logs = generationLogs(logScope, result);
        } else {
          result = { status: 'scheduled', scope };
          logs = [createLogEntry(logScope, 'info', 'Rigenerazione pianificata')];
        }
      } else {
        res.status(400).json({ error: `Azione non supportata: ${action}` });
        return;
      }
      res.json({
        suggestion: { id: suggestion.id, scope, action },
        result,
        logs,
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore applicazione suggerimento' });
    }
  });

  app.post('/api/generation/species', async (req, res) => {
    const payload = req.body || {};
    try {
      const result = await generationOrchestrator.generateSpecies(payload);
      res.json(result);
    } catch (error) {
      if (error && error.message && error.message.includes('trait_ids')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error.message || 'Errore generazione specie' });
    }
  });

  app.post('/api/generation/species/batch', async (req, res) => {
    const payload = req.body || {};
    try {
      const result = await generationOrchestrator.generateSpeciesBatch(payload);
      res.json(result);
    } catch (error) {
      const status = error && error.message && error.message.includes('trait_ids') ? 400 : 500;
      res.status(status).json({ error: error.message || 'Errore generazione batch specie' });
    }
  });

  return { app, repo };
}

module.exports = { createApp };
