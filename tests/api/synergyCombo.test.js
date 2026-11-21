// Synergy Combo integration — verifies that dune_stalker (with synergy-eligible
// species default_parts) emits a synergy event in the action response body.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function duneStalkerVsTanker() {
  return [
    {
      id: 'p1',
      species: 'dune_stalker', // YAML synergy: senses.echolocation + offense.sand_claws
      job: 'skirmisher',
      hp: 14,
      max_hp: 14,
      ap: 2,
      // resolveAttack reads `mod` (NOT `attack_mod`). mod 8 vs the target's dc 5
      // means die+8 >= 5 for every d20 face -> the attack ALWAYS lands, so the
      // synergy fires deterministically (no dice dependence -> no parallel-CI flake).
      mod: 8,
      attack_range: 3,
      initiative: 14,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      hp: 60,
      max_hp: 60,
      ap: 2,
      dc: 5, // resolveAttack reads `dc` (NOT `defense_dc`); low DC -> attacks always land
      attack_range: 1,
      initiative: 5,
      position: { x: 2, y: 1 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

function plainPlayerVsTanker() {
  // Non-synergy species (no echo+claws combo). Used as control to show synergy
  // does NOT trigger when species lacks the parts.
  return [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      hp: 14,
      max_hp: 14,
      ap: 2,
      mod: 8, // guaranteed hit (mod 8 vs dc 5) -> proves no synergy even ON a landed hit
      attack_range: 3,
      initiative: 14,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      hp: 60,
      max_hp: 60,
      ap: 2,
      dc: 5,
      attack_range: 1,
      initiative: 5,
      position: { x: 2, y: 1 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

async function startSession(app, units) {
  const res = await request(app).post('/api/session/start').send({ units }).expect(200);
  return res.body.session_id;
}

async function playerAttack(app, sessionId, actorId, targetId) {
  return request(app).post('/api/session/action').send({
    session_id: sessionId,
    actor_id: actorId,
    action_type: 'attack',
    target_id: targetId,
  });
}

test('dune_stalker triggers echo_backstab synergy on hit', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, duneStalkerVsTanker());
  // Hit is deterministic (mod 8 vs dc 5), so the synergy precondition
  // (landed hit + echolocation+sand_claws parts, cooldown clear on fresh round)
  // is met on the first attack — no probabilistic retry loop needed.
  const r = await playerAttack(app, sid, 'p1', 'sis');
  assert.equal(r.status, 200);
  assert.equal(r.body.result, 'hit', 'attack must land (mod 8 vs dc 5)');
  assert.ok(
    r.body.synergy && r.body.synergy.triggered,
    `echo_backstab must fire on the guaranteed hit, got ${JSON.stringify(r.body.synergy)}`,
  );
  assert.ok(
    r.body.synergy.synergies.find((s) => s.id === 'echo_backstab'),
    'echo_backstab in synergies list',
  );
  assert.ok(r.body.synergy.bonus_damage >= 1);
});

test('non-synergy species (velox) does NOT trigger synergy', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, plainPlayerVsTanker());
  // Single attack is enough — velox lacks both senses.echolocation and
  // offense.sand_claws → no synergy can fire ever.
  const r = await playerAttack(app, sid, 'p1', 'sis');
  assert.equal(r.status, 200);
  assert.ok(
    !r.body.synergy || !r.body.synergy.triggered,
    `velox must not trigger synergy, got ${JSON.stringify(r.body.synergy)}`,
  );
  const list = (r.body.state && r.body.state.last_round_synergies) || [];
  assert.equal(list.length, 0, 'last_round_synergies should be empty for non-synergy species');
});

test('synergy state.last_round_synergies populated after fire', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, duneStalkerVsTanker());
  // Deterministic hit (mod 8 vs dc 5) -> synergy fires on the first attack.
  const r = await playerAttack(app, sid, 'p1', 'sis');
  assert.equal(r.status, 200);
  assert.ok(
    r.body.synergy && r.body.synergy.triggered,
    `expected synergy fire on the guaranteed hit, got ${JSON.stringify(r.body.synergy)}`,
  );
  const body = r.body;
  const list = (body.state && body.state.last_round_synergies) || [];
  assert.ok(
    list.length >= 1,
    `last_round_synergies should contain >=1 entry, got ${JSON.stringify(list)}`,
  );
  const first = list[0];
  assert.equal(first.actor_id, 'p1');
  assert.equal(first.target_id, 'sis');
  assert.ok(Array.isArray(first.synergies));
  assert.equal(first.synergies[0].id, 'echo_backstab');
});
