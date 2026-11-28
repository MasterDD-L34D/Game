// tests/services/squareLos.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lineOfSightClear } = require('../../apps/backend/services/grid/squareLos');

// blocker set helper: cells listed as [x,y] block; everything else is clear.
function blocker(cells) {
  const s = new Set(cells.map(([x, y]) => `${x},${y}`));
  return (x, y) => s.has(`${x},${y}`);
}
const CLEAR = () => false;

test('clear straight line is visible', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 4, y: 0 }, CLEAR), true);
});

test('a blocker strictly between blocks LOS', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 4, y: 0 }, blocker([[2, 0]])), false);
});

test('adjacent target is always clear (no intermediate cells)', () => {
  assert.equal(lineOfSightClear({ x: 1, y: 1 }, { x: 2, y: 1 }, blocker([[2, 1]])), true);
});

test('endpoints are excluded: blocker ON the target does not self-block', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 0 }, blocker([[3, 0]])), true);
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 0 }, blocker([[0, 0]])), true);
});

test('from == to is clear (range-0 / self)', () => {
  assert.equal(lineOfSightClear({ x: 2, y: 2 }, { x: 2, y: 2 }, blocker([[2, 2]])), true);
});

test('symmetry: clear(A,B) == clear(B,A) on a blocked diagonal', () => {
  const b = blocker([
    [1, 1],
    [2, 2],
  ]);
  const ab = lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 3 }, b);
  const ba = lineOfSightClear({ x: 3, y: 3 }, { x: 0, y: 0 }, b);
  assert.equal(ab, ba);
});

test('corner-rule: single diagonal blocker on a corner-grazing ray does NOT block', () => {
  // ray (0,0)->(2,2) grazes the corner shared by (1,0) and (0,1); one blocker only.
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 2, y: 2 }, blocker([[1, 0]])), true);
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 2, y: 2 }, blocker([[0, 1]])), true);
});

test('strict diagonal squeeze: BOTH diagonal cells block -> LOS blocked', () => {
  // both (1,0) and (0,1) block the (0,0)->(2,2) corner.
  assert.equal(
    lineOfSightClear(
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      blocker([
        [1, 0],
        [0, 1],
      ]),
    ),
    false,
  );
});

test('diagonal blocker directly on the diagonal path blocks', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 3 }, blocker([[1, 1]])), false);
});

test('axis-aligned horizontal ray: mid-blocker blocks', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 5, y: 0 }, blocker([[3, 0]])), false);
});

test('negative coordinates: mid-blocker on a negative diagonal blocks', () => {
  assert.equal(lineOfSightClear({ x: -2, y: -2 }, { x: 2, y: 2 }, blocker([[-1, -1]])), false);
});
