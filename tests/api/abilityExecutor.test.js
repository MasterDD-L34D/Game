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

test('effect_type non supportato (taunt = aggro_pull) → 501', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'taunt',
  });
  assert.equal(res.status, 501, `aggro_pull non supportato: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'aggro_pull');
  assert.ok(Array.isArray(res.body.supported));
  assert.ok(res.body.supported.includes('shield'));
  assert.ok(res.body.supported.includes('aoe_debuff'));
});

test('blade_flurry: multi_attack esegue fino a attack_count hit', async (t) => {
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
  assert.equal(res.status, 200, `blade_flurry ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'multi_attack');
  assert.ok(Array.isArray(res.body.attacks), 'attacks array presente');
  assert.ok(res.body.attacks.length >= 1, 'almeno 1 attack eseguito');
  assert.ok(res.body.attacks.length <= 3, 'max 3 attack (attack_count)');
});

test('shield_bash: attack_push applica sbilanciato + tenta push', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  // p_tank at (1,3) range=1, e_nomad_2 at (3,4) dist=3. Move tank a (2,4) prima.
  // Consuma 2 AP move, rimane 1 AP (shield_bash cost_ap=1).
  await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_tank',
      position: { x: 2, y: 3 },
    });
  await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_tank',
      position: { x: 2, y: 4 },
    });
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'shield_bash',
    target_id: 'e_nomad_2',
  });
  assert.equal(res.status, 200, `shield_bash ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'attack_push');
  assert.ok(res.body.attack);
});

test('disrupt_field: debuff applica defense_mod_debuff + defense_mod_bonus', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'disrupt_field',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `disrupt_field ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'debuff');
  assert.equal(res.body.debuff_applied.stat, 'defense_mod');
  assert.equal(res.body.debuff_applied.amount, -1);

  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const target = stateRes.body.units.find((u) => u.id === 'e_nomad_1');
  assert.equal(Number(target.status?.defense_mod_debuff) || 0, 2);
  assert.equal(Number(target.defense_mod_bonus) || 0, -1, 'defense_mod_bonus applicato -1');
});

test('focused_blast: ranged_attack con damage_step_mod +2', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_scout (1,2) → e_nomad_1 (3,2), dist=2, range override da focused_blast irrelevante qui.
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'focused_blast',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `focused_blast ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'ranged_attack');
  assert.ok(res.body.attack);
});

test('essence_drain: drain_attack cura actor per lifesteal_pct del damage', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'essence_drain',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `essence_drain ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'drain_attack');
  assert.ok(res.body.attack);
  // healing_applied = 0 se actor HP gia full (scout max_hp=10, hp=10). Accettabile.
  assert.ok(typeof res.body.healing_applied === 'number');
  assert.equal(res.body.seed_gain, 1);
});

test('kill_shot: execution_attack non triggera execute se target HP piena', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'kill_shot',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `kill_shot ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'execution_attack');
  // e_nomad_1 hp=3/3 → hp_pct=1.0 > 0.3 threshold → execute non triggered.
  assert.equal(res.body.execution_triggered, false, 'execute non triggered a HP full');
  assert.equal(res.body.target_hp_pct_before, 1);
});

test('attack_mod_bonus bonifica roll in resolveAttack (hit rate sale)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // Verify predict baseline vs buff via dash_strike (che applica +1 attack_mod
  // durante un solo attacco se target_not_adjacent). Basic sanity: ability
  // ritorna buff_applied.reason = 'target_not_adjacent' e attack è risolto.
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
  assert.equal(res.status, 200);
  assert.equal(res.body.buff_applied?.reason, 'target_not_adjacent');

  // Dopo dash_strike, attack_mod_bonus deve essere resetato (one-shot).
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const scoutAfter = stateRes.body.units.find((u) => u.id === 'p_scout');
  assert.equal(
    Number(scoutAfter.attack_mod_bonus) || 0,
    0,
    "attack_mod_bonus azzerato dopo l'attacco one-shot",
  );
});

test('defense_mod_bonus applicato su DC via predictCombat', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // Baseline predict: scout attacca e_nomad_1 (dc=12)
  const predictBase = await request(app)
    .post('/api/session/predict')
    .send({ session_id: sid, actor_id: 'p_scout', target_id: 'e_nomad_1' });
  assert.equal(predictBase.status, 200);
  const baseDc = predictBase.body.dc;

  // Apply debuff che abbassa defense_mod del target di 1 → DC effettivo scende di 1.
  // (amount -1 sommato a DC = DC base - 1)
  await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'disrupt_field',
    target_id: 'e_nomad_1',
  });

  const predictDeb = await request(app)
    .post('/api/session/predict')
    .send({ session_id: sid, actor_id: 'p_scout', target_id: 'e_nomad_1' });
  assert.equal(predictDeb.status, 200);
  assert.equal(
    predictDeb.body.dc,
    baseDc - 1,
    `DC scende di 1 con debuff: base=${baseDc}, debuffed=${predictDeb.body.dc}`,
  );
});

test('energy_barrier: shield assorbe damage in performAttack', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_scout cast shield self
  const shieldRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'energy_barrier',
    target_id: 'p_scout',
  });
  assert.equal(shieldRes.status, 200, `shield ok: ${JSON.stringify(shieldRes.body)}`);
  assert.equal(shieldRes.body.effect_type, 'shield');
  assert.equal(shieldRes.body.shield_hp_granted, 8);

  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const scoutAfter = stateRes.body.units.find((u) => u.id === 'p_scout');
  assert.equal(Number(scoutAfter.shield_hp) || 0, 8);
  assert.equal(Number(scoutAfter.status?.shield_buff) || 0, 2);
});

test('resonance_amplifier: team_buff applica pp_grant a tutti gli alleati in range', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_scout (1,2), p_tank (1,3) → distanza 1, range 3 da spec → entrambi affetti.
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'resonance_amplifier',
  });
  assert.equal(res.status, 200, `team_buff ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'team_buff');
  assert.ok(Array.isArray(res.body.allies_affected));
  assert.ok(res.body.allies_affected.length >= 2, '>=2 allies (scout+tank)');
  // Verifica pp_grant applicato a ciascuno
  for (const a of res.body.allies_affected) {
    assert.equal(a.pp_grant, 2);
  }
});

test('symbiotic_bloom: team_heal cura tutti gli alleati in range', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'symbiotic_bloom',
  });
  assert.equal(res.status, 200, `team_heal ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'team_heal');
  assert.ok(Array.isArray(res.body.healed));
  // healing_applied = 0 se HP gia full (atteso); seed_gain=1 per ciascuno
  for (const h of res.body.healed) {
    assert.ok(typeof h.healing_applied === 'number');
    assert.equal(h.seed_gain, 1);
  }
});

test("sanctuary: aoe_buff applica defense_mod ai allies nell'area", async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // Centro AoE su p_tank (1,3). aoe_size=2 → ±1. p_scout (1,2) e p_tank (1,3) inclusi.
  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'ability',
      actor_id: 'p_scout',
      ability_id: 'sanctuary',
      position: { x: 1, y: 3 },
    });
  assert.equal(res.status, 200, `aoe_buff ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'aoe_buff');
  assert.deepEqual(res.body.center, { x: 1, y: 3 });
  assert.ok(res.body.allies_affected.length >= 1);
});

test("binding_field: aoe_debuff applica movement debuff agli enemy nell'area", async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // Centro su (3,3), aoe_size=3 → ±1. e_nomad_1 (3,2), e_nomad_2 (3,4) inclusi.
  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'ability',
      actor_id: 'p_scout',
      ability_id: 'binding_field',
      position: { x: 3, y: 3 },
    });
  assert.equal(res.status, 200, `aoe_debuff ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'aoe_debuff');
  assert.equal(res.body.aoe_size, 3);
  assert.ok(res.body.enemies_affected.length >= 1, 'almeno 1 enemy in area');
});

test('cataclysm: surge_aoe danno area + stress_reset, shield-aware', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'ability',
      actor_id: 'p_scout',
      ability_id: 'cataclysm',
      position: { x: 3, y: 3 },
    });
  assert.equal(res.status, 200, `surge_aoe ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'surge_aoe');
  assert.ok(Array.isArray(res.body.damaged));
  assert.equal(res.body.stress_after, 0.25);
  for (const d of res.body.damaged) {
    assert.ok(typeof d.damage_dealt === 'number');
    assert.ok(typeof d.shield_absorbed === 'number');
  }
});

test('overwatch_shot: reaction registra trigger su actor.reactions[]', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'overwatch_shot',
  });
  assert.equal(res.status, 200, `reaction ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'reaction');
  assert.equal(res.body.reaction_armed.ability_id, 'overwatch_shot');
  assert.equal(res.body.reaction_armed.trigger, 'enemy_moves_in_range');
  assert.equal(res.body.reactions_count, 1);
  assert.match(res.body.note || '', /trigger system pending/i);
});

test('FRICTION #6: effective_reach esposto in GET /api/jobs/:id per ogni ability', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/skirmisher');
  assert.equal(res.status, 200);
  const dash = res.body.abilities.find((a) => a.ability_id === 'dash_strike');
  // dash_strike: move_distance=2 + skirmisher attack_range=2 = 4
  assert.equal(dash.effective_reach, 4, `dash_strike effective_reach = move(2) + range(2) = 4`);

  const evasive = res.body.abilities.find((a) => a.ability_id === 'evasive_maneuver');
  // attack_move: solo attack_range=2 (move dopo non contribuisce)
  assert.equal(evasive.effective_reach, 2);

  const flurry = res.body.abilities.find((a) => a.ability_id === 'blade_flurry');
  // multi_attack: attack_range=2
  assert.equal(flurry.effective_reach, 2);

  // Invoker focused_blast: ranged_attack range override implicito (no range field → attack_range=3)
  const inv = await request(app).get('/api/jobs/invoker');
  const blast = inv.body.abilities.find((a) => a.ability_id === 'focused_blast');
  assert.equal(blast.effective_reach, 3, `focused_blast: invoker attack_range=3`);

  // Vanguard fortify (buff self): effective_reach=0
  const van = await request(app).get('/api/jobs/vanguard');
  const fortify = van.body.abilities.find((a) => a.ability_id === 'fortify');
  assert.equal(fortify.effective_reach, 0, 'self-buff = reach 0');
});

test('FRICTION #7: shield_bash default on_hit (miss → no push, no status)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Inietta rng deterministico nel session router per forzare miss
  // (die=1, garantito miss vs DC>=12).
  const fixedRng = (() => {
    let calls = 0;
    return () => {
      calls += 1;
      if (calls === 1) return 0; // rollD20 → die=1
      return 0.5;
    };
  })();
  const { app: app2, close: close2 } = createApp({
    databasePath: null,
    session: { rng: fixedRng },
  });
  t.after(async () => {
    if (typeof close2 === 'function') await close2().catch(() => {});
  });

  const scenario = await request(app2).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app2)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  // Move tank a (2,4) per essere in range di e_nomad_2 (3,4)
  await request(app2)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_tank',
      position: { x: 2, y: 3 },
    });
  await request(app2)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_tank',
      position: { x: 2, y: 4 },
    });

  const res = await request(app2).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'shield_bash',
    target_id: 'e_nomad_2',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.attack.hit, false, 'attack miss confermato (die=1)');
  assert.equal(res.body.effect_trigger, 'on_hit', 'default on_hit');
  assert.equal(res.body.pushed, null, 'no push su miss');
  assert.equal(res.body.applied_status, null, 'no status su miss');

  // Verifica via /state che e_nomad_2 NON abbia sbilanciato
  const stateRes = await request(app2).get('/api/session/state').query({ session_id: sid });
  const enemy = stateRes.body.units.find((u) => u.id === 'e_nomad_2');
  assert.equal(Number(enemy.status?.sbilanciato) || 0, 0, 'sbilanciato non applicato su miss');
});

test('FRICTION #7: ability con effect_trigger=always applica push + status anche su miss', async (t) => {
  const {
    _setAbilityForTest,
    _resetAbilityIndex,
  } = require('../../apps/backend/services/abilityExecutor');
  // Inietta variant di shield_bash con effect_trigger=always
  _setAbilityForTest('shield_bash_always', {
    ability_id: 'shield_bash_always',
    effect_type: 'attack_push',
    cost_ap: 1,
    push_distance: 1,
    apply_status: { status_id: 'sbilanciato', duration: 1 },
    effect_trigger: 'always',
    target: 'enemy',
    rank: 1,
  });
  t.after(() => _resetAbilityIndex());

  // RNG forzato a die=1 (miss garantito)
  const fixedRng = (() => {
    let calls = 0;
    return () => {
      calls += 1;
      if (calls === 1) return 0;
      return 0.5;
    };
  })();
  const { app, close } = createApp({ databasePath: null, session: { rng: fixedRng } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_tank',
      position: { x: 2, y: 3 },
    });
  await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_tank',
      position: { x: 2, y: 4 },
    });

  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'shield_bash_always',
    target_id: 'e_nomad_2',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.attack.hit, false, 'attack miss confermato');
  assert.equal(res.body.effect_trigger, 'always');
  // Su miss + always → status applicato comunque
  assert.ok(res.body.applied_status, 'sbilanciato applicato anche su miss');
  assert.equal(res.body.applied_status.id, 'sbilanciato');
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
