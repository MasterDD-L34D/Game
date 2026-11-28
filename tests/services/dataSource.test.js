'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { getEmbeddedCatalogData } = require('../../services/data-source.js');

test('getEmbeddedCatalogData returns valid catalog structure', (t) => {
  // STRICT CONSTRAINT: MOCK external deps to ensure no network/fs hits
  const fetchMock = t.mock.fn();
  globalThis.fetch = fetchMock;
  const fetchFromCandidatesMock = t.mock.fn();
  globalThis.fetchFromCandidates = fetchFromCandidatesMock;

  const data = getEmbeddedCatalogData();

  // Happy path
  assert.ok(data, 'Should return an object');
  assert.equal(typeof data, 'object');
  assert.ok('generated_at' in data, 'Should have generated_at');
  assert.ok('ecosistema' in data, 'Should have ecosistema');
  assert.equal(typeof data.ecosistema, 'object');
  assert.ok(Array.isArray(data.ecosistema.biomi), 'ecosistema should have biomi array');

  assert.equal(fetchMock.mock.callCount(), 0, 'Should not hit network');
  assert.equal(fetchFromCandidatesMock.mock.callCount(), 0, 'Should not hit network');
});

test('getEmbeddedCatalogData returns a deep clone (mutation does not affect source)', (t) => {
  // STRICT CONSTRAINT: MOCK external deps
  globalThis.fetch = t.mock.fn();
  globalThis.fetchFromCandidates = t.mock.fn();

  const data1 = getEmbeddedCatalogData();

  // Mutate data1
  const originalGeneratedAt = data1.generated_at;
  const originalLabel = data1.ecosistema.label;
  const originalSpeciesCount = data1.species.length;

  data1.generated_at = '2099-12-31T23:59:59.000Z';
  data1.ecosistema.label = 'Mutated Label';
  data1.species.push({ id: 'fake-species' });

  // Fetch again
  const data2 = getEmbeddedCatalogData();

  // Verify data2 was not affected by mutation to data1
  assert.equal(data2.generated_at, originalGeneratedAt, 'generated_at should remain unchanged');
  assert.equal(data2.ecosistema.label, originalLabel, 'ecosistema.label should remain unchanged');
  assert.equal(
    data2.species.length,
    originalSpeciesCount,
    'species array length should remain unchanged',
  );
});

test('getEmbeddedCatalogData edge/error path: falls back when structuredClone fails', (t) => {
  // STRICT CONSTRAINT: MOCK external deps
  globalThis.fetch = t.mock.fn();
  globalThis.fetchFromCandidates = t.mock.fn();

  // Mock structuredClone to throw, simulating a failure in the environment or an unsupported type
  const originalStructuredClone = globalThis.structuredClone;
  t.after(() => {
    globalThis.structuredClone = originalStructuredClone;
  });

  globalThis.structuredClone = () => {
    throw new Error('Simulated failure');
  };

  const data = getEmbeddedCatalogData();

  // Should successfully fall back to JSON.parse(JSON.stringify())
  assert.ok(data, 'Should return an object despite structuredClone failure');
  assert.ok('generated_at' in data, 'Should have generated_at');
  assert.ok('ecosistema' in data, 'Should have ecosistema');
});
