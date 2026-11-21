import test, { describe, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTraitReference } from '../../../services/api/generatorClient.ts';

function createJsonResponse(data, status = 200, ok = true) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

describe('fetchTraitReference', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('main path: fetches successfully from the first candidate without hitting real network', async () => {
    const mockData = { traits: ['A', 'B'] };
    let fetchedUrl = '';

    // MOCK external deps (network fetch, fs/localAsset, fetchFromCandidates)
    mock.method(globalThis, 'fetch', async (input) => {
      fetchedUrl = typeof input === 'string' ? input : input.toString();
      return createJsonResponse(mockData);
    });

    const result = await fetchTraitReference({
      candidates: ['https://dummy/trait-reference.json'],
    });

    assert.equal(fetchedUrl, 'https://dummy/trait-reference.json');
    assert.deepEqual(result.data, mockData);
    assert.equal(result.fromFallback, false);
  });

  test('edge path: falls back to local asset and flags as fromFallback without hitting real fs', async () => {
    const mockData = { fallback: true };
    mock.method(globalThis, 'fetch', async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('failing-candidate')) {
        return createJsonResponse(null, 404, false);
      }
      // If it falls back to a file:// protocol we return mockData
      if (url.startsWith('file://') && url.includes('trait-reference.json')) {
        return createJsonResponse(mockData);
      }
      return createJsonResponse(null, 404, false);
    });

    const result = await fetchTraitReference({
      candidates: ['https://dummy/failing-candidate.json'],
    });

    assert.equal(result.fromFallback, true);
    assert.deepEqual(result.data, mockData);
    assert.ok(result.url);
    assert.ok(result.url.includes('trait-reference.json'));
  });

  test('error path: throws error when all candidates and fallback fail', async () => {
    mock.method(globalThis, 'fetch', async () => {
      return createJsonResponse(null, 500, false);
    });

    await assert.rejects(
      async () => {
        await fetchTraitReference({
          candidates: ['https://dummy/candidate.json'],
        });
      },
      (err) => {
        assert.equal(err.message, 'HTTP 500');
        return true;
      },
    );
  });
});
