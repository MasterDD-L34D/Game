// Verify GAME_DATABASE_ENABLED default flip (OD-030 ai-station re-verdict).
//
// Wave 2026-05-13 shipped D2-C Prisma cross-stack pipeline (PR #2259 +
// Godot v2 #253/#254/#256) making Game-Database the canonical persistence
// layer for godot_v2_campaign_states. Default flag flipped from OFF to ON
// 2026-05-14 in apps/backend/index.js — only explicit GAME_DATABASE_ENABLED
// =false disables. Catalog service preserves graceful local-fallback on
// HTTP failure (catalog.js:211 'local-fallback' source).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(REPO_ROOT, 'apps', 'backend', 'index.js');

test('GAME_DATABASE_ENABLED default ON when env unset', () => {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  // Default-ON predicate: gameDatabaseEnabled is TRUE unless env explicitly 'false'.
  assert.match(
    src,
    /gameDatabaseEnabled\s*=\s*process\.env\.GAME_DATABASE_ENABLED\s*!==\s*'false'/,
    'expected gameDatabaseEnabled default-ON predicate (!== "false")',
  );
});

test('default-ON predicate behavior matches semantic contract', () => {
  // Inline test of the predicate to lock semantics: unset → true, 'true' → true,
  // 'false' → false, anything else → true. Override is explicit-OFF only.
  const compute = (envVal) => envVal !== 'false';
  assert.equal(compute(undefined), true, 'unset → ON');
  assert.equal(compute(''), true, 'empty → ON');
  assert.equal(compute('true'), true, '"true" → ON');
  assert.equal(compute('TRUE'), true, '"TRUE" → ON (case-sensitive override-OFF only)');
  assert.equal(compute('false'), false, '"false" → OFF (explicit override)');
  assert.equal(compute('FALSE'), true, '"FALSE" → ON (case-sensitive, only lowercase disables)');
  assert.equal(compute('0'), true, '"0" → ON (not a recognized OFF token)');
});

test('comment block documents OD-030 ai-station re-verdict + override path', () => {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.match(src, /OD-030/, 'index.js must reference OD-030 verdict');
  assert.match(src, /GAME_DATABASE_ENABLED=false/, 'index.js must document override-OFF path');
});
