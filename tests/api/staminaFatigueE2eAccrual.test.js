'use strict';

// OD-024 engine #2 (stamina/fatigue) -- e2e move-handler accrual guard.
// Audit follow-up (#2937): the existing staminaFatigue tests are module-level
// (hand-built `_tiles_voluntary_round` literals). This drives the REAL
// /api/session/action move path so the session.js move-handler tile-accrual
// guard (`isFatigueEnabled()`) is exercised end-to-end:
//   - flag ON  -> a sprint round (all AP spent on >=2 voluntary tiles) accrues
//                 the transient `_tiles_voluntary_round` on the unit.
//   - flag OFF -> the move handler never writes it -> band-neutral, no leak
//                 into the serialized session state.
// Robust ping-pong move pattern borrowed from apBudget.test.js (1 AP / Manhattan
// cell) so it does not depend on map geometry beyond one free adjacent cell.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

const FLAG = 'STAMINA_FATIGUE_ENABLED';

function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prev === undefined) delete process.env[FLAG];
      else process.env[FLAG] = prev;
    });
}

async function startSession(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200);
  return { sid: startRes.body.session_id, state: startRes.body.state };
}

// Drain AP via 1-cell ping-pong moves -> ends with ap_remaining=0 and
// _tiles_voluntary_round = initialAp (>=2 => sprint). Returns the drained unit
// snapshot from /api/session/state.
async function drainApViaMoves(app, sid, player) {
  const initialAp = Number(player.ap_remaining ?? player.ap);
  for (let i = 0; i < initialAp; i += 1) {
    const snap = (await request(app).get('/api/session/state').query({ session_id: sid })).body;
    const self = snap.units.find((u) => u.id === player.id);
    const gridSize = snap.grid_size || snap.grid?.width || 6;
    const occupied = new Set(
      snap.units
        .filter((u) => u.hp > 0 && u.id !== player.id)
        .map((u) => `${u.position.x},${u.position.y}`),
    );
    const from = self.position;
    const candidates = [
      { x: from.x + 1, y: from.y },
      { x: from.x - 1, y: from.y },
      { x: from.x, y: from.y + 1 },
      { x: from.x, y: from.y - 1 },
    ].filter(
      (p) =>
        p.x >= 0 && p.x < gridSize && p.y >= 0 && p.y < gridSize && !occupied.has(`${p.x},${p.y}`),
    );
    assert.ok(candidates.length > 0, `free adjacent cell expected at step ${i}`);
    const mres = await request(app).post('/api/session/action').send({
      session_id: sid,
      action_type: 'move',
      actor_id: player.id,
      position: candidates[0],
    });
    assert.equal(mres.status, 200, `move #${i + 1}: ${JSON.stringify(mres.body)}`);
  }
  const drained = (await request(app).get('/api/session/state').query({ session_id: sid })).body;
  return drained.units.find((u) => u.id === player.id);
}

test('stamina e2e: flag ON -> real /action move accrues _tiles_voluntary_round (sprint)', (t) => {
  return withFlag('true', async () => {
    const { app, close } = createApp({ databasePath: null });
    t.after(async () => {
      if (typeof close === 'function') await close().catch(() => {});
    });
    const { sid, state } = await startSession(app);
    const player = state.units.find((u) => u.controlled_by === 'player');
    const initialAp = Number(player.ap_remaining ?? player.ap);
    assert.ok(initialAp >= 2, `need ap>=2 for a sprint round, got ${initialAp}`);
    const drained = await drainApViaMoves(app, sid, player);
    assert.equal(drained.ap_remaining, 0, 'AP drained to 0');
    assert.ok(
      Number(drained._tiles_voluntary_round) >= 2,
      `move-handler guard accrued voluntary tiles flag-ON (sprint), got ${drained._tiles_voluntary_round}`,
    );
  });
});

test('stamina e2e: flag OFF -> move never writes _tiles_voluntary_round (band-neutral, no leak)', (t) => {
  return withFlag(undefined, async () => {
    const { app, close } = createApp({ databasePath: null });
    t.after(async () => {
      if (typeof close === 'function') await close().catch(() => {});
    });
    const { sid, state } = await startSession(app);
    const player = state.units.find((u) => u.controlled_by === 'player');
    const drained = await drainApViaMoves(app, sid, player);
    assert.equal(drained.ap_remaining, 0, 'AP drained to 0');
    assert.equal(
      drained._tiles_voluntary_round,
      undefined,
      'flag OFF: transient field absent from serialized session state (no leak)',
    );
  });
});
