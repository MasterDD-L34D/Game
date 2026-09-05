// tests/api/roundExecutePriorityQueue.test.js
//
// Verifica priority_queue flag in /api/session/round/execute (ADR-2026-04-15).
// priority = initiative + action_speed - status_penalty
// action_speed: defend/parry +2, attack 0, ability -1, move -2
// status_penalty: panic 2×intensity, disorient 1×intensity

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function threeUnits() {
  return [
    // p_fast: initiative alta + attack (priority = 15 + 0 = 15)
    {
      id: 'p_fast',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 3,
      initiative: 15,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      status: {},
    },
    // p_slow: initiative bassa + move (priority = 5 - 2 = 3)
    {
      id: 'p_slow',
      species: 'carapax',
      job: 'vanguard',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 5,
      position: { x: 2, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    // enemy: target passivo
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      hp: 50,
      max_hp: 50,
      ap: 2,
      attack_range: 1,
      initiative: 3,
      position: { x: 3, y: 3 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

async function startSession(app, units) {
  const res = await request(app).post('/api/session/start').send({ units });
  assert.equal(res.status, 200);
  return res.body.session_id;
}

test('priority_queue=false (default): player_intents dispatched in declaration order', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, threeUnits());
  // Declare p_slow move PRIMA di p_fast attack (ordine inverso a priority).
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'p_slow', action: { type: 'move', position: { x: 2, y: 2 } } },
        { actor_id: 'p_fast', action: { type: 'attack', target_id: 'sis' } },
      ],
      ai_auto: false,
    });
  assert.equal(res.status, 200);
  // Default (no priority queue): esegui p_slow prima (come in body)
  assert.equal(res.body.results[0].actor_id, 'p_slow');
  assert.equal(res.body.results[0].action_type, 'move');
  assert.equal(res.body.results[1].actor_id, 'p_fast');
  assert.equal(res.body.results[1].action_type, 'attack');
  assert.equal(res.body.priority_queue_used, false);
});

test('priority_queue=true: sort desc per priority (p_fast attack > p_slow move)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, threeUnits());
  // p_fast attack: priority = 15 + 0 = 15
  // p_slow move:   priority = 5 + (-2) = 3
  // Dichiarati in ordine inverso a priority → queue sorta
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'p_slow', action: { type: 'move', position: { x: 2, y: 2 } } },
        { actor_id: 'p_fast', action: { type: 'attack', target_id: 'sis' } },
      ],
      ai_auto: false,
      priority_queue: true,
    });
  assert.equal(res.status, 200);
  // priority_queue sorts: p_fast (priority 15) PRIMA di p_slow (priority 3)
  assert.equal(res.body.results[0].actor_id, 'p_fast', 'p_fast dispatch per prima');
  assert.equal(res.body.results[0].action_type, 'attack');
  assert.equal(res.body.results[1].actor_id, 'p_slow');
  assert.equal(res.body.results[1].action_type, 'move');
  assert.equal(res.body.priority_queue_used, true);
});

test('priority_queue=true: status_penalty (panic) riduce priority', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = threeUnits();
  // Dai p_fast panic intensity 3 → penalty = 6
  // Priority nuovo: 15 + 0 - 6 = 9 (ancora > p_slow 3, ma ridotto)
  units[0].status = { panic: 3 };
  const sid = await startSession(app, units);

  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'p_fast', action: { type: 'attack', target_id: 'sis' } },
        { actor_id: 'p_slow', action: { type: 'attack', target_id: 'sis' } },
      ],
      ai_auto: false,
      priority_queue: true,
    });
  assert.equal(res.status, 200);
  // p_fast ancora prima (9 > 5), ma panic penalty lo rallenta relativamente.
  // Con p_slow attack (priority 5) vs p_fast panicked (9): p_fast vince comunque.
  assert.equal(res.body.results[0].actor_id, 'p_fast');
});

test('priority_queue=true: tiebreak stabile per-actor (2 attack stesso actor)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, threeUnits());
  // 2 attack di p_fast stesso actor, stessa priority → mantieni ordine dichiarazione
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'p_fast', action: { type: 'attack', target_id: 'sis' } },
        { actor_id: 'p_fast', action: { type: 'attack', target_id: 'sis' } },
      ],
      ai_auto: false,
      priority_queue: true,
    });
  assert.equal(res.status, 200);
  // 2 attack dello stesso actor preservati in ordine originale.
  assert.equal(res.body.results.length, 2);
  assert.equal(res.body.results[0].actor_id, 'p_fast');
  assert.equal(res.body.results[1].actor_id, 'p_fast');
});

test('priority_queue=true + ai_auto=true: AI intents mescolati via priority', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, threeUnits());
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [{ actor_id: 'p_slow', action: { type: 'move', position: { x: 2, y: 2 } } }],
      ai_auto: true,
      priority_queue: true,
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.priority_queue_used, true);
  // ai_result è null (AI gestito nel queue, non via handleTurnEndViaRound)
  assert.equal(res.body.ai_result, null);
  // results dovrebbe contenere player + AI intents mescolati
  assert.ok(res.body.results.length >= 1);
});

test('priority_queue: end-of-round ticks (bleeding decay) applicati', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = threeUnits();
  units[0].status = { bleeding: 2 };
  const initialHp = units[0].hp;
  const sid = await startSession(app, units);

  const res = await request(app).post('/api/session/round/execute').send({
    session_id: sid,
    player_intents: [],
    ai_auto: true,
    priority_queue: true,
  });
  assert.equal(res.status, 200);

  // Verifica bleeding tick: hp -1 e status.bleeding decremented
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const pFast = stateRes.body.units.find((u) => u.id === 'p_fast');
  assert.equal(pFast.hp, initialHp - 1, 'bleeding 1 dmg applicato');
  assert.equal(Number(pFast.status.bleeding), 1, 'bleeding decay 2→1');
});
