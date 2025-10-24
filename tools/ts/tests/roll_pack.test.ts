import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { roll_pack } from '../roll_pack.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(TEST_DIR, '../../../../data/packs.yaml');
const CLI_ENTRY = path.resolve(TEST_DIR, '../roll_pack.js');

const EXPECTED_COMBO = ['job_ability', 'trait_T1'];

const withRestoredEnv = async (
  key: string,
  value: string | undefined,
  fn: () => Promise<void> | void,
) => {
  const previous = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
};

test('roll_pack uses deterministic seed when provided explicitly', () => {
  const result = roll_pack('ENTP', 'invoker', DATA_PATH, { seed: 'demo' });
  assert.equal(result.inputs.form, 'ENTP');
  assert.equal(result.pack, 'A');
  assert.deepEqual(result.combo, EXPECTED_COMBO);
  assert.equal(result.rolls.d20, 19);
});

test('roll_pack normalizes the form and honors the ROLL_PACK_SEED env fallback', async () => {
  await withRestoredEnv('ROLL_PACK_SEED', 'demo', () => {
    const result = roll_pack('entp', 'invoker', DATA_PATH);
    assert.equal(result.inputs.form, 'ENTP');
    assert.equal(result.pack, 'A');
    assert.deepEqual(result.combo, EXPECTED_COMBO);
  });
});

test('CLI execution prints JSON compatible with direct invocation', () => {
  const run = spawnSync(
    process.execPath,
    [CLI_ENTRY, 'entp', 'invoker', DATA_PATH, '--seed', 'demo'],
    { encoding: 'utf8' },
  );
  assert.equal(run.status, 0, run.stderr);
  const parsed = JSON.parse(run.stdout);
  assert.equal(parsed.inputs.form, 'ENTP');
  assert.equal(parsed.pack, 'A');
  assert.deepEqual(parsed.combo, EXPECTED_COMBO);
});
