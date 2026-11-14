// Sprint γ Tech Baseline (2026-04-28) — dirtyFlagTracker tests.
// Pattern: Frostpunk dirty-flag invalidation.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  markDirty,
  clearDirty,
  isDirty,
  markAllDirty,
  commitClean,
  clearAll,
} = require('../../apps/backend/services/perf/dirtyFlagTracker');

test('markDirty + isDirty: basic round trip', () => {
  const unit = { id: 'u1' };
  assert.equal(markDirty(unit, 'traits'), true);
  assert.equal(isDirty(unit, 'traits'), true);
  assert.equal(unit._dirty_fields.traits, true);
});

test('commitClean explicit false: prevents conservative default', () => {
  const unit = { id: 'u1' };
  // Untracked field defaults to dirty
  assert.equal(isDirty(unit, 'traits'), true);
  // Commit clean
  commitClean(unit, 'traits');
  assert.equal(isDirty(unit, 'traits'), false);
  // Recompute trigger
  markDirty(unit, 'traits');
  assert.equal(isDirty(unit, 'traits'), true);
});

test('isolation: multi-unit independent', () => {
  const u1 = { id: 'u1' };
  const u2 = { id: 'u2' };
  markDirty(u1, 'traits');
  commitClean(u2, 'traits');
  assert.equal(isDirty(u1, 'traits'), true);
  assert.equal(isDirty(u2, 'traits'), false);
  // No cross-pollination
  clearDirty(u1, 'traits');
  assert.equal(isDirty(u1, 'traits'), true); // back to conservative default
  assert.equal(isDirty(u2, 'traits'), false);
});

test('markAllDirty: bulk invalidation hits known fields', () => {
  const unit = { id: 'u1' };
  commitClean(unit, 'traits');
  commitClean(unit, 'stats');
  markAllDirty(unit);
  assert.equal(isDirty(unit, 'traits'), true);
  assert.equal(isDirty(unit, 'stats'), true);
  assert.equal(isDirty(unit, 'ai_score'), true);
  assert.equal(isDirty(unit, 'abilities'), true);
  assert.equal(isDirty(unit, 'vc'), true);
});

test('invalid input: graceful no-op', () => {
  assert.equal(markDirty(null, 'traits'), false);
  assert.equal(markDirty({}, ''), false);
  assert.equal(markDirty({}, null), false);
  assert.equal(isDirty(null, 'traits'), true); // conservative
  assert.equal(clearAll(null), false);
});
