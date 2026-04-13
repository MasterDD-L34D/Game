const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const { sessions } = require('../../apps/backend/routes/combat');

function buildApp() {
  return createApp().app;
}

test('POST /api/v1/combat/session restituisce session_id e initial_state', async () => {
  const app = buildApp();
  const response = await request(app)
    .post('/api/v1/combat/session')
    .send({ seed: 'test-seed-1', max_rounds: 10 })
    .expect(200);

  const { session_id, initial_state } = response.body;
  assert.ok(session_id, 'la risposta deve contenere session_id');
  assert.ok(
    typeof session_id === 'string' && session_id.startsWith('combat-'),
    'session_id deve iniziare con combat-',
  );
  assert.ok(initial_state, 'la risposta deve contenere initial_state');
  assert.equal(initial_state.session_id, session_id);
  assert.equal(initial_state.seed, 'test-seed-1');
  assert.equal(initial_state.turn, 1);
  assert.ok(Array.isArray(initial_state.units), 'units deve essere un array');
  assert.ok(initial_state.units.length >= 2, 'devono esserci almeno 2 unit');
  assert.ok(Array.isArray(initial_state.initiative_order), 'initiative_order deve essere un array');
  assert.ok(initial_state.active_unit_id, 'active_unit_id deve essere presente');
  assert.deepEqual(initial_state.log, []);

  // Cleanup
  sessions.delete(session_id);
});

test('POST /api/v1/combat/action restituisce next_state e turn_log_entry', async () => {
  const app = buildApp();

  // Start a session first
  const startRes = await request(app)
    .post('/api/v1/combat/session')
    .send({ seed: 'action-test' })
    .expect(200);

  const { session_id } = startRes.body;

  // Send an action
  const actionRes = await request(app)
    .post('/api/v1/combat/action')
    .send({
      session_id,
      action: {
        type: 'attack',
        actor_id: 'party-alpha',
        target_id: 'hostile-01',
        ap_cost: 1,
      },
    })
    .expect(200);

  const { next_state, turn_log_entry } = actionRes.body;
  assert.ok(next_state, 'la risposta deve contenere next_state');
  assert.ok(turn_log_entry, 'la risposta deve contenere turn_log_entry');
  assert.equal(next_state.turn, 2, 'il turno deve avanzare');
  assert.ok(next_state.log.length > 0, 'il log deve contenere almeno una entry');
  assert.equal(turn_log_entry.action.type, 'attack');
  assert.equal(turn_log_entry.action.actor_id, 'party-alpha');
  assert.equal(turn_log_entry.action.target_id, 'hostile-01');
  assert.ok(typeof turn_log_entry.roll === 'object', 'roll deve essere un oggetto');
  assert.ok(
    typeof turn_log_entry.damage_applied === 'number',
    'damage_applied deve essere un numero',
  );

  // Cleanup
  sessions.delete(session_id);
});

test('POST /api/v1/combat/action ritorna 404 per sessione inesistente', async () => {
  const app = buildApp();

  const response = await request(app)
    .post('/api/v1/combat/action')
    .send({
      session_id: 'combat-nonexistent',
      action: { type: 'attack', actor_id: 'party-alpha', target_id: 'hostile-01', ap_cost: 1 },
    })
    .expect(404);

  assert.ok(response.body.error);
});

test('POST /api/v1/combat/action ritorna 400 senza action', async () => {
  const app = buildApp();

  const startRes = await request(app)
    .post('/api/v1/combat/session')
    .send({ seed: 'no-action-test' })
    .expect(200);

  const { session_id } = startRes.body;

  const response = await request(app)
    .post('/api/v1/combat/action')
    .send({ session_id })
    .expect(400);

  assert.ok(response.body.error);

  // Cleanup
  sessions.delete(session_id);
});

test('POST /api/v1/combat/session/:id/end restituisce final_state, winner e rounds_played', async () => {
  const app = buildApp();

  // Start a session
  const startRes = await request(app)
    .post('/api/v1/combat/session')
    .send({ seed: 'end-test' })
    .expect(200);

  const { session_id } = startRes.body;

  // Send an action to advance state
  await request(app)
    .post('/api/v1/combat/action')
    .send({
      session_id,
      action: { type: 'attack', actor_id: 'party-alpha', target_id: 'hostile-01', ap_cost: 1 },
    })
    .expect(200);

  // End the session
  const endRes = await request(app).post(`/api/v1/combat/session/${session_id}/end`).expect(200);

  const { final_state, winner, rounds_played } = endRes.body;
  assert.ok(final_state, 'la risposta deve contenere final_state');
  assert.ok(typeof winner === 'string', 'winner deve essere una stringa');
  assert.ok(['party', 'hostile'].includes(winner), 'winner deve essere party o hostile');
  assert.ok(typeof rounds_played === 'number', 'rounds_played deve essere un numero');
  assert.ok(rounds_played >= 2, 'devono essere passati almeno 2 turni');

  // Session should be removed from store
  assert.equal(sessions.has(session_id), false, 'la sessione deve essere rimossa dopo end');
});

test('POST /api/v1/combat/session/:id/end ritorna 404 per sessione inesistente', async () => {
  const app = buildApp();

  await request(app).post('/api/v1/combat/session/combat-nonexistent/end').expect(404);
});

test('POST /api/combat/session funziona anche senza prefisso v1', async () => {
  const app = buildApp();
  const response = await request(app)
    .post('/api/combat/session')
    .send({ seed: 'legacy-path' })
    .expect(200);

  assert.ok(response.body.session_id);
  sessions.delete(response.body.session_id);
});
