// tests/ai/hexGrid.test.js — Hex grid engine unit tests
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hexDistance,
  hexNeighbors,
  getReachableTiles,
  findPath,
  getTilesInRange,
  getLineOfSight,
  cubeRound,
  hexKey,
} = require('../../apps/backend/services/grid/hexGrid');

// ── hexDistance ──

test('hexDistance: self = 0', () => {
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 }), 0);
});

test('hexDistance: adjacent = 1', () => {
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 }), 1);
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 }), 1);
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 }), 1);
});

test('hexDistance: two steps = 2', () => {
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 }), 2);
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 1, r: 1 }), 2);
});

test('hexDistance: symmetric', () => {
  const a = { q: 3, r: -2 };
  const b = { q: -1, r: 4 };
  assert.equal(hexDistance(a, b), hexDistance(b, a));
});

// ── hexNeighbors ──

test('hexNeighbors: returns 6', () => {
  assert.equal(hexNeighbors({ q: 0, r: 0 }).length, 6);
});

test('hexNeighbors: all distance 1', () => {
  const center = { q: 3, r: -1 };
  for (const n of hexNeighbors(center)) {
    assert.equal(hexDistance(center, n), 1);
  }
});

// ── getTilesInRange ──

test('getTilesInRange: range 0 = 1 tile', () => {
  assert.equal(getTilesInRange({ q: 0, r: 0 }, 0).length, 1);
});

test('getTilesInRange: range 1 = 7 tiles', () => {
  assert.equal(getTilesInRange({ q: 0, r: 0 }, 1).length, 7);
});

test('getTilesInRange: range 2 = 19 tiles', () => {
  assert.equal(getTilesInRange({ q: 0, r: 0 }, 2).length, 19);
});

test('getTilesInRange: all within range', () => {
  const center = { q: 2, r: -1 };
  for (const t of getTilesInRange(center, 3)) {
    assert.ok(hexDistance(center, t) <= 3);
  }
});

// ── getReachableTiles ──

test('getReachableTiles: maxCost 0 = origin only', () => {
  assert.equal(getReachableTiles({ q: 0, r: 0 }, 0, () => 1).size, 1);
});

test('getReachableTiles: maxCost 1 uniform = 7', () => {
  assert.equal(getReachableTiles({ q: 0, r: 0 }, 1, () => 1).size, 7);
});

test('getReachableTiles: respects walls', () => {
  const cost = (from, to) => (to.q === 1 && to.r === 0 ? null : 1);
  const result = getReachableTiles({ q: 0, r: 0 }, 1, cost);
  assert.ok(!result.has(hexKey(1, 0)));
});

test('getReachableTiles: variable terrain cost', () => {
  const cost = (from, to) => (to.q === 1 && to.r === 0 ? 2 : 1);
  const r1 = getReachableTiles({ q: 0, r: 0 }, 1, cost);
  assert.ok(!r1.has(hexKey(1, 0))); // costs 2, budget 1
  const r2 = getReachableTiles({ q: 0, r: 0 }, 2, cost);
  assert.ok(r2.has(hexKey(1, 0))); // costs 2, budget 2
});

// ── findPath ──

test('findPath: self = [self]', () => {
  const p = findPath({ q: 0, r: 0 }, { q: 0, r: 0 }, () => 1);
  assert.ok(p);
  assert.equal(p.length, 1);
});

test('findPath: neighbor = 2 nodes', () => {
  const p = findPath({ q: 0, r: 0 }, { q: 1, r: 0 }, () => 1);
  assert.ok(p);
  assert.equal(p.length, 2);
});

test('findPath: blocked = null', () => {
  const cost = (from, to) => (to.q === 2 && to.r === 0 ? null : 1);
  assert.equal(findPath({ q: 0, r: 0 }, { q: 2, r: 0 }, cost), null);
});

test('findPath: respects maxCost', () => {
  assert.equal(
    findPath({ q: 0, r: 0 }, { q: 5, r: 0 }, () => 1, 3),
    null,
  );
});

// ── getLineOfSight ──

test('LOS: clear to adjacent', () => {
  const r = getLineOfSight({ q: 0, r: 0 }, { q: 1, r: 0 }, () => false);
  assert.ok(r.clear);
});

test('LOS: blocked by obstacle', () => {
  const r = getLineOfSight({ q: 0, r: 0 }, { q: 2, r: 0 }, (h) => h.q === 1 && h.r === 0);
  assert.ok(!r.clear);
});

test('LOS: self always clear', () => {
  const r = getLineOfSight({ q: 3, r: 2 }, { q: 3, r: 2 }, () => true);
  assert.ok(r.clear);
});

// ── cubeRound ──

test('cubeRound: exact coords', () => {
  assert.deepEqual(cubeRound(2, 3), { q: 2, r: 3 });
});

test('cubeRound: fractional satisfies q+r+s=0', () => {
  const { q, r } = cubeRound(0.4, 0.3);
  assert.ok(Number.isInteger(-q - r));
});
