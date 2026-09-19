// =============================================================================
// SISTEMA PRESSURE WIRING — verifica che pressure salga su KO player
//
// Pressure inizia a 0. Ogni KO di una unita' SIS dal player → +20.
// Tier (computeSistemaTier) cambia da Calm → Alert (>=25) → Escalated (>=50).
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('Sistema pressure: starts at 0', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(stateRes.body.sistema_pressure, 0, 'pressure starts at 0');
  assert.ok(stateRes.body.sistema_tier, 'tier object exists');
});

test('Sistema pressure: rises after player KOs enemy', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  // Force a KO: directly poke session state via attacks until enemy dies.
  // Run rounds until at least one enemy KO'd.
  const MAX_ROUNDS = 12;
  let killed = false;
  for (let r = 0; r < MAX_ROUNDS && !killed; r++) {
    const state = (await request(app).get('/api/session/state').query({ session_id: sid })).body;
    const players = state.units.filter((u) => u.controlled_by === 'player' && u.hp > 0);
    const enemies = state.units.filter((u) => u.controlled_by === 'sistema' && u.hp > 0);
    if (!players.length || !enemies.length) break;

    for (const p of players) {
      const liveState = (await request(app).get('/api/session/state').query({ session_id: sid }))
        .body;
      const liveEnemies = liveState.units.filter((u) => u.controlled_by === 'sistema' && u.hp > 0);
      if (!liveEnemies.length) {
        killed = true;
        break;
      }
      await request(app).post('/api/session/action').send({
        session_id: sid,
        actor_id: p.id,
        action_type: 'attack',
        target_id: liveEnemies[0].id,
      });
    }

    const finalState = (await request(app).get('/api/session/state').query({ session_id: sid }))
      .body;
    const finalEnemies = finalState.units.filter((u) => u.controlled_by === 'sistema' && u.hp > 0);
    if (finalEnemies.length < 2) killed = true;

    if (!killed) await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }

  const finalState = (await request(app).get('/api/session/state').query({ session_id: sid })).body;
  console.log(
    `  Pressure dopo ${killed ? 'KO' : 'no KO'}: ${finalState.sistema_pressure} (tier=${finalState.sistema_tier?.label || 'N/A'})`,
  );
  if (killed) {
    assert.ok(
      finalState.sistema_pressure >= 20,
      `pressure should be >= 20 after KO, got ${finalState.sistema_pressure}`,
    );
  }
});
