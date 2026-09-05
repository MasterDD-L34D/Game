// Disable on-disk status refresh so building the app under test does not race
// reports/status.json with other parallel test processes (EPERM on Windows).
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

// Deterministic, environment-independent proof of the app.js orchestrator
// gating: under IDEA_ENGINE_STUB_ORCHESTRATOR=1 the app builds the no-op stub
// (zero Python worker subprocesses), while an explicit injection still wins.
// The `Worker N terminato (SIGTERM)` / `[trait-diagnostics] preload fallito`
// noise is a CONTENTION artifact (only surfaces when many real pools spawn in
// parallel), so we assert the structural cause is gone rather than scraping logs.

const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../../apps/backend/app');

function withEnv(key, value) {
  const prior = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  return () => {
    if (prior === undefined) delete process.env[key];
    else process.env[key] = prior;
  };
}

test('createApp uses the stub orchestrator when IDEA_ENGINE_STUB_ORCHESTRATOR=1', async () => {
  const restore = withEnv('IDEA_ENGINE_STUB_ORCHESTRATOR', '1');
  const handle = createApp({ databasePath: null });
  try {
    assert.equal(typeof handle.generationOrchestrator.getPoolStats, 'function');
    // stub marker + zero workers -> no Python pool was constructed
    assert.deepEqual(handle.generationOrchestrator.getPoolStats(), { stub: true, workers: 0 });
  } finally {
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
    restore();
  }
});

test('explicit options.generationOrchestrator overrides the stub flag', async () => {
  const restore = withEnv('IDEA_ENGINE_STUB_ORCHESTRATOR', '1');
  const sentinel = {
    fetchTraitDiagnostics: async () => ({}),
    close: async () => {},
    getPoolStats: () => ({ sentinel: true }),
  };
  const handle = createApp({ databasePath: null, generationOrchestrator: sentinel });
  try {
    assert.equal(handle.generationOrchestrator, sentinel);
  } finally {
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
    restore();
  }
});
