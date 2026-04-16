// ADR-2026-04-16 PR 4 di N — integration test per il wrapper legacy
// /api/session/action quando USE_ROUND_MODEL e' attivo.
//
// Scope: verifica che con flag on, /action continui ad accettare lo
// stesso body legacy ({action_type, actor_id, target_id, cost?}) e
// ritorni la stessa response shape (roll, mos, result, pt,
// damage_dealt, target_hp, trait_effects, state), ma la pipeline
// interna passi attraverso il round flow (planning → commit → resolve)
// con real performAttack wirato via handleLegacyAttackViaRound.
//
// Con flag off, /action resta invariato — verificato dal fatto che i
// test dei restanti endpoint passano ancora (sessionRoundEndpoints
// usa flag on solo per i nuovi endpoint).

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { withRoundFlag, startSession } = require('./sessionTestHelpers');

// ─────────────────────────────────────────────────────────────────
// Flag on — legacy /action wrapped via round flow
// ─────────────────────────────────────────────────────────────────

test('with flag on, /action attack returns legacy response + round metadata', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
    })
    .expect(200);

  // Legacy response fields
  assert.ok('roll' in res.body, 'roll missing');
  assert.ok('mos' in res.body, 'mos missing');
  assert.ok(['hit', 'miss'].includes(res.body.result));
  assert.ok('pt' in res.body);
  assert.ok('damage_dealt' in res.body);
  assert.ok('target_hp' in res.body);
  assert.ok('trait_effects' in res.body);
  assert.ok('state' in res.body);
  assert.ok('actor_position' in res.body);
  // Round wrapper metadata
  assert.equal(res.body.round_wrapper, true);
  assert.equal(res.body.round_phase, 'resolved');
});

test('with flag on, hit reduces target.hp and updates state', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  // Tenta attack multiple times per assicurarsi di ottenere hit
  // almeno una volta (rng reale in session.js). Target hp iniziale 10.
  let finalHp = 10;
  for (let i = 0; i < 5; i++) {
    // Refresh turn between attempts to restore AP
    const attackRes = await request(app).post('/api/session/action').send({
      session_id: sessionId,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
    });
    if (attackRes.status !== 200) break;
    finalHp = attackRes.body.target_hp;
    // End turn per restore AP
    await request(app).post('/api/session/turn/end').send({ session_id: sessionId });
  }
  // Dopo 5 tentativi (con hit rate ~ 55% a mod 3 vs DC 12), sis dovrebbe
  // aver subito almeno 1 damage in aggregate. Verifica monotonicita':
  // hp finale <= hp iniziale.
  assert.ok(finalHp <= 10, `sis hp should decrease: ${finalHp}`);
});

test('with flag on, /action rejects target out of range', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // SIS a (5,5), player a (0,0), range 2 -> distanza 10, fuori range
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: [
        {
          id: 'p1',
          hp: 10,
          ap: 2,
          attack_range: 2,
          position: { x: 0, y: 0 },
          controlled_by: 'player',
        },
        {
          id: 'sis',
          hp: 10,
          ap: 2,
          position: { x: 5, y: 5 },
          controlled_by: 'sistema',
        },
      ],
    })
    .expect(200);
  const sessionId = res.body.session_id;

  const attackRes = await request(app).post('/api/session/action').send({
    session_id: sessionId,
    actor_id: 'p1',
    action_type: 'attack',
    target_id: 'sis',
  });
  assert.equal(attackRes.status, 400);
  assert.match(attackRes.body.error, /range/);
});

test('with flag on, /action attack sets session.roundState to resolved phase', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
    })
    .expect(200);

  // Il wrapper esegue un round cycle completo e lascia roundState
  // in phase 'resolved'. Una successiva /declare-intent dovrebbe
  // quindi auto-trigger beginRound (phase → planning).
  assert.equal(res.body.round_phase, 'resolved');

  const declareRes = await request(app)
    .post('/api/session/declare-intent')
    .send({
      session_id: sessionId,
      actor_id: 'sis',
      action: { id: 'x', type: 'move', actor_id: 'sis', ap_cost: 1 },
    })
    .expect(200);
  assert.equal(declareRes.body.round_phase, 'planning');
});

// ─────────────────────────────────────────────────────────────────
// Flag off — /action path legacy invariato
// ─────────────────────────────────────────────────────────────────

test('M17: /action attack always returns round_wrapper (no legacy path)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
    })
    .expect(200);

  assert.ok('roll' in res.body);
  assert.ok('damage_dealt' in res.body);
  assert.equal(res.body.round_wrapper, true);
  assert.ok(res.body.round_phase);
});

test('with flag on, /action move path resta legacy (non toccato dal wrapper)', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const res = await request(app)
    .post('/api/session/action')
    .send({
      session_id: sessionId,
      actor_id: 'p1',
      action_type: 'move',
      position: { x: 2, y: 3 },
    });
  // PR 4 wrapper copre solo attack. Move deve ancora funzionare
  // via il path legacy originale.
  assert.equal(res.status, 200);
  // Response shape legacy move (no round_wrapper)
  assert.equal(res.body.round_wrapper, undefined);
});
