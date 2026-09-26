// CI guard species-index.json integrity (M5-#2, P0-C audit fix 2026-04-19).
//
// Background: parallel-agent species-reviewer audit (2026-04-19) rivelò
// `packs/evo_tactics_pack/docs/catalog/species-index.json` vuoto
// (`total_species: 0`, `species: []`). Game-Database `npm run evo:import`
// leggeva questo come entry point → silent zero import.
//
// Runtime loader (`services/api/generatorClient.ts::fetchSpecies`, line
// 300-303) tenta in ordine:
//   1. `docs/catalog/species/index.json`       (PRIMARY runtime)
//   2. `docs/catalog/species.json`             (secondary — non validato qui, opzionale)
//   3. `../../docs/evo-tactics-pack/species-index.json`  (FALLBACK)
//
// Questo guard assicura che ENTRAMBI primary + fallback siano non-vuoti
// (codex-bot review su #1631 ha segnalato che validare solo fallback
// lascia regressione silenziosa sul primary runtime).
//
// Files validati (canonical + public/docs mirror):
//   - packs/evo_tactics_pack/docs/catalog/species/index.json     (PRIMARY)
//   - packs/evo_tactics_pack/docs/catalog/species-index.json     (FALLBACK/Game-Database ingest)
//   - docs/evo-tactics-pack/species/index.json                   (MIRROR primary)
//   - docs/evo-tactics-pack/species-index.json                   (MIRROR fallback)
//   - public/docs/evo-tactics-pack/species/index.json            (MIRROR primary, public)
//   - public/docs/evo-tactics-pack/species-index.json            (MIRROR fallback, public)
//
// Run: `node --test tests/scripts/speciesIndexIntegrity.test.js`
// Wirato in `npm run test:api`.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Tutti i path species-index che il runtime o l'ingest consumano.
// Ogni regressione di uno di questi = silent failure a monte.
const INDEX_PATHS = [
  {
    role: 'primary-canonical',
    path: path.join(
      REPO_ROOT,
      'packs',
      'evo_tactics_pack',
      'docs',
      'catalog',
      'species',
      'index.json',
    ),
  },
  {
    role: 'fallback-canonical',
    path: path.join(
      REPO_ROOT,
      'packs',
      'evo_tactics_pack',
      'docs',
      'catalog',
      'species-index.json',
    ),
  },
  {
    role: 'primary-mirror-docs',
    path: path.join(REPO_ROOT, 'docs', 'evo-tactics-pack', 'species', 'index.json'),
  },
  {
    role: 'fallback-mirror-docs',
    path: path.join(REPO_ROOT, 'docs', 'evo-tactics-pack', 'species-index.json'),
  },
  {
    role: 'primary-mirror-public',
    path: path.join(REPO_ROOT, 'public', 'docs', 'evo-tactics-pack', 'species', 'index.json'),
  },
  {
    role: 'fallback-mirror-public',
    path: path.join(REPO_ROOT, 'public', 'docs', 'evo-tactics-pack', 'species-index.json'),
  },
];

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

for (const { role, path: indexPath } of INDEX_PATHS) {
  test(`species-index [${role}] exists and is valid JSON`, () => {
    assert.ok(fs.existsSync(indexPath), `Missing file: ${indexPath}. Run: npm run sync:evo-pack`);
    const data = loadJson(indexPath);
    assert.equal(typeof data, 'object');
    assert.ok(data !== null, 'species-index è null');
  });

  test(`species-index [${role}] has total_species > 0 (P0-C audit guard)`, () => {
    const data = loadJson(indexPath);
    assert.ok(
      Number.isInteger(data.total_species) && data.total_species > 0,
      `total_species > 0 required. File: ${indexPath}. Current: ${data.total_species}.` +
        ' Run: `npm run sync:evo-pack`.',
    );
  });

  test(`species-index [${role}] species[] consistent with total_species`, () => {
    const data = loadJson(indexPath);
    assert.ok(Array.isArray(data.species), 'species deve essere array');
    assert.equal(
      data.species.length,
      data.total_species,
      'species.length deve uguagliare total_species',
    );
  });

  test(`species-index [${role}] entries have minimum required fields`, () => {
    const data = loadJson(indexPath);
    const requiredFields = ['id', 'display_name'];
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

  test(`species-index [${role}] ids are unique`, () => {
    const data = loadJson(indexPath);
    const ids = data.species.map((s) => s.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, 'species ids devono essere unique');
  });

  test(`species-index [${role}] schema_version present`, () => {
    const data = loadJson(indexPath);
    assert.equal(typeof data.schema_version, 'string');
    assert.ok(data.schema_version.length > 0, 'schema_version empty');
  });
}

// Cross-check: primary vs fallback canonical devono avere lo stesso total_species
// (sync:evo-pack dovrebbe rigenerarli in tandem; drift = bug pipeline).
test('primary and fallback species-index have matching total_species', () => {
  const primary = loadJson(
    path.join(REPO_ROOT, 'packs', 'evo_tactics_pack', 'docs', 'catalog', 'species', 'index.json'),
  );
  const fallback = loadJson(
    path.join(REPO_ROOT, 'packs', 'evo_tactics_pack', 'docs', 'catalog', 'species-index.json'),
  );
  assert.equal(
    primary.total_species,
    fallback.total_species,
    `Drift: primary=${primary.total_species} vs fallback=${fallback.total_species}.` +
      ' Run `npm run sync:evo-pack` per rigenerare in tandem.',
  );
});
