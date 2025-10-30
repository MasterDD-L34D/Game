import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import request from 'supertest';

import appModule from '../../server/app.js';

const { createApp } = appModule;

function createStubDiagnostics(summary = {}) {
  let ensureCalls = 0;
  const diagnostics = { summary, generated_at: '2024-05-18T10:00:00Z' };
  return {
    async load() {
      ensureCalls += 1;
      return diagnostics;
    },
    async ensureLoaded() {
      ensureCalls += 1;
      return diagnostics;
    },
    getDiagnostics() {
      return diagnostics;
    },
    get ensureCalls() {
      return ensureCalls;
    },
  };
}

test('GET /api/generation/snapshot aggrega dataset, diagnostics e orchestrator', async () => {
  const diagnosticsSummary = {
    total_traits: 12,
    glossary_ok: 10,
    with_conflicts: 2,
  };
  const traitDiagnosticsSync = createStubDiagnostics(diagnosticsSummary);
  const stubOrchestrator = {
    async generateSpecies(request) {
      return {
        blueprint: { id: `synthetic-${request?.seed || 'preview'}` },
        validation: { messages: [{ level: 'info', message: 'ok' }], discarded: [] },
        meta: { request_id: request?.request_id || null, fallback_used: false },
      };
    },
  };

  const datasetPath = path.resolve(
    __dirname,
    '..',
    '..',
    'data',
    'flow-shell',
    'atlas-snapshot.json',
  );

  const { app } = createApp({
    generationOrchestrator: stubOrchestrator,
    traitDiagnosticsSync,
    generationSnapshot: { datasetPath },
  });

  const response = await request(app).get('/api/generation/snapshot').expect(200);
  const snapshot = response.body;

  assert.ok(Array.isArray(snapshot?.overview?.objectives), 'overview deve essere presente');
  assert.equal(snapshot.runtime.lastBlueprintId.startsWith('synthetic-'), true);
  assert.deepEqual(snapshot.qualityRelease.traitDiagnosticsSummary, diagnosticsSummary);
  assert.equal(
    snapshot.biomeSummary.validated + snapshot.biomeSummary.pending,
    snapshot.biomes.length,
    'il riepilogo biomi deve riflettere il dataset',
  );
  assert.equal(
    traitDiagnosticsSync.ensureCalls >= 1,
    true,
    'ensureLoaded deve essere invocato almeno una volta',
  );
});
