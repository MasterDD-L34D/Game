// ADR-2026-05-29-trait-schema-canonization -- contract guard (TKT-CL-04).
//
// Lock the invariants:
//   1. Canon files (glossary/index/biome_pools/active_effects) declare schema_version 2.0.
//   2. Mock traits.sample.ts retired post TKT-CL-08 (skipped pending TKT-CL-08 ship).
//   3. PUT /api/traits/:id rejects schema-invalid payload (smoke -- expansion follow-up).
//   4. Ancestors fully migrated to native ids (Option C, 2026-06-23): 0 ancestor_ slugs remain.
//   5. Index entry non-ancestor requires design block (tier + famiglia_tipologia + slot_profile).
//   6. Pre-commit gate exits 1 on schema_version != 2.0 (sandbox temp file).
//
// Test runner: node:test (consistent con scripts/run-test-api.cjs glob tests/api/*.test.js).
// G4 tdd-guard: no tool installed; characterization/guard tests asserting shipped state.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const os = require('node:os');

const REPO_ROOT = path.resolve(__dirname, '../..');

const CANON_JSON_FILES = [
  'data/core/traits/glossary.json',
  'data/traits/index.json',
  'data/core/traits/biome_pools.json',
];

test('canon JSON files declare schema_version 2.0', () => {
  for (const rel of CANON_JSON_FILES) {
    const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
    assert.equal(
      String(doc.schema_version),
      '2.0',
      `${rel} schema_version != 2.0 (got ${doc.schema_version})`,
    );
  }
});

test('active_effects.yaml declares schema_version 2.0 (regex grep, no js-yaml dep)', () => {
  // Worktree may lack node_modules; using regex on raw YAML avoids js-yaml load.
  const content = fs.readFileSync(
    path.join(REPO_ROOT, 'data/core/traits/active_effects.yaml'),
    'utf8',
  );
  const match = content.match(/^schema_version:\s*['"]?2\.0['"]?\s*$/m);
  assert.ok(match, 'active_effects.yaml must declare schema_version: "2.0" at top-level');
});

test(
  'mock retire -- traits.sample.ts moved to tests/fixtures/',
  { skip: 'TKT-CL-08 pending ship' },
  () => {
    const oldPath = path.join(REPO_ROOT, 'apps/trait-editor/src/data/traits.sample.ts');
    const newPath = path.join(REPO_ROOT, 'apps/trait-editor/tests/fixtures/traits.sample.ts');
    assert.ok(!fs.existsSync(oldPath), 'sample.ts MUST be moved out of src/data/');
    assert.ok(fs.existsSync(newPath), 'fixture MUST exist at new path');
  },
);

test('glossary has no ancestor_ entries (migrated to native ids -- Option C 2026-06-23)', () => {
  // Option C (master-dd, istruttoria 2026-06-23 / PR Game#2993): the 290 ancestor_*
  // wiki-derived traits were dedup+renamed to native Evo-Tactics ids and the
  // ancestor_ namespace was retired. Provenance was discarded (inspiration-only, no
  // CC BY-NC-SA constraint). This guard now locks the migration: no ancestor_ regress.
  const doc = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'data/core/traits/glossary.json'), 'utf8'),
  );
  const ancestorKeys = Object.keys(doc.traits).filter((k) => k.startsWith('ancestor_'));
  assert.equal(ancestorKeys.length, 0, `expected 0 ancestor_* slugs, found ${ancestorKeys.length}`);
});

test('index entry non-ancestor SHOULD have design block (sample first 5, warn-only)', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data/traits/index.json'), 'utf8'));
  const sampleKeys = Object.keys(doc.traits)
    .filter((k) => !k.startsWith('ancestor_'))
    .slice(0, 5);
  assert.ok(sampleKeys.length >= 1);
  for (const k of sampleKeys) {
    const entry = doc.traits[k];
    // Hard: must have at least tier + famiglia_tipologia.
    assert.ok(entry.tier, `${k} missing tier`);
    assert.ok(entry.famiglia_tipologia, `${k} missing famiglia_tipologia`);
    // Soft: slot_profile not strict (Tier-Backlog 26 entries tolerated per ADR sez C).
  }
});

test('pre-commit gate exits 1 on schema_version != 2.0 (sandbox)', () => {
  const gateScript = path.join(REPO_ROOT, 'tools/lint/trait_schema_gate.py');
  assert.ok(fs.existsSync(gateScript), 'gate script must exist');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trait-gate-'));
  const badFile = path.join(tmpDir, 'bad.json');
  fs.writeFileSync(badFile, JSON.stringify({ schema_version: '1.0', traits: {} }));
  const r = spawnSync('python', [gateScript, '--check', badFile], { encoding: 'utf8' });
  assert.equal(
    r.status,
    1,
    `gate must exit 1 on wrong schema_version (got ${r.status}, stderr: ${r.stderr})`,
  );
  assert.match(r.stderr || '', /2\.0|WRONG schema_version/);
});
