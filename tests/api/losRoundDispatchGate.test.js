// tests/api/losRoundDispatchGate.test.js — Combat LOS slice-1 known-gap closure.
//
// The single-attack HTTP handler gates ranged attacks on line-of-sight when
// COMBAT_LOS_ENABLED=true (see tests/api/losAttackGate.test.js). The SECOND human
// ranged path — POST /round/execute with player_intents (source:'player') —
// resolved attacks through a separate handleLegacyAttackViaRound call that only
// range-checked, so a player could still shoot through a rock. This test pins the
// symmetric LOS gate on that round-dispatch loop:
//   - flag ON  -> player shot through a rock is skipped (target_los_blocked)
//   - flag OFF -> shot still resolves (byte-identical, band-neutral)
//   - flag ON + clear line -> shot still resolves
// The AI path (source:'ai') is intentionally NOT re-gated here: it is already
// LOS-gated upstream at target selection (losClearForAi), the same predicate.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

// Rock at (2,0) sits strictly between shooter (0,0) and target (4,0); the shooter's
// range 4 covers the distance so ONLY the LOS gate can stop the shot. Mirrors the
// proven geometry in losAttackGate.test.js / aiLosFilter.test.js. encounter.grid
// width/height are declared wide enough that positions are not clamped, and its
// terrain_features are carried onto session.grid at /start.
function rockUnits() {
  return [
    {
      id: 'p_shooter',
      controlled_by: 'player',
      position: { x: 0, y: 0 },
      attack_range: 4,
      hp: 20,
      ap: 3,
      initiative: 20,
    },
    {
      id: 'e_target',
      controlled_by: 'sistema',
      position: { x: 4, y: 0 },
      hp: 20,
      initiative: 1,
    },
  ];
}

async function startSession(app, terrainFeatures) {
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: rockUnits(),
      encounter: { grid: { width: 8, height: 8, terrain_features: terrainFeatures } },
    });
  return res.body.session_id;
}

async function shoot(app, sid) {
  return request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [
        { actor_id: 'p_shooter', action: { type: 'attack', target_id: 'e_target' } },
      ],
      ai_auto: false,
    });
}

test('round/execute LOS gate — flag ON: player shot through a rock is skipped', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    delete process.env.COMBAT_LOS_ENABLED;
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, [{ x: 2, y: 0, type: 'roccia' }]);
  process.env.COMBAT_LOS_ENABLED = 'true';
  const res = await shoot(app, sid);

  assert.equal(res.status, 200, `round/execute ok: ${JSON.stringify(res.body).slice(0, 200)}`);
  assert.equal(res.body.results.length, 1);
  assert.equal(res.body.results[0].skipped, 'target_los_blocked');
  assert.equal(res.body.results[0].actor_id, 'p_shooter');
  assert.equal(res.body.results[0].target_id, 'e_target');
});

test('round/execute LOS gate — flag OFF: shot through a rock still resolves (byte-identical)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  delete process.env.COMBAT_LOS_ENABLED;
  const sid = await startSession(app, [{ x: 2, y: 0, type: 'roccia' }]);
  const res = await shoot(app, sid);

  assert.equal(res.status, 200);
  assert.equal(res.body.results.length, 1);
  assert.equal(res.body.results[0].action_type, 'attack');
  assert.equal(res.body.results[0].skipped, undefined, 'no LOS skip when flag OFF');
});

test('round/execute LOS gate — flag ON: clear line (no rock) still resolves', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    delete process.env.COMBAT_LOS_ENABLED;
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, []);
  process.env.COMBAT_LOS_ENABLED = 'true';
  const res = await shoot(app, sid);

  assert.equal(res.status, 200);
  assert.equal(res.body.results.length, 1);
  assert.equal(res.body.results[0].action_type, 'attack');
});
