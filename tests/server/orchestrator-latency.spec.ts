import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';

import { createGenerationOrchestratorBridge } from '../../apps/backend/services/orchestratorBridge';

function median(values: number[]): number {
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

describe('generation orchestrator latency guardrail', () => {
  const traitIds = ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'];
  let bridge: ReturnType<typeof createGenerationOrchestratorBridge>;
  let previousEnv: { nodeEnv?: string; autoClose?: string | undefined };
  const durations: number[] = [];

  before(async () => {
    previousEnv = {
      nodeEnv: process.env.NODE_ENV,
      autoClose: process.env.ORCHESTRATOR_AUTOCLOSE_MS,
    };
    process.env.NODE_ENV = 'test';
    process.env.ORCHESTRATOR_AUTOCLOSE_MS = '0';
    bridge = createGenerationOrchestratorBridge({
      poolSize: 2,
      requestTimeoutMs: 60_000,
      heartbeatIntervalMs: 1_000,
      heartbeatTimeoutMs: 5_000,
      autoShutdownMs: null,
    });
    bridge.on('task:success', (event: any) => {
      if (event?.action === 'generate-species' && Number.isFinite(event.durationMs)) {
        durations.push(Number(event.durationMs));
      }
    });
  });

  after(async () => {
    await bridge.close();
    if (previousEnv.nodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnv.nodeEnv;
    }
    if (previousEnv.autoClose === undefined) {
      delete process.env.ORCHESTRATOR_AUTOCLOSE_MS;
    } else {
      process.env.ORCHESTRATOR_AUTOCLOSE_MS = previousEnv.autoClose;
    }
  });

  it('mantiene la latenza mediana sotto la soglia configurata', async () => {
    durations.length = 0;
    const totalRequests = 12;
    const requests = Array.from({ length: totalRequests }).map((_, index) =>
      bridge.generateSpecies({
        trait_ids: traitIds,
        seed: index + 1,
        request_id: `latency-${index + 1}`,
      }),
    );

    await Promise.all(requests);

    assert.equal(
      durations.length,
      totalRequests,
      'attese misurazioni di latenza per ogni richiesta generata',
    );

    const threshold = Number(process.env.ORCHESTRATOR_MEDIAN_LATENCY_THRESHOLD_MS || '4000');
    const observedMedian = median(durations);

    assert.ok(
      observedMedian <= threshold,
      `latency guardrail superato: mediana ${observedMedian}ms > soglia ${threshold}ms`,
    );
  });
});
