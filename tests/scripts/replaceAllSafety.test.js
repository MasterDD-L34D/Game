// M7-#1 test per replace_all safety lint.
// Verifica analyseDiff() rileva pattern rename massivi su identificatori risky.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  analyseDiff,
  RISKY_IDENTIFIERS,
  OCCURRENCE_THRESHOLD,
} = require('../../scripts/lint/replace_all_safety');

function buildDiff(addedLines, removedLines) {
  const lines = ['+++ b/test.js', '--- a/test.js'];
  for (const l of addedLines) lines.push('+' + l);
  for (const l of removedLines) lines.push('-' + l);
  return lines.join('\n');
}

test('analyseDiff detects massive rename of risky identifier', () => {
  // Simula replace_all di "action" → "roundAction" su molte linee
  const added = [];
  const removed = [];
  for (let i = 0; i < OCCURRENCE_THRESHOLD + 2; i++) {
    added.push(`  const roundAction = foo(${i});`);
    removed.push(`  const action = foo(${i});`);
  }
  const diff = buildDiff(added, removed);
  const warnings = analyseDiff(diff);

  const actionWarning = warnings.find((w) => w.identifier === 'action');
  assert.ok(actionWarning, 'should warn on "action" mass rename');
  // Trigger su OR: removed raggiunge threshold anche se added=0 (rename a substring)
  assert.ok(
    actionWarning.added >= OCCURRENCE_THRESHOLD || actionWarning.removed >= OCCURRENCE_THRESHOLD,
  );
});

test('analyseDiff ignores small renames below threshold', () => {
  const diff = buildDiff(['const action = 1;', 'const action = 2;'], ['const x = 1;']);
  const warnings = analyseDiff(diff);
  assert.deepEqual(warnings, [], 'small diff should not warn');
});

test('analyseDiff ignores identifiers not in risky set', () => {
  const added = [];
  const removed = [];
  for (let i = 0; i < 20; i++) {
    added.push(`const foo = ${i};`);
    removed.push(`const bar = ${i};`);
  }
  const diff = buildDiff(added, removed);
  const warnings = analyseDiff(diff);
  // "foo" and "bar" not in RISKY_IDENTIFIERS
  assert.deepEqual(warnings, []);
});

test('RISKY_IDENTIFIERS contains core session engine vars', () => {
  for (const id of ['action', 'state', 'result', 'round', 'session']) {
    assert.ok(
      RISKY_IDENTIFIERS.has(id),
      `"${id}" should be in RISKY_IDENTIFIERS (common source of replace_all bugs)`,
    );
  }
});

test('analyseDiff handles empty diff gracefully', () => {
  assert.deepEqual(analyseDiff(''), []);
});

test('analyseDiff word-boundary match (not substring)', () => {
  const added = [];
  const removed = [];
  // "actionable" contains "action" but NOT word-boundary
  for (let i = 0; i < 15; i++) {
    added.push(`const actionable = ${i};`);
    removed.push(`const dispatchable = ${i};`);
  }
  const diff = buildDiff(added, removed);
  const warnings = analyseDiff(diff);
  // Should NOT warn because \baction\b doesn't match "actionable"
  assert.equal(warnings.length, 0);
});
