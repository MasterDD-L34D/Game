const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createCatalogService } = require('../../apps/backend/services/catalog');

function setupFixture(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-http-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const traitsDir = path.join(tempRoot, 'core', 'traits');
  fs.mkdirSync(traitsDir, { recursive: true });

  // Local glossary fixture — used when HTTP is disabled OR when fallback kicks in.
  // The label_it value is intentionally distinct so that tests can tell apart
  // a "local hit" from an "http hit".
  fs.writeFileSync(
    path.join(traitsDir, 'glossary.json'),
    JSON.stringify(
      {
        traits: {
          test_trait_local: {
            label_it: 'LOCAL it',
            label_en: 'LOCAL en',
            description_it: null,
            description_en: null,
          },
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(traitsDir, 'biome_pools.json'),
    JSON.stringify({ pools: [] }, null, 2),
  );

  return {
    dataRoot: tempRoot,
    catalogDataPath: path.join(tempRoot, 'catalog_data.json'),
  };
}

function makeMockFetch({ payload, status = 200, delayMs = 0, calls }) {
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

test('catalog http client — disabled by default returns local glossary and source=local', async (t) => {
  const fixture = setupFixture(t);
  const service = createCatalogService({
    dataRoot: fixture.dataRoot,
    traitCatalogPath: fixture.catalogDataPath,
  });

  const glossary = await service.loadTraitGlossary();
  assert.equal(glossary.traits.test_trait_local.label_it, 'LOCAL it');
  assert.equal(service.getSource(), 'local');

  const health = await service.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.source, 'local');
});

test('catalog http client — enabled + 200 OK uses HTTP payload and source=http', async (t) => {
  const fixture = setupFixture(t);
  const calls = [];
  const fetchFn = makeMockFetch({
    calls,
    payload: {
      traits: [
        {
          _id: 'test_trait_remote',
          labels: { it: 'REMOTE it', en: 'REMOTE en' },
          descriptions: { it: 'descrizione', en: 'description' },
        },
      ],
    },
  });

  const service = createCatalogService({
    dataRoot: fixture.dataRoot,
    traitCatalogPath: fixture.catalogDataPath,
    httpEnabled: true,
    httpBase: 'http://fake-game-database:3333',
    httpFetch: fetchFn,
  });

  const glossary = await service.loadTraitGlossary();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://fake-game-database:3333/api/traits/glossary');
  assert.equal(glossary.traits.test_trait_remote.label_it, 'REMOTE it');
  assert.equal(glossary.traits.test_trait_remote.description_it, 'descrizione');
  assert.equal(service.getSource(), 'http');

  const health = await service.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.source, 'http');
  assert.equal(health.httpBase, 'http://fake-game-database:3333');
});

test('catalog http client — enabled + 500 falls back to local file', async (t) => {
  const fixture = setupFixture(t);
  const calls = [];
  const fetchFn = makeMockFetch({ calls, payload: {}, status: 500 });
  const warnings = [];
  const logger = {
    warn: (...args) => warnings.push(args),
    log: () => {},
    error: () => {},
  };

  const service = createCatalogService({
    dataRoot: fixture.dataRoot,
    traitCatalogPath: fixture.catalogDataPath,
    httpEnabled: true,
    httpBase: 'http://fake-game-database:3333',
    httpFetch: fetchFn,
    logger,
  });

  const glossary = await service.loadTraitGlossary();
  assert.equal(calls.length, 1);
  assert.equal(glossary.traits.test_trait_local.label_it, 'LOCAL it');
  assert.equal(service.getSource(), 'local-fallback');
  assert.ok(warnings.length >= 1, 'fallback should emit a warning');
});

test('catalog http client — enabled + timeout aborts and falls back to local', async (t) => {
  const fixture = setupFixture(t);
  const calls = [];
  const fetchFn = makeMockFetch({ calls, payload: {}, delayMs: 200 });
  const logger = { warn: () => {}, log: () => {}, error: () => {} };

  const service = createCatalogService({
    dataRoot: fixture.dataRoot,
    traitCatalogPath: fixture.catalogDataPath,
    httpEnabled: true,
    httpBase: 'http://fake-game-database:3333',
    httpTimeoutMs: 50,
    httpFetch: fetchFn,
    logger,
  });

  const glossary = await service.loadTraitGlossary();
  assert.equal(calls.length, 1);
  assert.equal(glossary.traits.test_trait_local.label_it, 'LOCAL it');
  assert.equal(service.getSource(), 'local-fallback');
});

test('catalog http client — TTL cache reuses the first fetch result', async (t) => {
  const fixture = setupFixture(t);
  const calls = [];
  const fetchFn = makeMockFetch({
    calls,
    payload: {
      traits: [{ _id: 'cached_trait', labels: { it: 'CACHED', en: 'CACHED' }, descriptions: {} }],
    },
  });

  const service = createCatalogService({
    dataRoot: fixture.dataRoot,
    traitCatalogPath: fixture.catalogDataPath,
    httpEnabled: true,
    httpBase: 'http://fake-game-database:3333',
    httpTtlMs: 60_000,
    httpFetch: fetchFn,
  });

  await service.loadTraitGlossary();
  await service.loadTraitGlossary();
  await service.loadBiomePools();
  assert.equal(calls.length, 1, 'second loadTraitGlossary should hit the TTL cache');
});

test('catalog http client — reload() invalidates the cache and re-fetches', async (t) => {
  const fixture = setupFixture(t);
  const calls = [];
  const fetchFn = makeMockFetch({
    calls,
    payload: {
      traits: [{ _id: 'reload_trait', labels: { it: 'RELOAD', en: 'RELOAD' }, descriptions: {} }],
    },
  });

  const service = createCatalogService({
    dataRoot: fixture.dataRoot,
    traitCatalogPath: fixture.catalogDataPath,
    httpEnabled: true,
    httpBase: 'http://fake-game-database:3333',
    httpTtlMs: 60_000,
    httpFetch: fetchFn,
  });

  await service.loadTraitGlossary();
  await service.reload();
  assert.equal(calls.length, 2, 'reload should bypass the cache and trigger a second fetch');
});

test('catalog http client — httpEnabled false ignores httpBase even if set', async (t) => {
  const fixture = setupFixture(t);
  const calls = [];
  const fetchFn = makeMockFetch({ calls, payload: { traits: [] } });

  const service = createCatalogService({
    dataRoot: fixture.dataRoot,
    traitCatalogPath: fixture.catalogDataPath,
    httpEnabled: false,
    httpBase: 'http://fake-game-database:3333',
    httpFetch: fetchFn,
  });

  await service.loadTraitGlossary();
  assert.equal(calls.length, 0, 'fetch should never be called when httpEnabled is false');
  assert.equal(service.getSource(), 'local');
});
