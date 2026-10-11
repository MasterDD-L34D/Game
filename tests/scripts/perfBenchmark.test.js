// Sprint γ Tech Baseline (2026-04-28) — perf_benchmark.py smoke test.
// Verifica script esegue exit 0 in dry-run + produce JSON valido.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const SCRIPT = path.resolve(__dirname, '..', '..', 'tools', 'py', 'perf_benchmark.py');

test('perf_benchmark.py --dry-run --output <tmp>: exit 0 + valid JSON', () => {
  const tmpFile = path.join(os.tmpdir(), `perf-bench-${Date.now()}.json`);
  const result = spawnSync(PYTHON, [SCRIPT, '--dry-run', '--output', tmpFile], {
    encoding: 'utf8',
    timeout: 30000,
  });

  if (result.error && result.error.code === 'ENOENT') {
    console.log('SKIP: python not available');
    return;
  }

  assert.equal(
    result.status,
    0,
    `exit code 0 expected, got ${result.status}\nstderr: ${result.stderr}`,
  );
  assert.ok(fs.existsSync(tmpFile), 'output JSON file created');

  const payload = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert.ok(payload.version);
  assert.ok(payload.timestamp);
  assert.ok(payload.hotpaths);
  assert.ok(payload.hotpaths.resolveAttack);
  assert.ok(typeof payload.hotpaths.resolveAttack.p95_ms === 'number');
  assert.ok(payload.dry_run === true);

  fs.unlinkSync(tmpFile);
});

test('patch_delta_report.py --dry-run: exit 0', () => {
  const SCRIPT_PD = path.resolve(__dirname, '..', '..', 'tools', 'py', 'patch_delta_report.py');
  const tmpFile = path.join(os.tmpdir(), `patch-delta-${Date.now()}.md`);
  const result = spawnSync(
    PYTHON,
    [SCRIPT_PD, '--from', 'HEAD~1', '--to', 'HEAD', '--output', tmpFile, '--dry-run'],
    { encoding: 'utf8', timeout: 30000 },
  );

  if (result.error && result.error.code === 'ENOENT') {
    console.log('SKIP: python not available');
    return;
  }

  assert.equal(
    result.status,
    0,
    `exit code 0 expected, got ${result.status}\nstderr: ${result.stderr}`,
  );
  assert.ok(fs.existsSync(tmpFile), 'output md file created');
  const content = fs.readFileSync(tmpFile, 'utf8');
  assert.ok(content.includes('# Patch Delta Report'));
  assert.ok(content.includes('## Summary'));
  fs.unlinkSync(tmpFile);
});

test('bug_replay_export.py --synthetic: round-trip hash deterministic', () => {
  const SCRIPT_BR = path.resolve(__dirname, '..', '..', 'tools', 'py', 'bug_replay_export.py');
  const tmpFile1 = path.join(os.tmpdir(), `replay-1-${Date.now()}.json`);
  const tmpFile2 = path.join(os.tmpdir(), `replay-2-${Date.now()}.json`);

  const r1 = spawnSync(
    PYTHON,
    [SCRIPT_BR, '--session', 'test_synth', '--synthetic', '--output', tmpFile1],
    { encoding: 'utf8', timeout: 15000 },
  );

  if (r1.error && r1.error.code === 'ENOENT') {
    console.log('SKIP: python not available');
    return;
  }

  assert.equal(r1.status, 0, `r1 exit 0 expected, got ${r1.status}\nstderr: ${r1.stderr}`);
  assert.ok(fs.existsSync(tmpFile1));

  const r2 = spawnSync(
    PYTHON,
    [SCRIPT_BR, '--session', 'test_synth', '--synthetic', '--output', tmpFile2],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.equal(r2.status, 0);

  const p1 = JSON.parse(fs.readFileSync(tmpFile1, 'utf8'));
  const p2 = JSON.parse(fs.readFileSync(tmpFile2, 'utf8'));
  // Hash deterministic over same content (excludes exported_at)
  // Note: timestamp differs, so re-hash payload sans exported_at + hash
  function rehash(p) {
    const clean = { ...p };
    delete clean.hash;
    delete clean.exported_at;
    return JSON.stringify(clean, Object.keys(clean).sort());
  }
  assert.equal(rehash(p1), rehash(p2), 'synthetic content identical');
  assert.equal(p1.session_id, 'test_synth');
  assert.ok(p1.hash.startsWith('sha256:'));
  assert.equal(p1.events.length, 3);

  fs.unlinkSync(tmpFile1);
  fs.unlinkSync(tmpFile2);
});
