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
