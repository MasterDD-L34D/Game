const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs/promises');
const { IdeaRepository, normaliseList } = require('./storage');
const { buildCodexReport } = require('./report');
const { createBiomeSynthesizer } = require('../services/generation/biomeSynthesizer');
const { createRuntimeValidator } = require('../services/generation/runtimeValidator');
const { createGenerationOrchestratorBridge } = require('./services/orchestratorBridge');
const { createTraitDiagnosticsSync } = require('./traitDiagnostics');
const {
  createGenerationSnapshotHandler,
} = require('./routes/generationSnapshot');
const { createGenerationSnapshotStore } = require('./services/generationSnapshotStore');
const { createNebulaRouter } = require('./routes/nebula');
const { createNebulaTelemetryAggregator } = require('./services/nebulaTelemetryAggregator');
const { createReleaseReporter } = require('./services/releaseReporter');
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

const DEFAULT_STATUS_REPORT = path.resolve(__dirname, '..', 'reports', 'status.json');
const DEFAULT_QA_STATUS = path.resolve(__dirname, '..', 'reports', 'qa_badges.json');

async function readJsonFile(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, payload) {
  const targetDir = path.dirname(filePath);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

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

function normaliseDeploymentEntry(payload) {
  const deployedAt = payload.deployedAt || payload.deployed_at || new Date().toISOString();
  const entry = {
    version: payload.version || payload.release || payload.tag || null,
    releaseId: payload.releaseId || payload.release_id || null,
    environment: payload.environment || payload.env || 'production',
    status: payload.status || 'deployed',
    deployedAt,
    releaseUrl: payload.releaseUrl || payload.release_url || null,
    notes: payload.notes || null,
  };
  if (!entry.version) {
    return { error: "Campo 'version' o 'release' richiesto" };
  }
  const date = new Date(entry.deployedAt);
  entry.deployedAt = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  entry.environment = String(entry.environment).trim() || 'production';
  entry.status = String(entry.status || 'deployed').trim() || 'deployed';
  if (entry.releaseUrl) {
    entry.releaseUrl = String(entry.releaseUrl);
  }
  if (entry.notes) {
    entry.notes = String(entry.notes);
  }
  if (entry.releaseId) {
    entry.releaseId = String(entry.releaseId);
  }
  entry.version = String(entry.version);
  return { entry };
}

async function updateDeploymentStatus(filePath, payload, options = {}) {
  const { entry, error } = normaliseDeploymentEntry(payload || {});
  if (error) {
    const err = new Error(error);
    err.statusCode = 400;
    throw err;
  }
  const status = await readJsonFile(filePath, { deployments: [], updatedAt: null });
  const deployments = Array.isArray(status.deployments) ? status.deployments : [];
  deployments.unshift(entry);
  const limit = Number.isFinite(payload.keepLast) ? Number(payload.keepLast) : 20;
  status.deployments = deployments.slice(0, Math.max(limit, 1));
  status.updatedAt = new Date().toISOString();
  const reporter = options.releaseReporter;
  if (reporter && typeof reporter.buildReport === 'function') {
    try {
      const enriched = await reporter.buildReport(status);
      await writeJsonFile(filePath, enriched);
      return { status: enriched, entry };
    } catch (error) {
      console.warn('[release-reporter] buildReport fallito, utilizzo status base', error);
    }
  }
  await writeJsonFile(filePath, status);
  return { status, entry };
}

function shouldRefreshStatusFlag(value) {
  const token = String(value || '').trim().toLowerCase();
  if (!token) {
    return false;
  }
  return token === '1' || token === 'true' || token === 'yes' || token === 'force' || token === 'refresh';
}

function createApp(options = {}) {
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', 'data');
  const databasePath = options.databasePath || path.resolve(dataRoot, 'idea_engine.db');
  const repo = options.repo || new IdeaRepository(databasePath);
  const runtimeValidator =
    options.runtimeValidator || createRuntimeValidator(options.runtimeValidatorOptions || {});
  const biomeSynthesizer =
    options.biomeSynthesizer || createBiomeSynthesizer({ dataRoot, runtimeValidator });
  const generationSnapshotOptions = options.generationSnapshot || {};
  const generationSnapshotStore =
    generationSnapshotOptions.store ||
    createGenerationSnapshotStore({
      datasetPath: generationSnapshotOptions.datasetPath,
      staticDataset: generationSnapshotOptions.staticDataset,
    });
  const orchestratorOptions = {
    ...(options.orchestratorOptions || {}),
    snapshotStore: generationSnapshotStore,
  };
  const generationOrchestrator =
    options.generationOrchestrator ||
    createGenerationOrchestratorBridge(orchestratorOptions);
  const traitDiagnosticsSync =
    options.traitDiagnosticsSync ||
    createTraitDiagnosticsSync({
      orchestrator: generationOrchestrator,
      suppressErrors: true,
    });
  const qaStatusPath = options.qaStatusPath || DEFAULT_QA_STATUS;
  const deploymentOptions = options.deployment || {};
  const statusReportPath = deploymentOptions.statusReportPath || DEFAULT_STATUS_REPORT;
  const deploymentNotifier = deploymentOptions.notifier;
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
    datasetPath: generationSnapshotOptions.datasetPath,
    snapshotStore: generationSnapshotStore,
  });

  app.get('/api/generation/snapshot', generationSnapshotHandler);
  app.get('/api/v1/generation/snapshot', generationSnapshotHandler);

  const nebulaOptions = options?.nebula || {};
  const nebulaAggregator =
    nebulaOptions.aggregator ||
    createNebulaTelemetryAggregator({
      telemetryPath: nebulaOptions.telemetryPath,
      generatorTelemetryPath: nebulaOptions.generatorTelemetryPath,
      cacheTTL: nebulaOptions.cacheTTL,
      telemetry: nebulaOptions.telemetry,
      orchestrator: nebulaOptions.orchestrator,
      staticDataset: nebulaOptions.staticDataset,
    });

  const nebulaRouter = createNebulaRouter({
    telemetryPath: nebulaOptions.telemetryPath,
    generatorTelemetryPath: nebulaOptions.generatorTelemetryPath,
    configPath: nebulaOptions.configPath,
    config: nebulaOptions.config,
    aggregator: nebulaAggregator,
  });
  app.use('/api/nebula', nebulaRouter);
  app.use('/api/v1/atlas', atlasV1Router);

  const releaseReporter = createReleaseReporter({
    snapshotStore: generationSnapshotStore,
    traitDiagnostics: traitDiagnosticsSync,
    nebulaAggregator,
  });

  async function refreshStatusReport(baseStatus) {
    const existing =
      baseStatus || (await readJsonFile(statusReportPath, { deployments: [], updatedAt: null }));
    if (releaseReporter && typeof releaseReporter.buildReport === 'function') {
      const enriched = await releaseReporter.buildReport(existing);
      await writeJsonFile(statusReportPath, enriched);
      return enriched;
    }
    await writeJsonFile(statusReportPath, existing);
    return existing;
  }

  refreshStatusReport().catch((error) => {
    console.warn('[release-reporter] preload fallito', error);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'idea-engine' });
  });

  async function handleQaStatus(req, res) {
    try {
      const report = await readJsonFile(qaStatusPath, null);
      if (!report) {
        res.status(404).json({ error: 'QA report non disponibile' });
        return;
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore caricamento QA report' });
    }
  }

  app.get('/api/qa/status', handleQaStatus);
  app.get('/api/v1/qa/status', handleQaStatus);

  async function handleTraitDiagnostics(req, res) {
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
  }

  app.get('/api/traits/diagnostics', handleTraitDiagnostics);
  app.get('/api/v1/traits/diagnostics', handleTraitDiagnostics);

  app.get('/api/deployments/status', async (req, res) => {
    try {
      const refresh = shouldRefreshStatusFlag(req.query.refresh);
      if (refresh) {
        const status = await refreshStatusReport();
        res.json(status);
        return;
      }
      const status = await readJsonFile(statusReportPath, { deployments: [], updatedAt: null });
      if (!status.telemetry || !status.goNoGo) {
        const enriched = await refreshStatusReport(status);
        res.json(enriched);
        return;
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore caricamento status deploy' });
    }
  });

  app.post('/api/deployments/hook', async (req, res) => {
    try {
      const payload = { ...(req.body || {}) };
      if (deploymentOptions.keepLast !== undefined && payload.keepLast === undefined) {
        payload.keepLast = deploymentOptions.keepLast;
      }
      const { status, entry } = await updateDeploymentStatus(statusReportPath, payload, {
        releaseReporter,
      });
      if (typeof deploymentNotifier === 'function') {
        try {
          await deploymentNotifier(entry, status);
        } catch (notifyError) {
          console.warn('[deploy-hook] notifica fallita', notifyError);
        }
      }
      res.status(201).json({ entry, updatedAt: status.updatedAt });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Errore registrazione deploy' });
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

  async function handleBiomeGeneration(req, res) {
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
  }

  app.post('/api/biomes/generate', handleBiomeGeneration);
  app.post('/api/v1/generation/biomes', handleBiomeGeneration);

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

  async function handleRuntimeValidation(req, res) {
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
  }

  app.post('/api/validators/runtime', handleRuntimeValidation);
  app.post('/api/v1/validators/runtime', handleRuntimeValidation);

  async function handleQualitySuggestion(req, res) {
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
  }

  app.post('/api/quality/suggestions/apply', handleQualitySuggestion);
  app.post('/api/v1/quality/suggestions/apply', handleQualitySuggestion);

  async function handleSpeciesGeneration(req, res) {
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
  }

  async function handleSpeciesBatchGeneration(req, res) {
    const payload = req.body || {};
    try {
      const result = await generationOrchestrator.generateSpeciesBatch(payload);
      res.json(result);
    } catch (error) {
      const status = error && error.message && error.message.includes('trait_ids') ? 400 : 500;
      res.status(status).json({ error: error.message || 'Errore generazione batch specie' });
    }
  }

  app.post('/api/generation/species', handleSpeciesGeneration);
  app.post('/api/v1/generation/species', handleSpeciesGeneration);
  app.post('/api/generation/species/batch', handleSpeciesBatchGeneration);
  app.post('/api/v1/generation/species/batch', handleSpeciesBatchGeneration);

  return { app, repo };
}

module.exports = { createApp };
