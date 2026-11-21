// SPEC-I N=40 gates (ER1 role-gap / ER6 stresswave) -- combat-adapter event collector.
// The ER6 probe must count `stresswave_event` / `reinforcement_spawn` raw events, but
// GET /api/session/state only exposes a tail-30 events window (sessionHelpers
// publicSessionView). Opt-in `collectEvents: [action_type,...]`: accumulate the tail at
// every state poll + one final sweep, dedupe across overlapping windows. Default (no opt)
// stays byte-identical: no extra state call, `collectedEvents` always [] (additive shape,
// same posture as the overcharge counters #2713).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runEncounter } = require('../../tools/sim/combat-adapter');

// Fake http: one player vs one foe; the foe dies after `foeRounds` state fetches.
// `eventsByFetch[i]` = the events tail returned by the i-th (1-based) state fetch.
function makeFakeHttp({ foeRounds = 2, eventsByFetch = {} } = {}) {
  const calls = [];
  let stateFetches = 0;
  return {
    calls,
    stateFetchCount: () => stateFetches,
    post: async (p, body) => {
      calls.push({ method: 'post', p, body });
      if (p === '/api/session/start') return { status: 200, body: { session_id: 's1' } };
      return { status: 200, body: {} };
    },
    get: async (p) => {
      calls.push({ method: 'get', p });
      if (p === '/api/session/state') {
        stateFetches += 1;
        const foeHp = stateFetches > foeRounds ? 0 : 4;
        return {
          status: 200,
          body: {
            turn: stateFetches,
            events: eventsByFetch[stateFetches] || [],
            units: [
              {
                id: 'hero_a',
                controlled_by: 'player',
                hp: 10,
                ap_remaining: 2,
                status: {},
                position: { x: 0, y: 0 },
                attack_range: 1,
              },
              { id: 'foe_1', controlled_by: 'sistema', hp: foeHp, position: { x: 0, y: 1 } },
            ],
            active_unit: 'hero_a',
          },
        };
      }
      return { status: 404, body: {} };
    },
  };
}

const ROSTER = [{ id: 'hero_a', controlled_by: 'player', hp: 10 }];
const ENEMIES = [{ id: 'foe_1', controlled_by: 'sistema', hp: 4 }];

const SW_T4 = {
  action_type: 'stresswave_event',
  turn: 4,
  actor_id: null,
  result: 'rescue',
};
const SPAWN_A = {
  action_type: 'reinforcement_spawn',
  turn: 3,
  actor_id: 'reinf_1',
  result: 'spawned',
};
const SPAWN_B = {
  action_type: 'reinforcement_spawn',
  turn: 3,
  actor_id: 'reinf_2',
  result: 'spawned',
};
const ATTACK_EV = {
  action_type: 'attack',
  turn: 3,
  actor_id: 'hero_a',
  result: 'hit',
};

test('default (no opt): collectedEvents [] + no extra final state sweep', async () => {
  const http = makeFakeHttp({ foeRounds: 2, eventsByFetch: { 1: [SW_T4] } });
  const res = await runEncounter(http, { roster: ROSTER, enemies: ENEMIES });
  assert.deepEqual(res.collectedEvents, []);
  // 3 in-loop fetches (foe dies on the 3rd), no 4th sweep.
  assert.equal(http.stateFetchCount(), 3);
  // sessionId surfaced (the ER1 probe reads post-run state for the eco-apply proof).
  assert.equal(res.sessionId, 's1');
});

test('opt-in: collects matching types, drops the rest, dedupes overlapping tails', async () => {
  const http = makeFakeHttp({
    foeRounds: 2,
    eventsByFetch: {
      // Overlapping windows: SPAWN_A appears in two consecutive tails -> counted once.
      1: [SPAWN_A, ATTACK_EV],
      2: [SPAWN_A, SPAWN_B],
      3: [SW_T4],
    },
  });
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    collectEvents: ['stresswave_event', 'reinforcement_spawn'],
  });
  const types = res.collectedEvents.map((e) => `${e.action_type}:${e.actor_id || e.result}`);
  assert.deepEqual(types, [
    'reinforcement_spawn:reinf_1',
    'reinforcement_spawn:reinf_2',
    'stresswave_event:rescue',
  ]);
});

test('opt-in: final sweep catches events emitted after the last in-loop poll', async () => {
  const http = makeFakeHttp({
    foeRounds: 2,
    // The stresswave event only ever appears in the 4th (post-loop sweep) tail.
    eventsByFetch: { 4: [SW_T4] },
  });
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    collectEvents: ['stresswave_event'],
  });
  assert.equal(http.stateFetchCount(), 4);
  assert.equal(res.collectedEvents.length, 1);
  assert.equal(res.collectedEvents[0].result, 'rescue');
});

test('pressureStart opt: threads BOTH start knobs; default: neither', async () => {
  const httpOff = makeFakeHttp({ foeRounds: 1 });
  await runEncounter(httpOff, { roster: ROSTER, enemies: ENEMIES });
  const startOff = httpOff.calls.find((c) => c.p === '/api/session/start');
  assert.equal('pressure_start' in startOff.body, false);
  assert.equal('sistema_pressure_start' in startOff.body, false);
  const httpOn = makeFakeHttp({ foeRounds: 1 });
  await runEncounter(httpOn, { roster: ROSTER, enemies: ENEMIES, pressureStart: 50 });
  const startOn = httpOn.calls.find((c) => c.p === '/api/session/start');
  assert.equal(startOn.body.pressure_start, 50);
  assert.equal(startOn.body.sistema_pressure_start, 50);
});

test('modulation opt: threaded into the start body; default: absent', async () => {
  const httpOff = makeFakeHttp({ foeRounds: 1 });
  await runEncounter(httpOff, { roster: ROSTER, enemies: ENEMIES });
  const startOff = httpOff.calls.find((c) => c.p === '/api/session/start');
  assert.equal('modulation' in startOff.body, false);
  const httpOn = makeFakeHttp({ foeRounds: 1 });
  await runEncounter(httpOn, { roster: ROSTER, enemies: ENEMIES, modulation: 'duo_hardcore' });
  const startOn = httpOn.calls.find((c) => c.p === '/api/session/start');
  assert.equal(startOn.body.modulation, 'duo_hardcore');
});

test('captureFirstState: first-poll units snapshot (default: null)', async () => {
  const httpOff = makeFakeHttp({ foeRounds: 1 });
  const off = await runEncounter(httpOff, { roster: ROSTER, enemies: ENEMIES });
  assert.equal(off.firstStateUnits, null);
  const httpOn = makeFakeHttp({ foeRounds: 1 });
  const on = await runEncounter(httpOn, {
    roster: ROSTER,
    enemies: ENEMIES,
    captureFirstState: true,
  });
  assert.ok(Array.isArray(on.firstStateUnits));
  assert.deepEqual(
    on.firstStateUnits.map((u) => u.id),
    ['hero_a', 'foe_1'],
  );
});

test('opt-in: two same-turn spawns with distinct actor_id both counted', async () => {
  const http = makeFakeHttp({
    foeRounds: 1,
    eventsByFetch: { 1: [SPAWN_A, SPAWN_B], 2: [SPAWN_A, SPAWN_B] },
  });
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    collectEvents: ['reinforcement_spawn'],
  });
  assert.equal(res.collectedEvents.length, 2);
});
