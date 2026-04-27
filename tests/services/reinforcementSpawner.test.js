// Unit test for reinforcementSpawner — ADR-2026-04-19.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const { tick, _internals } = require('../../apps/backend/services/combat/reinforcementSpawner');

function mockSession(overrides = {}) {
  return {
    pressure: 30,
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
    reinforcement_pool: [{ unit_id: 'minion_01', weight: 1.0, max_spawns: 5, hp: 6, mod: 2 }],
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
    ],
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 0,
      max_total_spawns: 10,
    },
    ...overrides,
  };
}

test('tick skips when policy disabled (default OFF)', () => {
  const session = mockSession();
  const enc = mockEncounter({ reinforcement_policy: { enabled: false } });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.skipped, true);
  assert.equal(res.reason, 'policy_disabled');
  assert.equal(res.spawned.length, 0);
});

test('tick skips at Calm tier (below min_tier Alert)', () => {
  const session = mockSession({ pressure: 10 }); // Calm
  const enc = mockEncounter();
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.skipped, true);
  assert.match(res.reason, /tier_below_min/);
});

test('tick spawns 1 unit at Alert tier (budget 1)', () => {
  const session = mockSession({ pressure: 30 }); // Alert → budget 1
  const enc = mockEncounter();
  const initialUnitCount = session.units.length;
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.budget_used, 1);
  assert.equal(res.spawned.length, 1);
  assert.equal(session.units.length, initialUnitCount + 1);
  const spawn = res.spawned[0];
  assert.equal(spawn.tier_at_spawn, 'Alert');
  assert.equal(spawn.wave_index, 1);
  assert.deepEqual(spawn.spawn_tile, [9, 9]);
});

test('tick spawns 4 units at Apex tier (budget 4)', () => {
  const session = mockSession({ pressure: 95 }); // Apex → budget 4
  const enc = mockEncounter({
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
      [8, 8],
    ],
  });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.budget_used, 4);
});

test('tick respects max_total_spawns cap', () => {
  const session = mockSession({
    pressure: 75,
    reinforcement_state: {
      total_spawned: 9,
      last_spawn_round: 0,
      spawn_history: Array(9).fill({ unit_id: 'minion_01' }),
    },
  });
  // Pool with high per-unit cap so only total cap binds.
  const enc = mockEncounter({
    reinforcement_pool: [{ unit_id: 'minion_01', weight: 1.0, max_spawns: 100 }],
  });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.budget_used, 1, 'only 1 spawn left before cap');
});

test('tick blocks when max_total reached', () => {
  const session = mockSession({
    pressure: 75,
    reinforcement_state: {
      total_spawned: 10,
      last_spawn_round: 0,
      spawn_history: Array(10).fill({ unit_id: 'minion_01' }),
    },
  });
  const res = tick(session, mockEncounter(), { rng: () => 0.5 });
  assert.equal(res.skipped, true);
  assert.equal(res.reason, 'max_total_reached');
});

test('tick respects cooldown_rounds', () => {
  const session = mockSession({
    pressure: 30,
    round: 2,
    reinforcement_state: {
      total_spawned: 1,
      last_spawn_round: 1,
      spawn_history: [{ unit_id: 'minion_01' }],
    },
  });
  const enc = mockEncounter({
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 3,
      max_total_spawns: 10,
    },
  });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.skipped, true);
  assert.equal(res.reason, 'cooldown_active');
});

test('tick rejects entry_tile too close to PG (Manhattan < 3)', () => {
  const session = mockSession({
    pressure: 30,
    units: [{ id: 'p1', controlled_by: 'player', position: [8, 8], hp: 10 }],
  });
  const enc = mockEncounter({
    reinforcement_entry_tiles: [[9, 9]], // Manhattan=2 from [8,8]
  });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.skipped, true);
  assert.match(res.reason, /no_tile_or_pool|no_walkable_entry/);
});

test('tick respects per-unit max_spawns cap', () => {
  const session = mockSession({
    pressure: 95, // Apex budget 4
    reinforcement_state: {
      total_spawned: 2,
      last_spawn_round: 0,
      spawn_history: [{ unit_id: 'rare_boss' }, { unit_id: 'rare_boss' }],
    },
  });
  const enc = mockEncounter({
    reinforcement_pool: [
      { unit_id: 'rare_boss', weight: 1.0, max_spawns: 2 }, // already at cap
      { unit_id: 'minion_01', weight: 1.0, max_spawns: 10 },
    ],
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
      [8, 8],
    ],
  });
  const res = tick(session, enc, { rng: () => 0.5 });
  // All spawns should fall back to minion_01
  const bossSpawns = res.spawned.filter((s) => s.unit_id === 'rare_boss').length;
  assert.equal(bossSpawns, 0, 'rare_boss cap respected');
  assert.ok(res.budget_used > 0);
});

test('tick returns no_pool when pool empty', () => {
  const res = tick(mockSession(), { reinforcement_policy: { enabled: true } }, { rng: () => 0.5 });
  assert.equal(res.skipped, true);
  assert.equal(res.reason, 'no_pool');
});

test('tick returns no_entry_tiles when entry list empty', () => {
  const enc = {
    reinforcement_pool: [{ unit_id: 'minion_01', weight: 1, max_spawns: 5 }],
    reinforcement_entry_tiles: [],
    reinforcement_policy: { enabled: true, min_tier: 'Alert' },
  };
  const res = tick(mockSession(), enc, { rng: () => 0.5 });
  assert.equal(res.skipped, true);
  assert.equal(res.reason, 'no_entry_tiles');
});

test('Sprint 2 §II — biomeConfig derived from encounter.biome_id (universal initial wave)', () => {
  // Sprint 2 §II — encounter.biome_id only (canonical YAML) → bias must engage.
  // Pre-fix: biomeConfig was always null, role_templates loader skipped.
  // Post-fix: biomeConfig fallback synthesized from biome_id → bias active.
  const session = mockSession({ pressure: 95 }); // Apex budget 4 to trigger picks
  const enc = mockEncounter({
    biome_id: 'biome_test_sprint2',
    reinforcement_pool: [
      { unit_id: 'fungal_drone', weight: 1, max_spawns: 5, tags: ['fungal', 'spore'] },
      { unit_id: 'plain_minion', weight: 1, max_spawns: 5, tags: ['neutral'] },
    ],
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
      [8, 8],
    ],
    affixes: ['spore_diluite'], // Should boost fungal_drone via tag match
  });
  // Pass affixes via encounter (canonical YAML path).
  const res = tick(session, enc, { rng: () => 0.05 });
  assert.equal(res.budget_used, 4, '4 spawns at Apex');
  // Affix bias should preferentially pick fungal_drone (low rng + boosted weight).
  const fungalSpawns = res.spawned.filter((s) => s.unit_id === 'fungal_drone').length;
  assert.ok(fungalSpawns >= 1, 'biome bias picks fungal_drone via spore_diluite affix');
});

test('Sprint 2 §II — biomeConfig fallback null when no biome_id + no biome', () => {
  const session = mockSession({ pressure: 95 });
  const enc = mockEncounter({
    reinforcement_pool: [{ unit_id: 'm', weight: 1, max_spawns: 5 }],
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
      [8, 8],
    ],
  });
  // No biome / biome_id → biomeConfig stays null → bias skipped, no crash.
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.budget_used, 4);
  assert.ok(res.spawned.every((s) => s.unit_id === 'm'));
});

test('_internals: manhattanDistance', () => {
  assert.equal(_internals.manhattanDistance([0, 0], [3, 4]), 7);
  assert.equal(_internals.manhattanDistance([5, 5], [5, 5]), 0);
});

test('_internals: tierMeetsMin', () => {
  assert.equal(_internals.tierMeetsMin('Alert', 'Calm'), true);
  assert.equal(_internals.tierMeetsMin('Calm', 'Alert'), false);
  assert.equal(_internals.tierMeetsMin('Apex', 'Escalated'), true);
  assert.equal(_internals.tierMeetsMin('Unknown', 'Alert'), true); // permissive fallback
});
