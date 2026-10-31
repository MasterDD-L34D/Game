import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { fetchTraitRegistry } from '../../services/api/generatorClient.ts';

function createJsonResponse(data: unknown, init: ResponseInit = {}) {
  const body = JSON.stringify(data);
  return {
    ok: true,
    status: init.status ?? 200,
    json: async () => data,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    }),
  } as unknown as Response;
}

function createErrorResponse(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
}

describe('fetchTraitRegistry', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('returns data from a candidate successfully and does not hit real fetch', async () => {
    const globalFetchMock = mock.method(globalThis, 'fetch', async () => createErrorResponse(500));
    const mockData = { trait: 'test' };
    const fetchImpl = mock.fn(async (input: RequestInfo | URL) => {
      return createJsonResponse(mockData);
    });

    const result = await fetchTraitRegistry({
      candidates: ['https://example.com/traits.json'],
      fetchImpl,
    });

    assert.deepEqual(result.data, mockData);
    assert.equal(result.url, 'https://example.com/traits.json');
    assert.equal(result.fromFallback, false);
    assert.equal(fetchImpl.mock.calls.length, 1);
    assert.equal(globalFetchMock.mock.calls.length, 0);
  });

  it('uses fallback when candidates fail and returns fromFallback as true without real fetch', async () => {
    const globalFetchMock = mock.method(globalThis, 'fetch', async () => createErrorResponse(500));
    const mockData = { trait: 'fallback' };
    const fetchImpl = mock.fn(async (input: RequestInfo | URL) => {
      const urlStr = input.toString();
      if (urlStr === 'https://example.com/bad.json') {
        return createErrorResponse(404);
      }
      return createJsonResponse(mockData);
    });

    const result = await fetchTraitRegistry({
      candidates: ['https://example.com/bad.json'],
      fetchImpl,
    });

    assert.deepEqual(result.data, mockData);
    assert.ok(result.url?.includes('env-traits.json'));
    assert.equal(result.fromFallback, true);
    assert.equal(fetchImpl.mock.calls.length, 2);
    assert.equal(globalFetchMock.mock.calls.length, 0);
  });

  it('throws an error if all candidates and fallback fail without real fetch', async () => {
    const globalFetchMock = mock.method(globalThis, 'fetch', async () => createErrorResponse(500));
    const fetchImpl = mock.fn(async () => {
      return createErrorResponse(500);
    });

    await assert.rejects(
      async () => {
        await fetchTraitRegistry({
          candidates: ['https://example.com/traits.json'],
          fetchImpl,
        });
      },
      (err: Error) => {
        assert.equal(err.message, 'HTTP 500');
        return true;
      },
    );

    assert.equal(fetchImpl.mock.calls.length, 2);
    assert.equal(globalFetchMock.mock.calls.length, 0);
  });
});
