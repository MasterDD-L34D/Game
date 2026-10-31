'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('../../tools/sim/combat-adapter');

function supertestHttp(app) {
  return {
    post: (p, body) =>
      request(app)
        .post(p)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (p, query) =>
      request(app)
        .get(p)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

// Regression guard #2662 (full-loop completion 0.9 -> 0.0). The sim kill-wire session must
// LOAD the encounter objective so a NON-elimination encounter completes via the objective-
// driver, not only by elimination. Root cause: combat-adapter sent `scenario_id`, but
// /api/session/start loads the objective from `encounter_id` -> session.encounter was null
// -> the /objective evaluation was null -> pollObjective never fired -> survival/capture
// encounters fell through to elimination. With a REAL (un-eliminable) roster that times out.
//
// This test pins it on SURVIVAL: vs an un-killable harmless foe the party CANNOT win by
// elimination, so victory MUST come from the survival objective (survive_turns reached) --
// at the runner's own maxRounds=40 budget.
test('OA2 wire: survival objective completes (not elimination) at runner maxRounds=40', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);
  const roster = [
    {
      id: 'c1',
      hp: 60,
      max_hp: 60,
      ap: 3,
      mod: 20,
      attack_range: 2,
      initiative: 18,
      position: { x: 3, y: 3 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'c2',
      hp: 60,
      max_hp: 60,
      ap: 3,
      mod: 18,
      attack_range: 2,
      initiative: 16,
      position: { x: 4, y: 4 },
      controlled_by: 'player',
      status: {},
    },
  ];
  // hp 9999 >> any damage the party can deal over 40 rounds -> un-killable; mod 0 -> harmless
  // so the party survives. Victory can ONLY come from the survival objective.
  const unkillableFoe = [
    {
      id: 'f1',
      hp: 9999,
      max_hp: 9999,
      ap: 1,
      mod: 0,
      dc: 1,
      attack_range: 1,
      initiative: 1,
      position: { x: 0, y: 0 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
  const res = await runEncounter(http, {
    roster,
    enemies: unkillableFoe,
    scenarioId: 'enc_tutorial_02',
    seed: 'surv-wire-1',
    maxRounds: 40,
  });
  assert.equal(
    res.outcome,
    'victory',
    `survival must complete via the objective at maxRounds=40, got ${res.outcome}`,
  );
});
