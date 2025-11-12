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
const { createGenerationSnapshotHandler } = require('./routes/generationSnapshot');
const { createGenerationSnapshotStore } = require('./services/generationSnapshotStore');
const { createNebulaRouter, createAtlasV1Router } = require('./routes/nebula');
const { createMonitoringRouter } = require('./routes/monitoring');
const { createGenerationRouter, createGenerationRoutes } = require('./routes/generation');
const { createTraitRouter } = require('./routes/traits');
const { createQualityRouter } = require('./routes/quality');
const { createValidatorsRouter } = require('./routes/validators');
const { createNebulaTelemetryAggregator } = require('./services/nebulaTelemetryAggregator');
const { createReleaseReporter } = require('./services/releaseReporter');
const { createCatalogService } = require('./services/catalog');
const { createSchemaValidator, SchemaValidationError } = require('./middleware/schemaValidator');
const {
  generationSnapshotSchema,
  speciesSchema,
  telemetrySchema,
} = require('../packages/contracts');
const qualitySuggestionSchema = require('../schemas/quality/suggestion.schema.json');
const qualitySuggestionApplySchema = require('../schemas/quality/suggestions-apply-request.schema.json');
const ideaTaxonomy = require('../config/idea_engine_taxonomy.json');
const slugTaxonomy = require('../docs/public/idea-taxonomy.json');

const IDEA_CATEGORIES = new Set(
  ideaTaxonomy && Array.isArray(ideaTaxonomy.categories) ? ideaTaxonomy.categories : [],
);

const SLUG_CONFIG = {
  biomes: buildSlugConfig('biomes', 'biomeAliases'),
  ecosystems: buildSlugConfig('ecosystems'),
  species: buildSlugConfig('species', 'speciesAliases'),
  traits: buildSlugConfig('traits'),
  game_functions: buildSlugConfig('gameFunctions'),
};

const DEFAULT_STATUS_REPORT = path.resolve(__dirname, '..', 'reports', 'status.json');
const DEFAULT_QA_STATUS = path.resolve(__dirname, '..', 'reports', 'qa_badges.json');

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildSlugConfig(sectionKey, aliasKey) {
  const canonicalEntries = Array.isArray(slugTaxonomy?.[sectionKey])
    ? slugTaxonomy[sectionKey]
    : [];
  const canonicalSet = new Set();
  const aliasMap = {};
  for (const entry of canonicalEntries) {
    const canonicalValue = String(entry || '').trim();
    if (!canonicalValue) {
      continue;
    }
    canonicalSet.add(canonicalValue);
    const slug = slugify(canonicalValue);
    if (slug) {
      aliasMap[slug] = canonicalValue;
    }
  }
  const aliasSource = aliasKey && slugTaxonomy ? slugTaxonomy[aliasKey] : null;
  if (aliasSource && typeof aliasSource === 'object') {
    for (const [alias, target] of Object.entries(aliasSource)) {
      const canonicalValue = String(target || '').trim();
      if (!canonicalValue) {
        continue;
      }
      const slug = slugify(alias);
      if (!slug) {
        continue;
      }
      aliasMap[slug] = canonicalValue;
    }
  }
  return { canonicalSet, aliasMap };
}

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
    ['game_functions', 'Funzioni di gioco'],
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
    const enriched = await reporter.buildReport(status);
    await writeJsonFile(filePath, enriched);
    return { status: enriched, entry };
  }
  await writeJsonFile(filePath, status);
  return { status, entry };
}

function shouldRefreshStatusFlag(value) {
  const token = String(value || '')
    .trim()
    .toLowerCase();
  if (!token) {
    return false;
  }
  return (
    token === '1' || token === 'true' || token === 'yes' || token === 'force' || token === 'refresh'
  );
}

function createApp(options = {}) {
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', 'data');
  const databasePath = options.databasePath || path.resolve(dataRoot, 'idea_engine.db');
  const repo = options.repo || new IdeaRepository(databasePath);
  const runtimeValidator =
    options.runtimeValidator || createRuntimeValidator(options.runtimeValidatorOptions || {});
  const catalogService =
    options.catalogService ||
    createCatalogService({
      dataRoot,
      mongo: options.mongo,
      logger: options.logger,
    });
  const biomeSynthesizer =
    options.biomeSynthesizer ||
    createBiomeSynthesizer({ dataRoot, runtimeValidator, catalogService });
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
    options.generationOrchestrator || createGenerationOrchestratorBridge(orchestratorOptions);
  const schemaValidator =
    options.schemaValidator || createSchemaValidator(options.schemaValidatorOptions || {});
  schemaValidator.registerSchema('quality://suggestion', qualitySuggestionSchema);
  schemaValidator.registerSchema(
    'quality://suggestions/apply/request',
    qualitySuggestionApplySchema,
  );
  const generationSnapshotSchemaId = schemaValidator.registerSchema(
    generationSnapshotSchema.$id || 'contract://generation/snapshot',
    generationSnapshotSchema,
  );
  const telemetrySchemaId = schemaValidator.registerSchema(
    telemetrySchema.$id || 'contract://atlas/telemetry',
    telemetrySchema,
  );
  const speciesSchemaId = schemaValidator.registerSchema(
    speciesSchema.$id || 'contract://atlas/species',
    speciesSchema,
  );

  function validateWithSchema(payload, schemaId) {
    if (!schemaValidator || !schemaId) {
      return null;
    }
    try {
      schemaValidator.validate(schemaId, payload);
      return null;
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        return error;
      }
      throw error;
    }
  }

  function validateSpeciesEntries(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return null;
    }
    for (const entry of entries) {
      const validationError = validateWithSchema(entry, speciesSchemaId);
      if (validationError) {
        return validationError;
      }
    }
    return null;
  }
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

  const monitoringRouter = createMonitoringRouter();
  app.use('/monitoring', monitoringRouter);

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
    schemaValidator,
    validationSchemaId: generationSnapshotSchemaId,
  });

  const mockSnapshotPath =
    generationSnapshotOptions.mockDatasetPath ||
    path.resolve(
      __dirname,
      '..',
      'webapp',
      'public',
      'data',
      'flow',
      'snapshots',
      'flow-shell-snapshot.json',
    );
  let mockSnapshotCache = null;
  const mockSnapshotStore = generationSnapshotOptions.mockStore || {
    async getSnapshot({ refresh = false } = {}) {
      if (refresh) {
        mockSnapshotCache = null;
      }
      if (mockSnapshotCache) {
        return JSON.parse(JSON.stringify(mockSnapshotCache));
      }
      const snapshot = await readJsonFile(mockSnapshotPath, null);
      if (!snapshot) {
        return {};
      }
      mockSnapshotCache = snapshot;
      return JSON.parse(JSON.stringify(snapshot));
    },
  };
  const generationSnapshotMockHandler = createGenerationSnapshotHandler({
    datasetPath: mockSnapshotPath,
    snapshotStore: mockSnapshotStore,
    traitDiagnostics: null,
    orchestrator: null,
    schemaValidator,
    validationSchemaId: generationSnapshotSchemaId,
  });

  app.get('/api/generation/snapshot', generationSnapshotHandler);
  app.get('/api/v1/generation/snapshot', generationSnapshotHandler);
  app.get('/api/mock/generation/snapshot', generationSnapshotMockHandler);
  app.get('/api/mock/v1/generation/snapshot', generationSnapshotMockHandler);

  const nebulaOptions = options?.nebula || {};
  const mockDataRoot =
    options.mockDataRoot || path.resolve(__dirname, '..', 'webapp', 'public', 'data');
  const mockAtlasBundlePath =
    nebulaOptions.mockAtlasPath || path.join(mockDataRoot, 'nebula', 'atlas.json');
  const mockTelemetryPath =
    nebulaOptions.mockTelemetryPath || path.join(mockDataRoot, 'nebula', 'telemetry.json');
  const defaultSpeciesMatrixPath =
    nebulaOptions.speciesMatrixPath ||
    nebulaOptions.speciesRolloutMatrixPath ||
    path.resolve(__dirname, '..', 'reports', 'evo', 'rollout', 'species_ecosystem_matrix.csv');

  async function loadMockAtlasBundle() {
    return readJsonFile(mockAtlasBundlePath, null);
  }

  async function loadMockTelemetry() {
    const explicit = await readJsonFile(mockTelemetryPath, null);
    if (explicit) {
      return explicit;
    }
    const bundle = await loadMockAtlasBundle();
    if (bundle && typeof bundle === 'object') {
      return bundle.telemetry || null;
    }
    return null;
  }

  async function handleMockAtlasBundle(req, res) {
    try {
      const bundle = await loadMockAtlasBundle();
      if (!bundle) {
        res.status(404).json({ error: 'Atlas mock non disponibile' });
        return;
      }
      const dataset = bundle.dataset || null;
      const telemetry = bundle.telemetry || null;
      const speciesValidation = dataset ? validateSpeciesEntries(dataset.species) : null;
      if (speciesValidation) {
        res.status(500).json({
          error: 'Dataset mock Nebula non conforme allo schema specie',
          details: speciesValidation.details || [],
        });
        return;
      }
      const telemetryValidation = telemetry
        ? validateWithSchema(telemetry, telemetrySchemaId)
        : null;
      if (telemetryValidation) {
        res.status(500).json({
          error: 'Telemetria mock Nebula non conforme allo schema',
          details: telemetryValidation.details || [],
        });
        return;
      }
      res.json(bundle);
    } catch (error) {
      console.error('[atlas-mock] errore caricamento bundle', error);
      res.status(500).json({ error: error?.message || 'Errore caricamento atlas mock' });
    }
  }

  async function handleMockAtlasDataset(req, res) {
    try {
      const bundle = await loadMockAtlasBundle();
      const dataset = bundle?.dataset || null;
      if (!dataset) {
        res.status(404).json({ error: 'Dataset mock Nebula non disponibile' });
        return;
      }
      const validationError = validateSpeciesEntries(dataset.species);
      if (validationError) {
        res.status(500).json({
          error: 'Dataset mock Nebula non conforme allo schema specie',
          details: validationError.details || [],
        });
        return;
      }
      res.json(dataset);
    } catch (error) {
      console.error('[atlas-mock] errore caricamento dataset', error);
      res.status(500).json({ error: error?.message || 'Errore caricamento dataset mock' });
    }
  }

  async function handleMockAtlasTelemetry(req, res) {
    try {
      const telemetry = await loadMockTelemetry();
      if (!telemetry) {
        res.status(404).json({ error: 'Telemetria mock Nebula non disponibile' });
        return;
      }
      const validationError = validateWithSchema(telemetry, telemetrySchemaId);
      if (validationError) {
        res.status(500).json({
          error: 'Telemetria mock Nebula non conforme allo schema',
          details: validationError.details || [],
        });
        return;
      }
      res.json(telemetry);
    } catch (error) {
      console.error('[atlas-mock] errore caricamento telemetria', error);
      res.status(500).json({ error: error?.message || 'Errore caricamento telemetria mock' });
    }
  }
  const nebulaAggregator =
    nebulaOptions.aggregator ||
    createNebulaTelemetryAggregator({
      telemetryPath: nebulaOptions.telemetryPath,
      generatorTelemetryPath: nebulaOptions.generatorTelemetryPath,
      cacheTTL: nebulaOptions.cacheTTL,
      telemetry: nebulaOptions.telemetry,
      orchestrator: nebulaOptions.orchestrator,
      staticDataset: nebulaOptions.staticDataset,
      speciesMatrixPath: defaultSpeciesMatrixPath,
    });

  const nebulaRouter = createNebulaRouter({
    telemetryPath: nebulaOptions.telemetryPath,
    generatorTelemetryPath: nebulaOptions.generatorTelemetryPath,
    configPath: nebulaOptions.configPath,
    config: nebulaOptions.config,
    aggregator: nebulaAggregator,
    schemaValidator,
    telemetrySchemaId,
    speciesSchemaId,
  });
  const atlasV1Router = createAtlasV1Router({
    telemetryPath: nebulaOptions.telemetryPath,
    generatorTelemetryPath: nebulaOptions.generatorTelemetryPath,
    datasetPath: nebulaOptions.datasetPath,
    configPath: nebulaOptions.configPath,
    config: nebulaOptions.config,
    aggregator: nebulaAggregator,
    schemaValidator,
    telemetrySchemaId,
    speciesSchemaId,
  });
  app.get('/api/mock/nebula/atlas', handleMockAtlasBundle);
  app.get('/api/mock/v1/atlas', handleMockAtlasBundle);
  app.get('/api/mock/atlas/dataset', handleMockAtlasDataset);
  app.get('/api/mock/v1/atlas/dataset', handleMockAtlasDataset);
  app.get('/api/mock/atlas/telemetry', handleMockAtlasTelemetry);
  app.get('/api/mock/v1/atlas/telemetry', handleMockAtlasTelemetry);
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

  const traitRouterOptions = {
    dataRoot,
    ...(options.traits || {}),
  };
  app.use('/api/traits', createTraitRouter(traitRouterOptions));

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

  const validatorsRouter = createValidatorsRouter({ runtimeValidator });
  app.use('/api/v1/validators', validatorsRouter);
  app.use('/api/validators', validatorsRouter);

  const qualityRouter = createQualityRouter({
    runtimeValidator,
    generationOrchestrator,
    schemaValidator,
  });
  app.use('/api/v1/quality', qualityRouter);
  app.use('/api/quality', qualityRouter);

  const generationRoutes = createGenerationRoutes({
    biomeSynthesizer,
    generationOrchestrator,
    catalogService,
  });
  const generationRouter = createGenerationRouter({
    biomeSynthesizer,
    generationOrchestrator,
    catalogService,
  });

  app.use('/api/v1/generation', generationRouter);
  app.use('/api/generation', generationRouter);
  app.post('/api/biomes/generate', generationRoutes.biomes);

  async function sendCatalogPools(req, res) {
    try {
      if (catalogService && typeof catalogService.ensureReady === 'function') {
        await catalogService.ensureReady();
      }
      if (!catalogService || typeof catalogService.loadBiomePools !== 'function') {
        res.status(503).json({ error: 'Catalog service non disponibile' });
        return;
      }
      const biomePools = await catalogService.loadBiomePools();
      res.json(biomePools);
    } catch (error) {
      console.warn('[catalog] errore caricamento biome pools', error);
      res.status(500).json({ error: 'Errore caricamento pool catalogo' });
    }
  }

  app.get('/api/v1/catalog/pools', sendCatalogPools);
  app.get('/api/catalog/pools', sendCatalogPools);

  return { app, repo };
}

module.exports = { createApp };
