// tests/api/anchorStateWire.test.js
//
// Phase 3 integration: radici_ancora_planare anchor wired end-to-end (always-on
// slice, NOT flag-gated -- band-neutral by no live carrier).
//   1. producer: a carrier is `ancorato` (DR2) at session start (standstill).
//   2. consumer: moving forfeits the anchor for the round (break-on-move).
//   3. DR seam: an anchored carrier takes ANCHOR_DR (2) less damage than a
//      non-carrier under an identical seeded attack.
// Determinism: mod:99 = always-hit (sessionTestHelpers convention) + a fixed seed
// so the only cross-run difference is the radici trait -> isolates the anchor DR.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const { createStubOrchestrator } = require('../../apps/backend/services/stubOrchestrator');
const {
  ANCORATO,
  ANCHOR_DR,
  RADICI_TRAIT,
} = require('../../apps/backend/services/combat/anchorState');

function appHandle() {
  return createApp({ databasePath: null, generationOrchestrator: createStubOrchestrator() });
}

async function start(app, units, seed) {
  const res = await request(app).post('/api/session/start').send({ units, seed });
  assert.equal(res.status, 200, `start should succeed: ${JSON.stringify(res.body)}`);
  return res.body.session_id;
}

async function state(app, sid) {
  const res = await request(app).get('/api/session/state').query({ session_id: sid });
  return res.body;
}

const unit = (s, id) => s.units.find((u) => u.id === id);

// Player carrier (so the move handler -- a player-only path -- can break the anchor).
function playerCarrier(withRadici) {
  return [
    {
      id: 'treant',
      name: 'Treant',
      controlled_by: 'player',
      position: { x: 2, y: 2 },
      hp: 20,
      max_hp: 20,
      ap: 3,
      ap_remaining: 3,
      attack: 3,
      defense: 3,
      attack_range: 1,
      initiative: 14,
      traits: withRadici ? [RADICI_TRAIT] : [],
    },
    {
      id: 'sis',
      name: 'Dummy',
      controlled_by: 'sistema',
      position: { x: 5, y: 5 },
      hp: 20,
      max_hp: 20,
      ap: 2,
      ap_remaining: 2,
      attack: 3,
      defense: 3,
      attack_range: 1,
      initiative: 10,
      traits: [],
    },
  ];
}

// Enemy carrier attacked by an always-hit player, for the DR-delta measurement.
function attackPair(withRadici) {
  return [
    {
      id: 'p1',
      name: 'Striker',
      controlled_by: 'player',
      position: { x: 2, y: 2 },
      hp: 20,
      max_hp: 20,
      ap: 3,
      ap_remaining: 3,
      attack: 8,
      defense: 3,
      attack_range: 2,
      mod: 99, // always-hit
      initiative: 14,
      traits: [],
    },
    {
      id: 'treant',
      name: 'Treant',
      controlled_by: 'sistema',
      position: { x: 3, y: 2 },
      // High HP: mod:99 inflates damage (it feeds positional.damage, not just
      // to-hit), so a big-but-identical hit must leave the baseline alive for the
      // 2-point DR delta to be observable. Both runs share the seed + mod, so the
      // only cross-run difference is the radici trait -> isolates ANCHOR_DR.
      hp: 120,
      max_hp: 120,
      ap: 2,
      ap_remaining: 2,
      attack: 3,
      defense: 3,
      attack_range: 1,
      initiative: 10,
      traits: withRadici ? [RADICI_TRAIT] : [],
    },
  ];
}

test('producer: a carrier is anchored (ancorato=DR2) at session start', async (t) => {
  const h = appHandle();
  t.after(async () => {
    if (typeof h.close === 'function') await h.close().catch(() => {});
  });
  const sid = await start(h.app, playerCarrier(true), 123);
  const s = await state(h.app, sid);
  assert.equal(
    Number(unit(s, 'treant').status?.[ANCORATO]),
    ANCHOR_DR,
    'carrier anchored at start',
  );
  assert.ok(!unit(s, 'sis').status?.[ANCORATO], 'non-carrier never anchors');
});

test('consumer: moving forfeits the anchor for the round (break-on-move)', async (t) => {
  const h = appHandle();
  t.after(async () => {
    if (typeof h.close === 'function') await h.close().catch(() => {});
  });
  const sid = await start(h.app, playerCarrier(true), 123);
  const before = await state(h.app, sid);
  assert.equal(Number(unit(before, 'treant').status?.[ANCORATO]), ANCHOR_DR, 'anchored pre-move');

  const mv = await request(h.app)
    .post('/api/session/action')
    .send({ session_id: sid, action_type: 'move', actor_id: 'treant', position: { x: 2, y: 3 } });
  assert.equal(mv.status, 200, `move should succeed: ${JSON.stringify(mv.body)}`);

  const after = await state(h.app, sid);
  assert.ok(!unit(after, 'treant').status?.[ANCORATO], 'anchor cleared after the move');
});

test('DR seam: an anchored carrier takes ANCHOR_DR less than a non-carrier', async (t) => {
  const h1 = appHandle();
  const h2 = appHandle();
  t.after(async () => {
    if (typeof h1.close === 'function') await h1.close().catch(() => {});
    if (typeof h2.close === 'function') await h2.close().catch(() => {});
  });

  const SEED = 777;
  const sidR = await start(h1.app, attackPair(true), SEED);
  const sidP = await start(h2.app, attackPair(false), SEED);

  const atk = (app, sid) =>
    request(app)
      .post('/api/session/action')
      .send({ session_id: sid, actor_id: 'p1', action_type: 'attack', target_id: 'treant' });

  const rR = await atk(h1.app, sidR);
  const rP = await atk(h2.app, sidP);
  assert.equal(rR.status, 200, `radici attack: ${JSON.stringify(rR.body)}`);
  assert.equal(rP.status, 200, `plain attack: ${JSON.stringify(rP.body)}`);

  const hpRadici = Number(unit(await state(h1.app, sidR), 'treant').hp);
  const hpPlain = Number(unit(await state(h2.app, sidP), 'treant').hp);

  assert.ok(hpPlain < 120, `baseline took damage (hp ${hpPlain})`);
  assert.ok(hpPlain > 0, 'baseline not KO -- DR would be clamped');
  assert.equal(hpRadici - hpPlain, ANCHOR_DR, 'anchored carrier took exactly ANCHOR_DR less');
});
