// SPEC-I N=40 gates probe -- pure helper coverage (roster jobs, ER1 proof getter,
// ER6 event extraction/aggregation, arm wiring sanity). The probe itself is a CLI
// evidence harness (L-069 report-only); these tests pin the pure logic the paired
// deltas depend on.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  rosterWithJobs,
  maxEnemyAtkBonus,
  extractStresswave,
  aggregateStresswave,
  extractSpawnComposition,
  aggregateEr7,
  buildBiomePopulation,
  EFFECTS,
  ER1_GAP_JOBS,
  ER1_FULL_JOBS,
} = require('../../tools/sim/spec-i-gates-probe');
const { computeRoleGap } = require('../../apps/backend/services/coop/ermesExporter');

test('rosterWithJobs: same stats as the probe roster, only the job string changes', () => {
  const roster = rosterWithJobs(['guerriero', 'custode']);
  assert.equal(roster.length, 2);
  assert.equal(roster[0].job, 'guerriero');
  assert.equal(roster[1].job, 'custode');
  // ap:2 canon preserved (90-FINAL-DESIGN-FREEZE 7.1) + player control.
  for (const u of roster) {
    assert.equal(u.ap, 2);
    assert.equal(u.controlled_by, 'player');
  }
});

test('arm jobs match the badlands demand semantics (gap negative vs complete)', () => {
  // badlands BIOME_ROLE_DEMANDS = { guerriero: 1, esploratore: 1 }.
  const gap = computeRoleGap(ER1_GAP_JOBS, 'badlands');
  assert.ok(
    Object.values(gap).some((v) => v < 0),
    'gap party must have a negative role gap',
  );
  const full = computeRoleGap(ER1_FULL_JOBS, 'badlands');
  assert.ok(
    Object.values(full).every((v) => v >= 0),
    'complete party must have no negative gap',
  );
});

test('maxEnemyAtkBonus: sistema units only, max across, 0 default', () => {
  assert.equal(maxEnemyAtkBonus([]), 0);
  assert.equal(
    maxEnemyAtkBonus([
      { controlled_by: 'player', attack_mod_bonus: 5 },
      { controlled_by: 'sistema' },
      { controlled_by: 'sistema', attack_mod_bonus: 1 },
    ]),
    1,
  );
});

test('extractStresswave: first rescue/overrun turn + spawn count/turns', () => {
  const out = extractStresswave([
    { action_type: 'reinforcement_spawn', turn: 3, actor_id: 'r1' },
    { action_type: 'stresswave_event', turn: 4, result: 'rescue' },
    { action_type: 'reinforcement_spawn', turn: 6, actor_id: 'r2' },
    { action_type: 'stresswave_event', turn: 8, result: 'overrun' },
  ]);
  assert.deepEqual(out, { rescue_turn: 4, overrun_turn: 8, spawns: 2, spawn_turns: [3, 6] });
});

test('extractStresswave: no events -> null turns, 0 spawns', () => {
  assert.deepEqual(extractStresswave([]), {
    rescue_turn: null,
    overrun_turn: null,
    spawns: 0,
    spawn_turns: [],
  });
});

test('aggregateStresswave: rates over n, turn stats over firing runs only', () => {
  const agg = aggregateStresswave([
    { rescue_turn: 4, overrun_turn: 8, spawns: 3, spawn_turns: [3, 6, 9] },
    { rescue_turn: 4, overrun_turn: null, spawns: 1, spawn_turns: [5] },
    { rescue_turn: null, overrun_turn: null, spawns: 0, spawn_turns: [] },
    { rescue_turn: 4, overrun_turn: 8, spawns: 2, spawn_turns: [3, 7] },
  ]);
  assert.equal(agg.rescue_rate, 0.75);
  assert.equal(agg.overrun_rate, 0.5);
  assert.equal(agg.rescue_turn.n, 3);
  assert.equal(agg.rescue_turn.mean, 4);
  assert.equal(agg.overrun_turn.mean, 8);
  assert.equal(agg.spawns.mean, 1.5);
  // last_spawn_turn over runs WITH spawns only: max(9, 5, 7) -> mean 7.
  assert.equal(agg.last_spawn_turn.n, 3);
  assert.equal(agg.last_spawn_turn.mean, 7);
});

test('extractSpawnComposition: parses species from reinforcement_spawn actor_id', () => {
  const out = extractSpawnComposition([
    { action_type: 'reinforcement_spawn', turn: 3, actor_id: 'reinf_1_sand-burrower' },
    { action_type: 'reinforcement_spawn', turn: 6, actor_id: 'reinf_2_dune-stalker' },
    { action_type: 'reinforcement_spawn', turn: 9, actor_id: 'reinf_3_sand-burrower' },
    { action_type: 'stresswave_event', turn: 4, result: 'rescue' }, // ignored
  ]);
  assert.equal(out.spawns, 3);
  assert.deepEqual(out.spawn_species, { 'sand-burrower': 2, 'dune-stalker': 1 });
});

test('extractSpawnComposition: no spawns -> empty', () => {
  assert.deepEqual(extractSpawnComposition([]), { spawns: 0, spawn_species: {} });
});

test('aggregateEr7: prey/meso/apex shares from real badlands role map', () => {
  // sand-burrower=prey, echo-wing=mesopredator, dune-stalker=apex (ecosystem.yaml).
  const agg = aggregateEr7(
    [
      { spawn_species: { 'sand-burrower': 2, 'dune-stalker': 1, 'echo-wing': 1 } },
      { spawn_species: { 'sand-burrower': 2, 'echo-wing': 2 } },
    ],
    'badlands',
  );
  // 8 spawns total: prey 4, meso 3, apex 1.
  assert.equal(agg.spawns_per_run, 4); // 8 / 2 runs
  assert.equal(agg.prey_share, 0.5);
  assert.equal(agg.meso_share, 0.375);
  assert.equal(agg.apex_share, 0.125);
  assert.equal(agg.by_species['sand-burrower'], 2); // 4 / 2 runs
});

test('aggregateEr7: depleted-prey arm shows prey_share 0 (effect-fired proof)', () => {
  // What the on_depleted arm looks like: prey species never spawn.
  const agg = aggregateEr7(
    [{ spawn_species: { 'dune-stalker': 2, 'echo-wing': 1, 'ferrimordax-rutilus': 1 } }],
    'badlands',
  );
  assert.equal(agg.prey_share, 0);
  assert.ok(agg.apex_share > 0);
});

test('buildBiomePopulation: defaults stable, override pins one role', () => {
  const pop = buildBiomePopulation('badlands', { prey: 'depleted' });
  assert.equal(pop.badlands.prey.state, 'depleted');
  assert.equal(pop.badlands.apex.state, 'stable');
  assert.equal(pop.badlands.mesopredator.state, 'stable');
  assert.equal(pop.badlands.prey.seasons, 0);
});

test('EFFECTS wiring: flags pinned EXPLICITLY per arm (post-flip: default engine ON)', () => {
  assert.equal(EFFECTS.er1.flag, 'ERMES_ROLE_GAP_ENABLED');
  assert.equal(EFFECTS.er6.flag, 'STRESSWAVE_EVENTS_ENABLED');
  // Off arms MUST opt-out explicitly ('false'): with the engine default ON an
  // unset env would silently turn the control arms into effect arms.
  assert.equal(EFFECTS.er1.arms.off_gap.env.ERMES_ROLE_GAP_ENABLED, 'false');
  assert.equal(EFFECTS.er1.arms.off_full.env.ERMES_ROLE_GAP_ENABLED, 'false');
  assert.equal(EFFECTS.er1.arms.on_gap.env.ERMES_ROLE_GAP_ENABLED, 'true');
  assert.equal(EFFECTS.er6.arms.off.env.STRESSWAVE_EVENTS_ENABLED, 'false');
  assert.equal(EFFECTS.er6.arms.on.env.STRESSWAVE_EVENTS_ENABLED, 'true');
  // ER6 collects exactly the two raw event streams the evidence needs.
  assert.deepEqual(EFFECTS.er6.collectEvents, ['stresswave_event', 'reinforcement_spawn']);
  // ER7 (population shaping): flag pinned both ways, campaign-seeded arms, spawn
  // events collected for the composition observable.
  assert.equal(EFFECTS.er7.flag, 'BIOME_POPULATION_ENABLED');
  assert.equal(EFFECTS.er7.seedCampaign, true);
  assert.equal(EFFECTS.er7.arms.off.env.BIOME_POPULATION_ENABLED, 'false');
  assert.equal(EFFECTS.er7.arms.on_depleted.env.BIOME_POPULATION_ENABLED, 'true');
  assert.equal(EFFECTS.er7.arms.on_depleted.popState.prey, 'depleted');
  assert.equal(EFFECTS.er7.arms.on_abundant.popState.apex, 'abundant');
  assert.deepEqual(EFFECTS.er7.collectEvents, ['reinforcement_spawn']);
});
