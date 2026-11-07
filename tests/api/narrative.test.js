// Integration tests: narrative engine (inkjs) — pattern I1/I2.
//
// Copre:
//   - GET /api/v1/narrative/stories → lista storie
//   - POST /start → avvia story, ritorna storyId + lines + choices
//   - POST /start senza storyFile → 400
//   - POST /choice → continua story
//   - POST /choice con storyId inesistente → 404
//   - POST /save → salva stato story
//   - Integration: tutorial briefing → combat → debrief

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/v1/narrative/stories lists available stories', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/v1/narrative/stories');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.stories));
  assert.ok(res.body.stories.includes('briefing_default.ink.json'));
});

test('POST /api/v1/narrative/start loads briefing story', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app)
    .post('/api/v1/narrative/start')
    .send({ storyFile: 'briefing_default.ink.json' });
  assert.equal(res.status, 200);
  assert.ok(res.body.storyId, 'should return storyId');
  assert.ok(Array.isArray(res.body.lines), 'should return lines');
  assert.ok(res.body.lines.length > 0, 'should have at least one line');
  assert.ok(Array.isArray(res.body.choices), 'should return choices');
  assert.equal(typeof res.body.ended, 'boolean');
});

test('POST /api/v1/narrative/start without storyFile returns 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).post('/api/v1/narrative/start').send({});
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test('POST /api/v1/narrative/choice advances story', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Start story
  const startRes = await request(app)
    .post('/api/v1/narrative/start')
    .send({ storyFile: 'briefing_default.ink.json' });
  assert.equal(startRes.status, 200);
  assert.ok(startRes.body.choices.length > 0, 'briefing should offer choices');

  // Make first choice
  const choiceRes = await request(app)
    .post('/api/v1/narrative/choice')
    .send({ storyId: startRes.body.storyId, choiceIndex: 0 });
  assert.equal(choiceRes.status, 200);
  assert.ok(Array.isArray(choiceRes.body.lines));
  assert.ok(choiceRes.body.lines.length > 0, 'choice should produce text');
});

test('POST /api/v1/narrative/choice with unknown storyId returns 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app)
    .post('/api/v1/narrative/choice')
    .send({ storyId: 'nonexistent-id', choiceIndex: 0 });
  assert.equal(res.status, 404);
});

test('POST /api/v1/narrative/save returns story state', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const startRes = await request(app)
    .post('/api/v1/narrative/start')
    .send({ storyFile: 'briefing_default.ink.json' });
  assert.equal(startRes.status, 200);

  const saveRes = await request(app)
    .post('/api/v1/narrative/save')
    .send({ storyId: startRes.body.storyId });
  assert.equal(saveRes.status, 200);
  assert.equal(saveRes.body.storyId, startRes.body.storyId);
  assert.ok(saveRes.body.stateJson, 'should return serialized state');
});

test('POST /api/v1/narrative/start with sessionData binds external functions', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app)
    .post('/api/v1/narrative/start')
    .send({
      storyFile: 'briefing_default.ink.json',
      sessionData: {
        units: [{ id: 'u1', species: 'Gulogluteus', hp: 100 }],
        vc: { aggression: 0.7 },
      },
    });
  assert.equal(res.status, 200);
  assert.ok(res.body.storyId);
  assert.ok(res.body.lines.length > 0);
});

test('narrative debrief story loads and runs', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app)
    .post('/api/v1/narrative/start')
    .send({
      storyFile: 'debrief_default.ink.json',
      sessionData: {
        units: [
          { id: 'p1', species: 'Gulogluteus', hp: 80 },
          { id: 'p2', species: 'Elastovaranus', hp: 0 },
        ],
        vc: { aggression: 0.8, cooperation: 0.5, exploration: 0.3 },
      },
    });
  assert.equal(res.status, 200);
  assert.ok(res.body.storyId);
  assert.ok(res.body.lines.length > 0, 'debrief should produce text');
});

test('integration: tutorial briefing → combat round → debrief', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // 1. Get tutorial scenario
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);

  // 2. Start combat session
  const sessionRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(sessionRes.status, 200, `session start failed: ${JSON.stringify(sessionRes.body)}`);
  const sid = sessionRes.body.session_id;

  // 3. Start briefing narrative
  const briefingRes = await request(app)
    .post('/api/v1/narrative/start')
    .send({ storyFile: 'briefing_default.ink.json' });
  assert.equal(briefingRes.status, 200);
  assert.ok(briefingRes.body.choices.length > 0);

  // 4. Player picks tactical approach
  const choiceRes = await request(app)
    .post('/api/v1/narrative/choice')
    .send({ storyId: briefingRes.body.storyId, choiceIndex: 0 });
  assert.equal(choiceRes.status, 200);

  // 5. End combat session
  const endRes = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(endRes.status, 200);

  // 6. Start debrief with session data
  const debriefRes = await request(app)
    .post('/api/v1/narrative/start')
    .send({
      storyFile: 'debrief_default.ink.json',
      sessionData: {
        units: sessionRes.body.state.units,
        vc: { aggression: 0.6 },
        session_id: sid,
      },
    });
  assert.equal(debriefRes.status, 200);
  assert.ok(debriefRes.body.lines.length > 0, 'debrief should produce narrative text');
});
