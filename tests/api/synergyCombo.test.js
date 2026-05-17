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
      attack_mod: 8, // bias to land hits + significant damage so bonus is observable
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
      defense_dc: 5, // low DC so attacks reliably land
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
      attack_mod: 8,
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
      defense_dc: 5,
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
  // d20 nat-1 always misses → loop with turn/end on miss to retry on full AP.
  let foundSynergy = false;
  for (let i = 0; i < 6; i += 1) {
    const r = await playerAttack(app, sid, 'p1', 'sis');
    assert.equal(r.status, 200);
    if (r.body.synergy && r.body.synergy.triggered) {
      foundSynergy = true;
      assert.ok(
        r.body.synergy.synergies.find((s) => s.id === 'echo_backstab'),
        'echo_backstab in synergies list',
      );
      assert.ok(r.body.synergy.bonus_damage >= 1);
      break;
    }
    if (r.body.result && r.body.result.hit) {
      throw new Error(`hit landed but synergy missing: ${JSON.stringify(r.body.synergy)}`);
    }
    // Miss → end the round so cooldown clears and AP refills, then retry
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  assert.ok(foundSynergy, 'expected at least one synergy fire over 6 attempts');
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
  // Loop until synergy triggers — same retry pattern as the previous test.
  let body = null;
  for (let i = 0; i < 6; i += 1) {
    const r = await playerAttack(app, sid, 'p1', 'sis');
    assert.equal(r.status, 200);
    if (r.body.synergy && r.body.synergy.triggered) {
      body = r.body;
      break;
    }
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  assert.ok(body, 'expected synergy fire within 6 attempts');
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
