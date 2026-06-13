// Round simultaneo — Fase A (ADR-2026-04-15 + SoT §13.1).
//
// Copre nuovo flow:
//   /session/round/begin-planning → SIS + hazard + bleeding applicati in planning
//   /session/declare-intent        → player dichiara intent in parallelo a SIS
//   /session/commit-round (auto_resolve=true) → risolve in simultanea ordinato
//                                                per reaction_speed.
//
// Contratto: player vedono i SIS intents in pending_intents durante planning
// (fog-of-intent = Fase B networking). Resolve ordina per priority desc, unit_id asc.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { startSession, twoUnits } = require('./sessionTestHelpers');

test('begin-planning: SIS declares intents in shared planning phase', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, twoUnits());

  const res = await request(app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sid })
    .expect(200);

  assert.equal(res.body.round_phase, 'planning');
  assert.ok(res.body.sistema_intents_count >= 1, 'SIS should declare at least one intent');
  assert.ok(Array.isArray(res.body.pending_intents));
  const sisIntent = res.body.pending_intents.find((i) => String(i.unit_id) === 'sis');
  assert.ok(sisIntent, 'sis intent must be present in pending_intents');
  assert.ok(Array.isArray(res.body.sistema_decisions));
  assert.ok(res.body.sistema_decisions.length >= 1);
});

test('round simultaneo end-to-end: begin → player intent → commit auto_resolve', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, twoUnits({ sisPos: { x: 3, y: 2 } }));

  // 1) begin-planning → SIS intents dichiarati
  const planRes = await request(app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sid })
    .expect(200);
  assert.equal(planRes.body.round_phase, 'planning');

  // 2) player dichiara intent (attack sis)
  const declareRes = await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sid,
      actor_id: 'p1',
      action: {
        id: 'p1-attack',
        type: 'attack',
        actor_id: 'p1',
        target_id: 'sis',
        ap_cost: 1,
        damage_dice: { count: 1, sides: 6, modifier: 2 },
      },
    })
    .expect(200);
  assert.equal(declareRes.body.round_phase, 'planning');
  const unitIds = declareRes.body.pending_intents.map((i) => String(i.unit_id));
  assert.ok(unitIds.includes('p1'), 'p1 in pending_intents');
  assert.ok(unitIds.includes('sis'), 'sis ancora presente');

  // 3) commit-round con auto_resolve=true → risolve round simultaneo
  const commitRes = await request(app)
    .post('/api/session/commit-round')
    .send({ session_id: sid, auto_resolve: true })
    .expect(200);

  assert.equal(commitRes.body.round_phase, 'resolved');
  assert.ok(Array.isArray(commitRes.body.resolution_queue));
  assert.ok(commitRes.body.resolution_queue.length >= 2, 'almeno 2 azioni in queue');
  assert.ok(Array.isArray(commitRes.body.player_actions));
  assert.ok(Array.isArray(commitRes.body.ia_actions));
  assert.equal(commitRes.body.turn, 2, 'turn incrementato dopo resolve');

  // Verifica: almeno un attack registrato (player o sis)
  const totalAttacks =
    (commitRes.body.player_actions || []).filter((a) => a.type === 'attack').length +
    (commitRes.body.ia_actions || []).filter((a) => a.type === 'attack').length;
  assert.ok(totalAttacks >= 1, 'almeno 1 attack risolto');
});

test('commit-round senza auto_resolve mantiene retrocompat', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, twoUnits());

  await request(app)
    .post('/api/session/round/begin-planning')
    .send({ session_id: sid })
    .expect(200);

  await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sid,
      actor_id: 'p1',
      action: {
        id: 'p1-attack',
        type: 'attack',
        actor_id: 'p1',
        target_id: 'sis',
        ap_cost: 1,
      },
    })
    .expect(200);

  // auto_resolve omesso/false → commit solo, senza resolve
  const commitRes = await request(app)
    .post('/api/session/commit-round')
    .send({ session_id: sid })
    .expect(200);

  assert.notEqual(commitRes.body.round_phase, 'resolved', 'senza auto_resolve non deve risolvere');
  assert.equal(commitRes.body.turn, undefined, 'turn non presente se non auto-resolve');
});
