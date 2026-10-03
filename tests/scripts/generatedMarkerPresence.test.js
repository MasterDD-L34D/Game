// CI guard: the generated evo-pack species catalog files must carry the
// DO-NOT-EDIT marker (Phase A / L1 generation-enforcement).
//
// The marker is emitted by scripts/update_evo_pack_catalog.js (via
// scripts/utils/generatedMarker.js) into the committed derived files. This guard
// asserts the contract on the COMMITTED files directly (no regeneration), so it
// is fast and gives an explicit failure message if the marker is dropped or
// altered by a hand-edit. The CI regenerate-and-diff gate (dataset-checks) is
// the complementary enforcement that also covers the docs/ + public/ mirrors.
//
// Run: `node --test tests/scripts/generatedMarkerPresence.test.js`

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { GENERATED_MARKER } = require('../../scripts/utils/generatedMarker');

const PACK_CATALOG = path.resolve(
  __dirname,
  '..',
  '..',
  'packs',
  'evo_tactics_pack',
  'docs',
  'catalog',
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('catalog_data.json carries the generated marker', () => {
  const data = readJson(path.join(PACK_CATALOG, 'catalog_data.json'));
  assert.equal(data._generated, GENERATED_MARKER);
});

test('every per-file species json carries the generated marker', () => {
  const speciesDir = path.join(PACK_CATALOG, 'species');
  const files = fs
    .readdirSync(speciesDir)
    .filter((name) => name.endsWith('.json') && name !== 'index.json');
  assert.ok(files.length > 0, 'expected at least one per-file species json');
  for (const name of files) {
    const data = readJson(path.join(speciesDir, name));
    assert.equal(data._generated, GENERATED_MARKER, `species/${name} missing marker`);
  }
});

test('species index files carry the generated marker', () => {
  const indexes = ['species/index.json', 'species-index.json', 'species-canonical-index.json'];
  for (const rel of indexes) {
    const data = readJson(path.join(PACK_CATALOG, rel));
    assert.equal(data._generated, GENERATED_MARKER, `${rel} missing marker`);
  }
});
