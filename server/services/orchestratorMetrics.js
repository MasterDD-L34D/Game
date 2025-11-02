const DEFAULT_PREFIX = 'game_';
const DEFAULT_DURATION_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60];

let cachedDefaultMetrics = null;
let cachedNoopMetrics = null;
let promClientRef = undefined;
let promClientLoadAttempted = false;
let missingDependencyLogged = false;

function loadPromClient() {
  if (promClientLoadAttempted) {
    return promClientRef;
  }
  promClientLoadAttempted = true;
  try {
    // Lazy require to keep the dependency optional for environments that do not install it.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    promClientRef = require('prom-client');
  } catch (error) {
    if (error && error.code !== 'MODULE_NOT_FOUND') {
      console.warn('[orchestrator-metrics] impossibile caricare prom-client:', error.message);
    } else if (!missingDependencyLogged) {
      console.warn(
        '[orchestrator-metrics] prom-client non disponibile; metriche orchestrator disabilitate',
      );
      missingDependencyLogged = true;
    }
    promClientRef = null;
  }
  return promClientRef;
}

function nowInSeconds() {
  if (typeof process.hrtime === 'function' && typeof process.hrtime.bigint === 'function') {
    return Number(process.hrtime.bigint()) / 1_000_000_000;
  }
  return Date.now() / 1000;
}

function createNoopMetrics() {
  if (cachedNoopMetrics) {
    return cachedNoopMetrics;
  }
  const noopTimer = () => () => {};
  cachedNoopMetrics = {
    setQueueDepth() {},
    setQueueDepthForAction() {},
    startTaskTimer: noopTimer,
  };
  return cachedNoopMetrics;
}

function buildLabelNames(baseLabels, extra = []) {
  const keys = Object.keys(baseLabels || {});
  return [...keys, ...extra];
}

function ensureMetric(register, name, factory) {
  if (typeof register?.getSingleMetric === 'function') {
    const existing = register.getSingleMetric(name);
    if (existing) {
      return existing;
    }
  }
  return factory();
}

function createClientMetrics(options = {}) {
  const promClient = loadPromClient();
  if (!promClient) {
    return createNoopMetrics();
  }

  const register = options.register || promClient.register;
  const prefix = options.prefix || DEFAULT_PREFIX;
  const defaultLabels = options.defaultLabels || {};
  const durationBuckets = Array.isArray(options.durationBuckets)
    ? options.durationBuckets
    : DEFAULT_DURATION_BUCKETS;

  const queueGaugeName = `${prefix}orchestrator_queue_depth`;
  const taskDurationName = `${prefix}orchestrator_task_duration_seconds`;
  const taskFailureCounterName = `${prefix}orchestrator_task_failures_total`;

  const queueGauge = ensureMetric(
    register,
    queueGaugeName,
    () =>
      new promClient.Gauge({
        name: queueGaugeName,
        help: 'Numero di richieste in coda per il generation orchestrator',
        labelNames: buildLabelNames(defaultLabels, ['action']),
        registers: [register],
      }),
  );

  const taskDuration = ensureMetric(
    register,
    taskDurationName,
    () =>
      new promClient.Histogram({
        name: taskDurationName,
        help: 'Durata delle richieste inviate al generation orchestrator (in secondi)',
        labelNames: buildLabelNames(defaultLabels, ['action', 'status']),
        buckets: durationBuckets,
        registers: [register],
      }),
  );

  const taskFailureCounter = ensureMetric(
    register,
    taskFailureCounterName,
    () =>
      new promClient.Counter({
        name: taskFailureCounterName,
        help: 'Numero totale di richieste fallite verso il generation orchestrator',
        labelNames: buildLabelNames(defaultLabels, ['action', 'code']),
        registers: [register],
      }),
  );

  const labelForAction = (action) => ({
    ...defaultLabels,
    action: action || 'unknown',
  });

  const labelForDuration = (action, status) => ({
    ...defaultLabels,
    action: action || 'unknown',
    status: status || 'ok',
  });

  const labelForFailure = (action, code) => ({
    ...defaultLabels,
    action: action || 'unknown',
    code: code || 'unknown',
  });

  const metrics = {
    setQueueDepth(size, action = 'all') {
      if (!Number.isFinite(size)) {
        return;
      }
      queueGauge.labels(labelForAction(action)).set(Math.max(size, 0));
    },
    setQueueDepthForAction(action, size) {
      if (!Number.isFinite(size)) {
        return;
      }
      queueGauge.labels(labelForAction(action)).set(Math.max(size, 0));
    },
    startTaskTimer(action) {
      const startedAt = nowInSeconds();
      return (status = 'ok', error) => {
        const durationSeconds = Math.max(nowInSeconds() - startedAt, 0);
        taskDuration.labels(labelForDuration(action, status)).observe(durationSeconds);
        if (status !== 'ok') {
          const code = error?.code || error?.name || 'error';
          taskFailureCounter.labels(labelForFailure(action, code)).inc();
        }
      };
    },
  };

  return metrics;
}

function createOrchestratorMetrics(options = {}) {
  const useDefaultCache =
    !options || (!options.register && !options.prefix && !options.defaultLabels);
  if (useDefaultCache && cachedDefaultMetrics) {
    return cachedDefaultMetrics;
  }

  const metrics = createClientMetrics(options);
  if (useDefaultCache) {
    cachedDefaultMetrics = metrics;
  }
  return metrics;
}

module.exports = {
  createOrchestratorMetrics,
};
