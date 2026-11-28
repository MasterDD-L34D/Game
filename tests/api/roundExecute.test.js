// tests/api/roundExecute.test.js — Fase 1 SoT-alignment.
//
// Verifica POST /api/session/round/execute:
//   - batch player intents (attack + move + ability) in 1 request
//   - AP budget cumulativo enforced (violations 400)
//   - ai_auto=true triggera handleTurnEndViaRound
//   - ai_auto=false salta AI turn
//   - reaction engine wired (overwatch fires mid-batch se INTO range)
//   - events aggregati ritornati

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  return { sid: startRes.body.session_id, state: startRes.body.state };
}

test('round/execute: batch 2 attack player intents + ai_auto', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_scout (1,2) → e_nomad_1 (3,2) dist=2, range=2 → attack ok
  // p_tank (1,3) → range=1, nemico troppo lontano → move only
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } },
        { actor_id: 'p_tank', action: { type: 'move', position: { x: 2, y: 3 } } },
      ],
      ai_auto: true,
    });
  assert.equal(res.status, 200, `round/execute ok: ${JSON.stringify(res.body).slice(0, 200)}`);
  assert.equal(res.body.results.length, 2);
  assert.equal(res.body.results[0].action_type, 'attack');
  assert.equal(res.body.results[1].action_type, 'move');
  assert.ok(res.body.ai_result, 'ai_result populated con ai_auto=true');
  assert.ok(res.body.events_emitted_count >= 2, 'almeno 2 event emessi (scout attack + tank move)');
  assert.ok(res.body.ap_consumed.p_scout === 1);
  assert.ok(res.body.ap_consumed.p_tank === 1);
});

test('round/execute: AP budget violation → 400 con violations list', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_scout ap=3. 4 attack tentati = 4 AP > 3.
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } },
        { actor_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } },
        { actor_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } },
        { actor_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } },
      ],
      ai_auto: false,
    });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.violations));
  assert.ok(res.body.violations.length >= 1, 'almeno 1 violation');
  const v = res.body.violations.find((x) => x.actor_id === 'p_scout');
  assert.ok(v, 'violation per p_scout presente');
  assert.match(v.error, /AP budget superato/i);
});

test('round/execute: ai_auto=false NON avanza AI turn', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [{ actor_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } }],
      ai_auto: false,
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.ai_result, null, 'ai_result null se ai_auto=false');
  assert.equal(res.body.results.length, 1);
});

test('round/execute: ability intent dispatched via abilityExecutor', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        {
          actor_id: 'p_scout',
          action: {
            type: 'ability',
            ability_id: 'dash_strike',
            target_id: 'e_nomad_1',
            position: { x: 2, y: 2 },
          },
        },
      ],
      ai_auto: false,
    });
  assert.equal(res.status, 200, `ability ok: ${JSON.stringify(res.body).slice(0, 300)}`);
  assert.equal(res.body.results[0].action_type, 'ability');
  assert.equal(res.body.results[0].status, 200);
  assert.equal(res.body.results[0].result.effect_type, 'move_attack');
});

test('round/execute: invalid intent (actor missing) → 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'ghost_xyz', action: { type: 'attack', target_id: 'e_nomad_1' } },
      ],
    });
  assert.equal(res.status, 400);
  assert.ok(res.body.violations);
  assert.match(res.body.violations[0].error, /actor non trovato/i);
});

test('round/execute: empty intents + ai_auto=true runs AI only', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/round/execute').send({
    session_id: sid,
    player_intents: [],
    ai_auto: true,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.results.length, 0);
  assert.ok(res.body.ai_result);
  assert.ok(res.body.ai_result.turn > 1, 'AI ha avanzato turn');
});
