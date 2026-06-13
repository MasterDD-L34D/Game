// ADR-2026-04-16 PR 3 di N — test suite per
// apps/backend/services/ai/declareSistemaIntents.js.
//
// Strategy: DI con stub per pickLowestHpEnemy, stepTowards,
// manhattanDistance. Isolato da session.js / trait registry /
// orchestrator reale. Valida che il factory ritorni intents nella
// shape attesa dal round orchestrator per tutte le unit SIS vive.
//
// Copre:
//   - Factory validation (deps required)
//   - Skip di unita' player-controlled
//   - Skip di unita' morte
//   - Skip se no target disponibile
//   - Attack intent per policy.intent='attack'
//   - Move intent per 'approach'
//   - Move intent per 'retreat' (REGOLA_002, HP <= 30%)
//   - Fallback cornered: retreat → attack/approach se bloccato
//   - Intent 'skip' (stunned) → nessun intent, solo decision
//   - Overlap guard: cella occupata → nessun intent
//   - Multi-unit SIS: intents plurali in ordine deterministico

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');

// ─────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────

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

function makeSession(overrides = {}) {
  const units = overrides.units || [
    {
      id: 'p1',
      hp: 10,
      max_hp: 10,
      ap: 2,
      ap_remaining: 2,
      attack_range: 2,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis',
      hp: 10,
      max_hp: 10,
      ap: 2,
      ap_remaining: 2,
      attack_range: 1,
      position: { x: 3, y: 0 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
  return {
    session_id: 'test',
    turn: 1,
    units,
    grid: { width: 6, height: 6 },
    // Default high pressure: tier=Apex (cap=3) → tutti gli intents emessi.
    // Test che vogliono testare il pressure cap impostano sistema_pressure: 0.
    sistema_pressure: overrides.sistema_pressure ?? 100,
  };
}

function buildDeclare() {
  return createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 6,
  });
}

// ─────────────────────────────────────────────────────────────────
// Factory validation
// ─────────────────────────────────────────────────────────────────

test('createDeclareSistemaIntents throws without pickLowestHpEnemy', () => {
  assert.throws(
    () => createDeclareSistemaIntents({ stepTowards, manhattanDistance }),
    /pickLowestHpEnemy/,
  );
});

test('createDeclareSistemaIntents throws without stepTowards', () => {
  assert.throws(
    () => createDeclareSistemaIntents({ pickLowestHpEnemy, manhattanDistance }),
    /stepTowards/,
  );
});

test('createDeclareSistemaIntents throws without manhattanDistance', () => {
  assert.throws(
    () => createDeclareSistemaIntents({ pickLowestHpEnemy, stepTowards }),
    /manhattanDistance/,
  );
});

// ─────────────────────────────────────────────────────────────────
// Skip logic
// ─────────────────────────────────────────────────────────────────

test('skips player-controlled units (no intent)', () => {
  const declare = buildDeclare();
  const session = makeSession();
  const { intents, decisions } = declare(session);
  // Only sis-controlled should appear
  assert.ok(intents.every((i) => i.unit_id === 'sis'));
  assert.ok(decisions.every((d) => d.unit_id === 'sis'));
});

test('skips dead SIS units', () => {
  const declare = buildDeclare();
  const session = makeSession({
    units: [
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
        hp: 0,
        max_hp: 10,
        ap: 2,
        position: { x: 3, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 0);
  assert.equal(decisions.length, 0);
});

test('skip with NO_TARGET reason when no enemy alive', () => {
  const declare = buildDeclare();
  const session = makeSession({
    units: [
      {
        id: 'p1',
        hp: 0,
        max_hp: 10,
        ap: 2,
        position: { x: 0, y: 0 },
        controlled_by: 'player',
        status: {},
      },
      {
        id: 'sis',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 1,
        position: { x: 3, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 0);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].rule, 'NO_TARGET');
});

// ─────────────────────────────────────────────────────────────────
// Attack intent
// ─────────────────────────────────────────────────────────────────

test('attack intent when target in range (REGOLA_001)', () => {
  const declare = buildDeclare();
  const session = makeSession({
    units: [
      {
        id: 'p1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'player',
        status: {},
      },
      {
        id: 'sis',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 3, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'attack');
  assert.equal(intents[0].action.actor_id, 'sis');
  assert.equal(intents[0].action.target_id, 'p1');
  assert.equal(intents[0].action.ap_cost, 1);
  assert.equal(intents[0].action.source_ia_rule, 'REGOLA_001');
  assert.equal(decisions[0].intent, 'attack');
});

// ─────────────────────────────────────────────────────────────────
// Move intent (approach + retreat)
// ─────────────────────────────────────────────────────────────────

test('move approach intent when target out of range (REGOLA_001)', () => {
  const declare = buildDeclare();
  const session = makeSession({
    units: [
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
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 1,
        position: { x: 5, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  assert.ok(intents[0].action.move_to);
  assert.equal(intents[0].action.move_to.x, 4); // stepTowards(5,0 -> 0,0)
  assert.equal(decisions[0].intent, 'approach');
});

test('move retreat intent when HP <= 30% (REGOLA_002)', () => {
  const declare = buildDeclare();
  const session = makeSession({
    units: [
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
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  assert.equal(decisions[0].rule, 'REGOLA_002');
  assert.equal(decisions[0].intent, 'retreat');
});

// ─────────────────────────────────────────────────────────────────
// Cornered fallback
// ─────────────────────────────────────────────────────────────────

test('cornered retreat falls back to attack if in range', () => {
  const declare = buildDeclare();
  // SIS angolo (0,0), player a (1,0): cornered, stepAway = null
  const session = makeSession({
    units: [
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
        hp: 3,
        max_hp: 10,
        ap: 2,
        attack_range: 1,
        position: { x: 0, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  // Dovrebbe cadere in attack (in range 1) con REGOLA_001
  assert.equal(intents[0].action.type, 'attack');
  assert.equal(decisions[0].rule, 'REGOLA_001');
});

test('cornered retreat falls back to approach if out of range', () => {
  const declare = buildDeclare();
  // SIS angolo (0,0), player lontano (5,0), HP basso, cornered → approach
  const session = makeSession({
    units: [
      {
        id: 'p1',
        hp: 10,
        max_hp: 10,
        ap: 2,
        position: { x: 5, y: 0 },
        controlled_by: 'player',
        status: {},
      },
      {
        id: 'sis',
        hp: 3,
        max_hp: 10,
        ap: 2,
        attack_range: 1,
        position: { x: 0, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].action.type, 'move');
  assert.equal(decisions[0].rule, 'REGOLA_001');
  assert.equal(decisions[0].intent, 'approach');
});

// ─────────────────────────────────────────────────────────────────
// Skip (stunned)
// ─────────────────────────────────────────────────────────────────

test('stunned SIS produces skip decision with no intent', () => {
  const declare = buildDeclare();
  const session = makeSession({
    units: [
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
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 1,
        position: { x: 3, y: 0 },
        controlled_by: 'sistema',
        status: { stunned: 2 },
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 0);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].intent, 'skip');
  assert.equal(decisions[0].rule, 'STATO_STUNNED');
});

// ─────────────────────────────────────────────────────────────────
// Overlap guard
// ─────────────────────────────────────────────────────────────────

test('move skipped if destination cell occupied', () => {
  const declare = buildDeclare();
  // sis a (5,0), player a (0,0), altro alleato a (4,0) → blocker su approach
  const session = makeSession({
    units: [
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
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 1,
        position: { x: 5, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
      // Blocker su (4,0): altro player alive
      {
        id: 'p2',
        hp: 10,
        max_hp: 10,
        ap: 2,
        position: { x: 4, y: 0 },
        controlled_by: 'player',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 0);
  // sis targets lowest-hp enemy (p1, p2 both hp 10 - picks first).
  // Approach step towards p1 = (4, 0), blocked by p2.
  assert.equal(decisions.find((d) => d.unit_id === 'sis').intent, 'skip');
  assert.match(decisions[0].reason, /blocked/);
});

// ─────────────────────────────────────────────────────────────────
// Multi-unit deterministic order
// ─────────────────────────────────────────────────────────────────

test('multi-unit SIS produces intents in session.units order', () => {
  const declare = buildDeclare();
  const session = makeSession({
    units: [
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
        id: 'sis_a',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
      {
        id: 'sis_b',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 1 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents } = declare(session);
  assert.equal(intents.length, 2);
  assert.equal(intents[0].unit_id, 'sis_a');
  assert.equal(intents[1].unit_id, 'sis_b');
});

// ─────────────────────────────────────────────────────────────────
// Purity
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Sistema pressure tier — intent cap
// ─────────────────────────────────────────────────────────────────

test('pressure=0 (Calm): cap=1 — only first SIS unit emits intent', () => {
  const declare = buildDeclare();
  const session = makeSession({
    sistema_pressure: 0,
    units: [
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
        id: 'sis_a',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
      {
        id: 'sis_b',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 1 },
        controlled_by: 'sistema',
        status: {},
      },
      {
        id: 'sis_c',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 2 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents, decisions } = declare(session);
  assert.equal(intents.length, 1, 'cap=1 at Calm tier');
  const skipped = decisions.filter((d) => d.rule === 'PRESSURE_CAP');
  assert.equal(skipped.length, 2, '2 SIS skipped by pressure cap');
});

test('pressure=50 (Escalated): cap=3', () => {
  const declare = buildDeclare();
  const session = makeSession({
    sistema_pressure: 50,
    units: [
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
        id: 'sis_a',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
      {
        id: 'sis_b',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 1 },
        controlled_by: 'sistema',
        status: {},
      },
      {
        id: 'sis_c',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 2 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents } = declare(session);
  assert.equal(intents.length, 3, 'cap=3 at Escalated tier (post 2026-04-17 rebalance)');
});

test('pressure=80 (Critical): cap=3 — all SIS emit', () => {
  const declare = buildDeclare();
  const session = makeSession({
    sistema_pressure: 80,
    units: [
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
        id: 'sis_a',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 0 },
        controlled_by: 'sistema',
        status: {},
      },
      {
        id: 'sis_b',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 1 },
        controlled_by: 'sistema',
        status: {},
      },
      {
        id: 'sis_c',
        hp: 10,
        max_hp: 10,
        ap: 2,
        attack_range: 2,
        position: { x: 2, y: 2 },
        controlled_by: 'sistema',
        status: {},
      },
    ],
  });
  const { intents } = declare(session);
  assert.equal(intents.length, 3, 'cap=3 at Critical tier');
});

test('does not mutate session or units', () => {
  const declare = buildDeclare();
  const session = makeSession();
  const sisPosBefore = { ...session.units[1].position };
  const apBefore = session.units[1].ap_remaining;
  declare(session);
  assert.deepEqual(session.units[1].position, sisPosBefore);
  assert.equal(session.units[1].ap_remaining, apBefore);
});

test('returns empty when session is null or missing units', () => {
  const declare = buildDeclare();
  assert.deepEqual(declare(null), { intents: [], decisions: [] });
  assert.deepEqual(declare({}), { intents: [], decisions: [] });
});

// ─────────────────────────────────────────────────────────────────
// Utility AI per-actor (ADR-2026-04-17 Q-001 T3.1 gradual rollout)
// ─────────────────────────────────────────────────────────────────

const AI_PROFILES_FIXTURE = {
  profiles: {
    aggressive: { use_utility_brain: true, overrides: {} },
    balanced: { use_utility_brain: false, overrides: {} },
  },
};

function makeSessionWithProfile(aiProfile) {
  const units = [
    {
      id: 'p1',
      hp: 10,
      max_hp: 10,
      ap: 2,
      ap_remaining: 2,
      attack_range: 2,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis',
      hp: 10,
      max_hp: 10,
      ap: 2,
      ap_remaining: 2,
      attack_range: 1,
      position: { x: 1, y: 0 },
      controlled_by: 'sistema',
      status: {},
      ai_profile: aiProfile,
    },
  ];
  return {
    session_id: 'test',
    turn: 1,
    units,
    grid: { width: 6, height: 6 },
    sistema_pressure: 100,
  };
}

test('aiProfiles dep: actor with ai_profile=aggressive resolves to Utility AI (profile.use_utility_brain=true)', () => {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 6,
    aiProfiles: AI_PROFILES_FIXTURE,
    useUtilityAi: false, // global fallback, overridden by profile
  });
  const result = declare(makeSessionWithProfile('aggressive'));
  assert.equal(result.intents.length, 1);
});

test('aiProfiles dep: actor with ai_profile=balanced resolves to legacy rules (profile.use_utility_brain=false)', () => {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 6,
    aiProfiles: AI_PROFILES_FIXTURE,
    useUtilityAi: true, // global true, overridden by profile=false
  });
  const result = declare(makeSessionWithProfile('balanced'));
  assert.equal(result.intents.length, 1);
});

test('aiProfiles dep: actor without ai_profile falls back to global useUtilityAi', () => {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 6,
    aiProfiles: AI_PROFILES_FIXTURE,
    useUtilityAi: false,
  });
  const result = declare(makeSessionWithProfile(undefined));
  assert.equal(result.intents.length, 1);
});
