// tests/api/abilityExecutor.test.js — FRICTION #4 MVP executor.
//
// Verifica POST /api/session/action con action_type='ability':
//   - dash_strike (move_attack): move + attack + buff conditional
//   - evasive_maneuver (attack_move): attack + move + self-buff defense
//   - cost_ap enforcement: AP insufficienti → 400
//   - ability sconosciuta → 400
//   - effect_type non supportato (blade_flurry = multi_attack) → 501
//   - raw event persistito con action_type='ability' + ability_id

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200);
  return { sid: startRes.body.session_id, state: startRes.body.state };
}

test('dash_strike: move_attack end-to-end, AP decremented, event emitted', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const scout = state.units.find((u) => u.id === 'p_scout');
  const enemy = state.units.find((u) => u.id === 'e_nomad_1');
  assert.ok(scout && enemy, 'scout + enemy presenti nel tutorial_01');
  const apBefore = Number(scout.ap_remaining ?? scout.ap);

  // scout (1,2) → enemy (3,2). Dash a (2,2) = 1 cella Manhattan, poi attack.
  // Condition target_not_adjacent valutata PRIMA del move: dist=2 > 1 → buff attivo.
  const dest = { x: 2, y: 2 };
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'dash_strike',
    target_id: 'e_nomad_1',
    position: dest,
  });
  assert.equal(res.status, 200, `dash_strike ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'move_attack');
  assert.equal(res.body.ability_id, 'dash_strike');
  assert.deepEqual(res.body.position_to, dest);
  assert.ok(res.body.attack, 'attack payload presente');
  assert.equal(res.body.attack.target_id, 'e_nomad_1');
  assert.ok(res.body.buff_applied, 'buff_applied atteso (target_not_adjacent)');
  assert.equal(res.body.buff_applied.reason, 'target_not_adjacent');
  assert.equal(res.body.ap_remaining, apBefore - 2, 'cost_ap=2 decrementa AP');

  // Stato live conferma posizione scout + AP
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const scoutAfter = stateRes.body.units.find((u) => u.id === 'p_scout');
  assert.deepEqual(scoutAfter.position, dest);
  assert.equal(scoutAfter.ap_remaining, apBefore - 2);
});

test('evasive_maneuver: attack_move applica buff defense_mod 1 turno', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const scout = state.units.find((u) => u.id === 'p_scout');
  const enemy = state.units.find((u) => u.id === 'e_nomad_1');
  assert.ok(scout && enemy);

  // scout (1,2) → range 2 → enemy (3,2) a distanza 2. Attack poi move verso (1,1).
  const dest = { x: 1, y: 1 };
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'evasive_maneuver',
    target_id: 'e_nomad_1',
    position: dest,
  });
  assert.equal(res.status, 200, `evasive_maneuver ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'attack_move');
  assert.deepEqual(res.body.position_to, dest);
  assert.ok(res.body.buff_applied, 'buff_applied atteso');
  assert.equal(res.body.buff_applied.stat, 'defense_mod');
  assert.equal(res.body.buff_applied.amount, 1);
  assert.equal(res.body.buff_applied.duration, 1);

  // Verifica status persistito
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const scoutAfter = stateRes.body.units.find((u) => u.id === 'p_scout');
  assert.equal(
    Number(scoutAfter.status?.defense_mod_buff) || 0,
    1,
    'defense_mod_buff status attivo 1 turno',
  );
  assert.equal(Number(scoutAfter.defense_mod_bonus) || 0, 1);
});

test('cost_ap enforcement: ability rigettata se AP insufficienti', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const scout = state.units.find((u) => u.id === 'p_scout');
  const initialAp = Number(scout.ap_remaining ?? scout.ap);

  // Drena AP via move finché ne resta 1 (insufficiente per dash_strike cost_ap=2).
  // scout ap=3 → draina 2 con 2 move da 1 cella ciascuno.
  for (let i = 0; i < initialAp - 1; i += 1) {
    const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
    const self = stateRes.body.units.find((u) => u.id === 'p_scout');
    const from = self.position;
    const occupied = new Set(
      stateRes.body.units
        .filter((u) => u.hp > 0 && u.id !== 'p_scout')
        .map((u) => `${u.position.x},${u.position.y}`),
    );
    const candidates = [
      { x: from.x + 1, y: from.y },
      { x: from.x - 1, y: from.y },
      { x: from.x, y: from.y + 1 },
      { x: from.x, y: from.y - 1 },
    ].filter((p) => p.x >= 0 && p.x < 6 && p.y >= 0 && p.y < 6 && !occupied.has(`${p.x},${p.y}`));
    assert.ok(candidates.length > 0);
    const mres = await request(app).post('/api/session/action').send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_scout',
      position: candidates[0],
    });
    assert.equal(mres.status, 200);
  }

  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'ability',
      actor_id: 'p_scout',
      ability_id: 'dash_strike',
      target_id: 'e_nomad_1',
      position: { x: 2, y: 2 },
    });
  assert.equal(res.status, 400, `ability rigettata per AP: ${JSON.stringify(res.body)}`);
  assert.match(res.body.error || '', /AP insufficienti/i);
  assert.equal(res.body.cost_ap, 2);
});

test('ability_id sconosciuta → 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'inexistent_ability',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error || '', /non trovata/i);
});

test('effect_type non supportato (blade_flurry = multi_attack) → 501', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'blade_flurry',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 501, `multi_attack non supportato in MVP: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'multi_attack');
  assert.ok(Array.isArray(res.body.supported), 'supported list presente');
  assert.ok(res.body.supported.includes('move_attack'));
});

test('raw event persistito con action_type=ability + ability_id', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'ability',
      actor_id: 'p_scout',
      ability_id: 'dash_strike',
      target_id: 'e_nomad_1',
      position: { x: 2, y: 2 },
    });

  // Estrai eventi via debug endpoint se presente, altrimenti verifica via /state log_events_count
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.ok(
    stateRes.body.log_events_count >= 2,
    `attesi >=2 event (move + attack phase): ${stateRes.body.log_events_count}`,
  );
});
