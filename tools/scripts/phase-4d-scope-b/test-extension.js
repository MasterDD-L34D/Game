/**
 * Phase 4d Scope B — test extension for taxonomyRouters.test.js (Game-Database).
 *
 * Append this suite to server/tests/taxonomyRouters.test.js.
 * Requires fixture at server/tests/fixtures/species_catalog_53.json
 *   (copy from Game/data/core/species/species_catalog.json — see README.md step 3).
 */

const path = require('path');

describe('Phase 4d Scope B — canonical species_catalog.json import', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.GAME_CANONICAL_CATALOG_PATH;
    // Clear require cache so module-level state resets between tests
    delete require.cache[require.resolve('../../scripts/ingest/import-taxonomy')];
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GAME_CANONICAL_CATALOG_PATH;
    } else {
      process.env.GAME_CANONICAL_CATALOG_PATH = originalEnv;
    }
  });

  test('reads species_catalog.json when available', () => {
    process.env.GAME_CANONICAL_CATALOG_PATH = path.join(
      __dirname,
      'fixtures',
      'species_catalog_53.json',
    );
    const { loadGameCanonicalSpeciesCatalog } = require('../../scripts/ingest/import-taxonomy');
    const catalog = loadGameCanonicalSpeciesCatalog();
    expect(catalog).toBeTruthy();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBe(53);
  });

  test('canonical entries have rich schema fields', () => {
    process.env.GAME_CANONICAL_CATALOG_PATH = path.join(
      __dirname,
      'fixtures',
      'species_catalog_53.json',
    );
    const { loadGameCanonicalSpeciesCatalog } = require('../../scripts/ingest/import-taxonomy');
    const catalog = loadGameCanonicalSpeciesCatalog();
    const first = catalog[0];
    expect(first).toHaveProperty('slug');
    expect(first).toHaveProperty('clade_tag');
    expect(first).toHaveProperty('sentience_index');
    expect(first).toHaveProperty('_provenance_audit');
    expect(first).toHaveProperty('source_provenance');
    expect(first).toHaveProperty('_catalog_version');
  });

  test('dune_stalker (Skiv) preserves canonical fields', () => {
    process.env.GAME_CANONICAL_CATALOG_PATH = path.join(
      __dirname,
      'fixtures',
      'species_catalog_53.json',
    );
    const { loadGameCanonicalSpeciesCatalog } = require('../../scripts/ingest/import-taxonomy');
    const catalog = loadGameCanonicalSpeciesCatalog();
    const skiv = catalog.find((e) => e.slug === 'dune_stalker');
    expect(skiv).toBeTruthy();
    expect(skiv.biome_affinity).toBe('savana');
    expect(skiv.clade_tag).toBe('Threat');
    expect(skiv.sentience_index).toBe('T2');
    expect(skiv.default_parts).toBeTruthy();
    expect(skiv.default_parts.locomotion).toBe('burrower');
  });

  test('fallback gracefully when canonical missing', () => {
    process.env.GAME_CANONICAL_CATALOG_PATH = '/nonexistent/canonical-path.json';
    const { loadGameCanonicalSpeciesCatalog } = require('../../scripts/ingest/import-taxonomy');
    const catalog = loadGameCanonicalSpeciesCatalog();
    expect(catalog).toBeNull();
  });

  test('fallback gracefully when JSON malformed', () => {
    const tmpFile = path.join(__dirname, 'fixtures', 'malformed_catalog.json');
    const fs = require('fs');
    fs.writeFileSync(tmpFile, '{not valid json', 'utf8');
    try {
      process.env.GAME_CANONICAL_CATALOG_PATH = tmpFile;
      const { loadGameCanonicalSpeciesCatalog } = require('../../scripts/ingest/import-taxonomy');
      const catalog = loadGameCanonicalSpeciesCatalog();
      expect(catalog).toBeNull();
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});
