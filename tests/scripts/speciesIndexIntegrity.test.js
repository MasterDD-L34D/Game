// CI guard species-index.json integrity (M5-#2, P0-C audit fix 2026-04-19).
//
// Background: parallel-agent species-reviewer audit (2026-04-19) rivelò
// `packs/evo_tactics_pack/docs/catalog/species-index.json` vuoto
// (`total_species: 0`, `species: []`). Game-Database `npm run evo:import`
// leggeva questo come entry point → silent zero import.
//
// Questo guard assicura che:
// - il file esista ed sia JSON valido;
// - `total_species > 0` (regenerable via `npm run sync:evo-pack`);
// - `species[]` abbia lunghezza coerente con `total_species`;
// - ogni entry abbia i campi minimi richiesti da Game-Database ingest.
//
// Run: `node --test tests/scripts/speciesIndexIntegrity.test.js`
// Run nello script CI: incluso in `npm run test:backend` via Node test runner.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(
  REPO_ROOT,
  'packs',
  'evo_tactics_pack',
  'docs',
  'catalog',
  'species-index.json',
);

function loadIndex() {
  const raw = fs.readFileSync(INDEX_PATH, 'utf8');
  return JSON.parse(raw);
}

test('species-index.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(INDEX_PATH), `Missing file: ${INDEX_PATH}`);
  const data = loadIndex();
  assert.equal(typeof data, 'object');
  assert.ok(data !== null, 'species-index.json is null');
});

test('species-index.json has total_species > 0 (P0-C audit guard)', () => {
  const data = loadIndex();
  assert.ok(
    Number.isInteger(data.total_species) && data.total_species > 0,
    `total_species deve essere > 0. Current: ${data.total_species}.` +
      ' Run: `npm run sync:evo-pack` per rigenerare.',
  );
});

test('species-index.json has species[] length consistent with total_species', () => {
  const data = loadIndex();
  assert.ok(Array.isArray(data.species), 'species deve essere array');
  assert.equal(
    data.species.length,
    data.total_species,
    'species.length deve uguagliare total_species',
  );
});

test('each species entry has minimum required fields for Game-Database ingest', () => {
  const data = loadIndex();
  const requiredFields = ['id', 'display_name', 'path'];
  const errors = [];
  for (const entry of data.species) {
    for (const field of requiredFields) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        errors.push(`species '${entry.id ?? '<no-id>'}' missing ${field}`);
      }
    }
  }
  assert.deepEqual(errors, [], `Required fields missing:\n  ${errors.join('\n  ')}`);
});

test('species ids are unique', () => {
  const data = loadIndex();
  const ids = data.species.map((s) => s.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'species ids devono essere unique');
});

test('schema_version present and non-empty', () => {
  const data = loadIndex();
  assert.equal(typeof data.schema_version, 'string');
  assert.ok(data.schema_version.length > 0, 'schema_version empty');
});
