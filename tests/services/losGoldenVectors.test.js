// tests/services/losGoldenVectors.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lineOfSightClear } = require('../../apps/backend/services/grid/squareLos');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/core/balance/los_golden_vectors.json'), 'utf8'),
);

test('every golden vector matches lineOfSightClear', () => {
  const mismatches = [];
  for (const c of fixture.cases) {
    const blk = new Set(c.blockers.map(([x, y]) => `${x},${y}`));
    const got = lineOfSightClear(
      { x: c.from[0], y: c.from[1] },
      { x: c.to[0], y: c.to[1] },
      (x, y) => blk.has(`${x},${y}`),
    );
    if (got !== c.expected) {
      mismatches.push(`${JSON.stringify(c)} -> got ${got}`);
    }
  }
  assert.deepEqual(mismatches, [], `LOS golden-vector divergence(s):\n${mismatches.join('\n')}`);
});
