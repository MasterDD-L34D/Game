// tests/services/combat/moveTerrainBandNeutral.test.js
//
// End-to-end band-neutral invariant guard for the move terrain-cost substrate.
// The LOAD-BEARING property (spec 2026-06-23 sez.1/B): with no typed terrain, the
// resolved-profile -> moveCost chain MUST cost exactly the Manhattan distance, so the
// flag-gated wire is band-neutral even ON until a map carries typed terrain. Also locks
// that a no-volo unit (g=0) never alters the profile.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveMovementProfile,
  applyVoloGrade,
  evaluateVoloGrade,
} = require('../../../apps/backend/services/combat/movementResolver');
const {
  moveCost,
  terrainAtFromFeatures,
} = require('../../../apps/backend/services/combat/moveCost');

const bounds = { width: 6, height: 6 };

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

test('no-volo unit on untyped terrain: moveCost equals Manhattan for every profile', () => {
  const noTerrain = terrainAtFromFeatures([]);
  for (const morphotype of ['corazzato', 'volante', null]) {
    const profile = applyVoloGrade(
      resolveMovementProfile({ morphotype }, null),
      evaluateVoloGrade({}, { traits: [] }), // g=0
    );
    for (const dest of [
      { x: 3, y: 0 },
      { x: 2, y: 2 },
      { x: 5, y: 5 },
    ]) {
      const cost = moveCost({ x: 0, y: 0 }, dest, profile, noTerrain, bounds);
      assert.equal(
        cost,
        manhattan({ x: 0, y: 0 }, dest),
        `morphotype=${morphotype} dest=${dest.x},${dest.y}`,
      );
    }
  }
});

test('heavy unit on roccia pays more than Manhattan (cost actually bites)', () => {
  const profile = resolveMovementProfile({ morphotype: 'corazzato' }, null); // heavy
  const terrainAt = terrainAtFromFeatures([{ x: 1, y: 0, type: 'roccia' }]);
  const cost = moveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, profile, terrainAt, bounds);
  assert.ok(cost > 1, `expected >1, got ${cost}`); // roccia heavy mult 2.0
});

test('volo grade 3 on the same roccia falls back to Manhattan (terrain ignored)', () => {
  const profile = applyVoloGrade(resolveMovementProfile({ morphotype: 'corazzato' }, null), 3);
  const terrainAt = terrainAtFromFeatures([{ x: 1, y: 0, type: 'roccia' }]);
  const cost = moveCost({ x: 0, y: 0 }, { x: 1, y: 0 }, profile, terrainAt, bounds);
  assert.equal(cost, 1);
});
