const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createBiomeSynthesizer } = require('../../services/generation/biomeSynthesizer');
const { createCatalogService } = require('../../apps/backend/services/catalog');

const DATA_ROOT = path.resolve(__dirname, '..', '..', 'data');
const BIOME_POOLS_PATH = path.resolve(DATA_ROOT, 'core', 'traits', 'biome_pools.json');

test('biome pools receive root metadata when loaded from filesystem', async () => {
  const poolsFile = JSON.parse(fs.readFileSync(BIOME_POOLS_PATH, 'utf8'));
  const synthesizer = createBiomeSynthesizer({ dataRoot: DATA_ROOT });

  const { poolList } = await synthesizer.load();

  assert.ok(Array.isArray(poolList) && poolList.length > 0, 'expected at least one biome pool');

  for (const pool of poolList) {
    assert.ok(pool && typeof pool === 'object', 'pool entries should be objects');
    assert.ok(pool.metadata, `pool ${pool?.id || '<unknown>'} should expose metadata`);
    assert.equal(
      pool.metadata.schema_version,
      poolsFile.schema_version,
      'schema_version should match root metadata',
    );
    assert.equal(
      pool.metadata.updated_at,
      poolsFile.updated_at,
      'updated_at should match root metadata',
    );
  }
});

test('fallback catalog loader injects metadata into biome pools', async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-fallback-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const traitsDir = path.join(tempRoot, 'core', 'traits');
  fs.mkdirSync(traitsDir, { recursive: true });

  const poolsPayload = {
    schema_version: '2.5.0',
    updated_at: '2035-12-31T23:59:59Z',
    pools: [
      { _id: 'alpha', traits: { core: [] }, metadata: {} },
      { _id: 'beta', traits: { core: [] } },
    ],
  };

  fs.writeFileSync(
    path.join(traitsDir, 'biome_pools.json'),
    `${JSON.stringify(poolsPayload, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(traitsDir, 'glossary.json'), '{"traits":{}}\n');

  const service = createCatalogService({
    dataRoot: tempRoot,
    useMongo: false,
    traitCatalogPath: path.join(tempRoot, 'catalog_data.json'),
  });

  const biomePools = await service.loadBiomePools();
  const pools = biomePools.pools || [];

  assert.equal(pools.length, 2, 'fallback loader should return all pools');
  pools.forEach((pool) => {
    assert.ok(pool.metadata, 'metadata should be attached to each pool');
    assert.equal(pool.metadata.schema_version, poolsPayload.schema_version);
    assert.equal(pool.metadata.updated_at, poolsPayload.updated_at);
  });
});
