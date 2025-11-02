const {
  ensureDefaultMetrics,
  getOrCreateGauge,
  getOrCreateCounter,
  getOrCreateHistogram,
} = require('./registry');

ensureDefaultMetrics();

const poolSizeGauge = getOrCreateGauge({
  name: 'orchestrator_pool_workers_total',
  help: 'Numero totale di worker configurati per il bridge orchestrator.',
});

const poolBusyGauge = getOrCreateGauge({
  name: 'orchestrator_pool_workers_busy',
  help: 'Numero di worker attualmente occupati.',
});

const poolQueueGauge = getOrCreateGauge({
  name: 'orchestrator_pool_queue_size',
  help: 'Numero di richieste in coda nel bridge orchestrator.',
});

const heartbeatMissedCounter = getOrCreateCounter({
  name: 'orchestrator_worker_heartbeat_missed_total',
  help: 'Conteggio heartbeat mancati dai worker del bridge orchestrator.',
});

const taskRetryCounter = getOrCreateCounter({
  name: 'orchestrator_task_retries_total',
  help: 'Numero totale di retry richiesti dalle richieste orchestrator.',
});

const taskFailureCounter = getOrCreateCounter({
  name: 'orchestrator_task_failures_total',
  help: 'Numero di richieste orchestrator fallite in modo definitivo.',
  labelNames: ['code'],
});

const taskDurationHistogram = getOrCreateHistogram({
  name: 'orchestrator_task_duration_seconds',
  help: 'Durata delle richieste orchestrator completate.',
  labelNames: ['action'],
  buckets: [0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144],
});

const queueDurationHistogram = getOrCreateHistogram({
  name: 'orchestrator_task_queue_duration_seconds',
  help: 'Tempo di attesa in coda per le richieste orchestrator.',
  labelNames: ['action'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 13],
});

function observeMs(histogram, labels, valueMs) {
  if (typeof valueMs !== 'number' || !Number.isFinite(valueMs)) {
    return;
  }
  histogram.observe(labels, Math.max(0, valueMs) / 1000);
}

function bindOrchestratorMetrics(emitter) {
  if (!emitter || typeof emitter.on !== 'function') {
    return () => {};
  }
  const listeners = [];
  const subscribe = (event, handler) => {
    emitter.on(event, handler);
    listeners.push([event, handler]);
  };

  subscribe('stats', (stats) => {
    if (!stats || typeof stats !== 'object') {
      return;
    }
    const size = Number.isFinite(stats.size) ? stats.size : 0;
    const available = Number.isFinite(stats.available) ? stats.available : 0;
    const queue = Number.isFinite(stats.queue) ? stats.queue : 0;
    poolSizeGauge.set(size);
    poolBusyGauge.set(Math.max(0, size - available));
    poolQueueGauge.set(Math.max(0, queue));
  });

  subscribe('task-completed', (payload = {}) => {
    const action = payload.action || 'unknown';
    observeMs(taskDurationHistogram, { action }, payload.latencyMs);
    observeMs(queueDurationHistogram, { action }, payload.queueTimeMs);
  });

  subscribe('task-failed', (payload = {}) => {
    const action = payload.action || 'unknown';
    observeMs(taskDurationHistogram, { action }, payload.latencyMs);
    observeMs(queueDurationHistogram, { action }, payload.queueTimeMs);
    if (!payload.willRetry) {
      const code = payload?.error?.code || 'UNKNOWN';
      taskFailureCounter.inc({ code });
    }
  });

  subscribe('task-retry', () => {
    taskRetryCounter.inc();
  });

  subscribe('heartbeat-missed', () => {
    heartbeatMissedCounter.inc();
  });

  return () => {
    for (const [event, handler] of listeners) {
      if (typeof emitter.off === 'function') {
        emitter.off(event, handler);
      } else {
        emitter.removeListener(event, handler);
      }
    }
  };
}

module.exports = { bindOrchestratorMetrics };
