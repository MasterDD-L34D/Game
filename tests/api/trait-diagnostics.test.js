const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../server/app');

function createStubTraitDiagnostics(data) {
  const diagnostics = data;
  let loadCalls = 0;
  return {
    load: () => {
      loadCalls += 1;
      return Promise.resolve(diagnostics);
    },
    ensureLoaded: () => Promise.resolve(diagnostics),
    getDiagnostics: () => diagnostics,
    getStatus: () => ({ fetchedAt: '2025-01-01T00:00:00Z', loading: false, error: null }),
    get loadCalls() {
      return loadCalls;
    },
  };
}

test('GET /api/traits/diagnostics espone coverage e conflitti', async () => {
  const payload = {
    summary: {
      total_traits: 5,
      glossary_ok: 4,
      matrix_mismatch: 1,
      with_conflicts: 2,
    },
    traits: [
      {
        id: 'artigli_sette_vie',
        label: 'Artigli a Sette Vie',
        coverage: { core: 2, optional: 1, synergy: 0 },
        statuses: { glossary: 'ok', matrix: 'ok' },
        conflicts: ['rete_neurale_ibrida'],
        synergies: ['coda_frusta_cinetica'],
      },
    ],
  };

  const stubDiagnostics = createStubTraitDiagnostics(payload);
  const orchestrator = {
    generateSpecies: async () => ({ blueprint: {}, validation: {}, meta: {} }),
    generateSpeciesBatch: async () => ({ results: [], errors: [] }),
  };

  const { app } = createApp({
    generationOrchestrator: orchestrator,
    traitDiagnosticsSync: stubDiagnostics,
  });

  const response = await request(app)
    .get('/api/traits/diagnostics')
    .expect(200);

  assert.deepEqual(response.body.diagnostics.summary, payload.summary);
  assert.equal(response.body.diagnostics.traits.length, 1);
  assert.equal(response.body.meta.fetched_at, '2025-01-01T00:00:00Z');
  assert.equal(stubDiagnostics.loadCalls, 1, 'la prima richiesta usa il payload precaricato');

  await request(app).get('/api/traits/diagnostics?refresh=true').expect(200);
  assert.equal(stubDiagnostics.loadCalls, 2, 'refresh forza la rigenerazione');
});
