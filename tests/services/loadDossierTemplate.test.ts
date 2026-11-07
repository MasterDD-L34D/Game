import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDossierTemplate } from '../../services/export/dossier.ts';

// Note: The task mentioned mocking fs/localAsset and fetchFromCandidates, but these
// functions are not used within `loadDossierTemplate` (they are in `generatorClient.ts`).
// The primary external dependency here is the global fetch implementation, which is mocked
// via the `fetchImpl` parameter in the `LoadTemplateOptions`.

test('loadDossierTemplate - success cache hit', async () => {
  const cache = {
    get: () => 'cached html',
    set: () => {},
  };
  const res = await loadDossierTemplate('/path', { cache });
  assert.equal(res, 'cached html');
});

test('loadDossierTemplate - success network fetch', async () => {
  let cacheVal: string | null = null;
  const cache = {
    get: () => null,
    set: (val: string | null) => {
      cacheVal = val;
    },
  };
  const fetchImpl = async () =>
    ({
      ok: true,
      text: async () => 'fetched html',
    }) as unknown as Response;

  const res = await loadDossierTemplate('/path', { cache, fetchImpl });
  assert.equal(res, 'fetched html');
  assert.equal(cacheVal, 'fetched html');
});

test('loadDossierTemplate - network error (non-ok response)', async () => {
  let cacheVal: string | null | undefined = undefined;
  const cache = {
    get: () => null,
    set: (val: string | null) => {
      cacheVal = val;
    },
  };
  const fetchImpl = async () =>
    ({
      ok: false,
      status: 500,
      text: async () => 'internal server error',
    }) as unknown as Response;

  const res = await loadDossierTemplate('/path', { cache, fetchImpl });
  assert.equal(res, null);
  assert.equal(cacheVal, null);
});

test('loadDossierTemplate - network error (fetch exception)', async () => {
  let cacheVal: string | null | undefined = undefined;
  const cache = {
    get: () => null,
    set: (val: string | null) => {
      cacheVal = val;
    },
  };
  const fetchImpl = async () => {
    throw new Error('Network failure');
  };

  const res = await loadDossierTemplate('/path', { cache, fetchImpl });
  assert.equal(res, null);
  assert.equal(cacheVal, null);
});

test('loadDossierTemplate - returns null when fetch is missing', async () => {
  // Pass an explicitly undefined fetchImpl so it falls back to global fetch
  // but if global fetch is not defined (or we mock it away), we verify the catch.
  const originalFetch = globalThis.fetch;
  try {
    // @ts-ignore
    globalThis.fetch = undefined;
    const cache = {
      get: () => null,
      set: () => {},
    };
    const res = await loadDossierTemplate('/path', { cache, fetchImpl: undefined as any });
    assert.equal(res, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
