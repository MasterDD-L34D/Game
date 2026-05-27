// tools/sot-drift/detect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchChanges } from './detect.mjs';

const MAP = [
  { pattern: 'apps/backend/services/genetics/**', sot_ref: ['core/00-SOURCE-OF-TRUTH.md#24'], concept: 'genetic' },
  { pattern: 'data/core/economy*', sot_ref: ['core/26-ECONOMY_CANONICAL.md'], concept: 'economy' },
];

test('matches a nested glob and collects the file', () => {
  const m = matchChanges(MAP, ['apps/backend/services/genetics/epigenome.js']);
  assert.equal(m.length, 1);
  assert.equal(m[0].concept, 'genetic');
  assert.deepEqual(m[0].files, ['apps/backend/services/genetics/epigenome.js']);
});

test('matches a prefix glob (economy*)', () => {
  const m = matchChanges(MAP, ['data/core/economy_canonical.yaml']);
  assert.equal(m.length, 1);
  assert.equal(m[0].concept, 'economy');
});

test('no match returns empty', () => {
  assert.deepEqual(matchChanges(MAP, ['README.md', 'apps/frontend/x.js']), []);
});

test('single entry deduped across multiple matching files', () => {
  const m = matchChanges(MAP, [
    'apps/backend/services/genetics/epigenome.js',
    'apps/backend/services/genetics/mutationEngine.js',
  ]);
  assert.equal(m.length, 1);
  assert.equal(m[0].files.length, 2);
});

test('* does not cross directory boundary', () => {
  // economy* must not match a deeper path segment after a slash
  const m = matchChanges(MAP, ['data/core/economy/sub/file.yaml']);
  assert.equal(m.length, 0);
});
