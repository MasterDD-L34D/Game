const test = require('node:test');
const assert = require('node:assert/strict');

// MOCK external deps: the test MUST NOT hit the real network or filesystem.
// The file is testing generatorClient.ts which calls fetchJson (which uses fetchImpl)
// and localAsset which generates a file:// URL. We intercept both in our mockFetch.

function makeMockFetch({ payload, status = 200, delayMs = 0, calls = [] }) {
  return async function mockFetch(url, init) {
    calls.push({ url, init });
    if (delayMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        if (init && init.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    };
  };
}

test('fetchCatalog uses candidate and resolves context properly', async (t) => {
  const { fetchCatalog } = await import('../../services/api/generatorClient.ts');

  const calls = [];
  const mockFetch = makeMockFetch({ calls, payload: { version: '1.0.0' }, status: 200 });

  const result = await fetchCatalog({
    candidates: ['https://example.com/base/'],
    fetchImpl: mockFetch,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.com/base/docs/catalog/catalog_data.json');
  assert.deepEqual(result.data, { version: '1.0.0' });
  assert.equal(result.context.resolvedBase, 'https://example.com/base/');
});

test('fetchCatalog falls back to next candidate if first fails', async (t) => {
  const { fetchCatalog } = await import('../../services/api/generatorClient.ts');

  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push(url);
    if (url === 'https://fail.com/base/docs/catalog/catalog_data.json') {
      return { ok: false, status: 404 };
    }
    return { ok: true, status: 200, json: async () => ({ success: true }) };
  };

  const result = await fetchCatalog({
    candidates: ['https://fail.com/base/', 'https://success.com/base/'],
    fetchImpl: mockFetch,
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0], 'https://fail.com/base/docs/catalog/catalog_data.json');
  assert.equal(calls[1], 'https://success.com/base/docs/catalog/catalog_data.json');
  assert.deepEqual(result.data, { success: true });
  assert.equal(result.context.resolvedBase, 'https://success.com/base/');
});

test('fetchCatalog falls back to local fallback when all candidates fail', async (t) => {
  const { fetchCatalog } = await import('../../services/api/generatorClient.ts');

  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push(url);
    // Pretend the local fallback fetch returns success.
    if (typeof url === 'string' && url.endsWith('docs/evo-tactics-pack/catalog_data.json')) {
      return { ok: true, status: 200, json: async () => ({ fallbackHit: true }) };
    }
    return { ok: false, status: 500 };
  };

  const result = await fetchCatalog({
    candidates: ['https://fail1.com/'],
    fetchImpl: mockFetch,
  });

  assert.deepEqual(result.data, { fallbackHit: true });
  assert.equal(result.context.resolvedBase, '../../docs/evo-tactics-pack/');
  assert.ok(calls.length > 1); // first the candidate, then the fallback intercepted
});

test('fetchCatalog throws when all fail and fallback fails', async (t) => {
  const { fetchCatalog } = await import('../../services/api/generatorClient.ts');

  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push(url);
    return { ok: false, status: 500 }; // Fail everything
  };

  await assert.rejects(
    fetchCatalog({
      candidates: ['https://fail1.com/', 'https://fail2.com/'],
      fetchImpl: mockFetch,
    }),
    (err) => {
      assert.match(err.message, /Impossibile caricare il catalogo/);
      return true;
    },
  );

  // Two candidates + local fallback intercepted
  assert.equal(calls.length, 3);
  assert.ok(
    typeof calls[2] === 'string' && calls[2].endsWith('docs/evo-tactics-pack/catalog_data.json'),
  );
});
