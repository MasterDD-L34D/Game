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

function createNebulaRouter(options = {}) {
  const router = express.Router();
  const telemetryPath = options.telemetryPath || DEFAULT_TELEMETRY_EXPORT;

  async function loadData() {
    const dataset = cloneDataset();
    const records = await loadTelemetryRecords(telemetryPath).catch((error) => {
      console.warn('[nebula-route] impossibile caricare telemetria', error);
      return [];
    });
    const telemetry = buildTelemetryPayload(dataset, records);
    return { dataset, telemetry };
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

  return router;
}

module.exports = {
  createNebulaRouter,
  __internals__: {
    cloneDataset,
    loadTelemetryRecords,
    readinessTone,
    averageCoveragePercent,
    buildCoverageHistory,
    buildReadinessDistribution,
    buildTelemetrySummary,
    buildIncidentTimeline,
    buildTelemetryPayload,
  },
};
