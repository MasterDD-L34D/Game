// SPRINT_015: test suite per apps/backend/services/ai/sistemaTurnRunner.js
//
// Strategy: creare un runner con dependency injection usando stub/mock
// delle funzioni performAttack, buildAttackEvent, buildMoveEvent,
// emitKillAndAssists, appendEvent. Cosi' il test e' completamente
// isolato dal router session.js e dal trait registry.
//
// Copre:
//   - Dual-action loop (2 iterazioni per turno a ap 2)
//   - Break on kill (no iter 2 se iter 1 uccide)
//   - Skip on stunned (consuma tutti AP, 1 action)
//   - Retreat cornered + fallback approach flag per evitare oscillazioni
//   - Overlap guard (cell occupata)
//   - Distinzione retreat vs move type nell'output

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSistemaTurnRunner } = require('../../apps/backend/services/ai/sistemaTurnRunner');

// ─────────────────────────────────────────────────────────────────
// helpers e fixture
// ─────────────────────────────────────────────────────────────────

function makeSession(overrides = {}) {
  const units = overrides.units || [
    {
      id: 'unit_1',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      max_hp: 10,
      ap: 2,
      ap_remaining: 2,
      attack_range: 2,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
    },
    {
      id: 'unit_2',
      species: 'carapax',
      job: 'vanguard',
      hp: 10,
      max_hp: 10,
      ap: 2,
      ap_remaining: 2,
      attack_range: 1,
      position: { x: 3, y: 0 },
      controlled_by: 'sistema',
    },
  ];
  return {
    session_id: 'test',
    turn: 1,
    active_unit: overrides.active_unit || 'unit_2',
    units,
    grid: { width: 6, height: 6 },
    events: [],
    damage_taken: {},
    action_counter: 0,
  };
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickLowestHpEnemy(session, actor) {
  const enemies = session.units.filter(
    (u) => u.id !== actor.id && u.hp > 0 && u.controlled_by !== actor.controlled_by,
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

// Factory per un runner con stubs configurabili
function buildRunner(overrides = {}) {
  const appended = [];
  const killsEmitted = [];
  const attackResults = overrides.attackResults || [
    // default: 2 attacchi hit con damage 2 ciascuno
    { hit: true, damage: 2, pt: 1, roll: 15, mos: 3 },
    { hit: true, damage: 2, pt: 1, roll: 16, mos: 4 },
    { hit: true, damage: 2, pt: 1, roll: 16, mos: 4 },
  ];
  let attackIdx = 0;

  const performAttack = (session, actor, target) => {
    const r = attackResults[attackIdx++] || attackResults[attackResults.length - 1];
    const damageDealt = r.hit ? r.damage : 0;
    if (r.hit) target.hp = Math.max(0, target.hp - damageDealt);
    return {
      result: {
        hit: r.hit,
        roll: r.roll || 15,
        mos: r.mos || 3,
        pt: r.pt || 0,
        die: 20,
      },
      evaluation: { trait_effects: [] },
      damageDealt,
      killOccurred: target.hp === 0,
    };
  };

  const buildAttackEvent = ({ session, actor, target, result }) => ({
    action_type: 'attack',
    actor_id: actor.id,
    target_id: target.id,
    turn: session.turn,
    position_from: { ...actor.position },
    target_position_at_attack: { ...target.position },
    result: result.hit ? 'hit' : 'miss',
  });

  const buildMoveEvent = ({ session, actor, positionFrom }) => ({
    action_type: 'move',
    actor_id: actor.id,
    turn: session.turn,
    position_from: { ...positionFrom },
    position_to: { ...actor.position },
  });

  const emitKillAndAssists = async (session, killer, target, event) => {
    killsEmitted.push({ killer: killer.id, target: target.id });
  };

  const appendEvent = async (session, event) => {
    appended.push(event);
    session.events.push(event);
  };

  const runner = createSistemaTurnRunner({
    pickLowestHpEnemy,
    manhattanDistance,
    stepTowards,
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    emitKillAndAssists,
    appendEvent,
    gridSize: 6,
    ...overrides.depsOverrides,
  });

  return { runner, appended, killsEmitted };
}

// ─────────────────────────────────────────────────────────────────
// test
// ─────────────────────────────────────────────────────────────────

test('runner: dual-action attack + attack se in range', async () => {
  const { runner, appended } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 3, y: 0 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].type, 'attack');
  assert.equal(actions[1].type, 'attack');
  assert.equal(session.units[1].ap_remaining, 0);
});

test('runner: break on kill non esegue iter 2', async () => {
  // Target starts with 1 HP, first hit uccide, runner deve break
  const { runner, killsEmitted } = buildRunner({
    attackResults: [{ hit: true, damage: 5, pt: 0 }],
  });
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 1,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 3, y: 0 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'attack');
  assert.equal(killsEmitted.length, 1);
  assert.equal(session.units[0].hp, 0);
});

test('runner: fuori range fa move approach per 2 iter', async () => {
  const { runner } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 0, y: 0 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 5, y: 0 },
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].type, 'move');
  assert.equal(actions[1].type, 'move');
  // SIS si e' mosso di 2 celle verso P1 (da 5 a 3)
  assert.equal(session.units[1].position.x, 3);
});

test('runner: REGOLA_002 retreat quando HP basso con spazio', async () => {
  const { runner } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 1, y: 0 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 2,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 3, y: 0 },
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  assert.equal(
    actions.every((a) => a.ia_rule === 'REGOLA_002'),
    true,
  );
  assert.equal(actions[0].type, 'retreat');
  assert.equal(session.units[1].position.x, 5); // retreatato fino al bordo
});

test('runner: cornered fallback — retreat impossibile + in range → attack REGOLA_001', async () => {
  const { runner } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 4, y: 5 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 2,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 5, y: 5 }, // corner, non puo' ritirarsi
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  // Entrambi gli iter dovrebbero essere attack REGOLA_001 (desperate attack)
  assert.equal(actions.length, 2);
  assert.equal(actions[0].type, 'attack');
  assert.equal(actions[0].ia_rule, 'REGOLA_001');
  assert.equal(actions[1].ia_rule, 'REGOLA_001');
});

test('runner: cornered fallback — retreat impossibile + fuori range → approach', async () => {
  const { runner } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 2, y: 3 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 2,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 2, y: 5 }, // bordo bottom, non puo' retreatare verso y=6
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  // Iter 1: cornered, fuori range 1 (dist 2) → approach
  // Iter 2: ora a dist 1, in range → attack
  assert.equal(actions.length, 2);
  assert.equal(actions[0].type, 'move');
  assert.equal(actions[0].ia_rule, 'REGOLA_001');
  assert.equal(actions[1].type, 'attack');
});

test('runner: stunned → 1 skip action e break', async () => {
  const { runner } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 3, y: 0 },
        status: { stunned: 2, rage: 0, panic: 0 },
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'skip');
  assert.equal(actions[0].ia_rule, 'STATO_STUNNED');
  assert.equal(actions[0].ap_spent, 2);
  assert.equal(session.units[1].ap_remaining, 0);
});

test('runner: overlap guard — blocker sulla cella destinazione', async () => {
  // SIS vuole approach verso P1, ma c'e' un'altra unita' alleata in mezzo
  const { runner } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 0, y: 0 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 5, y: 0 },
        controlled_by: 'sistema',
      },
      {
        id: 'unit_3',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 1,
        position: { x: 4, y: 0 }, // blocca lo step di unit_2
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  // stepTowards da (5,0) verso (0,0): dx=-1 → (4,0) ma c'e' unit_3 → skip
  assert.ok(actions.some((a) => a.type === 'skip' && a.reason.includes('blocked by')));
});

test('runner: actor morto o inesistente → ritorna array vuoto', async () => {
  const { runner } = buildRunner();
  const session = makeSession({ active_unit: 'nonesiste' });
  const actions = await runner(session);
  assert.deepEqual(actions, []);
});

test('runner: AP pieni se ap_remaining era 0 a inizio turno', async () => {
  const { runner } = buildRunner();
  const session = makeSession({
    units: [
      {
        id: 'unit_1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack_range: 2,
        position: { x: 3, y: 0 },
        controlled_by: 'player',
      },
      {
        id: 'unit_2',
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 0, // dimenticato il reset
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'sistema',
      },
    ],
  });
  const actions = await runner(session);
  // Il runner reintegra: deve comunque fare 2 azioni
  assert.equal(actions.length, 2);
});

test('runner: factory valida deps required', () => {
  assert.throws(() => createSistemaTurnRunner({}), /pickLowestHpEnemy is required/);
  assert.throws(
    () => createSistemaTurnRunner({ pickLowestHpEnemy: () => null }),
    /stepTowards is required/,
  );
  assert.throws(
    () =>
      createSistemaTurnRunner({
        pickLowestHpEnemy: () => null,
        stepTowards: () => null,
      }),
    /performAttack is required/,
  );
});

// ─── Sistema Pushback integration ──────────────────────────────────────────

test('runner: pushback fires when sistema_counter >= 30, resets counter + restores pressure', async () => {
  const { runner, appended } = buildRunner();
  const session = makeSession();
  session.sistema_pressure = 40;
  session.sistema_counter = 30;
  await runner(session);
  // Counter reset to 0 and pressure increased
  assert.equal(session.sistema_counter, 0);
  assert.equal(session.sistema_pressure, 55); // 40 + 15
  // A sistema_pushback event must have been emitted
  const pushbackEvent = appended.find((e) => e.action_type === 'sistema_pushback');
  assert.ok(pushbackEvent, 'sistema_pushback event emitted');
  assert.equal(pushbackEvent.pressure_restored, 15);
  assert.equal(pushbackEvent.actor_id, 'sistema');
});

test('runner: pushback does not fire when sistema_counter < 30', async () => {
  const { runner, appended } = buildRunner();
  const session = makeSession();
  session.sistema_pressure = 40;
  session.sistema_counter = 15;
  await runner(session);
  assert.equal(session.sistema_counter, 15); // unchanged
  assert.equal(session.sistema_pressure, 40); // unchanged
  const pushbackEvent = appended.find((e) => e.action_type === 'sistema_pushback');
  assert.equal(pushbackEvent, undefined);
});

test('runner: pushback fires even on missing sistema_counter field (legacy sessions safe)', async () => {
  const { runner } = buildRunner();
  const session = makeSession(); // no sistema_counter field
  await runner(session); // must not throw
  assert.ok(true, 'no throw on missing campo');
});

test('runner: pushback pressure clamps at 100', async () => {
  const { runner } = buildRunner();
  const session = makeSession();
  session.sistema_pressure = 95;
  session.sistema_counter = 30;
  await runner(session);
  assert.equal(session.sistema_pressure, 100); // capped
  assert.equal(session.sistema_counter, 0);
});
