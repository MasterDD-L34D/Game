const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const { atlasDataset } = require('../../data/nebula/atlasDataset.js');

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
  if (value.includes('freeze') || value.includes('validazione completata') || value.includes('pronto')) {
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
      status.includes('ack') || status.includes('resolved') || status.includes('triaged') || status.includes('chiuso');
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
  return {
    summary,
    coverage: {
      average: averageCoveragePercent(species),
      history: coverageHistory,
      distribution,
    },
    incidents: {
      timeline: incidentTimeline,
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
  const enrichedSpecies = normaliseNumber(metrics.enriched_species, Math.round(species.length * 0.6));
  const eventTotal = normaliseNumber(metrics.event_total, 0);
  const coreTraits = normaliseNumber(metrics.core_traits_total, 0);
  const optionalTraits = normaliseNumber(metrics.optional_traits_total, 0);
  const synergyTraits = normaliseNumber(metrics.synergy_traits_total, 0);
  const expectedCoreTraits = normaliseNumber(metrics.expected_core_traits, 0);

  const trendOptions = { points: 6 };
  const streams = {
    generationTime: buildTrendSeries(generationTimeMs || 0, trendOptions),
    species: buildTrendSeries(speciesTotal, { ...trendOptions, baseline: species.length }),
    enriched: buildTrendSeries(enrichedSpecies, { ...trendOptions, baseline: Math.round(species.length * 0.5) || 1 }),
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

function createNebulaRouter(options = {}) {
  const router = express.Router();
  const telemetryPath = options.telemetryPath || DEFAULT_TELEMETRY_EXPORT;
  const generatorPath = options.generatorTelemetryPath || DEFAULT_GENERATOR_TELEMETRY;

  async function loadData() {
    const dataset = cloneDataset();
    const records = await loadTelemetryRecords(telemetryPath).catch((error) => {
      console.warn('[nebula-route] impossibile caricare telemetria', error);
      return [];
    });
    const generatorProfile = await loadGeneratorTelemetry(generatorPath).catch((error) => {
      console.warn('[nebula-route] impossibile caricare telemetria generatore', error);
      return null;
    });
    const telemetry = buildTelemetryPayload(dataset, records);
    const generator = buildGeneratorPayload(dataset, generatorProfile);
    return { dataset, telemetry, generator };
  }

  router.get('/atlas', async (req, res) => {
    try {
      const payload = await loadData();
      res.json(payload);
    } catch (error) {
      console.error('[nebula-route] errore aggregazione dataset', error);
      res.status(500).json({
        error: error?.message || 'Errore caricamento dataset Nebula',
      });
    }
  });

  router.get('/atlas/telemetry', async (req, res) => {
    try {
      const { telemetry } = await loadData();
      res.json(telemetry);
    } catch (error) {
      console.error('[nebula-route] errore aggregazione telemetria', error);
      res.status(500).json({
        error: error?.message || 'Errore caricamento telemetria Nebula',
      });
    }
  });

  router.get('/atlas/generator', async (req, res) => {
    try {
      const { generator } = await loadData();
      res.json(generator);
    } catch (error) {
      console.error('[nebula-route] errore aggregazione telemetria generatore', error);
      res.status(500).json({
        error: error?.message || 'Errore caricamento telemetria generatore Nebula',
      });
    }
  });

  return router;
}

module.exports = {
  createNebulaRouter,
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
  },
};
