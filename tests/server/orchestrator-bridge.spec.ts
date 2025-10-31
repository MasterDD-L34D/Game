import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';

import { createGenerationOrchestratorBridge } from '../../server/services/orchestratorBridge';

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
    const requests = Array.from({ length: 8 }).map((_, index) => ({
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

    const pool = (bridge as any)._pool;
    assert.ok(pool, 'Pool di worker non disponibile per il test');
    const stats = pool.getStats();
    assert.equal(stats.queue, 0, 'la coda dovrebbe essere scarica dopo le richieste');
    assert.equal(stats.size, 2);
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

  it('gestisce batch paralleli e mantiene statistiche coerenti', async () => {
    const batches = Array.from({ length: 3 }).map((_, batchIndex) =>
      bridge.generateSpeciesBatch({
        batch: Array.from({ length: 3 }).map((__, entryIndex) => ({
          trait_ids: traitIds,
          seed: batchIndex * 10 + entryIndex,
          request_id: `batch-${batchIndex}-${entryIndex}`,
        })),
      }),
    );

    const results = await Promise.all(batches);
    for (const batch of results) {
      assert.equal(batch.errors.length, 0, 'nessun errore atteso nel batch');
      assert.equal(batch.results.length, 3, 'ogni batch dovrebbe produrre tre risultati');
      for (const entry of batch.results) {
        assert.ok(entry.meta?.request_id?.startsWith('batch-'));
      }
    }

    const pool = (bridge as any)._pool;
    const stats = pool.getStats();
    assert.equal(stats.queue, 0, 'nessuna richiesta dovrebbe rimanere in coda');
    assert.equal(stats.size, 2);
    assert.equal(stats.lastHeartbeats.length, 2);
    const activeHeartbeats = stats.lastHeartbeats.filter((value) => typeof value === 'number');
    assert.ok(activeHeartbeats.length >= 1, 'almeno un worker dovrebbe aver inviato un heartbeat');
  });
});
