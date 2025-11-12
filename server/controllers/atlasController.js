const fs = require('node:fs/promises');
const path = require('node:path');

const { atlasDataset } = require('../../data/nebula/atlasDataset.js');
const { SchemaValidationError } = require('../middleware/schemaValidator');

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

  return async function loadAtlasData() {
    const dataset = cloneDataset();
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
  return params;
}

function createAtlasController(options = {}) {
  const loadData = createAtlasLoader(options);
  const aggregator = options.aggregator;
  const schemaValidator = options.schemaValidator;
  const telemetrySchemaId = options.telemetrySchemaId;
  const speciesSchemaId = options.speciesSchemaId;
  const useAggregator =
    aggregator &&
    typeof aggregator.getAtlas === 'function' &&
    typeof aggregator.getTelemetry === 'function' &&
    typeof aggregator.getGenerator === 'function';

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

  return {
    async dataset(req, res) {
      try {
        if (useAggregator) {
          const atlas = await aggregator.getAtlas(buildAggregatorParams(req));
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
        if (useAggregator) {
          const telemetry = await aggregator.getTelemetry(buildAggregatorParams(req));
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
        if (useAggregator) {
          const generator = await aggregator.getGenerator(buildAggregatorParams(req));
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
        if (useAggregator) {
          const payload = await aggregator.getAtlas(buildAggregatorParams(req));
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
      if (!useAggregator || typeof aggregator.getOrchestrator !== 'function') {
        res.status(404).json({ error: 'Telemetria orchestrator non disponibile' });
        return;
      }
      try {
        const orchestrator = await aggregator.getOrchestrator(buildAggregatorParams(req));
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
  },
};
