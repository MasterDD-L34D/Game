// SPEC-I ER6 overrun carry-over fork (grilling verdict 2026-06-30).
// When REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED=true, the UNSPENT portion of the
// overrun budget bonus accumulates onto the next tick (vs the as-built consume-once
// where it was discarded). Flag default OFF -> byte-identical to consume-once.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const { tick } = require('../../apps/backend/services/combat/reinforcementSpawner');

const ON = { REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED: 'true' };

function mockSession(overrides = {}) {
  return {
    pressure: 30, // Alert -> tier budget 1
    round: 3,
    turn: 3,
    grid: { width: 10, height: 10 },
    units: [
      { id: 'p1', controlled_by: 'player', position: [0, 0], hp: 10 },
      { id: 'p2', controlled_by: 'player', position: [1, 0], hp: 10 },
    ],
    ...overrides,
  };
}

function mockEncounter(overrides = {}) {
  return {
    reinforcement_pool: [{ unit_id: 'minion_01', weight: 1.0, max_spawns: 50, hp: 6, mod: 2 }],
    // Only TWO entry tiles -> a budget > 2 cannot fully spend (tiles occupy after spawn).
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
    ],
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 0,
      max_total_spawns: 50,
    },
    ...overrides,
  };
}

test('flag OFF: partial spawn discards the unspent bonus (consume-once, byte-identical)', () => {
  const session = mockSession();
  // Alert budget 1 + bonus 3 = 4 intended, but only 2 entry tiles -> spawn 2.
  const res = tick(session, mockEncounter(), { rng: () => 0.5, budgetBonus: 3 });
  assert.equal(res.budget_used, 2, 'only 2 tiles -> 2 spawns');
  assert.equal(
    session.reinforcement_state.overrun_carry,
    undefined,
    'flag OFF -> no carry field written',
  );
});

test('flag ON: partial spawn carries the unspent bonus to state', () => {
  const session = mockSession();
  // effectiveBonus = 3 (no prior carry). base 1 -> baseIntended 1.
  // spent 2 -> bonusSpent = 2-1 = 1 -> carry = 3-1 = 2.
  const res = tick(session, mockEncounter(), { rng: () => 0.5, budgetBonus: 3, env: ON });
  assert.equal(res.budget_used, 2);
  assert.equal(session.reinforcement_state.overrun_carry, 2, 'unspent bonus carried');
});

test('flag ON: carried bonus is applied to the NEXT tick budget then drained', () => {
  // Pre-seed a carry of 2; this tick has free tiles, budgetBonus 0.
  const session = mockSession({
    reinforcement_state: {
      total_spawned: 0,
      last_spawn_round: -Infinity,
      spawn_history: [],
      overrun_carry: 2,
    },
  });
  const enc = mockEncounter({
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
      [8, 8],
    ],
  });
  // effectiveBonus = 0 + 2 = 2. base 1 -> budget 3. 4 tiles -> spawn 3.
  const res = tick(session, enc, { rng: () => 0.5, budgetBonus: 0, env: ON });
  assert.equal(res.budget_used, 3, 'carried bonus lifted the budget from 1 to 3');
  assert.equal(session.reinforcement_state.overrun_carry, 0, 'carry fully spent -> 0');
});

test('flag ON: cooldown skip carries the freshly-armed bonus', () => {
  const session = mockSession({
    round: 2,
    reinforcement_state: {
      total_spawned: 1,
      last_spawn_round: 1,
      spawn_history: [{ unit_id: 'minion_01' }],
      overrun_carry: 0,
    },
  });
  const enc = mockEncounter({
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 3,
      max_total_spawns: 50,
    },
  });
  const res = tick(session, enc, { rng: () => 0.5, budgetBonus: 2, env: ON });
  assert.equal(res.reason, 'cooldown_active');
  assert.equal(session.reinforcement_state.overrun_carry, 2, 'bonus waits through cooldown');
});

test('flag ON: tier-below-min skip carries the bonus (pressure dropped)', () => {
  const session = mockSession({ pressure: 10 }); // Calm < Alert
  const res = tick(session, mockEncounter(), { rng: () => 0.5, budgetBonus: 2, env: ON });
  assert.match(res.reason, /tier_below_min/);
  assert.equal(session.reinforcement_state.overrun_carry, 2, 'bonus waits for pressure to rise');
});

test('flag ON: max_total terminal drops the carry (no unbounded leak)', () => {
  const session = mockSession({
    pressure: 75,
    reinforcement_state: {
      total_spawned: 50,
      last_spawn_round: 0,
      spawn_history: Array(50).fill({ unit_id: 'minion_01' }),
      overrun_carry: 5,
    },
  });
  const res = tick(session, mockEncounter(), { rng: () => 0.5, budgetBonus: 2, env: ON });
  assert.equal(res.reason, 'max_total_reached');
  assert.equal(session.reinforcement_state.overrun_carry, 0, 'cap reached -> carry dropped');
});

test('flag ON: full spawn leaves zero carry', () => {
  const session = mockSession();
  const enc = mockEncounter({
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
    ],
  });
  // base 1 + bonus 1 = budget 2, 3 free tiles -> spawn 2 -> nothing unspent.
  const res = tick(session, enc, { rng: () => 0.5, budgetBonus: 1, env: ON });
  assert.equal(res.budget_used, 2);
  assert.equal(session.reinforcement_state.overrun_carry, 0);
});
