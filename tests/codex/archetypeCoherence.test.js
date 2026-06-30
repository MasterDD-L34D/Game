// SPEC-H -- codex<->species resistance_archetype coherence check.
//
// Regression guard for the failure mode fixed in PR #3087 (cb16f7bf): the 5
// retired-creature codex entries were promoted (#3076) BEFORE #3080 remapped
// their species resistance_archetype strutturale -> adattivo, so their
// lore_vars.archetype + the resistance_archetype key_fact went stale silently.
//
// This asserts, for every promoted `data/codex/<id>.yaml` entry of type:species
// whose id resolves to a species spec, that lore_vars.archetype AND the
// L_linee_evolutive `resistance_archetype` key_fact match the CURRENT species
// resistance_archetype.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseKeyFactArchetype,
  checkArchetypeCoherence,
  loadSpeciesArchetypes,
} = require('../../tools/js/validate_codex_aliena.js');

const SCRIPT = path.join(__dirname, '..', '..', 'tools', 'js', 'validate_codex_aliena.js');
const REPO_ROOT = path.join(__dirname, '..', '..');

// Build a minimal codex_entry object for the pure comparator.
function entry({ id = 'x', archetype, keyFactArch } = {}) {
  const e = {
    id,
    type: 'species',
    lore_vars: {},
    aliena_dimensions: { L_linee_evolutive: { key_facts: [] } },
  };
  if (archetype !== undefined) e.lore_vars.archetype = archetype;
  if (keyFactArch !== undefined) {
    e.aliena_dimensions.L_linee_evolutive.key_facts = [
      'role_trofico: predatore; sentient: False',
      `resistance_archetype: ${keyFactArch}`,
    ];
  }
  return e;
}

// --- parseKeyFactArchetype --------------------------------------------------

test('parseKeyFactArchetype extracts the leading token', () => {
  assert.equal(parseKeyFactArchetype(['resistance_archetype: adattivo']), 'adattivo');
});

test('parseKeyFactArchetype ignores a trailing provenance suffix', () => {
  // The real predoni_nomadi key_fact carries a "(predoni-nomadi.yaml:3)" suffix.
  assert.equal(
    parseKeyFactArchetype(['resistance_archetype: adattivo (predoni-nomadi.yaml:3)']),
    'adattivo',
  );
});

test('parseKeyFactArchetype scans the whole key_facts list', () => {
  assert.equal(
    parseKeyFactArchetype(['role_trofico: x', 'resistance_archetype: strutturale']),
    'strutturale',
  );
});

test('parseKeyFactArchetype returns null when absent or empty', () => {
  assert.equal(parseKeyFactArchetype(['role_trofico: x']), null);
  assert.equal(parseKeyFactArchetype([]), null);
  assert.equal(parseKeyFactArchetype(undefined), null);
});

// --- checkArchetypeCoherence ------------------------------------------------

test('checkArchetypeCoherence: aligned entry yields no error', () => {
  const errs = checkArchetypeCoherence(
    entry({ id: 'a', archetype: 'adattivo', keyFactArch: 'adattivo' }),
    'adattivo',
  );
  assert.deepEqual(errs, []);
});

test('checkArchetypeCoherence: provenance-suffixed key_fact still matches', () => {
  const errs = checkArchetypeCoherence(
    entry({
      id: 'predoni_nomadi',
      archetype: 'adattivo',
      keyFactArch: 'adattivo (predoni-nomadi.yaml:3)',
    }),
    'adattivo',
  );
  assert.deepEqual(errs, []);
});

test('checkArchetypeCoherence: flags a stale lore_vars.archetype', () => {
  const errs = checkArchetypeCoherence(entry({ id: 'a', archetype: 'strutturale' }), 'adattivo');
  assert.equal(errs.length, 1);
  assert.match(errs[0], /lore_vars\.archetype 'strutturale'.*'adattivo'/);
});

test('checkArchetypeCoherence: flags a stale resistance_archetype key_fact', () => {
  const errs = checkArchetypeCoherence(entry({ id: 'a', keyFactArch: 'strutturale' }), 'adattivo');
  assert.equal(errs.length, 1);
  assert.match(errs[0], /key_fact 'strutturale'.*'adattivo'/);
});

test('checkArchetypeCoherence: the pre-#3087 strutturale state flags BOTH spots', () => {
  const errs = checkArchetypeCoherence(
    entry({
      id: 'lithoconstructus_inhibens',
      archetype: 'strutturale',
      keyFactArch: 'strutturale',
    }),
    'adattivo',
  );
  assert.equal(errs.length, 2, errs.join('\n'));
});

test('checkArchetypeCoherence: skips when neither spot is authored', () => {
  const errs = checkArchetypeCoherence(entry({ id: 'a' }), 'adattivo');
  assert.deepEqual(errs, []);
});

// --- loadSpeciesArchetypes --------------------------------------------------

test('loadSpeciesArchetypes resolves a known species id by its id field', () => {
  // Filenames hyphenate (lithoconstructus-inhibens.yaml) but ids underscore;
  // resolution must key on the in-file `id`, not the filename.
  const m = loadSpeciesArchetypes(REPO_ROOT);
  assert.equal(m.get('lithoconstructus_inhibens'), 'adattivo');
});

// --- CLI end-to-end ---------------------------------------------------------

test('CLI: real data/codex is archetype-coherent (post-#3087, errors=0)', () => {
  const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /errors=0/);
});

test('CLI: would FAIL on the pre-#3087 strutturale state (synthetic desync)', () => {
  const dir = path.join(__dirname, '_tmp_codex_archetype_desync');
  const filler = (c) => c.repeat(400);
  const body = `codex_entry:
  id: lithoconstructus_inhibens
  type: species
  display_name_it: Test
  unlock:
    triggers: [encounter_completed]
    threshold: 1
  lore_vars:
    archetype: strutturale
  aliena_dimensions:
    A_ambiente: { heading: Ambiente, content: '${filler('a')}' }
    L_linee_evolutive:
      heading: Linee
      content: '${filler('b')}'
      key_facts:
        - 'resistance_archetype: strutturale'
    I_impianto: { heading: Impianto, content: '${filler('c')}' }
    E_ecologia: { heading: Ecologia, content: '${filler('d')}' }
    N_norme_socio: { heading: Norme, content: '${filler('e')}' }
    A_ancoraggio_narrativo:
      heading: Ancoraggio
      content: '${filler('f')}'
      story_hook_it: 'Un gancio narrativo.'
`;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'lithoconstructus_inhibens.yaml'), body);
    const r = spawnSync('node', [SCRIPT, '--codex', dir], { encoding: 'utf8', cwd: REPO_ROOT });
    assert.equal(r.status, 1, `expected failure, got:\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /lore_vars\.archetype 'strutturale'/);
    assert.match(r.stdout, /key_fact 'strutturale'/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
