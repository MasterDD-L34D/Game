const client = require('prom-client');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const poolBusyGauge = new client.Gauge({
  name: 'orchestrator_pool_busy_workers',
  help: 'Numero di worker orchestrator occupati',
  registers: [registry],
});

const poolQueueGauge = new client.Gauge({
  name: 'orchestrator_pool_queue_length',
  help: 'Numero di richieste in coda verso il bridge orchestrator',
  registers: [registry],
});

const poolSizeGauge = new client.Gauge({
  name: 'orchestrator_pool_total_workers',
  help: 'Numero totale di worker attivi nel pool orchestrator',
  registers: [registry],
});

const heartbeatMissedCounter = new client.Counter({
  name: 'orchestrator_worker_heartbeat_missed_total',
  help: 'Conteggio di heartbeat mancati dai worker orchestrator',
  labelNames: ['worker_id'],
  registers: [registry],
});

const taskRetryCounter = new client.Counter({
  name: 'orchestrator_task_retries_total',
  help: 'Numero di retry delle richieste orchestrator',
  labelNames: ['action'],
  registers: [registry],
});

const taskDurationHistogram = new client.Histogram({
  name: 'orchestrator_task_duration_seconds',
  help: 'Distribuzione delle durate delle richieste orchestrator',
  labelNames: ['action'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 13],
  registers: [registry],
});

function updatePoolStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return;
  }
  const size = Number(stats.size) || 0;
  const available = Number(stats.available) || 0;
  const busy = Math.max(0, size - available);
  poolSizeGauge.set(size);
  poolBusyGauge.set(busy);
  poolQueueGauge.set(Number(stats.queue) || 0);
}

function registerOrchestratorBridgeMetrics(bridge) {
  if (!bridge || typeof bridge.on !== 'function') {
    return;
  }

  bridge.on('pool:stats', (stats) => {
    updatePoolStats(stats);
  });

  bridge.on('worker:heartbeat-missed', (payload = {}) => {
    const workerId = payload.workerId !== undefined ? String(payload.workerId) : 'unknown';
    heartbeatMissedCounter.inc({ worker_id: workerId });
  });

  bridge.on('task:retry', (payload = {}) => {
    const action = payload.action || 'unknown';
    taskRetryCounter.inc({ action });
  });

  bridge.on('task:success', (payload = {}) => {
    const action = payload.action || 'unknown';
    const durationSeconds = Number(payload.durationMs || 0) / 1000;
    if (Number.isFinite(durationSeconds) && durationSeconds >= 0) {
      taskDurationHistogram.observe({ action }, durationSeconds);
    }
  });

  if (typeof bridge.getPoolStats === 'function') {
    updatePoolStats(bridge.getPoolStats());
  }
}

function getPrometheusRegistry() {
  return registry;
}

module.exports = {
  getPrometheusRegistry,
  registerOrchestratorBridgeMetrics,
};
