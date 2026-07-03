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
