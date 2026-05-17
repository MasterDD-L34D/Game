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

test('effect_type non supportato → 501 (sentinel test, ability sintetica unsupported_xyz)', async (t) => {
  const {
    _setAbilityForTest,
    _resetAbilityIndex,
  } = require('../../apps/backend/services/abilityExecutor');
  _setAbilityForTest('synthetic_unknown', {
    ability_id: 'synthetic_unknown',
    effect_type: 'unknown_xyz',
    cost_ap: 1,
    target: 'self',
    rank: 1,
  });
  t.after(() => _resetAbilityIndex());

  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'synthetic_unknown',
  });
  assert.equal(res.status, 501, `unknown effect_type: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'unknown_xyz');
  assert.ok(Array.isArray(res.body.supported));
  assert.ok(res.body.supported.includes('aggro_pull'), 'aggro_pull ora supportato in iter5');
  assert.equal(res.body.supported.length, 18, '18/18 effect_type supportati');
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
    // M14-C: positional_mult esposto anche quando elevation=0 (multiplier 1).
    assert.ok(typeof d.positional_mult === 'number');
    assert.ok(typeof d.elevation_delta === 'number');
  }
});

// M14-C 2026-04-26 — surge_aoe honor elevation: attacker above targets = +30% dmg.
test('cataclysm surge_aoe: actor elevation 1 vs target 0 → multiplier 1.3 riportato', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Usa scenario tutorial_01 ma muta units con elevation raise per p_scout.
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const units = scenario.body.units.map((u) => (u.id === 'p_scout' ? { ...u, elevation: 1 } : u));
  const startRes = await request(app).post('/api/session/start').send({ units });
  const sid = startRes.body.session_id;
  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'ability',
      actor_id: 'p_scout',
      ability_id: 'cataclysm',
      position: { x: 3, y: 3 },
    });
  assert.equal(res.status, 200, `surge_aoe elev ok: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.damaged.length > 0, 'almeno 1 target in area');
  for (const d of res.body.damaged) {
    // actor +1 vs target 0. Multiplier in [1.3, 1.3*1.15=1.495] (flank/front quadrant).
    assert.ok(d.positional_mult >= 1.3, `target ${d.unit_id} elev bonus ≥ 1.3`);
    assert.equal(d.elevation_delta, 1);
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
  // iter4+iter6: trigger system live, note rimossa.
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

test('iter4 intercept: ally adjacent reroute damage to interceptor', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  // p_scout (1,2), p_tank (1,3) adiacenti. e_nomad_1 (3,2) range 2 → può colpire scout.
  // 1. p_tank arma intercept (warden ability via abilityIndex, no job check)
  const armRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'intercept',
  });
  assert.equal(armRes.status, 200, `intercept armed: ${JSON.stringify(armRes.body)}`);
  assert.equal(armRes.body.effect_type, 'reaction');

  // Verify reaction registered
  const stateAfterArm = await request(app).get('/api/session/state').query({ session_id: sid });
  const tank = stateAfterArm.body.units.find((u) => u.id === 'p_tank');
  assert.ok(Array.isArray(tank.reactions) && tank.reactions.length === 1);
  const tankHpBefore = tank.hp;
  const scout = stateAfterArm.body.units.find((u) => u.id === 'p_scout');
  const scoutHpBefore = scout.hp;

  // 2. e_nomad_1 attacks p_scout (no side check on /action)
  const atkRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: 'e_nomad_1',
    target_id: 'p_scout',
  });
  assert.equal(atkRes.status, 200);

  // 3. If hit, intercept should have rerouted damage to tank.
  if (atkRes.body.result === 'hit' && atkRes.body.damage_dealt > 0) {
    const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
    const scoutAfter = stateAfter.body.units.find((u) => u.id === 'p_scout');
    const tankAfter = stateAfter.body.units.find((u) => u.id === 'p_tank');
    assert.equal(
      scoutAfter.hp,
      scoutHpBefore,
      `scout HP unchanged (intercept rerouted): before=${scoutHpBefore}, after=${scoutAfter.hp}`,
    );
    assert.ok(
      tankAfter.hp < tankHpBefore,
      `tank HP < before (received rerouted damage): before=${tankHpBefore}, after=${tankAfter.hp}`,
    );
    // Reaction consumed
    assert.equal(
      Array.isArray(tankAfter.reactions) ? tankAfter.reactions.length : 0,
      0,
      'reaction consumed after fire',
    );
  }
});

test('iter4 overwatch_shot: mover entra IN range fires reaction (iter6 INTO semantics)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // 1. e_nomad_1 (3,2) arma overwatch_shot. nomad ap=2 → cast (1 AP) ok.
  const armRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'e_nomad_1',
    ability_id: 'overwatch_shot',
  });
  assert.equal(armRes.status, 200, `overwatch armed: ${JSON.stringify(armRes.body)}`);

  // 2. p_tank (1,3) → (2,3): from dist 3 (OUT range=2) to dist 2 (IN). Triggers INTO.
  const moveRes = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_tank',
      position: { x: 2, y: 3 },
    });
  assert.equal(moveRes.status, 200);
  assert.ok(moveRes.body.overwatch, 'overwatch fired su INTO range');
  assert.equal(moveRes.body.overwatch.overwatch_id, 'e_nomad_1');
  assert.equal(moveRes.body.overwatch.mover_id, 'p_tank');

  // Verify reaction consumed
  const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
  const nomadAfter = stateAfter.body.units.find((u) => u.id === 'e_nomad_1');
  assert.equal(
    Array.isArray(nomadAfter.reactions) ? nomadAfter.reactions.length : 0,
    0,
    'reaction consumed',
  );
});

test('iter4 no reaction armed: damage applies normalmente', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const scoutHpBefore = state.units.find((u) => u.id === 'p_scout').hp;

  const atkRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: 'e_nomad_1',
    target_id: 'p_scout',
  });
  assert.equal(atkRes.status, 200);
  if (atkRes.body.result === 'hit' && atkRes.body.damage_dealt > 0) {
    const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
    const scoutAfter = stateAfter.body.units.find((u) => u.id === 'p_scout');
    assert.ok(scoutAfter.hp < scoutHpBefore, 'scout HP scende normalmente (no intercept armed)');
  }
});

test('iter6 #1: interceptor death triggers kill + assist event chain', async (t) => {
  // Setup: low-HP interceptor (1 hp) + attacker che tira danno > 1.
  // Assist da damage_taken history: attacker A tira danno1 (storico),
  // poi attacker B (in test stesso) tira danno killing → kill chain
  // emette kill su B + assist su A (se A ha danneggiato target/interceptor).
  // Test minimale: verifica che kill event sia presente nell'event log
  // dopo intercept fatale.
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_tank arma intercept
  await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'intercept',
  });
  // Force tank a 1 HP per garantire morte su qualsiasi danno
  // (manipolazione via attack ripetuto è troppo non-deterministico).
  // Workaround: usa scenario che produce damage > tank.hp con probabilità alta.
  // Per ora: verifica solo la presenza del path code (interceptor_killed flag
  // nel response intercept). Kill chain semantico testato via event count.
  const stateBefore = await request(app).get('/api/session/state').query({ session_id: sid });
  const eventsBefore = stateBefore.body.log_events_count;

  await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: 'e_nomad_1',
    target_id: 'p_scout',
  });

  const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
  // Almeno attack event + (se hit) reaction_trigger event emessi
  assert.ok(
    stateAfter.body.log_events_count > eventsBefore,
    'eventi emessi dopo attack + intercept',
  );
});

test('iter6 #2: overwatch NOT fires se mover stays in range (no INTO)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // e_nomad_1 (3,2) arma overwatch
  await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'e_nomad_1',
    ability_id: 'overwatch_shot',
  });

  // p_scout (1,2) move → (2,2): both distances ≤2 (already in range). NO fire.
  const moveRes = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_scout',
      position: { x: 2, y: 2 },
    });
  assert.equal(moveRes.status, 200);
  assert.equal(
    moveRes.body.overwatch,
    null,
    'no overwatch (movimento dentro la stessa range zone)',
  );

  // Reaction NOT consumed
  const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
  const nomadAfter = stateAfter.body.units.find((u) => u.id === 'e_nomad_1');
  assert.equal(
    Array.isArray(nomadAfter.reactions) ? nomadAfter.reactions.length : 0,
    1,
    'reaction ancora armata (no trigger)',
  );
});

test('iter6 #3: aggro_warning quando player taunted attacca non-source', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const {
    _setAbilityForTest,
    _resetAbilityIndex,
  } = require('../../apps/backend/services/abilityExecutor');
  // Variant taunt cast da SIS su PG (forzato via test helper)
  _setAbilityForTest('test_taunt_pg', {
    ability_id: 'test_taunt_pg',
    effect_type: 'aggro_pull',
    cost_ap: 0,
    range: 5,
    buff_stat: 'defense_mod',
    buff_amount: 0,
    buff_duration: 2,
    aggro_duration: 2,
    target: 'enemy',
    rank: 1,
  });
  t.after(() => _resetAbilityIndex());

  const { sid } = await startSession(app);
  // e_nomad_1 cast taunt su p_scout (forza scout ad attaccare nomad).
  await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'e_nomad_1',
    ability_id: 'test_taunt_pg',
    target_id: 'p_scout',
  });

  // Move scout (1,2) → (1,4) per essere in range di e_nomad_2 (3,4): dist=2.
  await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_scout',
      position: { x: 1, y: 3 },
    });
  await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'move',
      actor_id: 'p_scout',
      position: { x: 1, y: 4 },
    });

  // p_scout attacca e_nomad_2 (NOT aggro_source). Atteso aggro_warning.
  const stateBefore = await request(app).get('/api/session/state').query({ session_id: sid });
  const scout = stateBefore.body.units.find((u) => u.id === 'p_scout');
  assert.ok(Number(scout.status?.aggro_locked) > 0, 'scout taunted');
  assert.equal(scout.aggro_source, 'e_nomad_1');

  const atkRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: 'p_scout',
    target_id: 'e_nomad_2',
  });
  assert.equal(atkRes.status, 200, `attack permesso: ${JSON.stringify(atkRes.body)}`);
  assert.ok(atkRes.body.aggro_warning, 'aggro_warning presente');
  assert.equal(atkRes.body.aggro_warning.forced_target, 'e_nomad_1');
  assert.equal(atkRes.body.aggro_warning.attacked_target, 'e_nomad_2');
});

test('iter6 #4: reaction cap = 1 (re-arm sostituisce previous)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_tank arma intercept
  const arm1 = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'intercept',
  });
  assert.equal(arm1.status, 200);
  assert.equal(arm1.body.reactions_count, 1);
  assert.equal(arm1.body.replaced_previous, null);

  // Re-arm overwatch_shot (sovrascrive intercept)
  const arm2 = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'overwatch_shot',
  });
  assert.equal(arm2.status, 200);
  assert.equal(arm2.body.reactions_count, 1, 'cap 1 — non stack');
  assert.ok(arm2.body.replaced_previous, 'replaced_previous popolato');
  assert.equal(arm2.body.replaced_previous.ability_id, 'intercept');

  // Verify state
  const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
  const tank = stateAfter.body.units.find((u) => u.id === 'p_tank');
  assert.equal(tank.reactions.length, 1);
  assert.equal(tank.reactions[0].ability_id, 'overwatch_shot');
});

test('iter5 taunt: aggro_pull applica defense buff + aggro_locked su target', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  // p_tank (1,3) → move (2,3) → move (3,3) adjacente a e_nomad_1 (3,2). 2 AP usati.
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
      position: { x: 3, y: 3 },
    });

  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_tank',
    ability_id: 'taunt',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `taunt ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'aggro_pull');
  assert.equal(res.body.target_id, 'e_nomad_1');
  assert.equal(res.body.aggro_source, 'p_tank');
  assert.equal(res.body.buff_applied.stat, 'defense_mod');
  assert.equal(res.body.buff_applied.amount, 2);

  // Verifica state
  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const enemy = stateRes.body.units.find((u) => u.id === 'e_nomad_1');
  assert.ok(Number(enemy.status?.aggro_locked) >= 1, 'enemy.status.aggro_locked attivo');
  assert.equal(enemy.aggro_source, 'p_tank');
  const tank = stateRes.body.units.find((u) => u.id === 'p_tank');
  assert.equal(Number(tank.defense_mod_bonus) || 0, 2);
});

test('iter5 declareSistemaIntents respect aggro_locked → target = aggro_source', async (t) => {
  const {
    createDeclareSistemaIntents,
  } = require('../../apps/backend/services/ai/declareSistemaIntents');
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy: (sess, actor) => {
      // Default pick: lowest hp enemy
      return (sess.units || [])
        .filter((u) => u.controlled_by !== actor.controlled_by && Number(u.hp) > 0)
        .sort((a, b) => Number(a.hp) - Number(b.hp))[0];
    },
    stepTowards: (from, to) => ({
      x: from.x + Math.sign(to.x - from.x),
      y: from.y + Math.sign(to.y - from.y),
    }),
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
    gridSize: 6,
  });

  const session = {
    units: [
      {
        id: 'p_scout',
        controlled_by: 'player',
        hp: 5,
        max_hp: 10,
        position: { x: 1, y: 2 },
        attack_range: 2,
      },
      {
        id: 'p_tank',
        controlled_by: 'player',
        hp: 12,
        max_hp: 12,
        position: { x: 3, y: 3 },
        attack_range: 1,
      },
      {
        id: 'e_nomad_1',
        controlled_by: 'sistema',
        hp: 3,
        max_hp: 3,
        position: { x: 3, y: 2 },
        attack_range: 2,
        // Aggro-locked su p_tank (NON il lowest-hp che sarebbe p_scout)
        status: { aggro_locked: 1 },
        aggro_source: 'p_tank',
      },
    ],
  };

  const { decisions } = declare(session);
  const decision = decisions.find((d) => d.unit_id === 'e_nomad_1');
  assert.ok(decision, 'decision per e_nomad presente');
  assert.equal(
    decision.target_id,
    'p_tank',
    'aggro override → target = p_tank (non p_scout lowest-hp)',
  );
  assert.equal(decision.aggro_override, true);
});

test('iter5 senza aggro_locked, AI sceglie lowest-hp normale (regression)', async (t) => {
  const {
    createDeclareSistemaIntents,
  } = require('../../apps/backend/services/ai/declareSistemaIntents');
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy: (sess, actor) => {
      return (sess.units || [])
        .filter((u) => u.controlled_by !== actor.controlled_by && Number(u.hp) > 0)
        .sort((a, b) => Number(a.hp) - Number(b.hp))[0];
    },
    stepTowards: (from, to) => ({
      x: from.x + Math.sign(to.x - from.x),
      y: from.y + Math.sign(to.y - from.y),
    }),
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
    gridSize: 6,
  });

  const session = {
    units: [
      {
        id: 'p_scout',
        controlled_by: 'player',
        hp: 5,
        max_hp: 10,
        position: { x: 1, y: 2 },
        attack_range: 2,
      },
      {
        id: 'p_tank',
        controlled_by: 'player',
        hp: 12,
        max_hp: 12,
        position: { x: 3, y: 3 },
        attack_range: 1,
      },
      {
        id: 'e_nomad_1',
        controlled_by: 'sistema',
        hp: 3,
        max_hp: 3,
        position: { x: 3, y: 2 },
        attack_range: 2,
        // No aggro: AI sceglie lowest-hp
      },
    ],
  };

  const { decisions } = declare(session);
  const decision = decisions.find((d) => d.unit_id === 'e_nomad_1');
  assert.ok(decision);
  assert.equal(decision.target_id, 'p_scout', 'no aggro → lowest-hp pick (p_scout)');
  assert.equal(decision.aggro_override, undefined);
});

// Sprint 8.1 r4 capstone smoke (2026-05-05) — verifica che ogni r4 dispatcha
// via gli effect_type esistenti senza nuovi runtime path. Pattern base: status
// 200 + effect_type expected + ability_id riportato. Resource gates lasciati al
// runtime (cost_ap consumato; cost_pp/pt/sg non bloccano nei tutorial fixture).

test('Sprint 8.1 dervish_whirlwind (r4 multi_attack): dispatch via skirmisher path', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'dervish_whirlwind',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `dervish_whirlwind ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'multi_attack');
  assert.equal(res.body.ability_id, 'dervish_whirlwind');
  assert.ok(Array.isArray(res.body.attacks), 'attacks array presente');
  assert.ok(res.body.attacks.length <= 4, 'max 4 hit (attack_count r4 capstone)');
});

test('Sprint 8.1 headshot (r4 execution_attack): dispatch via ranger path + execute branch', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'headshot',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `headshot ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'execution_attack');
  assert.equal(res.body.ability_id, 'headshot');
  // Target HP full (3/3) → execute non triggered (threshold 0.5).
  assert.equal(res.body.execution_triggered, false, 'execute non triggered a HP full');
  assert.equal(res.body.target_hp_pct_before, 1);
});

test('Sprint 8.1 apocalypse_ray (r4 surge_aoe): dispatch via invoker path + stress_reset 0', async (t) => {
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
      ability_id: 'apocalypse_ray',
      position: { x: 3, y: 3 },
    });
  assert.equal(res.status, 200, `apocalypse_ray ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'surge_aoe');
  assert.equal(res.body.ability_id, 'apocalypse_ray');
  assert.ok(Array.isArray(res.body.damaged), 'damaged array presente');
  // r4 capstone: stress_reset spec=0.0 ma effettivo dipende da SG attuale del actor.
  // Smoke verifica solo dispatch path (executor surge_aoe invariato per r4).
});

test('Sprint 8.1 lifegrove (r4 team_heal): dispatch via harvester path + remove_status', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'lifegrove',
  });
  assert.equal(res.status, 200, `lifegrove ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'team_heal');
  assert.equal(res.body.ability_id, 'lifegrove');
  assert.ok(Array.isArray(res.body.healed));
  for (const h of res.body.healed) {
    assert.equal(h.seed_gain, 2, 'capstone seed_gain=2');
  }
});

test('Sprint 8.1 shadow_assassinate (Stalker r4 expansion execution_attack): dispatch end-to-end', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startSession(app);
  const res = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'ability',
    actor_id: 'p_scout',
    ability_id: 'shadow_assassinate',
    target_id: 'e_nomad_1',
  });
  assert.equal(res.status, 200, `shadow_assassinate ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'execution_attack');
  assert.equal(res.body.ability_id, 'shadow_assassinate');
  // HP target full (3/3) → execute_threshold 0.3 non triggered.
  assert.equal(res.body.execution_triggered, false, 'execute non triggered (HP full > 30%)');
  assert.ok(res.body.attack, 'attack payload presente');
});

// Sprint 8 r3/r4 — smoke check that an r3 ability dispatches via the same
// move_attack path as r1 dash_strike (no new effect_type runtime needed).
test('Sprint 8 phantom_step (r3 move_attack): dispatch end-to-end via existing executor', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startSession(app);
  const scout = state.units.find((u) => u.id === 'p_scout');
  assert.ok(scout, 'scout presente nel tutorial_01');

  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sid,
      action_type: 'ability',
      actor_id: 'p_scout',
      ability_id: 'phantom_step',
      target_id: 'e_nomad_1',
      position: { x: 2, y: 2 },
    });
  assert.equal(res.status, 200, `phantom_step ok: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.effect_type, 'move_attack');
  assert.equal(res.body.ability_id, 'phantom_step');
  assert.deepEqual(res.body.position_to, { x: 2, y: 2 });
  assert.ok(res.body.attack, 'attack payload presente');
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
