#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createGenerationOrchestratorBridge } = require('../server/services/orchestratorBridge');

const DEFAULT_TRAITS = ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'];

function parseArgs(argv) {
  const options = {
    requests: 16,
    concurrency: 4,
    poolSize: null,
    timeout: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }
    const value = argv[index + 1];
    switch (arg) {
      case '--requests':
      case '--total':
        options.requests = Number(value) || options.requests;
        index += 1;
        break;
      case '--concurrency':
        options.concurrency = Number(value) || options.concurrency;
        index += 1;
        break;
      case '--pool-size':
        options.poolSize = Number(value) || options.poolSize;
        index += 1;
        break;
      case '--timeout':
      case '--timeout-ms':
        options.timeout = Number(value) || options.timeout;
        index += 1;
        break;
      default:
        break;
    }
  }
  options.requests = Math.max(1, Math.floor(options.requests));
  options.concurrency = Math.max(1, Math.floor(options.concurrency));
  return options;
}

function computePercentile(values, percentile) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(percentile * (sorted.length - 1))),
  );
  return sorted[index];
}

function computeMedian(values) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const poolSize = args.poolSize || undefined;
  const timeout = args.timeout || undefined;
  const totalRequests = args.requests;
  const concurrency = Math.min(args.concurrency, totalRequests);

  const orchestratorOptions = {
    autoShutdownMs: null,
  };
  if (poolSize) {
    orchestratorOptions.poolSize = poolSize;
  }
  if (timeout) {
    orchestratorOptions.requestTimeoutMs = timeout;
  }

  let orchestrator;
  const latencies = [];
  const queueLatencies = [];
  let errorCount = 0;
  let retryCount = 0;
  let heartbeatMissed = 0;

  try {
    orchestrator = createGenerationOrchestratorBridge(orchestratorOptions);

    orchestrator.on('task:success', (event) => {
      if (event?.action === 'generate-species') {
        latencies.push(Number(event.durationMs || 0));
        queueLatencies.push(Number(event.queueDurationMs || 0));
      }
    });

    orchestrator.on('task:error', (event) => {
      if (event?.action === 'generate-species') {
        errorCount += 1;
        console.error(
          `[loadtest] errore durante la richiesta ${event.id}:`,
          event.error?.message || event.error,
        );
      }
    });

    orchestrator.on('task:retry', (event) => {
      if (event?.action === 'generate-species') {
        retryCount += 1;
      }
    });

    orchestrator.on('worker:heartbeat-missed', () => {
      heartbeatMissed += 1;
    });

    const pending = { index: 0 };

    async function runWorker(workerId) {
      while (true) {
        const current = pending.index;
        if (current >= totalRequests) {
          break;
        }
        pending.index += 1;
        const requestId = `loadtest-${current + 1}`;
        try {
          await orchestrator.generateSpecies({
            trait_ids: DEFAULT_TRAITS,
            seed: current + 1,
            request_id: requestId,
          });
        } catch (error) {
          errorCount += 1;
          console.error(
            `[loadtest] worker ${workerId} errore ${requestId}:`,
            error.message || error,
          );
        }
      }
    }

    const workers = Array.from({ length: concurrency }).map((_, index) => runWorker(index + 1));
    await Promise.all(workers);
  } finally {
    if (orchestrator) {
      try {
        await orchestrator.close();
      } catch (error) {
        console.warn('[loadtest] chiusura orchestrator fallita', error);
      }
    }
  }

  const totalLatency = latencies.reduce((acc, value) => acc + value, 0);
  const averageLatency = latencies.length ? totalLatency / latencies.length : 0;
  const medianLatency = computeMedian(latencies);
  const p95Latency = computePercentile(latencies, 0.95);
  const medianQueue = computeMedian(queueLatencies);

  const summary = {
    requests: totalRequests,
    concurrency,
    poolSize: poolSize || 'default',
    timeoutMs: timeout || 'default',
    completed: latencies.length,
    errors: errorCount,
    retries: retryCount,
    heartbeatMissed,
    latency: {
      averageMs: Number(averageLatency.toFixed(2)),
      medianMs: Number(medianLatency.toFixed(2)),
      p95Ms: Number(p95Latency.toFixed(2)),
      medianQueueMs: Number(medianQueue.toFixed(2)),
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

process.on('unhandledRejection', (error) => {
  console.error('[loadtest] errore non gestito', error);
  process.exitCode = 1;
});

main().catch((error) => {
  console.error('[loadtest] esecuzione fallita', error);
  process.exitCode = 1;
});
