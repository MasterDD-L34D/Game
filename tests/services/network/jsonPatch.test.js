// Sprint R.3 — JSON-Patch (RFC 6902 subset: replace/add/remove) tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  applyOp,
  applyOps,
  decodePointer,
} = require('../../../apps/backend/services/network/jsonPatch');

test('decodePointer: empty string → []', () => {
  assert.deepEqual(decodePointer(''), []);
});

test('decodePointer: simple nested path', () => {
  assert.deepEqual(decodePointer('/foo/bar'), ['foo', 'bar']);
});

test('decodePointer: array index segment', () => {
  assert.deepEqual(decodePointer('/party/0/hp'), ['party', '0', 'hp']);
});

test('decodePointer: tilde escapes', () => {
  assert.deepEqual(decodePointer('/a~1b/c~0d'), ['a/b', 'c~d']);
});

test('decodePointer: invalid pointer throws', () => {
  assert.throws(() => decodePointer('foo/bar'));
});

test('applyOp: replace simple object key', () => {
  const out = applyOp({ a: 1, b: 2 }, { op: 'replace', path: '/a', value: 99 });
  assert.deepEqual(out, { a: 99, b: 2 });
});

test('applyOp: replace does NOT mutate input', () => {
  const input = { a: 1 };
  const out = applyOp(input, { op: 'replace', path: '/a', value: 2 });
  assert.equal(input.a, 1);
  assert.equal(out.a, 2);
});

test('applyOp: replace nested path', () => {
  const out = applyOp(
    { party: [{ hp: 10 }, { hp: 5 }] },
    { op: 'replace', path: '/party/1/hp', value: 8 },
  );
  assert.equal(out.party[1].hp, 8);
  assert.equal(out.party[0].hp, 10);
});

test('applyOp: replace missing path is no-op', () => {
  const out = applyOp({ a: 1 }, { op: 'replace', path: '/missing/deep', value: 5 });
  assert.deepEqual(out, { a: 1 });
});

test('applyOp: add new key on object', () => {
  const out = applyOp({ a: 1 }, { op: 'add', path: '/b', value: 2 });
  assert.deepEqual(out, { a: 1, b: 2 });
});

test('applyOp: add to array via numeric index inserts', () => {
  const out = applyOp({ list: [1, 3] }, { op: 'add', path: '/list/1', value: 2 });
  assert.deepEqual(out.list, [1, 2, 3]);
});

test('applyOp: add to array via "-" appends', () => {
  const out = applyOp({ list: [1, 2] }, { op: 'add', path: '/list/-', value: 3 });
  assert.deepEqual(out.list, [1, 2, 3]);
});

test('applyOp: remove object key', () => {
  const out = applyOp({ a: 1, b: 2 }, { op: 'remove', path: '/b' });
  assert.deepEqual(out, { a: 1 });
});

test('applyOp: remove array index', () => {
  const out = applyOp({ list: [1, 2, 3] }, { op: 'remove', path: '/list/1' });
  assert.deepEqual(out.list, [1, 3]);
});

test('applyOp: remove missing key is no-op', () => {
  const out = applyOp({ a: 1 }, { op: 'remove', path: '/missing' });
  assert.deepEqual(out, { a: 1 });
});

test('applyOp: replace at root replaces whole state', () => {
  const out = applyOp({ a: 1 }, { op: 'replace', path: '', value: { z: 9 } });
  assert.deepEqual(out, { z: 9 });
});

test('applyOp: unsupported op throws', () => {
  assert.throws(() => applyOp({}, { op: 'move', path: '/a' }));
});

test('applyOps: applies in order', () => {
  const out = applyOps({ a: 1, list: [1] }, [
    { op: 'replace', path: '/a', value: 2 },
    { op: 'add', path: '/list/-', value: 9 },
    { op: 'add', path: '/b', value: 'new' },
  ]);
  assert.deepEqual(out, { a: 2, list: [1, 9], b: 'new' });
});

test('applyOps: input array required', () => {
  assert.throws(() => applyOps({}, null));
  assert.throws(() => applyOps({}, 'not-array'));
});

test('applyOps: deep-cloned values not aliased to source', () => {
  const value = { hp: 8 };
  const out = applyOps({ unit: { hp: 0 } }, [{ op: 'replace', path: '/unit', value }]);
  value.hp = 999;
  assert.equal(out.unit.hp, 8);
});
