const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createBiomeSynthesizer } = require('../../services/generation/biomeSynthesizer');

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
