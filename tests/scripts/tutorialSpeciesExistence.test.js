// CI guard tutorial/hardcore scenario species references match YAML files.
//
// Background: parallel-agent species-reviewer audit (2026-04-19) rivelò
// 5 phantom species referenziate da apps/backend/services/tutorialScenario.js
// + hardcoreScenario.js senza YAML definition:
//   - predoni_nomadi, cacciatore_corazzato, guardiano_caverna,
//   - guardiano_pozza, apex_predatore
// Session engine accettava silenziosamente (zero validation gate).
//
// M5-#3 (P0-D): creati 5 YAML stub in
// packs/evo_tactics_pack/data/species/tutorial/, questo guard assicura
// che ogni `species: <name>` ref nel scenario JS abbia YAML corrispondente.
//
// Run: `node --test tests/scripts/tutorialSpeciesExistence.test.js`
// Wirato in `npm run test:api`.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SPECIES_ROOT = path.join(REPO_ROOT, 'packs', 'evo_tactics_pack', 'data', 'species');

const SCENARIO_FILES = [
  path.join(REPO_ROOT, 'apps', 'backend', 'services', 'tutorialScenario.js'),
  path.join(REPO_ROOT, 'apps', 'backend', 'services', 'hardcoreScenario.js'),
];

// Regex matches: species: 'foo_bar' or species: "foo_bar"
const SPECIES_REF_PATTERN = /species:\s*['"]([a-z0-9_]+)['"]/g;

function collectScenarioSpeciesRefs() {
  const refs = new Set();
  for (const file of SCENARIO_FILES) {
    // Fail-fast: se un file dichiarato SCENARIO_FILES manca (rename/delete),
    // il guard perderebbe coverage silenziosamente. Assertion esplicita
    // costringe ad aggiornare SCENARIO_FILES quando lo scenario JS si sposta.
    // (codex-bot review feedback su #1632.)
    assert.ok(
      fs.existsSync(file),
      `Scenario file tracked but missing: ${file}.` +
        ' Update SCENARIO_FILES in tests/scripts/tutorialSpeciesExistence.test.js' +
        ' o ripristina il file.',
    );
    const src = fs.readFileSync(file, 'utf8');
    let match;
    // Reset stateful regex
    SPECIES_REF_PATTERN.lastIndex = 0;
    while ((match = SPECIES_REF_PATTERN.exec(src)) !== null) {
      refs.add(match[1]);
    }
  }
  return refs;
}

function collectYamlSpeciesIds() {
  const ids = new Set();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        const raw = fs.readFileSync(full, 'utf8');
        // Minimal YAML parsing: match `^id:\s*<value>` at start.
        // Avoid js-yaml dependency per mantenere il test leggero.
        const idMatch = raw.match(/^id:\s*['"]?([a-zA-Z0-9_\-]+)['"]?\s*$/m);
        if (idMatch) {
          ids.add(idMatch[1]);
        }
      }
    }
  };
  walk(SPECIES_ROOT);
  return ids;
}

test('scenario files parseable and contain species refs', () => {
  const refs = collectScenarioSpeciesRefs();
  assert.ok(refs.size > 0, 'No species refs found in scenario JS files');
});

// Normalize id per matching drift convention: scenario usa snake_case,
// alcuni YAML canonici usano kebab-case (es. `dune-stalker` vs `dune_stalker`).
// La normalizzazione accetta entrambe per evitare false positive su drift
// pre-esistente. M5-#3 fix del solo subset phantom (tutorial-*); drift
// altro documentato come follow-up.
function normalizeId(id) {
  return id.replace(/-/g, '_');
}

test('every scenario species ref has a matching YAML file', () => {
  const scenarioRefs = collectScenarioSpeciesRefs();
  const yamlIds = new Set([...collectYamlSpeciesIds()].map((id) => normalizeId(id)));
  const missing = [];
  for (const ref of scenarioRefs) {
    if (!yamlIds.has(normalizeId(ref))) {
      missing.push(ref);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `Phantom species (no YAML): ${missing.join(', ')}.` +
      ' Aggiungere stub in packs/evo_tactics_pack/data/species/tutorial/',
  );
});

test('M5-#3 phantom species stubs are present (regression guard)', () => {
  const yamlIds = collectYamlSpeciesIds();
  const expectedPhantoms = [
    'predoni_nomadi',
    'cacciatore_corazzato',
    'guardiano_caverna',
    'guardiano_pozza',
    'apex_predatore',
    'predone_agile', // M13-P6 (2026-04-24) — scenario 07 pod_rush
  ];
  for (const id of expectedPhantoms) {
    assert.ok(yamlIds.has(id), `Missing phantom species stub: ${id}`);
  }
});
