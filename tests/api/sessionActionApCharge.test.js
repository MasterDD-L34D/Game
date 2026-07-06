// Server-authoritative attack + ability AP cost on the round-model resolver
// (security fix follow-up to the move-cost fix in sessionMoveApCharge.test.js).
//
// The round-model resolver deducted a flat Number(action.ap_cost || 1) for
// attacks and for the ability/other else-branch, trusting a client-supplied
// field. validatePlayerIntent only gates the TOTAL ap_cost against the AP budget
// -- it never enforces a per-action MINIMUM -- so a raw-HTTP player could post
// ap_cost:0 for an attack (undercharge to free) or ap_cost:1 for a 2-AP ability
// (undercharge by half) and keep the difference for extra actions. Same class as
// the move undercharge (OWASP A04).
//
// Fix: the resolver resolves cost from a server source of truth -- attack base
// cost (canon 1 AP) and per-ability cost_ap from the ability registry -- and
// ignores the client value (mirrors resolveMoveApCost / full-authoritative).
//
// AP reset happens at the NEXT begin-planning (applyEndOfRoundSideEffects), not
// at commit-round, so post-commit state reflects the resolve-time deduction.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { startSession, twoUnits } = require('./sessionTestHelpers');

async function resolveSingleAction(app, sid, action) {
  await request(app).post('/api/session/round/begin-planning').send({ session_id: sid }).expect(200);
  await request(app)
    .post('/api/session/declare-intent')
    .send({ session_id: sid, actor_id: 'p1', action })
    .expect(200);
  await request(app)
    .post('/api/session/commit-round')
    .send({ session_id: sid, auto_resolve: true })
    .expect(200);
  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  return state.body.units.find((u) => u.id === 'p1');
}

test('AP charge: an attack with negative client ap_cost cannot gain AP -- costs base 1', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 ap=2 at (2,2), attack_range=2; sis at (3,2) -> manhattan 1, in range.
  // Pre-fix: Number(-1 || 1) = -1 -> Math.max(0, 2 - (-1)) = 3 AP (player GAINS AP).
  const sid = await startSession(app, twoUnits());

  const p1 = await resolveSingleAction(app, sid, {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: -1,
  });

  assert.equal(p1.ap_remaining, 1, 'attack must charge the server base 1 AP; negative client cost cannot refund AP');
});

test('AP charge: an attack with fractional client ap_cost:0.5 still costs base 1', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // Pre-fix: Number(0.5 || 1) = 0.5 (truthy, not floored by `|| 1`) -> undercharge.
  const sid = await startSession(app, twoUnits());

  const p1 = await resolveSingleAction(app, sid, {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 0.5,
  });

  assert.equal(p1.ap_remaining, 1, 'attack must charge the full server base 1 AP, not the client-declared 0.5');
});

test('AP charge regression: an attack with client ap_cost:1 still costs 1 AP', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits());

  const p1 = await resolveSingleAction(app, sid, {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 1,
  });

  assert.equal(p1.ap_remaining, 1, '1-AP attack charges 1 AP (unchanged)');
});

test('AP charge: a 2-AP ability with client ap_cost:1 costs the registry 2 AP', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits());

  // aegis_stance is a cost_ap:2 ability in data/core/jobs.yaml. Declaring it with
  // a client-undercharged ap_cost:1 must still deduct the registry-authoritative 2.
  const p1 = await resolveSingleAction(app, sid, {
    id: 'p1-abil',
    type: 'ability',
    actor_id: 'p1',
    ability_id: 'aegis_stance',
    ap_cost: 1,
  });

  assert.equal(p1.ap_remaining, 0, '2-AP ability must charge 2 AP, not the client-declared 1');
});

test('AP charge: /resolve-round deduction is server-authoritative (no negative-cost refund)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // /resolve-round resolves via placeholderResolveAction, which deducts from the
  // roundState display model (ap.current). Pre-fix it trusted the client field, so
  // a negative ap_cost inflated ap.current (Math.max(0, 2 - (-1)) = 3). Defense-in-
  // depth: even this display-only path must use the server-authoritative cost.
  const sid = await startSession(app, twoUnits());
  await request(app).post('/api/session/round/begin-planning').send({ session_id: sid }).expect(200);
  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sid,
      actor_id: 'p1',
      action: { id: 'p1-atk', type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: -1 },
    })
    .expect(200);
  await request(app).post('/api/session/commit-round').send({ session_id: sid }).expect(200);
  const res = await request(app).post('/api/session/resolve-round').send({ session_id: sid }).expect(200);

  const p1 = res.body.units.find((u) => u.id === 'p1');
  assert.equal(p1.ap.current, 1, 'resolve-round must charge the server base 1 AP; negative client cost cannot refund');
});

test('AP budget gate: cannot over-declare more attacks than real AP via ap_cost:0', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 ap=2. validatePlayerIntent must gate on the SERVER cost (1 per attack), not
  // the client-declared ap_cost:0 -- otherwise N intents each ap_cost:0 all pass the
  // budget sum and the resolver executes all N (over-declaration free actions, A04).
  const sid = await startSession(app, twoUnits());
  await request(app).post('/api/session/round/begin-planning').send({ session_id: sid }).expect(200);
  const declare = (n) =>
    request(app)
      .post('/api/session/declare-intent')
      .send({
        session_id: sid,
        actor_id: 'p1',
        action: { id: `p1-atk-${n}`, type: 'attack', actor_id: 'p1', target_id: 'sis', ap_cost: 0 },
      });

  await declare(1).expect(200); // server cost 1, running total 1 <= 2
  await declare(2).expect(200); // running total 2 <= 2
  const third = await declare(3); // running total 3 > 2 -> must be rejected

  assert.equal(third.status, 400, '3rd attack must be rejected (3 x server cost 1 exceeds 2 AP)');
  assert.equal(third.body.code, 'AP_INSUFFICIENT', 'rejection must be an AP budget error');
});

