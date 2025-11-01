const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const { createNebulaTelemetryAggregator } = require('../services/nebulaTelemetryAggregator');

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

const DEFAULT_ORCHESTRATOR_LOG_DIR = path.resolve(__dirname, '..', '..', 'logs', 'tooling');
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', '..', 'config', 'nebula.json');

const DEFAULT_CONFIG = {
  cache: { ttlMs: 30_000 },
  telemetry: { defaultLimit: 200, timelineDays: 7 },
  orchestrator: {
    logDirectory: DEFAULT_ORCHESTRATOR_LOG_DIR,
    filePattern: '*.jsonl',
    maxEvents: 250,
  },
};

function mergeConfig(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeConfig(base[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadConfig(configPath, inlineConfig) {
  if (inlineConfig && typeof inlineConfig === 'object') {
    return mergeConfig(DEFAULT_CONFIG, inlineConfig);
  }
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(content);
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn('[nebula-route] impossibile leggere config Nebula', error);
    }
    return { ...DEFAULT_CONFIG };
  }
}

function resolveOrchestratorDir(dirPath) {
  if (!dirPath) {
    return DEFAULT_ORCHESTRATOR_LOG_DIR;
  }
  if (path.isAbsolute(dirPath)) {
    return dirPath;
  }
  return path.resolve(__dirname, '..', '..', dirPath);
}

function parseLimit(value, defaultLimit, maxEvents) {
  const fallback = Number.isFinite(defaultLimit) && defaultLimit > 0 ? Math.floor(defaultLimit) : 50;
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  const hardLimit = Number.isFinite(maxEvents) && maxEvents > 0 ? Math.floor(maxEvents) : fallback;
  return Math.min(parsed, hardLimit);
}

function parseSince(value) {
  if (!value) {
    return null;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function extractRequestParams(query, config) {
  const defaultLimit = config.telemetry?.defaultLimit ?? DEFAULT_CONFIG.telemetry.defaultLimit;
  const maxEvents = config.orchestrator?.maxEvents ?? DEFAULT_CONFIG.orchestrator.maxEvents;
  return {
    since: parseSince(query?.since),
    limit: parseLimit(query?.limit, defaultLimit, maxEvents),
  };
}

function createNebulaRouter(options = {}) {
  const router = express.Router();

  const configPath = options.configPath || DEFAULT_CONFIG_PATH;
  const config = loadConfig(configPath, options.config);

  const aggregator =
    options.aggregator ||
    createNebulaTelemetryAggregator({
      telemetryPath: options.telemetryPath || DEFAULT_TELEMETRY_EXPORT,
      generatorTelemetryPath: options.generatorTelemetryPath || DEFAULT_GENERATOR_TELEMETRY,
      cacheTTL: config.cache?.ttlMs,
      telemetry: {
        defaultLimit: config.telemetry?.defaultLimit,
        timelineDays: config.telemetry?.timelineDays,
      },
      orchestrator: {
        logDir: resolveOrchestratorDir(config.orchestrator?.logDirectory),
        filePattern: config.orchestrator?.filePattern,
        maxEvents: config.orchestrator?.maxEvents,
      },
    });

  router.get('/atlas', async (req, res) => {
    const params = extractRequestParams(req.query, config);
    try {
      const payload = await aggregator.getAtlas(params);
      res.json(payload);
    } catch (error) {
      console.error('[nebula-route] errore aggregazione dataset', error);
      res.status(500).json({
        error: error?.message || 'Errore caricamento dataset Nebula',
      });
    }
  });

  router.get('/atlas/telemetry', async (req, res) => {
    const params = extractRequestParams(req.query, config);
    try {
      const telemetry = await aggregator.getTelemetry(params);
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
      const generator = await aggregator.getGenerator();
      res.json(generator);
    } catch (error) {
      console.error('[nebula-route] errore aggregazione telemetria generatore', error);
      res.status(500).json({
        error: error?.message || 'Errore caricamento telemetria generatore Nebula',
      });
    }
  });

  router.get('/atlas/orchestrator', async (req, res) => {
    const params = extractRequestParams(req.query, config);
    try {
      const orchestrator = await aggregator.getOrchestrator(params);
      res.json(orchestrator);
    } catch (error) {
      console.error('[nebula-route] errore aggregazione orchestratore', error);
      res.status(500).json({
        error: error?.message || 'Errore caricamento orchestratore Nebula',
      });
    }
  });

  return router;
}

module.exports = {
  createNebulaRouter,
  __internals__: {
    loadConfig,
    mergeConfig,
    extractRequestParams,
    parseSince,
    parseLimit,
    resolveOrchestratorDir,
  },
};
