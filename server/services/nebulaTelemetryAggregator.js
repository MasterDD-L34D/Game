const fs = require('node:fs/promises');
const path = require('node:path');

const { atlasDataset } = require('../../data/nebula/atlasDataset.js');

const DEFAULT_CACHE_TTL = 30_000;
const DEFAULT_TELEMETRY_LIMIT = 200;
const DEFAULT_TIMELINE_DAYS = 7;
const DEFAULT_ORCHESTRATOR_MAX_EVENTS = 250;

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normaliseNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

function buildIncidentTimeline(records, days = DEFAULT_TIMELINE_DAYS) {
  const now = new Date();
  const buckets = [];
  const bucketMap = new Map();
  const totalDays = Math.max(days, 1);
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
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

function buildTelemetryPayload(dataset, records, options = {}) {
  const species = Array.isArray(dataset?.species) ? dataset.species : [];
  const coverageHistory = buildCoverageHistory(species);
  const distribution = buildReadinessDistribution(species);
  const summary = buildTelemetrySummary(records);
  const incidentTimeline = buildIncidentTimeline(records, options.timelineDays);
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
    sample: Array.isArray(records)
      ? records.slice(0, normaliseNumber(options.limit, DEFAULT_TELEMETRY_LIMIT))
      : [],
    state: options.state || 'live',
  };
}

function buildGeneratorPayload(dataset, generatorProfile) {
  const species = Array.isArray(dataset?.species) ? dataset.species : [];
  const metrics = generatorProfile?.metrics || {};
  const status = String(generatorProfile?.status || 'unknown').toLowerCase();
  const generationTimeMs = normaliseNumber(metrics.generation_time_ms ?? metrics.generationTimeMs, null);
  const speciesTotal = normaliseNumber(metrics.species_total ?? metrics.speciesTotal, species.length);
  const enrichedSpecies = normaliseNumber(
    metrics.enriched_species ?? metrics.enrichedSpecies,
    Math.round(species.length * 0.6),
  );
  const eventTotal = normaliseNumber(metrics.event_total ?? metrics.eventTotal, 0);
  const coreTraits = normaliseNumber(metrics.core_traits_total ?? metrics.coreTraitsTotal, 0);
  const optionalTraits = normaliseNumber(metrics.optional_traits_total ?? metrics.optionalTraitsTotal, 0);
  const synergyTraits = normaliseNumber(metrics.synergy_traits_total ?? metrics.synergyTraitsTotal, 0);
  const expectedCoreTraits = normaliseNumber(metrics.expected_core_traits ?? metrics.expectedCoreTraits, 0);

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

function createFileMatcher(pattern) {
  if (!pattern) {
    return () => true;
  }
  if (pattern instanceof RegExp) {
    return (value) => pattern.test(value);
  }
  const segments = String(pattern)
    .split('*')
    .map((segment) => segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
  const escaped = segments.join('.*');
  const regex = new RegExp(`^${escaped}$`, 'i');
  return (value) => regex.test(value);
}

async function readJsonFile(filePath, fallback = null) {
  if (!filePath) {
    return fallback;
  }
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

async function loadTelemetryRecords(filePath) {
  const parsed = await readJsonFile(filePath, []);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed;
}

async function loadGeneratorTelemetry(filePath) {
  const parsed = await readJsonFile(filePath, null);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  return parsed;
}

function normaliseTimestamp(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normaliseLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const timestamp =
    entry.timestamp || entry.time || entry.ts || entry.logged_at || entry.loggedAt || entry.date || entry.created_at;
  const level = String(entry.level || entry.severity || entry.status || 'info').toLowerCase();
  const message = entry.message || entry.msg || entry.event || entry.description || 'orchestrator event';
  const details = entry.details || entry.context || entry.meta || null;
  return {
    timestamp: normaliseTimestamp(timestamp),
    level,
    message,
    details: details && typeof details === 'object' ? details : null,
  };
}

async function loadOrchestratorLogEntries(options = {}) {
  const directory = options.logDir;
  if (!directory) {
    return [];
  }
  const matcher = createFileMatcher(options.filePattern || '*.jsonl');
  let entries = [];
  try {
    const dirEntries = await fs.readdir(directory, { withFileTypes: true });
    for (const fileEntry of dirEntries) {
      if (!fileEntry.isFile()) {
        continue;
      }
      if (!matcher(fileEntry.name)) {
        continue;
      }
      const filePath = path.join(directory, fileEntry.name);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const normalised = normaliseLogEntry(parsed);
          if (normalised) {
            entries.push(normalised);
          }
        } catch (error) {
          // ignora righe non valide
        }
      }
    }
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }
  entries.sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });
  return entries;
}

function filterBySince(entries, sinceDate) {
  if (!sinceDate || !Array.isArray(entries)) {
    return Array.isArray(entries) ? entries : [];
  }
  const since = new Date(sinceDate);
  if (Number.isNaN(since.getTime())) {
    return Array.isArray(entries) ? entries : [];
  }
  return entries.filter((entry) => {
    const timestamp = entry?.timestamp || entry?.event_timestamp || entry?.created_at;
    if (!timestamp) {
      return false;
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return date.getTime() >= since.getTime();
  });
}

function limitEntries(entries, limit, maxLimit) {
  if (!Array.isArray(entries)) {
    return [];
  }
  const effectiveMax = Number.isFinite(maxLimit) && maxLimit > 0 ? maxLimit : entries.length;
  const safeLimit = Math.min(
    effectiveMax,
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), effectiveMax) : effectiveMax,
  );
  return entries.slice(0, safeLimit);
}

function buildOrchestratorSummary(entries) {
  const summary = {
    totalEntries: 0,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    lastEventAt: null,
  };
  if (!Array.isArray(entries)) {
    return summary;
  }
  let lastTimestamp = null;
  for (const entry of entries) {
    summary.totalEntries += 1;
    const level = entry?.level || 'info';
    if (level === 'error' || level === 'fatal') {
      summary.errorCount += 1;
    } else if (level === 'warn' || level === 'warning') {
      summary.warningCount += 1;
    } else {
      summary.infoCount += 1;
    }
    if (entry?.timestamp) {
      const date = new Date(entry.timestamp);
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

function resolveOptions(options = {}) {
  const telemetryOptions = {
    path: options.telemetryPath,
    limit: options.telemetry?.defaultLimit ?? DEFAULT_TELEMETRY_LIMIT,
    timelineDays: options.telemetry?.timelineDays ?? DEFAULT_TIMELINE_DAYS,
  };
  const generatorOptions = {
    path: options.generatorTelemetryPath,
  };
  const orchestratorOptions = {
    logDir: options.orchestrator?.logDir,
    filePattern: options.orchestrator?.filePattern || '*.jsonl',
    maxEvents: options.orchestrator?.maxEvents ?? DEFAULT_ORCHESTRATOR_MAX_EVENTS,
  };
  const cacheTTL = options.cacheTTL ?? DEFAULT_CACHE_TTL;
  const dataset = options.staticDataset ? cloneValue(options.staticDataset) : cloneValue(atlasDataset);
  return {
    telemetry: telemetryOptions,
    generator: generatorOptions,
    orchestrator: orchestratorOptions,
    cacheTTL,
    dataset,
  };
}

function createNebulaTelemetryAggregator(options = {}) {
  const resolved = resolveOptions(options);

  let cache = null;
  let cacheExpiresAt = 0;

  async function loadAllSources() {
    const [telemetryRecords, generatorProfile, orchestratorEntries] = await Promise.all([
      loadTelemetryRecords(resolved.telemetry.path),
      loadGeneratorTelemetry(resolved.generator.path),
      loadOrchestratorLogEntries(resolved.orchestrator),
    ]);
    return {
      dataset: cloneValue(resolved.dataset),
      telemetryRecords,
      generatorProfile,
      orchestratorEntries,
      fetchedAt: new Date().toISOString(),
    };
  }

  async function getCache({ refresh } = {}) {
    if (!refresh && cache && cacheExpiresAt > Date.now()) {
      return cache;
    }
    const next = await loadAllSources();
    cache = next;
    cacheExpiresAt = Date.now() + resolved.cacheTTL;
    return cache;
  }

  function buildTelemetry(dataset, records, params = {}) {
    const filtered = filterBySince(records, params.since);
    const limit = params.limit ?? resolved.telemetry.limit;
    return buildTelemetryPayload(dataset, filtered, {
      limit,
      timelineDays: resolved.telemetry.timelineDays,
      state: params.offline ? 'offline' : 'live',
    });
  }

  function buildGenerator(dataset, generatorProfile) {
    return buildGeneratorPayload(dataset, generatorProfile);
  }

  function buildOrchestrator(entries, params = {}) {
    const filtered = filterBySince(entries, params.since);
    const limited = limitEntries(filtered, params.limit, resolved.orchestrator.maxEvents);
    return {
      summary: buildOrchestratorSummary(filtered),
      events: limited,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    async getAtlas(params = {}) {
      const snapshot = await getCache(params);
      return {
        dataset: cloneValue(snapshot.dataset),
        telemetry: buildTelemetry(snapshot.dataset, snapshot.telemetryRecords, params),
        generator: buildGenerator(snapshot.dataset, snapshot.generatorProfile),
        orchestrator: buildOrchestrator(snapshot.orchestratorEntries, params),
        updatedAt: snapshot.fetchedAt,
      };
    },
    async getTelemetry(params = {}) {
      const snapshot = await getCache(params);
      return buildTelemetry(snapshot.dataset, snapshot.telemetryRecords, params);
    },
    async getGenerator(params = {}) {
      const snapshot = await getCache(params);
      return buildGenerator(snapshot.dataset, snapshot.generatorProfile, params);
    },
    async getOrchestrator(params = {}) {
      const snapshot = await getCache(params);
      return buildOrchestrator(snapshot.orchestratorEntries, params);
    },
    invalidateCache() {
      cache = null;
      cacheExpiresAt = 0;
    },
    __internals__: {
      buildTelemetryPayload,
      buildGeneratorPayload,
      buildTrendSeries,
      buildIncidentTimeline,
      buildTelemetrySummary,
      buildOrchestratorSummary,
      readinessTone,
      averageCoveragePercent,
    },
  };
}

module.exports = {
  createNebulaTelemetryAggregator,
  DEFAULTS: {
    cacheTTL: DEFAULT_CACHE_TTL,
    telemetryLimit: DEFAULT_TELEMETRY_LIMIT,
    timelineDays: DEFAULT_TIMELINE_DAYS,
    orchestratorMaxEvents: DEFAULT_ORCHESTRATOR_MAX_EVENTS,
  },
};
