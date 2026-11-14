// tests/api/declareReactionWire.test.js — SPEC-C reaction wiring.
//
// Pins the missing surface for the existing engine fn
// roundOrchestrator.declareReaction: POST /api/session/declare-reaction lets a
// device register a conditional reaction intent during the planning phase
// (Gate-5: engine was LIVE, route was DEAD). Thin wire, mirrors /declare-intent.
// Spec: docs/design/evo-tactics-phone-wego-composer.md (SPEC-C, declareReaction).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startSession(app) {
  const res = await request(app)
    .post('/api/session/start')
    .send({
      units: [
        { id: 'hero', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 1, y: 1 } },
        { id: 'foe', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 2, y: 1 } },
      ],
    });
  return res.body.session_id;
}

const VALID = {
  reaction_trigger: { event: 'attacked', source_any_of: null, cooldown_rounds: 0 },
  reaction_payload: { type: 'parry', parry_bonus: 2 },
};

test('declare-reaction wire: valid reaction registered in pending_intents', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);

  const res = await request(app)
    .post('/api/session/declare-reaction')
    .send({ session_id: sid, actor_id: 'hero', ...VALID });

  assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.ok(res.body.round_phase, 'round_phase present (planning auto-entered)');
  const reaction = (res.body.pending_intents || []).find(
    (i) => i.unit_id === 'hero' && i.reaction_trigger,
  );
  assert.ok(reaction, 'reaction intent present in pending_intents');
  assert.equal(reaction.reaction_trigger.event, 'attacked');
  assert.equal(reaction.reaction_payload.type, 'parry');
});

test('declare-reaction wire: unsupported trigger event -> 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);
  const res = await request(app)
    .post('/api/session/declare-reaction')
    .send({
      session_id: sid,
      actor_id: 'hero',
      reaction_trigger: { event: 'unknown_event' },
      reaction_payload: { type: 'parry', parry_bonus: 1 },
    });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /non supportato|event/i);
});

test('declare-reaction wire: unsupported payload type -> 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);
  const res = await request(app)
    .post('/api/session/declare-reaction')
    .send({
      session_id: sid,
      actor_id: 'hero',
      reaction_trigger: { event: 'attacked' },
      reaction_payload: { type: 'nuke' },
    });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /non supportato|type/i);
});

test('declare-reaction wire: missing reaction_payload -> 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);
  const res = await request(app)
    .post('/api/session/declare-reaction')
    .send({ session_id: sid, actor_id: 'hero', reaction_trigger: { event: 'attacked' } });
  assert.equal(res.status, 400);
});

test('declare-reaction wire: missing session -> 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/session/declare-reaction')
    .send({ session_id: 'does_not_exist', actor_id: 'hero', ...VALID });
  assert.equal(res.status, 404);
});
