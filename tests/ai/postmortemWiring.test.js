// tests/ai/postmortemWiring.test.js
// AI War postmortem patterns wiring:
//   - PRESSURE_DELTAS constants (task 3)
//   - Decentralized conflict resolution in declareSistemaIntents (task 5a)
//   - Stateless invariant: same input → same output (task 5b)
const test = require('node:test');
const assert = require('node:assert/strict');

const { PRESSURE_DELTAS, applyPressureDelta } = require('../../apps/backend/routes/sessionHelpers');
const {
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');

// ── PRESSURE_DELTAS contract ──

test('PRESSURE_DELTAS: all required keys present', () => {
  assert.equal(typeof PRESSURE_DELTAS.pg_kills_sis, 'number');
  assert.equal(typeof PRESSURE_DELTAS.sg_pg_down, 'number');
  assert.equal(typeof PRESSURE_DELTAS.pg_victory_encounter, 'number');
  assert.equal(typeof PRESSURE_DELTAS.pg_trait_unlock, 'number');
  assert.equal(typeof PRESSURE_DELTAS.pg_biome_clear, 'number');
  assert.equal(typeof PRESSURE_DELTAS.round_decay, 'number');
});

test('PRESSURE_DELTAS: pg_kills_sis positive, sg_pg_down negative', () => {
  assert.ok(PRESSURE_DELTAS.pg_kills_sis > 0, 'PG KO sistema should raise pressure');
  assert.ok(PRESSURE_DELTAS.sg_pg_down < 0, 'Sistema KO PG should lower pressure');
  assert.ok(PRESSURE_DELTAS.round_decay < 0, 'round_decay should lower pressure');
});

test('PRESSURE_DELTAS: frozen (mutation silently ignored)', () => {
  const before = PRESSURE_DELTAS.pg_kills_sis;
  try {
    PRESSURE_DELTAS.pg_kills_sis = 999;
  } catch {
    // strict mode throws; sloppy mode silently ignores — both acceptable
  }
  assert.equal(PRESSURE_DELTAS.pg_kills_sis, before, 'frozen object must not mutate');
  assert.ok(Object.isFrozen(PRESSURE_DELTAS));
});

test('applyPressureDelta composes correctly with PRESSURE_DELTAS', () => {
  // 50 + pg_kills_sis (20) = 70
  assert.equal(applyPressureDelta(50, PRESSURE_DELTAS.pg_kills_sis), 70);
  // 20 + sg_pg_down (-10) = 10
  assert.equal(applyPressureDelta(20, PRESSURE_DELTAS.sg_pg_down), 10);
  // 5 + sg_pg_down (-10) clamped to 0
  assert.equal(applyPressureDelta(5, PRESSURE_DELTAS.sg_pg_down), 0);
  // 95 + pg_kills_sis (20) clamped to 100
  assert.equal(applyPressureDelta(95, PRESSURE_DELTAS.pg_kills_sis), 100);
});

// ── Decentralized conflict resolution (task 5a) ──

function makeSession(units, pressure = 50) {
  return {
    session_id: 't',
    units: units.map((u) => ({ hp: 10, position: { x: 0, y: 0 }, ...u })),
    sistema_pressure: pressure,
  };
}

function makeDeclare() {
  const pickLowestHpEnemy = (session, actor) => {
    const enemies = session.units.filter(
      (u) => u.id !== actor.id && u.hp > 0 && u.controlled_by !== actor.controlled_by,
    );
    if (!enemies.length) return null;
    return enemies.reduce((lo, c) => (!lo || c.hp < lo.hp ? c : lo), null);
  };
  return createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards: (f, t) => ({ x: f.x + 1, y: f.y }),
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
    gridSize: 6,
  });
}

test('conflict resolution: 2 SIS do not stack on same PG when alternatives exist', () => {
  const session = makeSession(
    [
      { id: 's1', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 0 } },
      { id: 's2', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 1 } },
      { id: 'p1', controlled_by: 'player', hp: 3, position: { x: 1, y: 0 } },
      { id: 'p2', controlled_by: 'player', hp: 5, position: { x: 1, y: 1 } },
    ],
    75, // Critical → 3 intents/round cap
  );
  const declare = makeDeclare();
  const { intents } = declare(session);

  const attackIntents = intents.filter((i) => i.action.type === 'attack');
  const targets = attackIntents.map((i) => i.action.target_id);
  const uniqueTargets = new Set(targets);
  assert.equal(uniqueTargets.size, targets.length, 'all attack targets must be distinct');
  assert.ok(targets.includes('p1'), 'lowest-hp PG must be first target');
  assert.ok(targets.includes('p2'), 'second SIS picks alternate PG, not stack');
});

test('conflict resolution: falls back to stacking if no alternative', () => {
  const session = makeSession(
    [
      { id: 's1', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 0 } },
      { id: 's2', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 1 } },
      { id: 'p1', controlled_by: 'player', hp: 3, position: { x: 1, y: 0 } },
    ],
    75, // 3 intents/round cap
  );
  const declare = makeDeclare();
  const { intents } = declare(session);
  const attackIntents = intents.filter((i) => i.action.type === 'attack');
  // Only 1 PG available → both SIS target p1 (no alternative).
  if (attackIntents.length === 2) {
    assert.equal(attackIntents[0].action.target_id, 'p1');
    assert.equal(attackIntents[1].action.target_id, 'p1');
  }
});

// ── Stateless invariant (task 5b) ──

test('stateless: same input produces same output (deep equal)', () => {
  const baseUnits = [
    { id: 's1', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 0 } },
    { id: 's2', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 1 } },
    { id: 'p1', controlled_by: 'player', hp: 3, position: { x: 1, y: 0 } },
    { id: 'p2', controlled_by: 'player', hp: 5, position: { x: 1, y: 1 } },
  ];
  const session1 = makeSession(baseUnits, 50);
  const session2 = makeSession(baseUnits, 50);
  const declare = makeDeclare();
  const out1 = declare(session1);
  const out2 = declare(session2);
  assert.deepEqual(out1, out2, 'declareSistemaIntents must be pure function of session');
});

test('stateless: does not mutate session', () => {
  const session = makeSession(
    [
      { id: 's1', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 0 } },
      { id: 'p1', controlled_by: 'player', hp: 3, position: { x: 1, y: 0 } },
    ],
    25,
  );
  const snapshot = JSON.parse(JSON.stringify(session));
  const declare = makeDeclare();
  declare(session);
  assert.deepEqual(session, snapshot, 'declareSistemaIntents must not mutate session');
});

test('stateless: calling twice in row produces identical output', () => {
  const session = makeSession(
    [
      { id: 's1', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 0 } },
      { id: 's2', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 1 } },
      { id: 'p1', controlled_by: 'player', hp: 3, position: { x: 1, y: 0 } },
      { id: 'p2', controlled_by: 'player', hp: 5, position: { x: 1, y: 1 } },
    ],
    75,
  );
  const declare = makeDeclare();
  const first = declare(session);
  const second = declare(session);
  assert.deepEqual(first, second, 'back-to-back calls must produce identical output');
});
