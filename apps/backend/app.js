const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const { IdeaRepository, normaliseList } = require('./storage');
const { buildCodexReport } = require('./report');
const { createBiomeSynthesizer } = require('../../services/generation/biomeSynthesizer');
const { createRuntimeValidator } = require('../../services/generation/runtimeValidator');
const { createGenerationOrchestratorBridge } = require('./services/orchestratorBridge');
const { createTraitDiagnosticsSync } = require('./traitDiagnostics');
const { createGenerationSnapshotHandler } = require('./routes/generationSnapshot');
const { createGenerationSnapshotStore } = require('./services/generationSnapshotStore');
const { createNebulaRouter, createAtlasV1Router } = require('./routes/nebula');
const { createMonitoringRouter } = require('./routes/monitoring');
const { createGenerationRouter, createGenerationRoutes } = require('./routes/generation');
const { createSpeciesBiomesRouter } = require('./routes/speciesBiomes');
const { createTraitRouter } = require('./routes/traits');
const { createQualityRouter } = require('./routes/quality');
const { createValidatorsRouter } = require('./routes/validators');
const { createSessionRouter } = require('./routes/session');
const { createFeedbackRouter } = require('./routes/feedback');
const { createPartyRouter } = require('./routes/party');
const { createCampaignRouter } = require('./routes/campaign');
const { createRewardsRouter } = require('./routes/rewards');
const { createCodexRouter } = require('./routes/codex');
const { createFormPackRouter } = require('./routes/formPackRoutes');
const { createLobbyRouter } = require('./routes/lobby');
const { createCoopRouter } = require('./routes/coop');
// W5.5 — companion picker REST endpoint.
const { createCompanionRouter } = require('./routes/companion');
// Skiv ticket #7 — unit diary persistence (cross-session memoria)
const { createDiaryRouter } = require('./routes/diary');
// Skiv-as-Monitor — git-event-driven creature feed (2026-04-25)
const { createSkivRouter } = require('./routes/skiv');
// Sprint 3 §II (2026-04-27) — AncientBeast wiki cross-link slug bridge.
const { createSpeciesWikiRouter } = require('./routes/speciesWiki');
const { createCoopStore } = require('./services/coop/coopStore');
const { LobbyService } = require('./services/network/wsSession');
const { createNebulaTelemetryAggregator } = require('./services/nebulaTelemetryAggregator');
const { createReleaseReporter } = require('./services/releaseReporter');
const { createCatalogService } = require('./services/catalog');
const { loadPlugins, BUILTIN_PLUGINS } = require('./services/pluginLoader');
const { createSchemaValidator, SchemaValidationError } = require('./middleware/schemaValidator');
const {
  generationSnapshotSchema,
  speciesSchema,
  telemetrySchema,
  speciesBiomesSchema,
  combatSchema,
  traitMechanicsSchema,
  glossarySchema,
  narrativeSchema,
  replaySchema,
  triSorgenteSchema,
  skivCompanionSchema,
} = require('@game/contracts');
const qualitySuggestionSchema = require('../../schemas/quality/suggestion.schema.json');
const qualitySuggestionApplySchema = require('../../schemas/quality/suggestions-apply-request.schema.json');
const ideaTaxonomy = require('../../config/idea_engine_taxonomy.json');
const slugTaxonomy = require('../../docs/public/idea-taxonomy.json');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

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

const DEFAULT_STATUS_REPORT = path.resolve(ROOT_DIR, 'reports', 'status.json');
const DEFAULT_QA_STATUS = path.resolve(ROOT_DIR, 'reports', 'qa_badges.json');

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

function isBenignTeardownError(error) {
  if (!error) return false;
  const message = typeof error.message === 'string' ? error.message : String(error);
  return /Pool terminato|worker pool closed|already closed|Worker non disponibile|worker not available/i.test(
    message,
  );
}

async function readJsonFile(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    if (error instanceof SyntaxError && fallback !== undefined) {
      console.warn(
        `[app] JSON corrotto in ${filePath} (${error.message}); uso fallback e riscriverò al prossimo write`,
      );
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, payload) {
  const targetDir = path.dirname(filePath);
  await fs.mkdir(targetDir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  try {
    await fs.rename(tmpPath, filePath);
  } catch (renameError) {
    await fs.rm(tmpPath, { force: true }).catch(() => {});
    throw renameError;
  }
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
  const dataRoot = options.dataRoot || path.resolve(ROOT_DIR, 'data');
  const repo = options.repo || new IdeaRepository(options.repoOptions || {});
  const runtimeValidator =
    options.runtimeValidator || createRuntimeValidator(options.runtimeValidatorOptions || {});
  const gameDatabaseOptions = options.gameDatabase || {};
  const catalogService =
    options.catalogService ||
    createCatalogService({
      dataRoot,
      httpEnabled: gameDatabaseOptions.enabled === true,
      httpBase: gameDatabaseOptions.url || null,
      httpTimeoutMs: gameDatabaseOptions.timeoutMs,
      httpTtlMs: gameDatabaseOptions.ttlMs,
      httpFetch: gameDatabaseOptions.fetch,
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
  schemaValidator.registerSchema(combatSchema.$id || 'contract://combat/state', combatSchema);
  schemaValidator.registerSchema(
    traitMechanicsSchema.$id || 'contract://traits/mechanics',
    traitMechanicsSchema,
  );
  schemaValidator.registerSchema(
    glossarySchema.$id || 'contract://traits/glossary',
    glossarySchema,
  );
  schemaValidator.registerSchema(
    narrativeSchema.$id || 'contract://narrative/story-response',
    narrativeSchema,
  );
  schemaValidator.registerSchema(
    speciesBiomesSchema.$id || 'contract://atlas/species-biomes',
    speciesBiomesSchema,
  );
  // S1 polish Phase 1 — Skiv portable companion (ADR-2026-04-27).
  schemaValidator.registerSchema(
    skivCompanionSchema.$id || 'contract://skiv/companion',
    skivCompanionSchema,
  );
  // Audit 2026-05-07 quick-win: register orphan contract schemas.
  // replay.schema.json — GET /api/session/:id/replay payload (Q-001 T2.4 PR-2).
  // tri-sorgente.schema.json — POST /api/v1/tri-sorgente/offer payload (Q-001 T3.2).
  // See docs/research/2026-05-07-orphan-engine-audit-game.md.
  schemaValidator.registerSchema(replaySchema.$id || 'contract://session/replay', replaySchema);
  schemaValidator.registerSchema(
    triSorgenteSchema.$id || 'contract://rewards/tri-sorgente',
    triSorgenteSchema,
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
  const statusReportExplicit = Object.prototype.hasOwnProperty.call(
    deploymentOptions,
    'statusReportPath',
  );
  const statusReportDisabledByEnv = process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH === '1';
  const statusReportPath = statusReportDisabledByEnv
    ? null
    : statusReportExplicit
      ? deploymentOptions.statusReportPath
      : DEFAULT_STATUS_REPORT;
  const deploymentNotifier = deploymentOptions.notifier;
  const app = express();

  app.use(cors({ origin: options.corsOrigin || '*' }));
  app.use(express.json({ limit: '1mb' }));

  const publicDir = options.publicDir || path.resolve(__dirname, 'public');
  app.use(express.static(publicDir));

  // Demo one-tunnel mode: serve built apps/play/dist at /play.
  // Opt-in via options.playDist or env PLAY_DIST_PATH. Missing dir = silent skip.
  const playDist =
    options.playDist || process.env.PLAY_DIST_PATH || path.resolve(__dirname, '..', 'play', 'dist');
  try {
    if (fsSync.existsSync(playDist) && fsSync.statSync(playDist).isDirectory()) {
      // Runtime config for frontend — injects WS resolution hint.
      // Shared mode (LOBBY_WS_SHARED=true) → frontend uses same-origin /ws.
      // Dedicated mode → falls back to VITE env / port 3341.
      const sameOrigin = process.env.LOBBY_WS_SHARED === 'true';
      app.get('/play/runtime-config.js', (_req, res) => {
        res
          .type('application/javascript')
          .send(`window.LOBBY_WS_SAME_ORIGIN=${sameOrigin ? 'true' : 'false'};\n`);
      });
      app.use('/play', express.static(playDist));
      console.log(`[play-static] serving ${playDist} at /play (ws-same-origin=${sameOrigin})`);
    }
  } catch {
    // silent: dist not built, dev flow via Vite still works
  }

  // V1 pattern: plugin-based service registration
  loadPlugins(app, BUILTIN_PLUGINS, options);

  const monitoringRouter = createMonitoringRouter();
  app.use('/monitoring', monitoringRouter);

  if (biomeSynthesizer && typeof biomeSynthesizer.load === 'function') {
    biomeSynthesizer.load().catch((error) => {
      console.warn('[biome-generator] impossibile precaricare i pool di tratti', error);
    });
  }

  traitDiagnosticsSync.load().catch((error) => {
    if (isBenignTeardownError(error)) return;
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
      ROOT_DIR,
      'apps',
      'dashboard',
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
  // apps/dashboard/public/data e' stato rimosso con #1343 (sprint SPRINT_001
  // fase 2). I mock endpoint sopravvivono ma puntano a data/mock/* (path
  // opzionale): se non esiste, i loader cadono sul fallback inline o ritornano
  // ENOENT gestito a valle. Override esplicito via options.mockDataRoot.
  const mockDataRoot = options.mockDataRoot || path.resolve(ROOT_DIR, 'data', 'mock');
  const mockAtlasBundlePath =
    nebulaOptions.mockAtlasPath || path.join(mockDataRoot, 'nebula', 'atlas.json');
  const mockTelemetryPath =
    nebulaOptions.mockTelemetryPath || path.join(mockDataRoot, 'nebula', 'telemetry.json');
  const defaultSpeciesMatrixPath =
    nebulaOptions.speciesMatrixPath ||
    nebulaOptions.speciesRolloutMatrixPath ||
    path.resolve(ROOT_DIR, 'reports', 'evo', 'rollout', 'species_ecosystem_matrix.csv');

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
    if (!statusReportPath) {
      if (releaseReporter && typeof releaseReporter.buildReport === 'function') {
        return releaseReporter.buildReport(baseStatus || { deployments: [], updatedAt: null });
      }
      return baseStatus || { deployments: [], updatedAt: null };
    }
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

  if (statusReportPath) {
    refreshStatusReport().catch((error) => {
      if (isBenignTeardownError(error)) return;
      console.warn('[release-reporter] preload fallito', error);
    });
  }

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

  // Sprint SPRINT_001 fase 3 — engine minimo giocabile.
  // Espone POST /api/session/{start,action,end} + GET /api/session/state.
  // Stato in memoria, log eventi su disco in logs/session_*.json.
  app.use('/api/session', createSessionRouter(options.session || {}));
  app.use('/api/party', createPartyRouter());
  // M7 demo playtest: feedback collection (/api/feedback, /api/feedback/summary)
  app.use('/api', createFeedbackRouter(options.feedback || {}));
  // M10 Phase B: campaign persistence + branching (ADR-2026-04-21)
  app.use('/api', createCampaignRouter(options.campaign || {}));
  // V2 Tri-Sorgente post-match reward (2026-04-26 sprint V2)
  app.use('/api', createRewardsRouter());
  // Tunic decipher Codex (2026-04-27 §H.4 ADOPT) — glyph language progression
  app.use('/api', createCodexRouter());
  // V4 PI-Pacchetti tematici (2026-04-26 sprint V4) — form recommend expose
  app.use('/api', createFormPackRouter());
  // M11 Phase A: Jackbox-style co-op lobby (ADR-2026-04-20).
  // REST only; WebSocket server bootstraps in index.js on port 3341.
  // Opzione C (2026-04-26): optional Prisma write-through persistence.
  // Graceful fallback when DATABASE_URL unset (dev/demo/tests).
  const lobbyOptions = { ...(options.lobby || {}) };
  if (!lobbyOptions.service && lobbyOptions.prisma === undefined && repo.prisma) {
    lobbyOptions.prisma = repo.prisma;
  }
  const lobby = lobbyOptions.service || new LobbyService(lobbyOptions);
  app.use('/api', createLobbyRouter({ lobby }));
  // M17 — Co-op run orchestrator (character creation + world setup + debrief).
  const coopStore = createCoopStore({ lobby });
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  app.use('/api', createCompanionRouter());

  // Skiv ticket #7 — unit diary persistence MVP (backend-only, JSONL append).
  app.use('/api', createDiaryRouter(options.diary || {}));

  // Skiv-as-Monitor — git-event-driven creature feed (2026-04-25).
  // Reads data/derived/skiv_monitor/{state.json, feed.jsonl} produced by
  // tools/py/skiv_monitor.py via .github/workflows/skiv-monitor.yml.
  app.use('/api', createSkivRouter(options.skiv || {}));

  // Sprint 3 §II (2026-04-27) — AncientBeast wiki cross-link slug bridge.
  // Cross-link runtime species (data/core/species.yaml) ↔ catalog wiki
  // (packs/evo_tactics_pack/docs/catalog/species/) via slug normalization.
  app.use('/api', createSpeciesWikiRouter());

  // Bundle B.3 codex routes già registrate sopra (line 758) — single
  // createCodexRouter() ora ospita BOTH glyph-progression (PR #1931) +
  // session decipher pages (Bundle B.3).

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

  app.use(
    '/api',
    createSpeciesBiomesRouter({
      prisma: repo.prisma,
    }),
  );

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

  const catalogInvalidateToken = process.env.CATALOG_INVALIDATE_TOKEN || '';
  app.post('/api/catalog/invalidate', async (req, res) => {
    if (!catalogInvalidateToken) {
      return res.status(403).json({ error: 'CATALOG_INVALIDATE_TOKEN not configured' });
    }
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (auth !== catalogInvalidateToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    try {
      if (catalogService && typeof catalogService.reload === 'function') {
        await catalogService.reload();
      }
      return res.json({ ok: true, message: 'Catalog cache invalidated' });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Invalidation failed' });
    }
  });

  async function close() {
    if (generationOrchestrator && typeof generationOrchestrator.close === 'function') {
      await generationOrchestrator.close();
    }
  }

  return { app, repo, generationOrchestrator, lobby, coopStore, close };
}

module.exports = { createApp };
