// TKT-SALVAGE-A2 (O8) — species resistance_archetype reference guard.
//
// resistanceEngine.js resolves a unit's resistances from its `resistance_archetype`
// against packs/evo_tactics_pack/data/balance/species_resistances.yaml, and SILENTLY
// falls back to `default_archetype` when the id is unknown. So a species declaring a
// typo'd / non-canonical archetype (e.g. `strutturale`, absent from the resistance
// table) gets the wrong resistance profile with no error. This guard pins that every
// authored species' resistance_archetype is a canonical archetype (or absent -> the
// engine default is intentional).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const REPO_ROOT = path.join(__dirname, '..', '..');
const RESIST_PATH = path.join(
  REPO_ROOT,
  'packs',
  'evo_tactics_pack',
  'data',
  'balance',
  'species_resistances.yaml',
);
const SPECIES_DIRS = [
  path.join(REPO_ROOT, 'data', 'core', 'species'),
  path.join(REPO_ROOT, 'packs', 'evo_tactics_pack', 'data', 'species'),
];

// Canonical archetype set = the species_archetypes keys + the default_archetype, the
// exact ids resistanceEngine.getArchetypeResistances() matches against.
function canonicalArchetypes() {
  const data = yaml.load(fs.readFileSync(RESIST_PATH, 'utf8'));
  const set = new Set(Object.keys((data && data.species_archetypes) || {}));
  if (data && data.default_archetype) set.add(String(data.default_archetype));
  return set;
}

function* speciesFiles() {
  for (const dir of SPECIES_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
        const p = path.join(cur, entry.name);
        if (entry.isDirectory()) stack.push(p);
        else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) yield p;
      }
    }
  }
}

// resistance_archetype is top-level on keeper/spec files but may be nested in a
// `species:`-wrapped doc -> collect every occurrence so the guard cannot be dodged
// by nesting.
function collectArchetypes(node, out) {
  if (Array.isArray(node)) {
    for (const v of node) collectArchetypes(v, out);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'resistance_archetype' && (typeof v === 'string' || v == null)) {
        if (v != null) out.push(String(v));
      } else {
        collectArchetypes(v, out);
      }
    }
  }
  return out;
}

test('species_resistances.yaml defines the expected canonical archetype set', () => {
  const set = canonicalArchetypes();
  for (const a of ['corazzato', 'bioelettrico', 'psionico', 'termico', 'adattivo']) {
    assert.ok(set.has(a), `canonical archetype '${a}' present in species_resistances.yaml`);
  }
});

test('every species resistance_archetype references a canonical archetype (no silent fallback)', () => {
  const set = canonicalArchetypes();
  const offenders = [];
  for (const f of speciesFiles()) {
    let doc;
    try {
      doc = yaml.load(fs.readFileSync(f, 'utf8'));
    } catch {
      continue; // malformed authoring file is another gate's problem
    }
    for (const arch of collectArchetypes(doc, [])) {
      if (!set.has(arch)) offenders.push(`${path.relative(REPO_ROOT, f)}: '${arch}'`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `non-canonical resistance_archetype -> silent fallback to the default (wrong resistances). ` +
      `Valid: ${[...set].join(', ')}. Offenders:\n  ${offenders.join('\n  ')}`,
  );
});
