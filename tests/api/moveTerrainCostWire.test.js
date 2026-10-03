// tests/api/moveTerrainCostWire.test.js
//
// Phase 1 integration: the player move-gate honours terrain cost when
// MOVE_TERRAIN_COST_ENABLED=true, and is byte-identical to Manhattan when OFF.
// Terrain reaches the session via the encounter payload (encounter.grid.terrain_features).
// A medium-profile unit (no morphotype) moving onto a `roccia` tile (mult 1.5) pays
// ceil(1.5)=2 AP for a 1-tile move when ON; 1 AP when OFF.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

// Two units (1 player, 1 enemy) with fixed positions + a roccia tile at (1,0).
function fixture() {
  return {
    units: [
      {
        id: 'p1',
        name: 'Mover',
        controlled_by: 'player',
        position: { x: 0, y: 0 },
        hp: 10,
        max_hp: 10,
        ap: 3,
        ap_remaining: 3,
        attack: 3,
        defense: 3,
        traits: [],
      },
      {
        id: 'e1',
        name: 'Dummy',
        controlled_by: 'sistema',
        position: { x: 3, y: 3 },
        hp: 10,
        max_hp: 10,
        ap: 2,
        ap_remaining: 2,
        attack: 3,
        defense: 3,
        traits: [],
      },
    ],
    encounter: {
      grid: {
        width: 6,
        height: 6,
        terrain_features: [{ x: 1, y: 0, type: 'roccia', defense_mod: 2 }],
      },
    },
  };
}

async function startFixture(app) {
  const f = fixture();
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: f.units, encounter: f.encounter });
  assert.equal(res.status, 200, `start should succeed: ${JSON.stringify(res.body)}`);
  return { sid: res.body.session_id, state: res.body.state };
}

function player(state) {
  return state.units.find((u) => u.id === 'p1');
}

test('flag OFF: move onto roccia costs 1 AP (Manhattan parity)', async (t) => {
  delete process.env.MOVE_TERRAIN_COST_ENABLED;
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startFixture(app);
  const p = player(state);
  assert.deepEqual(p.position, { x: 0, y: 0 }, 'input position honoured');
  const ap0 = p.ap_remaining;

  const mv = await request(app)
    .post('/api/session/action')
    .send({ session_id: sid, action_type: 'move', actor_id: 'p1', position: { x: 1, y: 0 } });
  assert.equal(mv.status, 200, `move should succeed: ${JSON.stringify(mv.body)}`);

  const after = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(player(after.body).ap_remaining, ap0 - 1, 'flag OFF -> 1 AP (Manhattan)');
});

test('flag ON: move onto roccia costs 2 AP (terrain cost bites)', async (t) => {
  process.env.MOVE_TERRAIN_COST_ENABLED = 'true';
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    delete process.env.MOVE_TERRAIN_COST_ENABLED;
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startFixture(app);
  const p = player(state);
  assert.deepEqual(p.position, { x: 0, y: 0 }, 'input position honoured');
  const ap0 = p.ap_remaining;

  const mv = await request(app)
    .post('/api/session/action')
    .send({ session_id: sid, action_type: 'move', actor_id: 'p1', position: { x: 1, y: 0 } });
  assert.equal(mv.status, 200, `move should succeed: ${JSON.stringify(mv.body)}`);

  const after = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(player(after.body).ap_remaining, ap0 - 2, 'flag ON -> 2 AP (ceil roccia 1.5)');
});

test('flag ON: move to a plain tile still costs Manhattan (band-neutral basis)', async (t) => {
  process.env.MOVE_TERRAIN_COST_ENABLED = 'true';
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    delete process.env.MOVE_TERRAIN_COST_ENABLED;
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startFixture(app);
  const ap0 = player(state).ap_remaining;

  // Move (0,0)->(0,1): no terrain on that tile -> default 1.0 -> 1 AP.
  const mv = await request(app)
    .post('/api/session/action')
    .send({ session_id: sid, action_type: 'move', actor_id: 'p1', position: { x: 0, y: 1 } });
  assert.equal(mv.status, 200, `move should succeed: ${JSON.stringify(mv.body)}`);

  const after = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(player(after.body).ap_remaining, ap0 - 1, 'plain tile -> 1 AP even with flag ON');
});
