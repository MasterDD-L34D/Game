import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import request from 'supertest';

import appModule from '../../server/app.js';

const { createApp } = appModule;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

test('GET /api/generation/snapshot?refresh=1 ricarica il dataset da disco', async (t) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'flow-shell-'));
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  const datasetPath = path.join(tempDir, 'atlas-snapshot.json');
  const diagnosticsSummary = { total_traits: 4, glossary_ok: 4, with_conflicts: 0 };
  const traitDiagnosticsSync = createStubDiagnostics(diagnosticsSummary);
  const orchestratorCalls = [];
  const stubOrchestrator = {
    async generateSpecies(request) {
      orchestratorCalls.push(request);
      return {
        blueprint: { id: `blueprint-${request?.request_id || 'unknown'}` },
        validation: { messages: [], discarded: [] },
        meta: { request_id: request?.request_id || null, fallback_used: false },
      };
    },
  };

  const datasetV1 = {
    overview: { title: 'Versione 1', objectives: ['alpha'] },
    biomes: [],
    biomeSummary: { validated: 0, pending: 0 },
    encounter: { variants: [] },
    encounterSummary: { variants: 0, seeds: 0, warnings: 0 },
    qualityRelease: { checks: {} },
    initialSpeciesRequest: {
      trait_ids: ['biome_alpha'],
      fallback_trait_ids: [],
      request_id: 'req-v1',
      seed: 'seed-v1',
    },
  };
  await writeFile(datasetPath, JSON.stringify(datasetV1, null, 2));

  const { app } = createApp({
    generationOrchestrator: stubOrchestrator,
    traitDiagnosticsSync,
    generationSnapshot: { datasetPath },
  });

  const responseV1 = await request(app).get('/api/generation/snapshot').expect(200);
  assert.equal(responseV1.body.overview.title, 'Versione 1');
  assert.equal(responseV1.body.runtime.lastBlueprintId, 'blueprint-req-v1');
  assert.equal(orchestratorCalls.length, 1);

  const datasetV2 = {
    overview: { title: 'Versione 2', objectives: ['beta'] },
    biomes: [{ validators: [] }],
    biomeSummary: { validated: 1, pending: 0 },
    encounter: { variants: [{ warnings: ['attenzione'], slots: [{ quantity: 2 }] }] },
    encounterSummary: { variants: 1, seeds: 2, warnings: 1 },
    qualityRelease: { checks: {} },
    initialSpeciesRequest: {
      trait_ids: ['biome_beta'],
      fallback_trait_ids: [],
      request_id: 'req-v2',
      seed: 'seed-v2',
    },
  };
  await writeFile(datasetPath, JSON.stringify(datasetV2, null, 2));

  const cachedResponse = await request(app).get('/api/generation/snapshot').expect(200);
  assert.equal(cachedResponse.body.overview.title, 'Versione 1');
  assert.equal(cachedResponse.body.runtime.lastBlueprintId, 'blueprint-req-v1');
  assert.equal(orchestratorCalls.length, 2);
  assert.deepEqual(orchestratorCalls[1].trait_ids, datasetV1.initialSpeciesRequest.trait_ids);

  const refreshedResponse = await request(app)
    .get('/api/generation/snapshot?refresh=1')
    .expect(200);
  assert.equal(refreshedResponse.body.overview.title, 'Versione 2');
  assert.equal(refreshedResponse.body.runtime.lastBlueprintId, 'blueprint-req-v2');
  assert.equal(orchestratorCalls.length, 3);
  assert.deepEqual(orchestratorCalls[2].trait_ids, datasetV2.initialSpeciesRequest.trait_ids);
  assert.deepEqual(refreshedResponse.body.biomeSummary, { validated: 1, pending: 0 });
  assert.equal(refreshedResponse.body.encounterSummary.variants, 1);
});
