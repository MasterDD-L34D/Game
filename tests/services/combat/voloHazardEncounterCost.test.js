// tests/services/combat/voloHazardEncounterCost.test.js
// Move terrain-cost substrate (2026-06-29): deterministic proof that the volo grades
// fire on the REAL loadable encounter terrain. Loads enc_deserto_caldo_bocche_vulcaniche_01,
// builds terrainAt from its grid.terrain_features, and asserts the wall-crossing cost is
// strictly decreasing g0 > g1 > g2 > g3 (heavy profile). No flag, no sim, no runtime.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadEncounter,
  _resetCache,
} = require('../../../apps/backend/services/combat/encounterLoader');
const {
  moveCost,
  terrainAtFromFeatures,
} = require('../../../apps/backend/services/combat/moveCost');
const { getProfile } = require('../../../apps/backend/services/combat/movementProfiles');
const { applyVoloGrade } = require('../../../apps/backend/services/combat/movementResolver');

const ENC_ID = 'enc_deserto_caldo_bocche_vulcaniche_01';

function setup() {
  _resetCache();
  const enc = loadEncounter(ENC_ID);
  assert.ok(enc, `${ENC_ID} not loadable`);
  assert.ok(
    enc.grid && Array.isArray(enc.grid.terrain_features),
    'encounter has no grid.terrain_features',
  );
  const terrainAt = terrainAtFromFeatures(enc.grid.terrain_features);
  const bounds = { width: enc.grid.width, height: enc.grid.height };
  const heavy = getProfile('heavy');
  // Cross the wall on row y=4: enter (3,4)=lava, (4,4)=roccia, (5,4)=default.
  const cost = (g) =>
    moveCost(
      { x: 2, y: 4 },
      { x: 5, y: 4 },
      g > 0 ? applyVoloGrade(heavy, g) : heavy,
      terrainAt,
      bounds,
    );
  return { cost, terrainAt };
}

test('the encounter terrain is the lava(x=3)+roccia(x=4) wall', () => {
  const { terrainAt } = setup();
  assert.equal(terrainAt(3, 4), 'lava');
  assert.equal(terrainAt(4, 4), 'roccia');
  assert.equal(terrainAt(5, 4), null); // default
});

test('crossing cost is strictly decreasing g0 > g1 > g2 > g3 (heavy profile)', () => {
  const { cost } = setup();
  const c0 = cost(0);
  const c1 = cost(1);
  const c2 = cost(2);
  const c3 = cost(3);
  assert.ok(c0 > c1, `g0(${c0}) !> g1(${c1})`);
  assert.ok(c1 > c2, `g1(${c1}) !> g2(${c2})`);
  assert.ok(c2 > c3, `g2(${c2}) !> g3(${c3})`);
});

test('exact crossing costs match the profile math (lava 2.0 / roccia 2.0 / default 1.0)', () => {
  const { cost } = setup();
  assert.equal(cost(0), 5.0); // 2.0 + 2.0 + 1.0
  assert.equal(cost(1), 4.0); // 2.0 (hazard unchanged) + 1.0 (roccia freed) + 1.0
  assert.equal(cost(2), 3.5); // 1.5 (hazard halved) + 1.0 + 1.0
  assert.equal(cost(3), 3.0); // 1.0 (hazard freed) + 1.0 + 1.0
});
