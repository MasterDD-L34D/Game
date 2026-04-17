// Validation su /declare-intent (sprint 2026-04-18).
//
// Copre rigetto 400 per intent player invalidi:
//   - out of range (attack)
//   - target dead
//   - target alleato (friendly fire)
//   - target inesistente
//   - AP insufficienti
//   - move fuori griglia
//   - move su cella occupata
//   - move troppo lontano per AP disponibili
//
// SIS intents bypassano (validazione interna a declareSistemaIntents).

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

test('validation: attack fuori range rigettato (OUT_OF_RANGE)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 at (2,2) range 2, sis at (5,5) → distanza 6 > 2
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 5, y: 5 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 1,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'OUT_OF_RANGE');
  assert.match(r.body.error, /fuori range/);
});

test('validation: attack contro alleato rigettato (FRIENDLY_FIRE)', async (t) => {
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
      attack_range: 1,
      initiative: 10,
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
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'p2',
    ap_cost: 1,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'FRIENDLY_FIRE');
});

test('validation: target inesistente rigettato (TARGET_NOT_FOUND)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits());
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'ghost',
    ap_cost: 1,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'TARGET_NOT_FOUND');
});

test('validation: AP insufficienti rigettato (AP_INSUFFICIENT)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // p1 ap=2, action ap_cost=5
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 5,
    move_to: { x: 3, y: 2 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'AP_INSUFFICIENT');
});

test('validation: move fuori griglia rigettato (OUT_OF_GRID)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 99, y: 99 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'OUT_OF_GRID');
});

test('validation: move su cella occupata rigettato (CELL_OCCUPIED)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 3, y: 2 },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'CELL_OCCUPIED');
});

test('validation happy path: attack in range accettato', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 }, sisPos: { x: 3, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-atk',
    type: 'attack',
    actor_id: 'p1',
    target_id: 'sis',
    ap_cost: 1,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.round_phase, 'planning');
});

test('validation happy path: move within range accettato', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app, twoUnits({ p1Pos: { x: 2, y: 2 } }));
  const r = await declare(app, sid, 'p1', {
    id: 'p1-mv',
    type: 'move',
    actor_id: 'p1',
    ap_cost: 1,
    move_to: { x: 2, y: 3 },
  });
  assert.equal(r.status, 200);
});
