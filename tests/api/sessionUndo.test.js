// Bundle B.2 — Tactical Breach Wizards Undo libero (planning-phase pop LIFO).
//
// Endpoint: POST /api/session/undo-action body { session_id, actor_id }
// Pop ultima main intent (non reaction) per actor da pending_intents.
// 409 se phase != 'planning'. 200 no-op se stack vuoto / solo reactions.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { startSession, twoUnits } = require('./sessionTestHelpers');

async function declare(app, sid, actorId, action) {
  return request(app)
    .post('/api/session/declare-intent')
    .send({ session_id: sid, actor_id: actorId, action });
}

async function undo(app, sid, actorId) {
  return request(app).post('/api/session/undo-action').send({ session_id: sid, actor_id: actorId });
}

test('undo: pop ultimo move intent da pending stack', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 5, y: 5 } }));
  // Declare 1 move
  const r1 = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    move_to: { x: 2, y: 3 },
    ap_cost: 1,
  });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.pending_intents.length, 1);
  // Undo
  const r2 = await undo(app, sid, 'p1');
  assert.equal(r2.status, 200);
  assert.equal(r2.body.pending_intents.length, 0);
  assert.ok(r2.body.popped, 'popped intent ritornato');
  assert.equal(r2.body.popped.unit_id, 'p1');
  assert.equal(r2.body.popped.action.type, 'move');
});

test('undo: LIFO pop ultimo intent quando 2+ presenti', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  // 2 declared intents: move + attack
  await declare(app, sid, 'p1', {
    id: 'mv1',
    type: 'move',
    actor_id: 'p1',
    move_to: { x: 2, y: 3 },
    ap_cost: 1,
  });
  await declare(app, sid, 'p1', {
    id: 'atk1',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 1,
  });
  const r = await undo(app, sid, 'p1');
  assert.equal(r.status, 200);
  // LIFO: attack rimosso, move resta
  assert.equal(r.body.pending_intents.length, 1);
  assert.equal(r.body.pending_intents[0].action.type, 'move');
  assert.equal(r.body.popped.action.type, 'attack');
});

test('undo: 409 se phase != planning (post commit-round)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  await declare(app, sid, 'p1', {
    id: 'mv1',
    type: 'move',
    actor_id: 'p1',
    move_to: { x: 2, y: 3 },
    ap_cost: 1,
  });
  // Commit round (no auto_resolve → fase passes a 'committed')
  const cr = await request(app)
    .post('/api/session/commit-round')
    .send({ session_id: sid, auto_resolve: false });
  assert.equal(cr.status, 200);
  // Undo dopo commit → 409
  const r = await undo(app, sid, 'p1');
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'UNDO_PHASE_INVALID');
});

test('undo: 200 no-op se stack vuoto', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  // Declare poi clear → stack vuoto ma roundState esiste
  await declare(app, sid, 'p1', {
    id: 'mv1',
    type: 'move',
    actor_id: 'p1',
    move_to: { x: 2, y: 3 },
    ap_cost: 1,
  });
  await request(app).post('/api/session/clear-intent/p1').send({ session_id: sid });
  // Undo su stack vuoto → 200, popped: null
  const r = await undo(app, sid, 'p1');
  assert.equal(r.status, 200);
  assert.equal(r.body.popped, null);
  assert.equal(r.body.pending_intents.length, 0);
});

test('undo: 400 se actor_id mancante', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  await declare(app, sid, 'p1', {
    id: 'mv1',
    type: 'move',
    actor_id: 'p1',
    move_to: { x: 2, y: 3 },
    ap_cost: 1,
  });
  const r = await request(app).post('/api/session/undo-action').send({ session_id: sid });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /actor_id/);
});

test('undo: pop solo intent del actor specificato (non altri)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const units = [
    {
      id: 'p1',
      species: 'velox',
      job: 'skirmisher',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 14,
      position: { x: 0, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'p2',
      species: 'carapax',
      job: 'vanguard',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 2,
      initiative: 12,
      position: { x: 1, y: 0 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'sis',
      species: 'lupo',
      job: 'vanguard',
      hp: 10,
      max_hp: 10,
      ap: 2,
      attack_range: 1,
      initiative: 8,
      position: { x: 5, y: 5 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
  const sid = await startSession(app, units);
  await declare(app, sid, 'p1', {
    id: 'mv1',
    type: 'move',
    actor_id: 'p1',
    move_to: { x: 0, y: 1 },
    ap_cost: 1,
  });
  await declare(app, sid, 'p2', {
    id: 'mv2',
    type: 'move',
    actor_id: 'p2',
    move_to: { x: 2, y: 0 },
    ap_cost: 1,
  });
  const r = await undo(app, sid, 'p1');
  assert.equal(r.status, 200);
  // Solo intent p1 rimosso, p2 preservato
  assert.equal(r.body.pending_intents.length, 1);
  assert.equal(r.body.pending_intents[0].unit_id, 'p2');
  assert.equal(r.body.popped.unit_id, 'p1');
});
