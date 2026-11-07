// tests/api/ptEconomyWire.test.js
//
// PT economy slice (26-ECONOMY §PT, P0 Q51 B): the per-attack technique roll
// (nat 15-19 +1 / nat 20 +2 / +5 MoS +1) accumulates into a per-ROUND actor.pt
// pool (ptTracker, cap 12), surfaced via publicSessionView for Gate-5 visibility,
// seeded by initial_pt at /start, reset per-round at the round boundary.
//
// performAttack stays a private closure; these drive it through the /action HTTP
// seam (the sequential flow earns + persists pt until a round boundary resets it,
// unlike /round/execute which ends the round in one shot).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

function combatUnits() {
  return [
    {
      id: 'atk',
      species: 'dune_stalker',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 20, // guarantees the hit (mos always >= 11 -> pt >= 2)
      attack_range: 2,
      initiative: 18,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'foe',
      species: 'velox',
      hp: 100, // survives the hit so the round state stays clean
      max_hp: 100,
      ap: 1,
      mod: 0,
      dc: 1, // trivial DC -> mos always huge -> pt earn deterministic (>=4), not RNG-flaky
      attack_range: 1,
      initiative: 1,
      position: { x: 1, y: 2 }, // Manhattan 1 from atk
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

async function start(app, extra = {}) {
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: combatUnits(), ...extra });
  assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  return res.body.session_id;
}

async function unit(app, sid, id) {
  const res = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(res.status, 200);
  return (res.body.units || []).find((u) => u.id === id);
}

async function attack(app, sid) {
  return request(app)
    .post('/api/session/action')
    .send({ session_id: sid, action_type: 'attack', actor_id: 'atk', target_id: 'foe' });
}

test('PT pool starts at 0 and is surfaced on /state (Gate-5 visibility)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await start(app);
  const atk = await unit(app, sid, 'atk');
  assert.equal(typeof atk.pt, 'number', 'pt surfaced as a number on the unit');
  assert.equal(atk.pt, 0, 'pool starts empty');
});

test('PT is earned from the attack technique roll (performAttack wire)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await start(app);
  const res = await attack(app, sid);
  assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  const atk = await unit(app, sid, 'atk');
  assert.ok(atk.pt >= 2, `pt earned from the hit (got ${atk.pt})`);
  assert.ok(atk.pt <= 12, 'pool never exceeds the cap');
});

test('initial_pt seeds the pool at /start (save-load / mirror initial_pp)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await start(app, { initial_pt: { atk: 7 } });
  const atk = await unit(app, sid, 'atk');
  assert.equal(atk.pt, 7, 'seeded pool surfaced on /state');
});

test('PT resets to 0 at the round boundary (per-round, /round/begin-planning)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await start(app, { initial_pt: { atk: 9 } });
  let atk = await unit(app, sid, 'atk');
  assert.equal(atk.pt, 9, 'seeded before the round boundary');
  const bp = await request(app).post('/api/session/round/begin-planning').send({ session_id: sid });
  assert.equal(bp.status, 200, JSON.stringify(bp.body).slice(0, 200));
  atk = await unit(app, sid, 'atk');
  assert.equal(atk.pt, 0, 'pool reset per-round');
});

test('PT resets to 0 after a priority-queue /round/execute (Codex #2557 P1)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // The canonical /round/execute priority_queue flow runs its OWN inline
  // end-of-round ticks (skips handleTurnEndViaRound); the per-round PT reset must
  // fire there too. Seed pt, run an empty round, assert it cleared.
  const sid = await start(app, { initial_pt: { atk: 9 } });
  const exec = await request(app)
    .post('/api/session/round/execute')
    .send({ session_id: sid, player_intents: [], ai_auto: false, priority_queue: true });
  assert.equal(exec.status, 200, JSON.stringify(exec.body).slice(0, 200));
  const atk = await unit(app, sid, 'atk');
  assert.equal(atk.pt, 0, 'priority-queue end-of-round resets the PT pool');
});
