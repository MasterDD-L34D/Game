const fs = require('node:fs/promises');
const path = require('node:path');

const { atlasDataset } = require('../../../data/nebula/atlasDataset.js');
const {
  loadSpeciesRolloutMatrix,
  applySpeciesRollout,
} = require('../services/nebulaTelemetryAggregator.js');
const { SchemaValidationError } = require('../middleware/schemaValidator');
const featureFlagsConfig = require('../../../config/featureFlags.json');

const NEBULA_ROLLOUT_FLAG_PATH = ['featureFlags', 'rollout', 'nebulaAtlasAggregator'];
const ROLLOUT_LOG_PREFIX = '[atlas-controller]';

const DEFAULT_TELEMETRY_EXPORT = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'derived',
  'exports',
  'qa-telemetry-export.json',
);

const DEFAULT_GENERATOR_TELEMETRY = path.resolve(
  __dirname,
  '..',
  '..',
  'logs',
  'tooling',
  'generator_run_profile.json',
);
const DEFAULT_SPECIES_MATRIX = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'reports',
  'evo',
  'rollout',
  'species_ecosystem_matrix.csv',
);

function cloneDataset() {
  return JSON.parse(JSON.stringify(atlasDataset));
}

async function loadTelemetryRecords(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function loadGeneratorTelemetry(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function readinessTone(readiness) {
  if (!readiness) {
    return 'neutral';
  }
  const value = String(readiness).toLowerCase();
  if (value.includes('richiede')) {
    return 'critical';
  }
  if (value.includes('approvazione') || value.includes('attesa')) {
    return 'warning';
  }
  if (
    value.includes('freeze') ||
    value.includes('validazione completata') ||
    value.includes('pronto')
  ) {
    return 'success';
  }
  return 'neutral';
}

function averageCoveragePercent(species) {
  if (!Array.isArray(species) || !species.length) {
    return 0;
  }
  const total = species.reduce((acc, entry) => acc + (Number(entry?.telemetry?.coverage) || 0), 0);
  return Math.round((total / species.length) * 100);
}

function buildCoverageHistory(species) {
  const average = averageCoveragePercent(species);
  if (!average) {
    return [0, 0, 0, 0];
  }
  const base = Math.max(average - 15, 0);
  return [
    Math.max(Math.round(average * 0.55), 0),
    Math.max(Math.round((base + average * 0.75) / 2), 0),
    Math.max(Math.round((average + base) / 2), 0),
    average,
  ];
}

function buildReadinessDistribution(species) {
  const distribution = { success: 0, warning: 0, neutral: 0, critical: 0 };
  if (!Array.isArray(species)) {
    return distribution;
  }
  for (const entry of species) {
    const tone = readinessTone(entry?.readiness);
    if (distribution[tone] !== undefined) {
      distribution[tone] += 1;
    }
  }
  return distribution;
}

function buildSentienceDistribution(species) {
  const distribution = {};
  if (!Array.isArray(species)) {
    return distribution;
  }
  for (const entry of species) {
    const value = entry?.sentienceIndex || entry?.sentience_index || 'Unknown';
    const key = String(value || 'Unknown');
    distribution[key] = (distribution[key] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(distribution).sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0)),
  );
}

function buildTelemetrySummary(records) {
  const summary = {
    totalEvents: 0,
    openEvents: 0,
    acknowledgedEvents: 0,
    highPriorityEvents: 0,
    lastEventAt: null,
  };
  if (!Array.isArray(records)) {
    return summary;
  }
  let lastTimestamp = null;
  for (const record of records) {
    summary.totalEvents += 1;
    const priority = String(record?.priority || '').toLowerCase();
    if (priority === 'high') {
      summary.highPriorityEvents += 1;
    }
    const status = String(record?.status || '').toLowerCase();
    const isClosed = status.includes('closed') || status.includes('risolto');
    const isAcknowledged =
      status.includes('ack') ||
      status.includes('resolved') ||
      status.includes('triaged') ||
      status.includes('chiuso');
    if (!isClosed) {
      summary.openEvents += 1;
    }
    if (isAcknowledged) {
      summary.acknowledgedEvents += 1;
    }
    const timestamp = record?.event_timestamp || record?.timestamp || record?.created_at;
    if (timestamp) {
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) {
        if (!lastTimestamp || date.getTime() > lastTimestamp.getTime()) {
          lastTimestamp = date;
        }
      }
    }
  }
  summary.lastEventAt = lastTimestamp ? lastTimestamp.toISOString() : null;
  return summary;
}

function buildIncidentTimeline(records, days = 7) {
  const now = new Date();
  const buckets = [];
  const bucketMap = new Map();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(now);
    bucketDate.setUTCDate(bucketDate.getUTCDate() - offset);
    const key = bucketDate.toISOString().slice(0, 10);
    const bucket = { date: key, total: 0, highPriority: 0 };
    buckets.push(bucket);
    bucketMap.set(key, bucket);
  }
  if (!Array.isArray(records)) {
    return buckets;
  }
  for (const record of records) {
    const timestamp = record?.event_timestamp || record?.timestamp || record?.created_at;
    if (!timestamp) {
      continue;
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const key = date.toISOString().slice(0, 10);
    const bucket = bucketMap.get(key);
    if (!bucket) {
      continue;
    }
    bucket.total += 1;
    const priority = String(record?.priority || '').toLowerCase();
    if (priority === 'high') {
      bucket.highPriority += 1;
    }
  }
  return buckets;
}

function buildTelemetryPayload(dataset, records) {
  const species = Array.isArray(dataset?.species) ? dataset.species : [];
  const coverageHistory = buildCoverageHistory(species);
  const distribution = buildReadinessDistribution(species);
  const summary = buildTelemetrySummary(records);
  const incidentTimeline = buildIncidentTimeline(records);
  const sentienceDistribution = buildSentienceDistribution(species);
  return {
    summary,
    coverage: {
      average: averageCoveragePercent(species),
      history: coverageHistory,
      distribution,
    },
    incidents: {
      timeline: incidentTimeline,
      sentienceIndexDistribution: sentienceDistribution,
    },
    updatedAt: new Date().toISOString(),
    sample: Array.isArray(records) ? records.slice(0, 20) : [],
  };
}

function normaliseNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildTrendSeries(latest, { points = 6, baseline } = {}) {
  const totalPoints = Math.max(points, 2);
  const value = normaliseNumber(latest, 0);
  if (!value) {
    return Array.from({ length: totalPoints }, () => 0);
  }
  const resolvedBaseline = baseline !== undefined ? baseline : Math.round(value * 0.6);
  let start = normaliseNumber(resolvedBaseline, value);
  if (start <= 0 || start >= value) {
    start = Math.max(Math.round(value * 0.55), Math.max(Math.round(value * 0.35), 1));
  }
  const step = (value - start) / (totalPoints - 1);
  const series = [];
  for (let index = 0; index < totalPoints; index += 1) {
    const point = start + step * index;
    series.push(Math.max(Math.round(point), 0));
  }
  return series;
}

function buildGeneratorPayload(dataset, generatorProfile) {
  const species = Array.isArray(dataset?.species) ? dataset.species : [];
  const metrics = generatorProfile?.metrics || {};
  const status = String(generatorProfile?.status || 'unknown').toLowerCase();
  const generationTimeMs = normaliseNumber(metrics.generation_time_ms, null);
  const speciesTotal = normaliseNumber(metrics.species_total, species.length);
  const enrichedSpecies = normaliseNumber(
    metrics.enriched_species,
    Math.round(species.length * 0.6),
  );
  const eventTotal = normaliseNumber(metrics.event_total, 0);
  const coreTraits = normaliseNumber(metrics.core_traits_total, 0);
  const optionalTraits = normaliseNumber(metrics.optional_traits_total, 0);
  const synergyTraits = normaliseNumber(metrics.synergy_traits_total, 0);
  const expectedCoreTraits = normaliseNumber(metrics.expected_core_traits, 0);

  const trendOptions = { points: 6 };
  const streams = {
    generationTime: buildTrendSeries(generationTimeMs || 0, trendOptions),
    species: buildTrendSeries(speciesTotal, { ...trendOptions, baseline: species.length }),
    enriched: buildTrendSeries(enrichedSpecies, {
      ...trendOptions,
      baseline: Math.round(species.length * 0.5) || 1,
    }),
  };

  const label =
    status === 'success'
      ? 'Generatore online'
      : status === 'warning' || status === 'degraded'
        ? 'Generatore in osservazione'
        : 'Generatore offline';

  return {
    status,
    label,
    generatedAt: generatorProfile?.generated_at || generatorProfile?.generatedAt || null,
    dataRoot: generatorProfile?.data_root || generatorProfile?.dataRoot || null,
    metrics: {
      generationTimeMs: generationTimeMs !== null ? generationTimeMs : null,
      speciesTotal,
      enrichedSpecies,
      eventTotal,
      datasetSpeciesTotal: species.length,
      coverageAverage: averageCoveragePercent(species),
      coreTraits,
      optionalTraits,
      synergyTraits,
      expectedCoreTraits,
    },
    streams,
    updatedAt: new Date().toISOString(),
    sourceLabel: 'Generator telemetry',
  };
}

function createAtlasLoader(options = {}) {
  const telemetryPath = options.telemetryPath || DEFAULT_TELEMETRY_EXPORT;
  const generatorPath = options.generatorTelemetryPath || DEFAULT_GENERATOR_TELEMETRY;
  const speciesMatrixPath =
    options.speciesMatrixPath || options.speciesRolloutMatrixPath || DEFAULT_SPECIES_MATRIX;
  const logger = normaliseRolloutLogger(options.logger);

  let speciesRolloutCache = null;

  async function loadSpeciesRollout() {
    if (!speciesMatrixPath) {
      return new Map();
    }
    if (speciesRolloutCache) {
      return speciesRolloutCache;
    }
    try {
      speciesRolloutCache = await loadSpeciesRolloutMatrix(speciesMatrixPath, logger);
      return speciesRolloutCache;
    } catch (error) {
      logger.warn('[atlas-controller] impossibile caricare matrice rollout specie', error);
      speciesRolloutCache = new Map();
      return speciesRolloutCache;
    }
  }

  return async function loadAtlasData() {
    const dataset = cloneDataset();
    const speciesRollout = await loadSpeciesRollout();
    applySpeciesRollout(dataset?.species, speciesRollout);
    const records = await loadTelemetryRecords(telemetryPath).catch((error) => {
      console.warn('[atlas-controller] impossibile caricare telemetria', error);
      return [];
    });
    const generatorProfile = await loadGeneratorTelemetry(generatorPath).catch((error) => {
      console.warn('[atlas-controller] impossibile caricare telemetria generatore', error);
      return null;
    });
    const telemetry = buildTelemetryPayload(dataset, records);
    const generator = buildGeneratorPayload(dataset, generatorProfile);
    return { dataset, telemetry, generator };
  };
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return false;
  }
  const normalised = String(value).trim().toLowerCase();
  return normalised === 'true' || normalised === '1' || normalised === 'yes';
}

function parseLimit(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

function normaliseRolloutLogger(logger) {
  const fallback = console;
  const target = logger && typeof logger === 'object' ? logger : fallback;
  const bind = (method) => {
    if (typeof target[method] === 'function') {
      return target[method].bind(target);
    }
    if (typeof fallback[method] === 'function') {
      return fallback[method].bind(fallback);
    }
    return () => {};
  };
  return {
    info: bind('info'),
    warn: bind('warn'),
    error: bind('error'),
  };
}

function getNebulaRolloutFlag(config) {
  let current = config;
  for (const key of NEBULA_ROLLOUT_FLAG_PATH) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = current[key];
  }
  return current && typeof current === 'object' ? current : null;
}

function parseRolloutDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function evaluateNebulaRollout(flag, context = {}) {
  const base = {
    enabled: false,
    reason: 'flag_missing',
    cohort: context?.cohort ?? null,
    stageGate: context?.stageGate ?? null,
  };
  if (!flag || typeof flag !== 'object') {
    return base;
  }

  const rollout = typeof flag.rollout === 'object' && flag.rollout !== null ? flag.rollout : {};
  const stageGate = typeof rollout.stageGate === 'string' ? rollout.stageGate.trim() : '';
  const normalisedStageGate = stageGate ? stageGate.toLowerCase() : null;
  const requestStageGate = context?.stageGate
    ? String(context.stageGate).trim().toLowerCase()
    : null;

  if (stageGate) {
    base.stageGate = stageGate;
    if (!requestStageGate) {
      return { ...base, reason: 'stage_gate_required' };
    }
    if (requestStageGate !== normalisedStageGate) {
      return { ...base, reason: 'stage_gate_mismatch' };
    }
  }

  const now = new Date();
  const start = parseRolloutDate(rollout.start);
  if (start && now < start) {
    return { ...base, reason: 'before_start' };
  }

  if (flag.default === true) {
    return {
      enabled: true,
      reason: 'default_enabled',
      cohort: context?.cohort ?? null,
      stageGate: stageGate || context?.stageGate || null,
    };
  }

  const cohorts = Array.isArray(rollout.cohorts)
    ? rollout.cohorts.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
    : [];

  if (cohorts.length) {
    if (!context?.cohort) {
      return { ...base, reason: 'cohort_missing' };
    }
    const requestCohort = String(context.cohort).trim().toLowerCase();
    if (!cohorts.includes(requestCohort)) {
      return { ...base, reason: 'cohort_not_authorized', cohort: context.cohort };
    }
    return {
      enabled: true,
      reason: 'cohort_enabled',
      cohort: context.cohort,
      stageGate: stageGate || context.stageGate || null,
    };
  }

  return { ...base, reason: 'flag_disabled' };
}

function extractRolloutContext(req) {
  const query = req?.query || {};
  const headers = req?.headers || {};
  const cohortToken =
    query.cohort ?? query.cohort_id ?? query.cohortId ?? headers['x-nebula-cohort'] ?? null;
  const stageGateToken =
    query.stageGate ??
    query.stage_gate ??
    headers['x-nebula-stage-gate'] ??
    headers['x-stage-gate'] ??
    null;
  return {
    cohort: cohortToken !== undefined && cohortToken !== null ? String(cohortToken) : null,
    stageGate:
      stageGateToken !== undefined && stageGateToken !== null ? String(stageGateToken) : null,
  };
}

function buildAggregatorParams(req) {
  const params = {};
  const query = req?.query || {};
  if (query.since) {
    params.since = query.since;
  }
  const limit = parseLimit(query.limit);
  if (limit !== undefined) {
    params.limit = limit;
  }
  if (query.refresh !== undefined) {
    params.refresh = parseBoolean(query.refresh);
  }
  if (query.offline !== undefined) {
    params.offline = parseBoolean(query.offline);
  }
  const rollout = extractRolloutContext(req);
  if (rollout.cohort) {
    params.cohort = rollout.cohort;
  }
  if (rollout.stageGate) {
    params.stageGate = rollout.stageGate;
  }
  return params;
}

function createAtlasController(options = {}) {
  const loadData = createAtlasLoader(options);
  const aggregator = options.aggregator;
  const schemaValidator = options.schemaValidator;
  const telemetrySchemaId = options.telemetrySchemaId;
  const speciesSchemaId = options.speciesSchemaId;
  const aggregatorAvailable =
    aggregator &&
    typeof aggregator.getAtlas === 'function' &&
    typeof aggregator.getTelemetry === 'function' &&
    typeof aggregator.getGenerator === 'function';
  const orchestratorAvailable =
    aggregatorAvailable && typeof aggregator.getOrchestrator === 'function';

  const rolloutOptions = options.rollout || {};
  const rolloutLogger = normaliseRolloutLogger(rolloutOptions.logger);
  const featureFlagsSource = rolloutOptions.featureFlags || featureFlagsConfig;
  const nebulaRolloutFlag = rolloutOptions.flag || getNebulaRolloutFlag(featureFlagsSource);
  const forceRollout = rolloutOptions.forceEnabled === true;
  let rolloutFallbackLogged = false;

  function validateTelemetryPayload(payload) {
    if (!schemaValidator || !telemetrySchemaId || !payload) {
      return;
    }
    try {
      schemaValidator.validate(telemetrySchemaId, payload);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        const validationError = new Error('Telemetria Nebula non conforme allo schema');
        validationError.statusCode = 500;
        validationError.details = error.details || [];
        throw validationError;
      }
      throw error;
    }
  }

  function validateSpeciesCollection(species) {
    if (!schemaValidator || !speciesSchemaId || !Array.isArray(species)) {
      return;
    }
    try {
      for (const entry of species) {
        schemaValidator.validate(speciesSchemaId, entry);
      }
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        const validationError = new Error('Specie Nebula non conformi allo schema');
        validationError.statusCode = 500;
        validationError.details = error.details || [];
        throw validationError;
      }
      throw error;
    }
  }

  function evaluateRolloutForRequest(req, aggregatorParams) {
    const contextFromParams = aggregatorParams || {};
    const fallbackContext = extractRolloutContext(req);
    const context = {
      cohort: contextFromParams.cohort ?? fallbackContext.cohort ?? null,
      stageGate: contextFromParams.stageGate ?? fallbackContext.stageGate ?? null,
    };
    if (!aggregatorAvailable) {
      return {
        enabled: false,
        reason: 'aggregator_unavailable',
        cohort: context.cohort,
        stageGate: context.stageGate,
      };
    }
    if (forceRollout) {
      return {
        enabled: true,
        reason: 'forced',
        cohort: context.cohort,
        stageGate: context.stageGate,
      };
    }
    const evaluation = evaluateNebulaRollout(nebulaRolloutFlag, context);
    if (!evaluation.cohort && context.cohort) {
      evaluation.cohort = context.cohort;
    }
    if (!evaluation.stageGate && context.stageGate) {
      evaluation.stageGate = context.stageGate;
    }
    if (!evaluation.enabled && !rolloutFallbackLogged) {
      rolloutLogger.info(
        `${ROLLOUT_LOG_PREFIX} rollout Nebula disabilitato (reason=${
          evaluation.reason || 'unknown'
        }, cohort=${evaluation.cohort || 'n/a'}, stageGate=${evaluation.stageGate || 'n/a'})`,
      );
      rolloutFallbackLogged = true;
    }
    return evaluation;
  }

  function applyRolloutHeaders(res, evaluation) {
    if (!res || typeof res.set !== 'function' || !evaluation) {
      return;
    }
    res.set('x-nebula-rollout-state', evaluation.enabled ? 'enabled' : 'disabled');
    if (evaluation.reason) {
      res.set('x-nebula-rollout-reason', evaluation.reason);
    }
    if (evaluation.stageGate) {
      res.set('x-nebula-rollout-stage-gate', evaluation.stageGate);
    }
    if (evaluation.cohort) {
      res.set('x-nebula-rollout-cohort', evaluation.cohort);
    }
  }

  return {
    async dataset(req, res) {
      try {
        const params = buildAggregatorParams(req);
        const rollout = evaluateRolloutForRequest(req, params);
        applyRolloutHeaders(res, rollout);
        if (rollout.enabled) {
          const atlas = await aggregator.getAtlas(params);
          if (atlas?.dataset) {
            validateSpeciesCollection(atlas.dataset.species);
          }
          if (atlas?.telemetry) {
            validateTelemetryPayload(atlas.telemetry);
          }
          res.json(atlas?.dataset || null);
          return;
        }
        const { dataset } = await loadData();
        validateSpeciesCollection(dataset?.species);
        res.json(dataset);
      } catch (error) {
        console.error('[atlas-controller] errore caricamento dataset', error);
        res.status(500).json({ error: error?.message || 'Errore caricamento dataset Nebula' });
      }
    },

    async telemetry(req, res) {
      try {
        const params = buildAggregatorParams(req);
        const rollout = evaluateRolloutForRequest(req, params);
        applyRolloutHeaders(res, rollout);
        if (rollout.enabled) {
          const telemetry = await aggregator.getTelemetry(params);
          if (telemetry) {
            validateTelemetryPayload(telemetry);
          }
          res.json(telemetry);
          return;
        }
        const { telemetry } = await loadData();
        validateTelemetryPayload(telemetry);
        res.json(telemetry);
      } catch (error) {
        console.error('[atlas-controller] errore caricamento telemetria', error);
        res.status(500).json({ error: error?.message || 'Errore caricamento telemetria Nebula' });
      }
    },

    async generator(req, res) {
      try {
        const params = buildAggregatorParams(req);
        const rollout = evaluateRolloutForRequest(req, params);
        applyRolloutHeaders(res, rollout);
        if (rollout.enabled) {
          const generator = await aggregator.getGenerator(params);
          res.json(generator);
          return;
        }
        const { generator } = await loadData();
        res.json(generator);
      } catch (error) {
        console.error('[atlas-controller] errore caricamento telemetria generatore', error);
        res
          .status(500)
          .json({ error: error?.message || 'Errore caricamento telemetria generatore Nebula' });
      }
    },

    async bundle(req, res) {
      try {
        const params = buildAggregatorParams(req);
        const rollout = evaluateRolloutForRequest(req, params);
        applyRolloutHeaders(res, rollout);
        if (rollout.enabled) {
          const payload = await aggregator.getAtlas(params);
          if (payload?.dataset) {
            validateSpeciesCollection(payload.dataset.species);
          }
          if (payload?.telemetry) {
            validateTelemetryPayload(payload.telemetry);
          }
          res.json(payload);
          return;
        }
        const payload = await loadData();
        if (payload?.dataset) {
          validateSpeciesCollection(payload.dataset.species);
        }
        if (payload?.telemetry) {
          validateTelemetryPayload(payload.telemetry);
        }
        res.json(payload);
      } catch (error) {
        console.error('[atlas-controller] errore aggregazione dataset', error);
        res.status(500).json({ error: error?.message || 'Errore caricamento dataset Nebula' });
      }
    },

    async orchestrator(req, res) {
      const params = buildAggregatorParams(req);
      const rollout = evaluateRolloutForRequest(req, params);
      applyRolloutHeaders(res, rollout);
      if (!rollout.enabled || !orchestratorAvailable) {
        res
          .status(404)
          .json({ error: 'Telemetria orchestrator non disponibile per rollout Nebula' });
        return;
      }
      try {
        const orchestrator = await aggregator.getOrchestrator(params);
        res.json(orchestrator);
      } catch (error) {
        console.error('[atlas-controller] errore caricamento telemetria orchestrator', error);
        res
          .status(500)
          .json({ error: error?.message || 'Errore caricamento telemetria orchestrator Nebula' });
      }
    },
  };
}

module.exports = {
  createAtlasController,
  createAtlasLoader,
  __internals__: {
    cloneDataset,
    loadTelemetryRecords,
    loadGeneratorTelemetry,
    readinessTone,
    averageCoveragePercent,
    buildCoverageHistory,
    buildReadinessDistribution,
    buildTelemetrySummary,
    buildIncidentTimeline,
    buildTelemetryPayload,
    buildGeneratorPayload,
    buildTrendSeries,
    parseBoolean,
    parseLimit,
    buildAggregatorParams,
    evaluateNebulaRollout,
    extractRolloutContext,
    getNebulaRolloutFlag,
    loadSpeciesRolloutMatrix,
    applySpeciesRollout,
  },
};
