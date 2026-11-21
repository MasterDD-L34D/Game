// tests/scripts/encounterSchema.test.js — Validate all encounter YAML against AJV schema
// CI-ready: fails if any encounter doesn't match schema.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Fail-closed on missing deps: in CI / run-test-api a soft skip here would be
// a false-green gate (the AJV validation would silently not run).
const { requireTestDeps } = require('../helpers/requireTestDeps');
const deps = requireTestDeps('encounterSchema', { Ajv: 'ajv/dist/2020', yaml: 'js-yaml' });
if (!deps.ok) return; // fail/skip test already registered by the helper
const { Ajv, yaml } = deps.mods;

const SCHEMA_PATH = path.join(__dirname, '../../schemas/evo/encounter.schema.json');
const ENCOUNTERS_DIR = path.join(__dirname, '../../docs/planning/encounters');

test('encounter schema file exists', () => {
  assert.ok(fs.existsSync(SCHEMA_PATH), `Schema not found: ${SCHEMA_PATH}`);
});

test('encounter schema is valid JSON', () => {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
  assert.doesNotThrow(() => JSON.parse(raw));
});

// Discover all encounter YAML files
const encounterFiles = fs.existsSync(ENCOUNTERS_DIR)
  ? fs.readdirSync(ENCOUNTERS_DIR).filter((f) => f.startsWith('enc_') && f.endsWith('.yaml'))
  : [];

test(`found ${encounterFiles.length} encounter files`, () => {
  assert.ok(encounterFiles.length > 0, 'No encounter files found');
});

// Validate each encounter
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

for (const file of encounterFiles) {
  test(`encounter ${file} validates against schema`, () => {
    const filePath = path.join(ENCOUNTERS_DIR, file);
    const data = yaml.load(fs.readFileSync(filePath, 'utf8'));
    const valid = validate(data);
    if (!valid) {
      const errors = validate.errors.map((e) => `${e.instancePath} ${e.message}`).join('; ');
      assert.fail(`${file}: ${errors}`);
    }
    assert.ok(valid);
  });
}
