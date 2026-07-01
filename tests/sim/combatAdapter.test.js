'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('../../tools/sim/combat-adapter');

// In-process http client (DI) over supertest — no WS / lobby.
function supertestHttp(app) {
  return {
    post: (path, body) =>
      request(app)
        .post(path)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (path, query) =>
      request(app)
        .get(path)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

// A known campaign roster (2 player units) vs a weak enemy → AI should win,
// and the combat MUST use exactly these roster ids (invariant #6 roster identity).
function roster() {
  return [
    {
      id: 'camp_a',
      species: 'dune_stalker',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 20,
      attack_range: 2,
      initiative: 18,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'camp_b',
      species: 'velox',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 18,
      attack_range: 2,
      initiative: 16,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      status: {},
    },
  ];
}
function enemies() {
  return [
    {
      id: 'foe_1',
      species: 'velox',
      hp: 4,
      max_hp: 4,
      ap: 1,
      mod: 0,
      dc: 1,
      attack_range: 1,
      initiative: 1,
      position: { x: 1, y: 4 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

test('combatAdapter.runEncounter: uses the injected roster + returns a real outcome', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);

  const res = await runEncounter(http, {
    roster: roster(),
    enemies: enemies(),
    scenarioId: 'full_loop_test',
    seed: 'fl-seed-1',
    maxRounds: 40,
  });

  // The roster moves into range (move action wired to `position`, Codex P2) and
  // kills the weak enemy → victory, proving end-to-end combat actually works.
  assert.equal(res.outcome, 'victory', `expected victory, got ${res.outcome}`);
  // Invariant #6 — roster identity: the combat's player ids == the injected roster ids.
  assert.deepEqual([...res.rosterIds].sort(), ['camp_a', 'camp_b']);
  // No foreign player ids (e.g. no hardcoded Skiv/AiChar leaked in).
  assert.ok(
    res.survivorIds.every((id) => ['camp_a', 'camp_b'].includes(id)),
    'survivors are roster members',
  );
  assert.ok(res.rounds >= 1 && res.rounds <= 40);
});

test('combatAdapter.runEncounter: a fixed seed replays deterministically (Codex #2561 P2)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);
  const opts = {
    roster: roster(),
    enemies: enemies(),
    scenarioId: 'full_loop_test',
    seed: 'det-1',
    maxRounds: 40,
  };
  const a = await runEncounter(http, opts);
  const b = await runEncounter(http, opts);
  // Same seed → identical outcome + step count (the `seed` field really reaches
  // the per-session RNG; before the fix it was sent as `run_seed` and ignored).
  assert.equal(a.outcome, b.outcome);
  assert.equal(a.rounds, b.rounds);
});

// W5 inc-1: graded calibration metrics (Q2 -- Gap C signal). runEncounter returns
// hp_remaining_pct + units_lost alongside the binary outcome so a team-power delta that a
// binary win/lose hides (cakewalk vs limped-in) becomes measurable. AI-independent.
test('combatAdapter.runEncounter: returns graded metrics (hp_remaining_pct, units_lost)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);
  const res = await runEncounter(http, {
    roster: roster(),
    enemies: enemies(),
    scenarioId: 'full_loop_test',
    seed: 'graded-1',
    maxRounds: 40,
  });
  assert.equal(res.outcome, 'victory');
  // both roster units survive the weak enemy -> 0 lost, survivors carry HP.
  assert.equal(res.units_lost, 0, `expected 0 lost, got ${res.units_lost}`);
  assert.equal(typeof res.hp_remaining_pct, 'number');
  assert.ok(
    res.hp_remaining_pct > 0 && res.hp_remaining_pct <= 1,
    `hp_remaining_pct in (0,1], got ${res.hp_remaining_pct}`,
  );
  // W5 inc-2: enemy_hp_remaining_pct = the team's damage-OUTPUT signal. Victory here means the
  // (weak) enemy is dead, so its remaining HP fraction is 0 -- the metric that discriminates a
  // team-power delta even when the binary WR is saturated (validated: 0.71 -> 0.21 on a +6 buff).
  assert.equal(
    res.enemy_hp_remaining_pct,
    0,
    `enemy dead at victory, got ${res.enemy_hp_remaining_pct}`,
  );
});

// OA2 (SPEC-O): a NON-elimination objective completes via the objective-driver + the
// objective-outcome wiring (sabotage progress while in the zone), NOT elimination.
test('combatAdapter.runEncounter: OA2 -- sabotage objective completes (not elimination)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);
  // One unit in the sabotage zone [4,4,6,6]; a TOUGH FAR foe (hp 300) that cannot be
  // killed -> victory MUST come from the objective (sabotage ticks), proving OA2.
  const roster = [
    {
      id: 'c1',
      hp: 60,
      max_hp: 60,
      ap: 4,
      mod: 20,
      attack_range: 2,
      initiative: 18,
      position: { x: 4, y: 4 },
      controlled_by: 'player',
      status: {},
    },
  ];
  const toughFoe = [
    {
      id: 'f1',
      hp: 300,
      max_hp: 300,
      ap: 1,
      mod: 0,
      dc: 1,
      attack_range: 1,
      initiative: 1,
      position: { x: 9, y: 9 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
  const res = await runEncounter(http, {
    roster,
    enemies: toughFoe,
    scenarioId: 'enc_sabotage_01',
    seed: 'oa2-test',
    maxRounds: 120, // ample margin: sabotage ticks slowly via turn/end; avoid edge flake
  });
  assert.equal(res.outcome, 'victory', `expected objective victory, got ${res.outcome}`);
});
