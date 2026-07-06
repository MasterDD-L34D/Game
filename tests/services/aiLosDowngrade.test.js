// tests/services/aiLosDowngrade.test.js
'use strict';
// Integration test for the COMBAT_LOS_ENABLED downgrade seam in
// declareSistemaIntents.js: when the flag is ON and an in-range target is
// LOS-blocked by terrain, the SIS actor must produce 'approach' (advance to
// gain line of sight) instead of 'attack' (shooting through the blocker).
// When the line is clear, the actor still attacks. Flag OFF -> no change.
//
// Uses the same DI stubs as tests/ai/declareSistemaIntents.test.js (only the
// pure geometry helpers are stubbed); the real losClearForAi runs.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickLowestHpEnemy(session, actor) {
  const enemies = session.units.filter(
    (u) => u.id !== actor.id && Number(u.hp) > 0 && u.controlled_by !== actor.controlled_by,
  );
  if (!enemies.length) return null;
  return enemies.reduce((lo, u) => (!lo || u.hp < lo.hp ? u : lo), null);
}

function stepTowards(from, to) {
  const next = { ...from };
  if (from.x !== to.x) next.x += from.x < to.x ? 1 : -1;
  else if (from.y !== to.y) next.y += from.y < to.y ? 1 : -1;
  return next;
}

function buildDeclare() {
  return createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 8,
  });
}

// SIS at (5,0) targets player at (1,0), distance 4, attack_range 4 -> in range.
// Both full HP (no retreat). terrain_features carries the LOS blocker.
function makeSession(terrainFeatures, units) {
  return {
    session_id: 'los-downgrade',
    turn: 1,
    units: units || [
      {
        id: 'p1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        position: { x: 1, y: 0 },
        controlled_by: 'player',
        status: {},
      },
      {
        id: 'sis',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 4,
        position: { x: 5, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
    grid: { width: 8, height: 8, terrain_features: terrainFeatures },
    sistema_pressure: 100,
  };
}

// Containment: a base intent that is NOT 'attack' must pass through the LOS
// downgrade untouched. Retreat scenario (SIS hp 3/10 -> ratio 0.3 <= 0.3 fires
// REGOLA_002) WITH a roccia blocker strictly between actor and target, flag ON.
// The retreat is valid (stepAway (2,0) -> (3,0)), so no cornered fallback to
// attack. Expected: intent stays 'retreat', rule stays REGOLA_002 (NO
// _LOS_BLOCKED suffix) -- proving the downgrade touches ONLY 'attack'.
const RETREAT_UNITS = [
  {
    id: 'p1',
    hp: 10,
    max_hp: 10,
    ap: 2,
    position: { x: 0, y: 0 },
    controlled_by: 'player',
    status: {},
  },
  {
    id: 'sis',
    hp: 3,
    max_hp: 10,
    ap: 2,
    attack_range: 1,
    position: { x: 2, y: 0 },
    controlled_by: 'sistema',
    status: {},
  },
];

test('flag ON: in-range but LOS-blocked target -> approach (not attack)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const declare = buildDeclare();
  const session = makeSession([{ x: 3, y: 0, type: 'roccia' }]);
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  assert.equal(decisions[0].intent, 'approach');
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: in-range with clear line -> attack', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const declare = buildDeclare();
  const session = makeSession([]);
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'attack');
  assert.equal(decisions[0].intent, 'attack');
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag OFF: LOS-blocked target still attacks (no-op)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const declare = buildDeclare();
  const session = makeSession([{ x: 3, y: 0, type: 'roccia' }]);
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'attack');
  assert.equal(decisions[0].intent, 'attack');
});

test('flag ON: LOS-blocked non-attack intent (retreat) passes through unchanged', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const declare = buildDeclare();
  // roccia at (1,0) strictly between player (0,0) and SIS (2,0): LOS blocked.
  const session = makeSession([{ x: 1, y: 0, type: 'roccia' }], RETREAT_UNITS);
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  // Downgrade touches ONLY 'attack': retreat is untouched, no _LOS_BLOCKED tag.
  assert.equal(decisions[0].intent, 'retreat');
  assert.equal(decisions[0].rule, 'REGOLA_002');
  assert.ok(!/_LOS_BLOCKED$/.test(decisions[0].rule));
  delete process.env.COMBAT_LOS_ENABLED;
});

// Task 3 (AI LOS-repositioning wiring): when the attack->approach downgrade
// fires, the SIS must step to a LOS-reopening tile (stepToRegainLos) instead
// of walking straight toward its chosen target -- and must keep engaging
// THAT target (only [target] is passed to stepToRegainLos, not all foes).
//
// Geometry: SIS at (0,1) attack_range 5, player target at (4,1), roccia wall
// at (2,0) and (2,1) blocking the row, grid 6x6. Verified via a direct
// stepToRegainLos(actor, [target], grid, {}) call: the reopening tile is
// (0,2) (matches the task's suggested geometry, no adjustment needed).
// Straight stepTowards from (0,1) toward (4,1) would produce (1,1) (still on
// the blocked row, y===1) -- the reposition must NOT match that.
const LOS_REPOSITION_UNITS = [
  {
    id: 'p1',
    hp: 10,
    max_hp: 10,
    ap: 2,
    position: { x: 4, y: 1 },
    controlled_by: 'player',
    status: {},
  },
  {
    id: 'sis',
    hp: 10,
    max_hp: 10,
    ap: 2,
    attack_range: 5,
    position: { x: 0, y: 1 },
    controlled_by: 'sistema',
    status: {},
  },
];

function makeLosRepositionSession(terrainFeatures) {
  return {
    session_id: 'los-reposition',
    turn: 1,
    units: LOS_REPOSITION_UNITS,
    grid: { width: 6, height: 6, terrain_features: terrainFeatures },
    sistema_pressure: 100,
  };
}

test('flag ON: LOS-blocked target -> SIS repositions to regain LOS (not straight approach)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const declare = buildDeclare();
  const session = makeLosRepositionSession([
    { x: 2, y: 0, type: 'roccia' },
    { x: 2, y: 1, type: 'roccia' },
  ]);
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  // Repositioned off the blocked row -- NOT a straight step toward target
  // (which would stay on y===1). Budget v2: the cost-first metric still picks
  // the 1-step tile (0,2) over any farther candidate, and the intent charges
  // the real move distance (1).
  assert.notEqual(intents[0].action.move_to.y, 1);
  assert.deepEqual(intents[0].action.move_to, { x: 0, y: 2 });
  assert.equal(intents[0].action.ap_cost, 1);
  assert.equal(decisions[0].intent, 'approach');
  assert.ok(/_LOS_BLOCKED$/.test(decisions[0].rule));
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag OFF: same LOS-blocked geometry -> byte-identical, no downgrade/reposition', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const declare = buildDeclare();
  const session = makeLosRepositionSession([
    { x: 2, y: 0, type: 'roccia' },
    { x: 2, y: 1, type: 'roccia' },
  ]);
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  // Flag OFF -> losClearForAi() always true -> no downgrade -> straight attack.
  assert.equal(intents[0].action.type, 'attack');
  assert.equal(decisions[0].intent, 'attack');
  assert.ok(!/_LOS_BLOCKED$/.test(decisions[0].rule));
});

// Graceful fallback (mirrors the sim seam's "no reopening step" test): when the
// downgrade fires but NO single 4-neighbor step reopens LOS, stepToRegainLos
// returns null and the SIS falls back to a plain stepTowards approach toward its
// target -- never worse than today. FULL vertical wall at x=2 (y=0..5) blocks the
// whole column, so no perpendicular step regains sight. Verified via a direct
// stepToRegainLos(actor, [target], grid, {}) call: returns null; the harness then
// emits the stepTowards advance move_to={x:1,y:1} (y stays 1, x advances toward
// the target at (4,1) -- NOT a perpendicular reposition).
function makeLosFullWallSession() {
  const wall = [];
  for (let y = 0; y <= 5; y++) wall.push({ x: 2, y, type: 'roccia' });
  return makeLosRepositionSession(wall);
}

// Budget lookahead (v2): the SIS spends its whole AP pool on the reposition when no
// 1-step tile reopens LOS -- an approach intent is a move-only round anyway, so a
// farther LOS tile strictly dominates the blind stepTowards. With ap:2 the full wall
// at x=2 is beaten by standing ON the wall column at (2,1) (terrain blocks LOS, not
// movement; endpoints excluded -> (2,1) sees (4,1) across the free (3,1)). The intent
// must charge the REAL move distance (ap_cost 2, not the legacy hardcoded 1) so the
// WEGO resolver -- which deducts the ap_cost field without recomputing -- stays honest.
test('flag ON: no one-step reopening -> SIS spends full AP budget on a multi-tile reposition', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const declare = buildDeclare();
  const session = makeLosFullWallSession();
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  assert.deepEqual(intents[0].action.move_to, { x: 2, y: 1 });
  assert.equal(intents[0].action.ap_cost, 2);
  assert.equal(decisions[0].intent, 'approach');
  assert.ok(/_LOS_BLOCKED$/.test(decisions[0].rule));
  delete process.env.COMBAT_LOS_ENABLED;
});

// Turn-starved guard: with only 1 AP the budget cannot reach past the 4-neighbors,
// the full wall defeats the greedy step, and the SIS falls back to the plain
// stepTowards approach -- never worse than today.
test('flag ON: turn-starved SIS (1 AP) + full wall -> graceful stepTowards fallback', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const declare = buildDeclare();
  const session = makeLosFullWallSession();
  // LOS_REPOSITION_UNITS is a shared module-level fixture: clone before mutating.
  session.units = session.units.map((u) => ({ ...u }));
  const sis = session.units.find((u) => u.id === 'sis');
  sis.ap = 1;
  sis.ap_remaining = 1;
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  // Fallback fired: stepTowards advance toward target (y stays on the row,
  // x advances) -- NOT a reposition the unit cannot afford.
  assert.deepEqual(intents[0].action.move_to, { x: 1, y: 1 });
  assert.equal(intents[0].action.ap_cost, 1);
  assert.equal(decisions[0].intent, 'approach');
  // Downgrade still fired (LOS was blocked); there was just no affordable tile.
  assert.ok(/_LOS_BLOCKED$/.test(decisions[0].rule));
  delete process.env.COMBAT_LOS_ENABLED;
});
