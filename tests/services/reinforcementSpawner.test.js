// Unit test for reinforcementSpawner — ADR-2026-04-19.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const { tick, _internals } = require('../../apps/backend/services/combat/reinforcementSpawner');
const ecosystemResolver = require('../../apps/backend/services/worldgen/ecosystemResolver');

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

// SPEC-I ER6 -- overrun one-shot: opts.budgetBonus extends the tier budget
// for THIS tick only (consume-once at the caller). Bounded by max_total_spawns.
test('tick honours opts.budgetBonus on top of tier budget (ER6 overrun)', () => {
  const session = mockSession(); // pressure 30 -> Alert, budget 1
  const enc = mockEncounter();
  const base = tick(session, enc, { rng: () => 0.5 });
  assert.equal(base.budget_used, 1, 'baseline Alert budget is 1');

  const boosted = tick(mockSession(), mockEncounter(), { rng: () => 0.5, budgetBonus: 1 });
  assert.equal(boosted.budget_used, 2, 'bonus +1 -> budget 2');
  assert.equal(boosted.spawned.length, 2);
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

test('tick carries canonical species_id from pool entry to spawned unit (#418)', () => {
  const session = mockSession({ pressure: 30 });
  const enc = mockEncounter({
    reinforcement_pool: [
      {
        unit_id: 'guardiani_risonanza_elite',
        species_id: 'leviatano_risonante',
        weight: 1.0,
        max_spawns: 5,
        hp: 10,
        mod: 3,
      },
    ],
  });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.spawned.length, 1);
  const spawned = session.units.find((u) => u.reinforcement === true);
  assert.equal(spawned.species, 'guardiani_risonanza_elite', 'species keeps the archetype label');
  assert.equal(
    spawned.species_id,
    'leviatano_risonante',
    'canonical species_id propagated so a recruit consumer resolves the real creature',
  );
});

test('tick leaves species_id empty when the pool entry authors none (back-compat)', () => {
  const session = mockSession({ pressure: 30 });
  const enc = mockEncounter(); // minion_01, no species_id
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.spawned.length, 1);
  const spawned = session.units.find((u) => u.reinforcement === true);
  assert.equal(
    spawned.species_id,
    '',
    'unauthored pool entry -> empty species_id (no label fallback)',
  );
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

// §21 ALIENA telemetry wire (ALIENA-B)
test('aliena telemetry: opt-in policy populates session buffer with pool snapshot', () => {
  const session = mockSession({ pressure: 30 });
  const enc = mockEncounter({
    biome_id: 'dune',
    affixes: ['sabbia'],
    reinforcement_pool: [
      { unit_id: 'dune_stalker', weight: 1, tags: ['desert', 'sand'], role: 'apex' },
      { unit_id: 'mire_husk', weight: 1, tags: ['wet'], role: 'support' },
    ],
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 0,
      max_total_spawns: 10,
      aliena_coherence_telemetry: true,
    },
  });
  tick(session, enc, { rng: () => 0.5 });
  assert.ok(Array.isArray(session.aliena_coherence_telemetry));
  assert.equal(session.aliena_coherence_telemetry.length, 2);
  const sample = session.aliena_coherence_telemetry[0];
  assert.equal(sample.biome_id, 'dune');
  assert.ok(typeof sample.entry_id === 'string');
  assert.ok(Number.isFinite(sample.aggregate));
  assert.ok(sample.sub_scores && typeof sample.sub_scores === 'object');
  assert.equal(typeof sample.round, 'number');
});

test('aliena telemetry: default (flag absent) does NOT attach buffer', () => {
  const session = mockSession({ pressure: 30 });
  const enc = mockEncounter({
    biome_id: 'dune',
    affixes: ['sabbia'],
  });
  tick(session, enc, { rng: () => 0.5 });
  assert.equal(session.aliena_coherence_telemetry, undefined);
});

test('aliena telemetry: multi-tick accumulates with round metadata', () => {
  const session = mockSession({ pressure: 30, round: 5 });
  const enc = mockEncounter({
    biome_id: 'dune',
    affixes: ['sabbia'],
    reinforcement_pool: [
      { unit_id: 'a', weight: 1, tags: ['sand'], role: 'apex' },
      { unit_id: 'b', weight: 1, tags: ['wet'], role: 'support' },
    ],
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 0,
      max_total_spawns: 99,
      aliena_coherence_telemetry: true,
    },
  });
  tick(session, enc, { rng: () => 0.5 });
  session.round = 7;
  tick(session, enc, { rng: () => 0.5 });
  assert.equal(session.aliena_coherence_telemetry.length, 4);
  assert.equal(session.aliena_coherence_telemetry[0].round, 5);
  assert.equal(session.aliena_coherence_telemetry[3].round, 7);
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

// --- TKT-WORLDGEN-GAPA: foodweb spawn-pool whitelist filter ---

const gapaFarEntryTiles = [
  [9, 9],
  [8, 9],
  [9, 8],
  [8, 8],
];

test('GAP-A: band-neutral on trophic-clean badlands pool (excluded empty)', () => {
  ecosystemResolver._resetCache();
  const session = mockSession({ pressure: 30 }); // Alert -> budget 1
  const enc = mockEncounter({
    biome_id: 'badlands',
    reinforcement_pool: [
      { unit_id: 'rust-scavenger', weight: 2, max_spawns: 5, hp: 8 },
      { unit_id: 'sand-burrower', weight: 2, max_spawns: 5, hp: 7 },
      { unit_id: 'echo-wing', weight: 1, max_spawns: 5, hp: 6 },
    ],
    reinforcement_entry_tiles: gapaFarEntryTiles,
  });
  const res = tick(session, enc, { rng: () => 0.1 });
  assert.ok(res.foodweb_filter);
  assert.deepEqual(res.foodweb_filter.excluded, []); // nothing removed -> WR bands unchanged
  assert.equal(res.foodweb_filter.applied, false);
  assert.ok(res.spawned.length > 0);
});

test('GAP-A: excludes off-biome species from spawn pool', () => {
  ecosystemResolver._resetCache();
  const session = mockSession({ pressure: 30 });
  const enc = mockEncounter({
    biome_id: 'badlands',
    reinforcement_pool: [
      { unit_id: 'rust-scavenger', weight: 5, max_spawns: 5, hp: 8 }, // badlands consumer
      { unit_id: 'cryo-lynx', weight: 5, max_spawns: 5, hp: 8 }, // cryosteppe -- filtered out
    ],
    reinforcement_entry_tiles: gapaFarEntryTiles,
  });
  // rng biased to the LAST entry: a broken filter would spawn cryo-lynx.
  const res = tick(session, enc, { rng: () => 0.99 });
  assert.equal(res.foodweb_filter.applied, true);
  assert.ok(res.foodweb_filter.excluded.includes('cryo-lynx'));
  assert.ok(res.spawned.length > 0);
  assert.ok(res.spawned.every((s) => s.unit_id === 'rust-scavenger'));
});

test('GAP-A: hardcore_07 off-foodweb pool -> all_excluded_fallback (pool preserved, band-safe)', () => {
  ecosystemResolver._resetCache();
  const session = mockSession({ pressure: 30 });
  // rovine_planari foodweb does NOT contain these synthetic combat units, so
  // the filter would empty the pool -> fallback preserves it unchanged.
  const enc = mockEncounter({
    biome_id: 'rovine_planari',
    reinforcement_pool: [
      { unit_id: 'cacciatore_corazzato', weight: 2, max_spawns: 3, hp: 8 },
      { unit_id: 'predone_agile', weight: 3, max_spawns: 3, hp: 6 },
    ],
    reinforcement_entry_tiles: gapaFarEntryTiles,
  });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.foodweb_filter.reason, 'all_excluded_fallback');
  assert.equal(res.foodweb_filter.applied, false);
  assert.ok(res.spawned.length > 0); // pool preserved -> still spawns -> bands unchanged
});

test('GAP-A: kill switch (foodweb_filter:false) disables filter', () => {
  ecosystemResolver._resetCache();
  const session = mockSession({ pressure: 30 });
  const enc = mockEncounter({
    biome_id: 'badlands',
    reinforcement_pool: [{ unit_id: 'cryo-lynx', weight: 1, max_spawns: 5, hp: 8 }], // off-biome, allowed
    reinforcement_entry_tiles: gapaFarEntryTiles,
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 0,
      max_total_spawns: 10,
      foodweb_filter: false,
    },
  });
  const res = tick(session, enc, { rng: () => 0 });
  assert.equal(res.foodweb_filter.reason, 'disabled');
  assert.ok(res.spawned.length > 0);
});

test('GAP-A: no biome_id -> filter passthrough (no_biome)', () => {
  const session = mockSession({ pressure: 30 });
  const enc = mockEncounter({ reinforcement_entry_tiles: gapaFarEntryTiles });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.foodweb_filter.reason, 'no_biome');
  assert.ok(res.spawned.length > 0);
});

// #2724 -- position format drift: il round model porta position {x,y} (object),
// lo spawner leggeva SOLO array -> manhattanDistance NaN -> farFromAllPG false
// per ogni tile con un PG vivo -> rinforzi MAI spawnati in partita reale.
test('#2724: spawns with object-format {x,y} PG positions (round model)', () => {
  const session = mockSession({
    units: [
      { id: 'p1', controlled_by: 'player', position: { x: 0, y: 0 }, hp: 10 },
      { id: 'p2', controlled_by: 'player', position: { x: 1, y: 0 }, hp: 10 },
    ],
  });
  const res = tick(session, mockEncounter(), { rng: () => 0.5 });
  assert.ok(!res.reason || res.reason === 'spawned', `expected spawn, got skip: ${res.reason}`);
  assert.equal(res.spawned.length, 1, 'Alert budget 1 -> one spawn');
});

test('#2724: occupied tile detected with object-format positions', () => {
  const session = mockSession({
    units: [
      // un'unit object-position SOPRA l'entry tile [9,9] -> tile occupato
      { id: 'p1', controlled_by: 'player', position: { x: 0, y: 0 }, hp: 10 },
      { id: 'blocker', controlled_by: 'sistema', position: { x: 9, y: 9 }, hp: 5 },
    ],
  });
  const enc = mockEncounter({ reinforcement_entry_tiles: [[9, 9]] });
  const res = tick(session, enc, { rng: () => 0.5 });
  assert.equal(res.spawned.length, 0, 'only tile is occupied -> no spawn');
});

test('#2724: spawned unit position matches the session format (object when PGs are objects)', () => {
  const session = mockSession({
    units: [{ id: 'p1', controlled_by: 'player', position: { x: 0, y: 0 }, hp: 10 }],
  });
  const res = tick(session, mockEncounter(), { rng: () => 0.5 });
  assert.equal(res.spawned.length, 1);
  const spawned = session.units.find((u) => u.id === res.spawned[0].spawned_unit_id);
  assert.ok(spawned, 'unit added to session');
  assert.ok(
    spawned.position && typeof spawned.position === 'object' && !Array.isArray(spawned.position),
    `expected {x,y} position, got ${JSON.stringify(spawned.position)}`,
  );
});
