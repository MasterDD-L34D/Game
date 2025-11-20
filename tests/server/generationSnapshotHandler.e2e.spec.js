const assert = require('node:assert/strict');
const express = require('express');
const test = require('node:test');
const request = require('supertest');

const { createGenerationSnapshotHandler } = require('../../apps/backend/routes/generationSnapshot');
const {
  createGenerationSnapshotStore,
} = require('../../apps/backend/services/generationSnapshotStore');
const { createMockFs } = require('../helpers/mockFs');

test('generationSnapshotHandler gestisce richieste concorrenti con patch coerenti', async () => {
  const datasetPath = '/data/flow-shell/atlas-snapshot.json';
  const staticDataset = {
    overview: { completion: { completed: 1, total: 5 } },
    species: { curated: 1, total: 10 },
    biomeSummary: { validated: 0, pending: 5 },
    encounterSummary: { variants: 0, seeds: 0, warnings: 0 },
    initialSpeciesRequest: { trait_ids: ['alpha-trait', 'beta-trait'] },
  };

  const fsMock = createMockFs();
  const store = createGenerationSnapshotStore({ datasetPath, fs: fsMock, staticDataset });

  const orchestratorResponses = [
    {
      blueprint: { id: 'bp-001' },
      meta: { request_id: 'req-001', fallback_used: false },
      validation: { messages: [] },
    },
    {
      blueprint: { id: 'bp-002' },
      meta: { request_id: 'req-002', fallback_used: false },
      validation: { messages: ['warn: missing texture'] },
    },
    {
      blueprint: { id: 'bp-003' },
      meta: { request_id: 'req-003', fallback_used: true },
      validation: { messages: ['warn: balance'], extra: ['note'] },
    },
  ];
  const responseDelays = [10, 5, 25];
  let orchestratorCalls = 0;

  const orchestrator = {
    async generateSpecies() {
      const callIndex = orchestratorCalls;
      orchestratorCalls += 1;
      const delay = responseDelays[callIndex] ?? 0;
      const payload =
        orchestratorResponses[callIndex] || orchestratorResponses[orchestratorResponses.length - 1];
      await new Promise((resolve) => setTimeout(resolve, delay));
      return payload;
    },
  };

  const traitDiagnostics = {
    async ensureLoaded() {
      return undefined;
    },
    getDiagnostics() {
      return { summary: { total_traits: 12, glossary_ok: 10, with_conflicts: 1 } };
    },
  };

  const handler = createGenerationSnapshotHandler({
    datasetPath,
    snapshotStore: store,
    orchestrator,
    traitDiagnostics,
    schemaValidator: null,
    validationSchemaId: null,
  });

  const app = express();
  app.use(express.json());
  app.get('/api/v1/generation/snapshot', handler);

  const curatedValues = [3, 5, 7];
  const shortlistValues = [['alpha', 'beta'], ['gamma', 'delta'], ['epsilon']];

  const concurrentRequests = curatedValues.map((curated, index) =>
    request(app)
      .get('/api/v1/generation/snapshot')
      .query({
        speciesStatus: JSON.stringify({ curated, shortlist: shortlistValues[index] }),
      })
      .expect(200),
  );

  const responses = await Promise.all(concurrentRequests);

  responses.forEach((response, index) => {
    const expected = orchestratorResponses[index];
    assert.equal(response.body.species.curated, curatedValues[index]);
    assert.deepEqual(response.body.species.shortlist, shortlistValues[index]);
    assert.equal(response.body.runtime.lastBlueprintId, expected.blueprint.id);
    assert.equal(response.body.runtime.lastRequestId, expected.meta.request_id);
    assert.equal(response.body.runtime.validationMessages, expected.validation.messages.length);
    assert.equal(response.body.runtime.fallbackUsed, Boolean(expected.meta.fallback_used));
  });

  const finalSnapshot = await store.getSnapshot();
  assert.equal(finalSnapshot.species.curated, curatedValues[curatedValues.length - 1]);
  assert.deepEqual(finalSnapshot.species.shortlist, shortlistValues[shortlistValues.length - 1]);
  assert.equal(finalSnapshot.runtime.lastBlueprintId, orchestratorResponses[2].blueprint.id);
  assert.equal(finalSnapshot.runtime.lastRequestId, orchestratorResponses[2].meta.request_id);
  assert.equal(
    finalSnapshot.runtime.validationMessages,
    orchestratorResponses[2].validation.messages.length,
  );

  assert.ok(fsMock.__files.has(datasetPath));
  assert.ok(!fsMock.__files.has(`${datasetPath}.lock`));
});
