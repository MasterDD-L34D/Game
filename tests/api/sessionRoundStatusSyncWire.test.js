// tests/api/sessionRoundStatusSyncWire.test.js
//
// REAL-BINDING lock-test for syncStatusesFromRoundState (sessionRoundBridge.js).
//
// Why this exists: tests/ai/sessionRoundStatusSync.test.js asserts a *copy* of
// the logic (`syncStatusesFromRoundStateSpec`), NOT the real function, so it
// stays green even if the bridge diverges. This suite drives the REAL function
// through the public round endpoints (createApp + supertest, in-memory, no DB)
// and pins its multi-unit ROUTING contract: the status back-sync maps each
// roundState unit to the correct session unit by id.
//
// Guard target: the per-unit `.find((u) => String(u.id) === String(roundUnit.id))`
// lookups inside syncStatusesFromRoundState (the main rebuild loop + the morale
// re-apply loop). Any refactor (e.g. N+1 -> Map/index) MUST keep these
// assertions green: same routing, same per-unit status dict, same intensity,
// no cross-unit contamination, no dropped/extra units.
//
// Determinism: morale_mod -99 forces the morale check, mod 20 forces the crit;
// status/status_intensity output is stable across runs (only hp varies with the
// d20 damage stream, so hp is never asserted). Values below are characterized
// against origin/main and must be updated only by a deliberate behavior change.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startWith(app, units) {
  const res = await request(app).post('/api/session/start').send({ units });
  assert.equal(res.status, 200, `session start ok: ${JSON.stringify(res.body).slice(0, 200)}`);
  return res.body.session_id;
}

function byId(units) {
  return Object.fromEntries((units || []).map((u) => [u.id, u]));
}

// ── Scenario A: two independent crit->panic pairs ───────────────────────────
// Exercises the morale re-apply loop inside syncStatusesFromRoundState across
// more than one unit. Locks that each victim's panic routes to THAT victim and
// neither attacker is contaminated.
test('STATUS-SYNC wire: multi-unit crit->panic routes to the correct units', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startWith(app, [
    {
      id: 'atk1',
      controlled_by: 'player',
      hp: 20,
      max_hp: 20,
      mod: 20,
      position: { x: 1, y: 1 },
      attack_range: 2,
      ap: 3,
    },
    {
      id: 'vic1',
      controlled_by: 'sistema',
      hp: 50,
      max_hp: 50,
      mod: 0,
      dc: 2,
      morale_mod: -99,
      position: { x: 1, y: 2 },
      attack_range: 1,
      ap: 3,
      status: {},
    },
    {
      id: 'atk2',
      controlled_by: 'player',
      hp: 20,
      max_hp: 20,
      mod: 20,
      position: { x: 5, y: 1 },
      attack_range: 2,
      ap: 3,
    },
    {
      id: 'vic2',
      controlled_by: 'sistema',
      hp: 50,
      max_hp: 50,
      mod: 0,
      dc: 2,
      morale_mod: -99,
      position: { x: 5, y: 2 },
      attack_range: 1,
      ap: 3,
      status: {},
    },
  ]);

  const exec = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'atk1', action: { type: 'attack', target_id: 'vic1' } },
        { actor_id: 'atk2', action: { type: 'attack', target_id: 'vic2' } },
      ],
      ai_auto: false,
    });
  assert.equal(exec.status, 200, `round exec ok: ${JSON.stringify(exec.body).slice(0, 200)}`);

  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(state.status, 200);
  const u = byId(state.body.units);

  // Routing invariants (the point of the test): attackers never carry the
  // victims' panic; each victim carries its own.
  assert.deepEqual(u.atk1.status, {}, 'atk1 not contaminated by a victim status');
  assert.deepEqual(u.atk2.status, {}, 'atk2 not contaminated by a victim status');
  assert.ok(Number(u.vic1.status.panic) > 0, 'vic1 panicked through the sync');
  assert.ok(Number(u.vic2.status.panic) > 0, 'vic2 panicked through the sync');

  // Golden characterization (origin/main): exact per-unit status dicts. A
  // misrouting refactor (wrong unit / dropped unit / merged dict) breaks these.
  assert.deepEqual(u.atk1.status, {});
  assert.deepEqual(u.vic1.status, { panic: 1 });
  assert.deepEqual(u.vic1.status_intensity, { panic: 1 });
  assert.deepEqual(u.atk2.status, {});
  assert.deepEqual(u.vic2.status, { panic: 2 });
});

// ── Scenario B: seeded-status decay routing across multiple units ───────────
// Exercises the main rebuild loop inside syncStatusesFromRoundState: seeded
// per-unit statuses flow session.status -> roundState -> orchestrator tick ->
// back to session.status on the SAME unit. Locks that u1 keeps its own decayed
// bleeding and no other unit inherits it.
test('STATUS-SYNC wire: seeded statuses decay back onto the originating unit', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startWith(app, [
    {
      id: 'u1',
      controlled_by: 'player',
      hp: 10,
      max_hp: 10,
      position: { x: 1, y: 1 },
      status: { bleeding: 3 },
      status_intensity: { bleeding: 2 },
    },
    {
      id: 'u2',
      controlled_by: 'player',
      hp: 10,
      max_hp: 10,
      position: { x: 2, y: 1 },
      status: { marked: 2 },
    },
    { id: 'enemy', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 1, y: 5 } },
  ]);

  const exec = await request(app)
    .post('/api/session/round/execute')
    .send({ session_id: sid, player_intents: [], ai_auto: true });
  assert.equal(exec.status, 200, `round exec ok: ${JSON.stringify(exec.body).slice(0, 200)}`);

  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(state.status, 200);
  const u = byId(state.body.units);

  // Routing invariants: u1's bleeding stays on u1; nobody else inherits it.
  assert.ok(Number(u.u1.status.bleeding) > 0, 'u1 retains its own bleeding after the tick');
  assert.equal(u.u2.status.bleeding, undefined, 'u2 did not inherit u1 bleeding');
  assert.equal(u.enemy.status.bleeding, undefined, 'enemy did not inherit u1 bleeding');

  // Golden characterization (origin/main): exact decayed dicts.
  assert.deepEqual(u.u1.status, { bleeding: 1 });
  assert.deepEqual(u.u1.status_intensity, { bleeding: 1 });
  assert.deepEqual(u.u2.status, {});
  assert.deepEqual(u.enemy.status, {});
});
