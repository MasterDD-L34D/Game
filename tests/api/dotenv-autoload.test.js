// Verify dotenv autoload at backend boot.
//
// Eliminates manual `$env:AUTH_SECRET = ...` workaround on Cloudflare deploy
// session 2026-05-03. Backend `apps/backend/index.js` now calls
// `require('dotenv').config(...)` before `./app` so JWT secret + autoclose +
// Game-Database flags all read from `.env` instead of dev fallbacks.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

test('dotenv loads .env from repo root', () => {
  const tmpEnv = path.join(REPO_ROOT, `.env.dotenv-autoload-fixture-${process.pid}`);
  fs.writeFileSync(tmpEnv, 'TEST_AUTOLOAD_VAR=loaded-via-dotenv\n');
  try {
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `require('dotenv').config({path:${JSON.stringify(tmpEnv)}});process.stdout.write(process.env.TEST_AUTOLOAD_VAR||'unset')`,
      ],
      { cwd: REPO_ROOT },
    );
    assert.equal(result.status, 0, result.stderr.toString());
    assert.equal(result.stdout.toString(), 'loaded-via-dotenv');
  } finally {
    fs.unlinkSync(tmpEnv);
  }
});

test('backend index.js wires dotenv before ./app require', () => {
  const indexSrc = fs.readFileSync(path.join(REPO_ROOT, 'apps/backend/index.js'), 'utf8');
  const dotenvIdx = indexSrc.indexOf("require('dotenv')");
  const createAppIdx = indexSrc.indexOf("require('./app')");
  assert.ok(dotenvIdx >= 0, 'dotenv require missing in index.js');
  assert.ok(createAppIdx >= 0, './app require missing in index.js');
  assert.ok(dotenvIdx < createAppIdx, 'dotenv must be required before ./app');
});

test('absent .env: dotenv config silent (no throw, status 0)', () => {
  const ghost = path.join(REPO_ROOT, `.env.never-exists-${Date.now()}-${process.pid}`);
  const result = spawnSync(
    process.execPath,
    ['-e', `require('dotenv').config({path:${JSON.stringify(ghost)}});process.stdout.write('ok')`],
    { cwd: REPO_ROOT },
  );
  assert.equal(result.status, 0, result.stderr.toString());
  assert.equal(result.stdout.toString(), 'ok');
});

test('process.env precedence: CLI/Docker env wins over .env (no override)', () => {
  // Codex follow-up — explicit guarantee that pre-existing process.env values
  // are preserved when dotenv loads. Critical for Docker compose flows that
  // inject secrets via env vars and for test files that pin AUTH_SECRET
  // BEFORE require('./app') (e.g. tests/api/lobby-jwt.test.js line 13).
  const tmpEnv = path.join(REPO_ROOT, `.env.precedence-fixture-${process.pid}`);
  fs.writeFileSync(tmpEnv, 'PRECEDENCE_VAR=value-from-file\n');
  try {
    const child = spawnSync(
      process.execPath,
      [
        '-e',
        `process.env.PRECEDENCE_VAR='value-from-cli';require('dotenv').config({path:${JSON.stringify(tmpEnv)}});process.stdout.write(process.env.PRECEDENCE_VAR)`,
      ],
      { cwd: REPO_ROOT },
    );
    assert.equal(child.status, 0, child.stderr.toString());
    assert.equal(child.stdout.toString(), 'value-from-cli');
  } finally {
    fs.unlinkSync(tmpEnv);
  }
});
