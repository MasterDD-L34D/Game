import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';

import { createGenerationOrchestratorBridge } from '../../services/generation/orchestratorBridge';

describe('generation orchestrator bridge worker pool', () => {
  const traitIds = ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'];
  let bridge: ReturnType<typeof createGenerationOrchestratorBridge>;
  let previousEnv: { nodeEnv?: string; autoClose?: string | undefined };

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

  it('elabora richieste concorrenti mantenendo la pipeline calda', async () => {
    const requests = Array.from({ length: 6 }).map((_, index) => ({
      trait_ids: traitIds,
      seed: index + 1,
      request_id: `req-${index + 1}`,
    }));

    const results = await Promise.all(requests.map((payload) => bridge.generateSpecies(payload)));

    assert.equal(results.length, requests.length);
    for (const result of results) {
      assert.ok(result.blueprint, 'blueprint mancante nel risultato');
      assert.ok(result.meta?.request_id, 'meta.request_id mancante');
    }
  });

  it('ripristina un worker dopo un crash improvviso', async () => {
    const pool = (bridge as any)._pool;
    assert.ok(pool, 'Pool di worker non disponibile per il test');

    pool.debugKillWorker(0);
    await new Promise((resolve) => setTimeout(resolve, 750));

    const recoveryResult = await bridge.generateSpecies({
      trait_ids: traitIds,
      seed: 42,
      request_id: 'crash-recovery',
    });

    assert.ok(recoveryResult.meta?.request_id === 'crash-recovery');

    const stats = pool.getStats();
    assert.equal(stats.size, 2, 'il pool dovrebbe ripristinare il numero di worker iniziali');
  });
});
