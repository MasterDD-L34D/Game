const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('package scripts use Node wrappers for cross-platform execution', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['test:api'], 'node scripts/run-test-api.cjs');
  assert.equal(pkg.scripts['test:stack'], 'node scripts/run-test-stack.cjs');
  assert.equal(pkg.scripts['dev:stack'], 'node scripts/run-dev-stack.cjs');
  assert.equal(pkg.scripts['export:qa'], 'node scripts/run-export-qa.cjs');
});

test('test-api wrapper enforces orchestrator env and tsx local cli usage', () => {
  const content = read('scripts/run-test-api.cjs');
  assert.match(content, /ORCHESTRATOR_AUTOCLOSE_MS:\s*['"]2000['"]/);
  assert.match(content, /require\.resolve\('tsx'\)/);
  assert.match(content, /spawnSync\(step,\s*\{/);
});

test('export-qa wrapper sets metrics-disable env', () => {
  const content = read('scripts/run-export-qa.cjs');
  assert.match(content, /ORCHESTRATOR_METRICS_DISABLED:\s*['"]true['"]/);
  assert.match(content, /spawnSync\('node scripts\/export-qa-report\.js'/);
});
