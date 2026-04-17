// =============================================================================
// HAZARD WIRING — verifica che hazard_tiles applichi danno a fine turno
//
// enc_tutorial_03 ha fumarole tossiche a (2,2) e (3,3). Quando una unita'
// termina il turno su un tile hazard, hp -= damage.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('Hazard: enc_tutorial_03 esposto in tutorial loader', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/tutorial/enc_tutorial_03');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'enc_tutorial_03');
  assert.equal(res.body.difficulty_rating, 3);
  assert.ok(Array.isArray(res.body.hazard_tiles), 'hazard_tiles array');
  assert.equal(res.body.hazard_tiles.length, 2);
  assert.equal(res.body.hazard_tiles[0].type, 'fumarole_tossica');
});

test('Hazard: tile damage applied at turn end', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_03');
  // Posiziona p_scout direttamente su tile hazard (2,2) prima di /start
  const units = scenario.body.units.map((u) =>
    u.id === 'p_scout' ? { ...u, position: { x: 2, y: 2 } } : u,
  );

  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units, hazard_tiles: scenario.body.hazard_tiles });
  assert.equal(startRes.status, 200);
  const sid = startRes.body.session_id;

  const stateBefore = await request(app).get('/api/session/state').query({ session_id: sid });
  const scoutBefore = stateBefore.body.units.find((u) => u.id === 'p_scout');
  assert.equal(scoutBefore.hp, 10, 'scout starts at full HP');

  // Trigger turn/end senza nessuna azione → hazard fires
  const turnRes = await request(app).post('/api/session/turn/end').send({ session_id: sid });
  assert.equal(turnRes.status, 200);
  assert.ok(Array.isArray(turnRes.body.hazard_events), 'hazard_events array in response');
  const scoutHazard = turnRes.body.hazard_events.find((h) => h.unit_id === 'p_scout');
  assert.ok(scoutHazard, 'p_scout should have hazard event');
  assert.equal(scoutHazard.hazard_type, 'fumarole_tossica');
  assert.equal(scoutHazard.damage, 1);

  const stateAfter = await request(app).get('/api/session/state').query({ session_id: sid });
  const scoutAfter = stateAfter.body.units.find((u) => u.id === 'p_scout');
  assert.equal(scoutAfter.hp, 9, 'scout HP should drop by 1 from hazard');
});

test('Hazard: no damage when no unit on hazard tiles', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_03');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, hazard_tiles: scenario.body.hazard_tiles });
  const sid = startRes.body.session_id;

  // Nessuna unita' parte su tile hazard (default positions: 0,1 / 0,4 / 4,1 / 4,4)
  const turnRes = await request(app).post('/api/session/turn/end').send({ session_id: sid });
  assert.equal(turnRes.status, 200);
  assert.equal(turnRes.body.hazard_events.length, 0, 'no hazard events when no unit on tile');
});
