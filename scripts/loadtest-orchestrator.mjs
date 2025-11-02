#!/usr/bin/env node
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createGenerationOrchestratorBridge } = require('../server/services/orchestratorBridge');

const DEFAULT_TRAIT_IDS = [
  'artigli_sette_vie',
  'coda_frusta_cinetica',
  'scheletro_idro_regolante',
];
const DEFAULT_REQUESTS = 12;
const DEFAULT_CONCURRENCY = 4;

function parseNumber(value, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return fallback;
}

function parseCli(argv) {
  const options = {
    requests: DEFAULT_REQUESTS,
    concurrency: DEFAULT_CONCURRENCY,
    thresholdMs: null,
    poolSize: null,
    requestTimeoutMs: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token || !token.startsWith('--')) {
      continue;
    }
    const [flag, rawValue] = token.split('=', 2);
    const nextValue = rawValue !== undefined ? rawValue : argv[index + 1];
    switch (flag) {
      case '--requests':
        if (nextValue !== undefined && rawValue === undefined) index += 1;
        options.requests = parseNumber(nextValue, options.requests);
        break;
      case '--concurrency':
        if (nextValue !== undefined && rawValue === undefined) index += 1;
        options.concurrency = parseNumber(nextValue, options.concurrency);
        break;
      case '--threshold-ms':
        if (nextValue !== undefined && rawValue === undefined) index += 1;
        options.thresholdMs = parseNumber(nextValue, options.thresholdMs);
        break;
      case '--pool-size':
        if (nextValue !== undefined && rawValue === undefined) index += 1;
        options.poolSize = parseNumber(nextValue, options.poolSize);
        break;
      case '--timeout-ms':
      case '--request-timeout-ms':
        if (nextValue !== undefined && rawValue === undefined) index += 1;
        options.requestTimeoutMs = parseNumber(nextValue, options.requestTimeoutMs);
        break;
      default:
        break;
    }
  }
  options.requests = Math.max(1, Math.floor(options.requests));
  options.concurrency = Math.max(1, Math.floor(options.concurrency));
  if (options.poolSize !== null) {
    options.poolSize = Math.max(1, Math.floor(options.poolSize));
  }
  if (options.thresholdMs !== null) {
    options.thresholdMs = Math.max(1, Math.floor(options.thresholdMs));
  }
  if (options.requestTimeoutMs !== null) {
    options.requestTimeoutMs = Math.max(1, Math.floor(options.requestTimeoutMs));
  }
  return options;
}

function buildPayload(index) {
  return {
    trait_ids: DEFAULT_TRAIT_IDS,
    seed: index + 1,
    request_id: `loadtest-${Date.now()}-${index}`,
  };
}

function computeStats(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const medianIndex = Math.floor((sorted.length - 1) / 2);
  const medianValue =
    sorted.length % 2 === 0
      ? (sorted[medianIndex] + sorted[medianIndex + 1]) / 2
      : sorted[medianIndex];
  const percentile = (p) => {
    if (sorted.length === 1) {
      return sorted[0];
    }
    const rank = (sorted.length - 1) * p;
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) {
      return sorted[lower];
    }
    const weight = rank - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: medianValue,
    p90: percentile(0.9),
    p95: percentile(0.95),
    average: total / sorted.length,
  };
}

async function main() {
  const cliOptions = parseCli(process.argv.slice(2));
  const orchestratorOptions = { autoShutdownMs: null };
  if (cliOptions.poolSize !== null) {
    orchestratorOptions.poolSize = cliOptions.poolSize;
  }
  if (cliOptions.requestTimeoutMs !== null) {
    orchestratorOptions.requestTimeoutMs = cliOptions.requestTimeoutMs;
  }

  const bridge = createGenerationOrchestratorBridge(orchestratorOptions);
  const events = bridge.events;
  const latencies = [];
  const queueTimes = [];
  const retryEvents = [];
  const failedEvents = [];
  const requestErrors = [];
  let latestStats = null;

  const onStats = (payload) => {
    latestStats = payload;
  };
  const onCompleted = (payload = {}) => {
    if (typeof payload.latencyMs === 'number' && Number.isFinite(payload.latencyMs)) {
      latencies.push(payload.latencyMs);
    }
    if (typeof payload.queueTimeMs === 'number' && Number.isFinite(payload.queueTimeMs)) {
      queueTimes.push(payload.queueTimeMs);
    }
  };
  const onFailed = (payload = {}) => {
    failedEvents.push(payload);
  };
  const onRetry = (payload = {}) => {
    retryEvents.push(payload);
  };

  events.on('stats', onStats);
  events.on('task-completed', onCompleted);
  events.on('task-failed', onFailed);
  events.on('task-retry', onRetry);

  const totalRequests = cliOptions.requests;
  const maxConcurrency = Math.min(cliOptions.concurrency, totalRequests);
  const summary = {
    requested: totalRequests,
    concurrency: maxConcurrency,
    successes: 0,
    failures: 0,
  };

  let nextIndex = 0;
  const workers = Array.from({ length: maxConcurrency }).map(async () => {
    while (nextIndex < totalRequests) {
      const current = nextIndex;
      nextIndex += 1;
      const payload = buildPayload(current);
      try {
        await bridge.generateSpecies(payload);
        summary.successes += 1;
      } catch (error) {
        summary.failures += 1;
        requestErrors.push({
          index: current,
          code: error?.code || 'UNKNOWN',
          message: error?.message || 'Errore generazione',
        });
      }
    }
  });

  try {
    await Promise.all(workers);
  } finally {
    if (typeof events.off === 'function') {
      events.off('stats', onStats);
      events.off('task-completed', onCompleted);
      events.off('task-failed', onFailed);
      events.off('task-retry', onRetry);
    } else {
      events.removeListener('stats', onStats);
      events.removeListener('task-completed', onCompleted);
      events.removeListener('task-failed', onFailed);
      events.removeListener('task-retry', onRetry);
    }
    await bridge.close();
  }

  const latencyStats = computeStats(latencies);
  const queueStats = computeStats(queueTimes);
  const retryCount = retryEvents.length;
  const definitiveFailures = failedEvents.filter((entry) => entry && entry.willRetry === false);
  const thresholdExceeded =
    cliOptions.thresholdMs !== null && latencyStats
      ? latencyStats.median > cliOptions.thresholdMs
      : false;

  const report = {
    requests: summary.requested,
    concurrency: summary.concurrency,
    poolSize: latestStats?.size ?? null,
    successes: summary.successes,
    failures: summary.failures,
    retries: retryCount,
    latencyMs: latencyStats,
    queueMs: queueStats,
    thresholdMs: cliOptions.thresholdMs,
    thresholdExceeded,
    definitiveFailures: definitiveFailures.length,
    errors: requestErrors,
  };

  const formatMs = (value) => (Number.isFinite(value) ? value.toFixed(1) : 'n/d');
  console.log(
    `[loadtest] richieste:${report.requests} successi:${report.successes} errori:${report.failures} retry:${report.retries}`,
  );
  if (latencyStats) {
    console.log(
      `[loadtest] latenza mediana ${formatMs(latencyStats.median)} ms (p95 ${formatMs(
        latencyStats.p95,
      )} ms, max ${formatMs(latencyStats.max)} ms)`);
  } else {
    console.log('[loadtest] nessuna latenza registrata');
  }
  if (queueStats) {
    console.log(
      `[loadtest] coda mediana ${formatMs(queueStats.median)} ms (p95 ${formatMs(queueStats.p95)} ms)`,
    );
  }

  console.log(JSON.stringify(report, null, 2));

  if (summary.failures > 0 || requestErrors.length > 0 || thresholdExceeded) {
    if (thresholdExceeded && latencyStats) {
      console.error(
        `[loadtest] latenza mediana ${formatMs(latencyStats.median)} ms oltre soglia impostata (${cliOptions.thresholdMs} ms)`,
      );
    }
    if (summary.failures > 0 && requestErrors.length) {
      console.error('[loadtest] esempi errori:', requestErrors.slice(0, 3));
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[loadtest] errore critico', error);
  process.exitCode = 1;
});
