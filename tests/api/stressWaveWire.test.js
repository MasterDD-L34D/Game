// SPEC-I ER6 -- wire integration: flag ON, la wave del bioma cresce col turno
// e al crossing della soglia rescue il soccorso scatta one-shot (heal player
// + telegraph nello state). Flag OFF (default) -> nessun campo, nessun effetto.
'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

// abisso_vulcanico: baseline 0.36, escalation 0.06 -> rescue (0.58) at turn 4.
const BIOME = 'abisso_vulcanico';

function units() {
  return [
    { id: 'p1', controlled_by: 'player', hp: 4, max_hp: 10, position: { x: 0, y: 0 } },
    { id: 'e1', controlled_by: 'sistema', hp: 30, max_hp: 30, position: { x: 5, y: 5 } },
  ];
}

async function startSession(app) {
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: units(), biome_id: BIOME })
    .expect(200);
  return res.body.session_id;
}

async function advanceTurns(app, sessionId, n) {
  for (let i = 0; i < n; i += 1) {
    await request(app).post('/api/session/turn/end').send({ session_id: sessionId });
  }
}

test('ER6 flag ON: rescue fires at threshold -> player healed + state telegraph', async (t) => {
  process.env.STRESSWAVE_EVENTS_ENABLED = 'true';
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    delete process.env.STRESSWAVE_EVENTS_ENABLED;
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sessionId = await startSession(app);
  await advanceTurns(app, sessionId, 8);

  const st = await request(app).get('/api/session/state').query({ session_id: sessionId });
  assert.ok(
    st.body.stresswave_event,
    `expected stresswave_event in state: ${JSON.stringify(st.body.stresswave_event)}`,
  );
  const p1 = st.body.units.find((u) => u.id === 'p1');
  assert.ok(p1.hp > 4, `expected p1 healed above 4, got ${p1.hp}`);
});

test('ER6 flag OFF (default): no stresswave_event, no heal', async (t) => {
  delete process.env.STRESSWAVE_EVENTS_ENABLED;
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sessionId = await startSession(app);
  await advanceTurns(app, sessionId, 8);

  const st = await request(app).get('/api/session/state').query({ session_id: sessionId });
  assert.equal(st.body.stresswave_event, null);
  const p1 = st.body.units.find((u) => u.id === 'p1');
  assert.ok(p1.hp <= 4, `expected p1 untouched (<=4 with possible bleed), got ${p1.hp}`);
});
