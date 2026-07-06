// Server-authoritative move AP cost on the round-model resolver (security fix
// 2026-07-05).
//
// The round-model resolver deducted a flat Number(action.ap_cost || 1) for a
// move, trusting a client-supplied field. The shipped playtest client posts
// ap_cost:1 for ANY destination (public/Evo-Tactics -- Playtest.html), so a
// player with N AP could move N tiles for 1 AP and keep N-1 AP for more actions.
// validatePlayerIntent gates dist <= AP budget but never enforces ap_cost==dist.
//
// Fix: the resolver recomputes cost = max(1, Manhattan(from,to) - move_bonus),
// ignoring the client value. buildMoveEvent already logged ap_spent = real
// distance, so post-fix the deduction and the telemetry converge.
//
// AP reset happens at the NEXT begin-planning (applyEndOfRoundSideEffects), not
// at commit-round, so post-commit state reflects the resolve-time deduction.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { startSession, twoUnits } = require('./sessionTestHelpers');

async function resolveSingleMove(app, sid, moveTo, apCost) {
  await request(app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sid })
    .expect(200);
  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sid,
      actor_id: 'p1',
      action: { id: 'p1-mv', type: 'move', actor_id: 'p1', ap_cost: apCost, move_to: moveTo },
    })
    .expect(200);
  await request(app)
    .post('/api/session/commit-round')
    .send({ session_id: sid, auto_resolve: true })
    .expect(200);
  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  return state.body.units.find((u) => u.id === 'p1');
}

test('AP charge: a 2-tile move with client ap_cost:1 costs 2 AP (real distance)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 ap=2 at (2,2); SIS parked far away so it cannot interfere with the move.
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 5, y: 5 } }));

  const p1 = await resolveSingleMove(app, sid, { x: 2, y: 4 }, 1);

  assert.deepEqual(p1.position, { x: 2, y: 4 }, 'move actually resolved (not skipped/blocked)');
  assert.equal(p1.ap_remaining, 0, '2-tile move must charge 2 AP, not the client-declared 1');
});

test('AP charge regression: a 1-tile move still costs 1 AP', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 5, y: 5 } }));

  const p1 = await resolveSingleMove(app, sid, { x: 2, y: 3 }, 1);

  assert.deepEqual(p1.position, { x: 2, y: 3 }, 'move actually resolved');
  assert.equal(p1.ap_remaining, 1, '1-tile move charges 1 AP (unchanged)');
});

test('AP budget gate: cannot over-declare more moves than real AP via ap_cost:0', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 ap=2 at (2,2); SIS parked far so it never occupies a destination cell.
  // validatePlayerIntent must gate on the SERVER move cost (max(1, dist) >= 1 per
  // move), not the client-declared ap_cost:0. Otherwise N move intents each
  // ap_cost:0 all pass the pending-sum budget check and the resolver executes all
  // N -- each deduction floored at ap_remaining 0 -- for free movement beyond the
  // real AP (OWASP A04, same class as the move-undercharge fixed above; the
  // attack analog lives in sessionActionApCharge.test.js).
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 5, y: 5 } }));
  await request(app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sid })
    .expect(200);
  const declareMove = (n, moveTo) =>
    request(app)
      .post('/api/session/declare-intent')
      .send({
        session_id: sid,
        actor_id: 'p1',
        action: { id: `p1-mv-${n}`, type: 'move', actor_id: 'p1', ap_cost: 0, move_to: moveTo },
      });

  // Each destination is 1 tile from (2,2): server cost 1 apiece.
  await declareMove(1, { x: 2, y: 3 }).expect(200); // running total 1 <= 2
  await declareMove(2, { x: 2, y: 1 }).expect(200); // running total 2 <= 2
  const third = await declareMove(3, { x: 1, y: 2 }); // running total 3 > 2 -> rejected

  assert.equal(third.status, 400, '3rd move must be rejected (3 x server cost 1 exceeds 2 AP)');
  assert.equal(third.body.code, 'AP_INSUFFICIENT', 'rejection must be an AP budget error');
});
