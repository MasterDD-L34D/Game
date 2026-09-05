'use strict';

// Unit contract for the no-op generation orchestrator used by Node-native API
// tests that never exercise /api/v1/generation/*. The stub must satisfy the
// surface app.js touches at boot/teardown without spawning Python workers:
//   - fetchTraitDiagnostics() resolves an empty diagnostics object
//   - close() is a no-op
//   - generate*() reject with a clear "stub" error (loud if ever reached)
// See apps/backend/services/stubOrchestrator.js + run-test-api.cjs gating.

const test = require('node:test');
const assert = require('node:assert/strict');

const { createStubOrchestrator } = require('../../apps/backend/services/stubOrchestrator');

test('stub orchestrator: fetchTraitDiagnostics resolves empty object', async () => {
  const stub = createStubOrchestrator();
  assert.equal(typeof stub.fetchTraitDiagnostics, 'function');
  const result = await stub.fetchTraitDiagnostics();
  assert.deepEqual(result, {});
});

test('stub orchestrator: close is a no-op that resolves', async () => {
  const stub = createStubOrchestrator();
  assert.equal(typeof stub.close, 'function');
  await assert.doesNotReject(() => stub.close());
});

test('stub orchestrator: generateSpecies rejects with a stub error', async () => {
  const stub = createStubOrchestrator();
  assert.equal(typeof stub.generateSpecies, 'function');
  await assert.rejects(() => stub.generateSpecies({}), /stub/i);
});

test('stub orchestrator: generateSpeciesBatch rejects with a stub error', async () => {
  const stub = createStubOrchestrator();
  assert.equal(typeof stub.generateSpeciesBatch, 'function');
  await assert.rejects(() => stub.generateSpeciesBatch({}), /stub/i);
});

test('stub orchestrator: getPoolStats reports zero live workers', () => {
  const stub = createStubOrchestrator();
  const stats = stub.getPoolStats();
  assert.equal(stats.workers, 0);
  assert.equal(stats.stub, true);
});
