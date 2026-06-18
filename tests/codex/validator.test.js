// SPEC-H HA2 -- A.L.I.E.N.A. Codex authoring-gate validator CI test.
// Mirrors tests/difficulty/validator.test.js (spawn the CLI against fixtures).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', '..', 'tools', 'js', 'validate_codex_aliena.js');
const REPO_ROOT = path.join(__dirname, '..', '..');

const SIX_DIMS = `
    A_ambiente: { heading: Ambiente, content: '${'a'.repeat(150)}' }
    L_linee_evolutive: { heading: Linee, content: '${'b'.repeat(150)}' }
    I_impianto: { heading: Impianto, content: '${'c'.repeat(150)}' }
    E_ecologia: { heading: Ecologia, content: '${'d'.repeat(150)}' }
    N_norme_socio: { heading: Norme, content: '${'e'.repeat(150)}' }
    A_ancoraggio_narrativo:
      heading: Ancoraggio
      content: '${'f'.repeat(150)}'
      story_hook_it: 'Un gancio narrativo.'`;

function wellFormed(id) {
  return `codex_entry:
  id: ${id}
  type: species
  display_name_it: Test
  unlock:
    triggers: [encounter_completed]
    threshold: 1
  aliena_dimensions:${SIX_DIMS}
`;
}

function writeFixture(dir, name, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body);
}

function run(dir, extra = []) {
  return spawnSync('node', [SCRIPT, '--codex', dir, ...extra], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
}

test('validator passes on the real data/codex without errors', () => {
  const result = spawnSync('node', [SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
  if (result.status !== 0) {
    assert.fail(`exit=${result.status}\n${result.stdout}\n${result.stderr}`);
  }
  assert.match(result.stdout, /errors=0/);
  assert.match(result.stdout, /authoring-gate audit/);
});

test('validator accepts a well-formed fixture (errors=0)', () => {
  const dir = path.join(__dirname, '_tmp_codex_ok');
  try {
    writeFixture(dir, 'good.yaml', wellFormed('good_one'));
    const r = run(dir);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /errors=0/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validator flags a missing A.L.I.E.N.A. dimension as error', () => {
  const dir = path.join(__dirname, '_tmp_codex_missing_dim');
  try {
    // Drop N_norme_socio (match the full 4-space-indented line).
    const body = wellFormed('missing_dim').replace(/ {4}N_norme_socio: \{[^}]*\}\n/, '');
    writeFixture(dir, 'bad.yaml', body);
    const r = run(dir);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /missing A\.L\.I\.E\.N\.A\. dimension 'N_norme_socio'/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validator flags an empty-content dimension as error', () => {
  const dir = path.join(__dirname, '_tmp_codex_empty');
  try {
    const body = wellFormed('empty_one').replace(
      /A_ambiente: \{ heading: Ambiente, content: '[^']*' \}/,
      "A_ambiente: { heading: Ambiente, content: '' }",
    );
    writeFixture(dir, 'bad.yaml', body);
    const r = run(dir);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /dimension 'A_ambiente' has no content/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validator flags a missing codex_entry as error', () => {
  const dir = path.join(__dirname, '_tmp_codex_noentry');
  try {
    writeFixture(dir, 'bad.yaml', 'not_codex_entry:\n  foo: 1\n');
    const r = run(dir);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /missing top-level codex_entry/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validator warns (non-strict pass, strict fail) on short content', () => {
  const dir = path.join(__dirname, '_tmp_codex_short');
  try {
    const body = wellFormed('short_one').replace(
      /A_ambiente: \{ heading: Ambiente, content: '[^']*' \}/,
      "A_ambiente: { heading: Ambiente, content: 'troppo corto' }",
    );
    writeFixture(dir, 'short.yaml', body);
    const r = run(dir);
    assert.equal(r.status, 0, 'short content is a warning, not an error (non-strict)');
    assert.match(r.stdout, /outside 100-300 char band/);
    const strict = run(dir, ['--strict']);
    assert.equal(strict.status, 1, 'strict mode fails on warnings');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
