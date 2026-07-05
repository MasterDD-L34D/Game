// Co-op turn semantics regression pin (2026-07-05, PR #3212 LOS probe-v2 follow-up).
//
// Ground-truthed verdict (ADR-2026-04-16 §2 + addendum 2026-07-05):
//   1. Free player ordering within a round IS the intended co-op design.
//      POST /action authorizes by actor_id + AP budget, NOT by turn_order
//      position. Enforcing a player turn order would contradict the round
//      model (shared planning -> commit -> resolution) and break the co-op
//      composer flow.
//   2. session.active_unit is honest: meaningful only while the sistema AI
//      chain is resolving (advanceThroughAiTurns). During the player planning
//      phase it is null. It used to stay pinned to turn_order's first player
//      for the whole fight (misleading "chi sta risolvendo ora" display +
//      starved AI-driven sim harnesses that acted only with the pinned unit).

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createFlaggedApp,
  startSession,
  playerAttack,
  turnEnd,
  getState,
} = require('./sessionTestHelpers');

// 3-player party + 1 sistema. Initiative: pA > pB > pC > sis, so turn_order
// is [pA, pB, pC, sis] and /start does NOT run the AI pre-phase. Every player
// is within attack_range 2 of the enemy at (3,3); no unit sits on another's
// LOS segment. mod 99 = deterministic hit (d20 + 99 vs DC ~10).
function coopParty(overrides = {}) {
  return [
    {
      id: 'pA',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: overrides.pAInitiative != null ? overrides.pAInitiative : 20,
      position: { x: 2, y: 2 },
      controlled_by: 'player',
      mod: 99,
    },
    {
      id: 'pB',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 18,
      position: { x: 3, y: 1 },
      controlled_by: 'player',
      mod: 99,
    },
    {
      id: 'pC',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 16,
      position: { x: 1, y: 3 },
      controlled_by: 'player',
      mod: 99,
    },
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      // mod 99 scala il danno con la MoS: hp alto cosi' 3 attacchi non uccidono.
      hp: 500,
      max_hp: 500,
      ap: 2,
      attack_range: 1,
      initiative: overrides.sisInitiative != null ? overrides.sisInitiative : 5,
      position: { x: 3, y: 3 },
      controlled_by: 'sistema',
    },
  ];
}

test('free player ordering: any player acts in any order within the round', async (t) => {
  const { app, close, restore } = createFlaggedApp('true');
  t.after(async () => {
    restore();
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, coopParty());
  const state0 = await getState(app, sid);
  assert.equal(state0.turn_order[0], 'pA', 'pA atteso primo in turn_order (initiative 20)');

  // pB (turn_order[1]) acts FIRST -- must be authorized (actor_id + AP, not
  // turn_order position).
  const rB = await playerAttack(app, sid, 'pB', 'sis');
  assert.equal(rB.status, 200, `pB out-of-order attack deve passare: ${JSON.stringify(rB.body)}`);
  assert.equal(rB.body.result, 'hit', 'mod 99 = hit deterministico');
  assert.ok(rB.body.damage_dealt > 0, 'danno atteso > 0');

  // Then pA and pC in arbitrary order: full party acts in the same round.
  const rA = await playerAttack(app, sid, 'pA', 'sis');
  assert.equal(rA.status, 200, `pA attack deve passare: ${JSON.stringify(rA.body)}`);
  const rC = await playerAttack(app, sid, 'pC', 'sis');
  assert.equal(rC.status, 200, `pC attack deve passare: ${JSON.stringify(rC.body)}`);

  const state1 = await getState(app, sid);
  const sis = state1.units.find((u) => u.id === 'sis');
  assert.ok(sis.hp < 500, `enemy hp scalato dai 3 attacchi, actual=${sis.hp}`);
  // Same round: turn not advanced by player actions.
  assert.equal(state1.turn, state0.turn, 'player actions non avanzano il turn counter');
});

test('active_unit e\' null durante la planning phase (hand-off da /start)', async (t) => {
  const { app, close, restore } = createFlaggedApp('true');
  t.after(async () => {
    restore();
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, coopParty());
  const state = await getState(app, sid);
  // turn_order[0] is a player -> no sistema chain is resolving -> honest
  // active_unit = null (NOT pinned to pA).
  assert.equal(
    state.active_unit,
    null,
    `active_unit atteso null in planning phase, actual=${JSON.stringify(state.active_unit)}`,
  );
});

test('active_unit resta null dopo /action e dopo /turn/end', async (t) => {
  const { app, close, restore } = createFlaggedApp('true');
  t.after(async () => {
    restore();
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, coopParty());

  const rB = await playerAttack(app, sid, 'pB', 'sis');
  assert.equal(rB.status, 200);
  const stateMid = await getState(app, sid);
  assert.equal(stateMid.active_unit, null, '/action non deve ri-puntare active_unit');

  const te = await turnEnd(app, sid);
  assert.equal(te.status, 200, `/turn/end deve passare: ${JSON.stringify(te.body)}`);
  // The sistema round is fully resolved inside /turn/end; the response hands
  // back a NEW planning phase -> no single active unit.
  assert.equal(
    te.body.active_unit,
    null,
    `active_unit atteso null nella response /turn/end, actual=${JSON.stringify(te.body.active_unit)}`,
  );
  const stateAfter = await getState(app, sid);
  assert.equal(stateAfter.active_unit, null, 'active_unit atteso null anche in /state');
  assert.equal(stateAfter.turn, 2, '/turn/end avanza il turn counter');
});

test('sistema-first: la catena AI di /start gira e poi consegna active_unit=null', async (t) => {
  const { app, close, restore } = createFlaggedApp('true');
  t.after(async () => {
    restore();
    if (typeof close === 'function') await close().catch(() => {});
  });

  // sis first in initiative -> /start runs advanceThroughAiTurns (AI pre-phase)
  // before handing off to players.
  const units = coopParty({ sisInitiative: 30 });
  const sid = await startSession(app, units);
  const state = await getState(app, sid);
  assert.equal(state.turn_order[0], 'sis', 'sis atteso primo in turn_order (initiative 30)');
  // AI pre-phase ran: turn advanced past 1 by the sistema chain.
  assert.ok(state.turn >= 2, `AI pre-phase attesa (turn >= 2), actual=${state.turn}`);
  // Chain handed off to players -> planning phase -> honest null.
  assert.equal(
    state.active_unit,
    null,
    `active_unit atteso null post hand-off, actual=${JSON.stringify(state.active_unit)}`,
  );
});
