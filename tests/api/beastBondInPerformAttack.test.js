// E2E tests for Beast Bond reaction trigger (Sprint 6, AncientBeast Tier S #6).
//
// Verifica POST /api/session/action con action_type='attack':
//   - Quando l'actor ha un alleato adiacente con `legame_di_branco`, l'alleato
//     riceve attack_mod_bonus +1 + defense_mod_bonus +1 + status[*_buff]=1
//   - Reaction NON triggera quando alleato fuori range (Manhattan > 1)
//   - Raw event `beast_bond_triggered` persistito nello stream eventi

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

function buildBeastBondUnits({ tankAdjacent = true } = {}) {
  return [
    {
      id: 'p_scout',
      species: 'dune_stalker',
      job: 'skirmisher',
      traits: ['zampe_a_molla'],
      hp: 10,
      ap: 3,
      mod: 3,
      dc: 12,
      guardia: 1,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      facing: 'E',
    },
    {
      id: 'p_tank',
      species: 'dune_stalker',
      job: 'vanguard',
      // Inietta legame_di_branco: stessa specie del scout → bond fires su sua attack.
      traits: ['pelle_elastomera', 'legame_di_branco'],
      hp: 12,
      ap: 3,
      mod: 2,
      dc: 13,
      guardia: 1,
      position: tankAdjacent ? { x: 1, y: 3 } : { x: 1, y: 5 },
      controlled_by: 'player',
      facing: 'E',
    },
    {
      id: 'e_nomad_1',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 2,
      mod: 2,
      dc: 12,
      guardia: 0,
      position: { x: 3, y: 2 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    {
      id: 'e_nomad_2',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 5,
      ap: 2,
      mod: 2,
      dc: 12,
      guardia: 0,
      position: { x: 3, y: 4 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];
}

async function startBeastBondSession(app, opts) {
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: buildBeastBondUnits(opts) });
  assert.equal(startRes.status, 200, `session/start ok: ${JSON.stringify(startRes.body)}`);
  return { sid: startRes.body.session_id, state: startRes.body.state };
}

test('beast bond: tank adiacente con legame_di_branco riceve buff quando scout attacca', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid, state } = await startBeastBondSession(app);
  const tankBefore = state.units.find((u) => u.id === 'p_tank');
  assert.equal(tankBefore.attack_mod_bonus || 0, 0, 'tank starts with no attack buff');
  assert.equal(tankBefore.defense_mod_bonus || 0, 0, 'tank starts with no defense buff');

  const atkRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: 'p_scout',
    target_id: 'e_nomad_1',
  });
  assert.equal(atkRes.status, 200, `attack ok: ${JSON.stringify(atkRes.body)}`);
  // Surface: beast_bond_reactions array on attack response.
  assert.ok(Array.isArray(atkRes.body.beast_bond_reactions), 'beast_bond_reactions field present');
  assert.equal(
    atkRes.body.beast_bond_reactions.length,
    1,
    'exactly one bond fired (legame_di_branco on tank)',
  );
  const reaction = atkRes.body.beast_bond_reactions[0];
  assert.equal(reaction.holder_id, 'p_tank');
  assert.equal(reaction.trait_id, 'legame_di_branco');
  assert.equal(reaction.atk_delta, 1);
  assert.equal(reaction.def_delta, 1);
  assert.equal(reaction.duration, 1);

  // Stato live conferma buff persistito sul tank.
  const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
  const tankAfter = stateAfter.body.units.find((u) => u.id === 'p_tank');
  assert.equal(Number(tankAfter.attack_mod_bonus) || 0, 1, 'tank attack_mod_bonus +1');
  assert.equal(Number(tankAfter.defense_mod_bonus) || 0, 1, 'tank defense_mod_bonus +1');
  assert.equal(
    Number(tankAfter.status?.attack_mod_buff) || 0,
    1,
    'attack_mod_buff status armed for decay',
  );
  assert.equal(
    Number(tankAfter.status?.defense_mod_buff) || 0,
    1,
    'defense_mod_buff status armed for decay',
  );
});

test('beast bond: tank fuori range (Manhattan=3) NON riceve buff', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startBeastBondSession(app, { tankAdjacent: false });
  const atkRes = await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: 'p_scout',
    target_id: 'e_nomad_1',
  });
  assert.equal(atkRes.status, 200);
  // beast_bond_reactions sempre presente come array; deve essere vuoto.
  assert.ok(Array.isArray(atkRes.body.beast_bond_reactions));
  assert.equal(atkRes.body.beast_bond_reactions.length, 0, 'no bond fired when tank Manhattan > 1');

  const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
  const tankAfter = stateAfter.body.units.find((u) => u.id === 'p_tank');
  assert.equal(Number(tankAfter.attack_mod_bonus) || 0, 0);
  assert.equal(Number(tankAfter.defense_mod_bonus) || 0, 0);
});

test('beast bond: raw event action_type=beast_bond_triggered persistito', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const { sid } = await startBeastBondSession(app);
  await request(app).post('/api/session/action').send({
    session_id: sid,
    action_type: 'attack',
    actor_id: 'p_scout',
    target_id: 'e_nomad_1',
  });

  const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
  const events = stateRes.body.events || stateRes.body.event_log || [];
  const bondEvents = events.filter((e) => e && e.action_type === 'beast_bond_triggered');
  assert.equal(bondEvents.length, 1, `expected 1 bond event, got ${bondEvents.length}`);
  const ev = bondEvents[0];
  assert.equal(ev.actor_id, 'p_scout');
  assert.equal(ev.ally_id, 'p_tank');
  assert.equal(ev.trait_id, 'legame_di_branco');
  assert.equal(ev.atk_delta, 1);
  assert.equal(ev.def_delta, 1);
  assert.equal(ev.log_tag, 'legame_di_branco_triggered');
});
