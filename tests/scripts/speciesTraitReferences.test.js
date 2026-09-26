// CI guard species trait references ↔ glossary coverage (M5-#4, P0-E audit fix 2026-04-19).
//
// Background: parallel-agent species-reviewer audit rivelò 7 trait ID
// referenziati da species YAML (suggested_traits / optional_traits) senza
// definizione in data/core/traits/glossary.json. Silent missing:
//   - pelli_cave, pigmenti_aurorali, proteine_shock_termico,
//   - reti_capillari_radici, pelli_fitte, pelli_anti_ustione, pigmenti_termici
//
// Questo guard assicura che ogni trait ID citato dalle species YAML abbia
// entry corrispondente in glossary.json. Fallisce fast con lista phantom.
//
// Run: `node --test tests/scripts/speciesTraitReferences.test.js`
// Wirato in `npm run test:api` + `dataset-checks` CI job (path filter `data`).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SPECIES_ROOT = path.join(REPO_ROOT, 'packs', 'evo_tactics_pack', 'data', 'species');
const GLOSSARY_PATH = path.join(REPO_ROOT, 'data', 'core', 'traits', 'glossary.json');

// YAML list-item matcher (es. "- artigli_sette_vie"). Accetta snake_case ids.
const LIST_ITEM_PATTERN = /^\s*-\s+([a-z0-9_]+)\s*$/;

// Keys in species YAML che contengono liste di trait_id.
// Conservative: solo quelle che il catalog + runtime trattano come trait refs.
const TRAIT_LIST_KEYS = new Set([
  'core',
  'optional',
  'synergy',
  'suggested_traits',
  'optional_traits',
]);

function collectSpeciesTraitRefs() {
  const refs = new Set();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;

      const raw = fs.readFileSync(full, 'utf8');
      const lines = raw.split('\n');
      let inTraitList = false;
      let traitListIndent = -1;

      for (const line of lines) {
        // Match key followed by nothing (list opener) o `[]` inline array.
        const keyMatch = line.match(/^(\s*)([a-z_]+):\s*$/);
        if (keyMatch) {
          const [, leadingSpaces, key] = keyMatch;
          if (TRAIT_LIST_KEYS.has(key)) {
            inTraitList = true;
            traitListIndent = leadingSpaces.length;
          } else if (inTraitList && leadingSpaces.length <= traitListIndent) {
            // siamo usciti dalla lista (key al pari livello o superiore)
            inTraitList = false;
          }
          continue;
        }
        if (inTraitList) {
          const itemMatch = line.match(LIST_ITEM_PATTERN);
          if (itemMatch) {
            refs.add(itemMatch[1]);
            continue;
          }
          // linea non-list → chiudo il contesto se non è whitespace o commento
          if (line.trim().length > 0 && !line.trim().startsWith('#')) {
            inTraitList = false;
          }
        }
      }
    }
  };
  walk(SPECIES_ROOT);
  return refs;
}

function loadGlossaryIds() {
  assert.ok(fs.existsSync(GLOSSARY_PATH), `Glossary missing: ${GLOSSARY_PATH}`);
  const raw = fs.readFileSync(GLOSSARY_PATH, 'utf8');
  const data = JSON.parse(raw);
  assert.ok(data && typeof data.traits === 'object', 'glossary.traits missing');
  return new Set(Object.keys(data.traits));
}

test('glossary loads and contains entries', () => {
  const ids = loadGlossaryIds();
  assert.ok(ids.size > 0, 'Glossary empty');
});

test('every species trait_id ref has glossary entry', () => {
  const refs = collectSpeciesTraitRefs();
  const glossaryIds = loadGlossaryIds();
  const missing = [];
  for (const ref of refs) {
    if (!glossaryIds.has(ref)) {
      missing.push(ref);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `Orphan trait refs (no glossary entry):\n  ${missing.join('\n  ')}\n` +
      'Aggiungere entry in data/core/traits/glossary.json',
  );
});

test('M5-#4 orphan trait stubs are present (regression guard)', () => {
  const ids = loadGlossaryIds();
  const expected = [
    'pelli_cave',
    'pigmenti_aurorali',
    'proteine_shock_termico',
    'reti_capillari_radici',
    'pelli_fitte',
    'pelli_anti_ustione',
    'pigmenti_termici',
  ];
  for (const id of expected) {
    assert.ok(ids.has(id), `Missing orphan trait entry: ${id}`);
  }
});
