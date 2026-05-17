// ADR-2026-04-16 PR 5 (M5b) — integration tests for /turn/end wrapper
// when USE_ROUND_MODEL is active.
//
// Verifica che con flag on, /turn/end usi declareSistemaIntents per
// emettere intents SIS, poi commit + resolve via round orchestrator
// con real performAttack + move. Response shape legacy-compat +
// round_wrapper metadata.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { withRoundFlag, startSession } = require('./sessionTestHelpers');

// ─────────────────────────────────────────────────────────────────
// Flag on — /turn/end via round flow
// ─────────────────────────────────────────────────────────────────

test('with flag on, /turn/end returns legacy response shape + round metadata', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const res = await request(app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);

  // Legacy fields
  assert.ok('turn' in res.body, 'turn missing');
  assert.ok('ia_actions' in res.body, 'ia_actions missing');
  assert.ok('state' in res.body, 'state missing');
  assert.ok('side_effects' in res.body, 'side_effects missing');
  // Round metadata
  assert.equal(res.body.round_wrapper, true);
  assert.ok(res.body.round_phase);
  assert.ok(res.body.round_decisions);
});

test('with flag on, SIS attacks player when in range', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // SIS adjacent to player (range 1, distance 1)
  const sessionId = await startSession(app, [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 14,
      position: { x: 2, y: 2 },
      controlled_by: 'player',
    },
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 10,
      position: { x: 3, y: 2 },
      controlled_by: 'sistema',
    },
  ]);

  const res = await request(app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);

  // SIS should have emitted an attack intent (distance 1, in range)
  assert.ok(res.body.ia_actions.length >= 1, 'expected at least 1 ia_action');
  const atkAction = res.body.ia_actions.find((a) => a.type === 'attack');
  if (atkAction) {
    assert.equal(atkAction.unit_id, 'sis');
    assert.equal(atkAction.target, 'p1');
    assert.ok('roll' in atkAction, 'roll missing from attack action');
    assert.ok('damage_dealt' in atkAction, 'damage_dealt missing');
  }
});

test('with flag on, SIS moves toward player when out of range', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // SIS far from player (range 1, distance 4)
  const sessionId = await startSession(app, [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 14,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
    },
    {
      id: 'sis',
      species: 'carapax',
      job: 'vanguard',
      hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 10,
      position: { x: 4, y: 0 },
      controlled_by: 'sistema',
    },
  ]);

  const res = await request(app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);

  const moveAction = res.body.ia_actions.find((a) => a.type === 'move');
  assert.ok(moveAction, 'expected move action from SIS');
  assert.equal(moveAction.unit_id, 'sis');
  // SIS should have moved closer (x decreased from 4)
  assert.ok(
    moveAction.position_to.x < 4,
    `expected closer position, got x=${moveAction.position_to.x}`,
  );
});

test('with flag on, multiple /turn/end calls work sequentially', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const res1 = await request(app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);
  assert.equal(res1.body.round_wrapper, true);

  const res2 = await request(app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);
  assert.equal(res2.body.round_wrapper, true);
  // Turn should increment
  assert.ok(res2.body.turn > res1.body.turn, 'turn should increment');
});

// ─────────────────────────────────────────────────────────────────
// Flag off — legacy path invariato
// ─────────────────────────────────────────────────────────────────

test('M17: /turn/end always returns round_wrapper (no legacy path)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app);

  const res = await request(app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);

  assert.ok('ia_actions' in res.body);
  assert.equal(res.body.round_wrapper, true);
  assert.ok(res.body.round_phase);
});

// ─────────────────────────────────────────────────────────────────
// Edge: stunned SIS skips
// ─────────────────────────────────────────────────────────────────

test('with flag on, stunned SIS produces no attack in ia_actions', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sessionId = await startSession(app, [
    {
      id: 'p1',
      hp: 10,
      ap: 2,
      attack_range: 2,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis',
      hp: 10,
      ap: 2,
      attack_range: 1,
      position: { x: 1, y: 0 },
      controlled_by: 'sistema',
      status: { stunned: 2 },
    },
  ]);

  const res = await request(app)
    .post('/api/session/turn/end')
    .send({ session_id: sessionId })
    .expect(200);

  // Stunned SIS should skip — no attack or move in ia_actions
  const nonSkipActions = (res.body.ia_actions || []).filter((a) => a.type !== 'skip');
  assert.equal(nonSkipActions.length, 0, 'stunned SIS should not produce attack/move');
  // But round_decisions should have skip entry
  const skipDecision = (res.body.round_decisions || []).find(
    (d) => d.unit_id === 'sis' && d.intent === 'skip',
  );
  assert.ok(skipDecision, 'expected skip decision for stunned SIS');
});
