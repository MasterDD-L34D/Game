const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createSpeciesBuilder } = require('../../services/generation/speciesBuilder');

const DEFAULT_CATALOG_PATH = path.resolve(__dirname, '..', '..', 'docs', 'catalog', 'catalog_data.json');

test('createSpeciesBuilder exposes metadata for traits', async () => {
  const builder = createSpeciesBuilder({ catalogPath: DEFAULT_CATALOG_PATH });
  const profile = await builder.buildProfile(['pathfinder'], { baseName: 'Scout' });
  assert.ok(profile?.traits?.metadata, 'metadata should be present in trait payload');
  const metadata = profile.traits.metadata;
  assert.ok(Array.isArray(metadata.usage_tags), 'usage tags should be aggregated');
  assert.ok(metadata.usage_tags.includes('scout'), 'aggregated usage tags should include trait tags');
  assert.ok(metadata.per_trait, 'per-trait metadata should be exposed');
  const pathfinderMeta = metadata.per_trait?.pathfinder;
  assert.ok(pathfinderMeta, 'pathfinder trait metadata should be available');
  assert.ok(Array.isArray(pathfinderMeta.species_affinity), 'species affinity array should exist');
  assert.ok(pathfinderMeta.species_affinity.length > 0, 'species affinity should include entries');
  assert.equal(metadata.completion_flags.has_species_link, true, 'aggregated completion flags should be truthy for species link');
});
