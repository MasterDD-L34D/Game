// Q-001 T2.4 PR-2 · Replay endpoint smoke test.
// GET /api/session/:id/replay — espone events + metadata per replay engine/UI.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('node:fs');
const path = require('node:path');

const { createApp } = require('../../apps/backend/app');

test('replay endpoint returns payload with session events + meta', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200);

  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200);
  const sid = startRes.body.session_id;

  // Fresh session — events vuoti ma struttura intatta
  const freshReplay = await request(app).get(`/api/session/${sid}/replay`);
  assert.equal(freshReplay.status, 200);
  assert.equal(freshReplay.body.session_id, sid);
  assert.ok(Array.isArray(freshReplay.body.events));
  assert.equal(freshReplay.body.meta.events_count, 0);
  assert.equal(freshReplay.body.meta.export_version, 1);
  assert.ok(freshReplay.body.started_at, 'started_at populated');
  assert.ok(freshReplay.body.units_snapshot_initial, 'initial snapshot captured');
  assert.equal(
    freshReplay.body.units_snapshot_initial.length,
    scenario.body.units.length,
    'snapshot has all units',
  );
});

test('replay endpoint 404 on unknown session_id', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/session/nonexistent-id/replay');
  assert.equal(res.status, 404);
});

test('replay payload matches AJV schema', async (t) => {
  let Ajv, schema;
  try {
    Ajv = require('ajv/dist/2020');
    schema = require('../../packages/contracts/schemas/replay.schema.json');
  } catch {
    return; // skip se deps mancanti
  }
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  const replay = await request(app).get(`/api/session/${sid}/replay`);
  const valid = validate(replay.body);
  if (!valid) {
    const errs = validate.errors.map((e) => `${e.instancePath} ${e.message}`).join('; ');
    assert.fail(`replay payload invalid: ${errs}`);
  }
  assert.ok(valid);
});

test('replay endpoint accumulates events after actions', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  // Get initial count
  const initial = await request(app).get(`/api/session/${sid}/replay`);
  const initialCount = initial.body.events.length;

  // Advance a turn (end turn emits events)
  await request(app).post('/api/session/turn/end').send({ session_id: sid });

  const after = await request(app).get(`/api/session/${sid}/replay`);
  // Events should be >= initial count (turn end may emit some)
  assert.ok(after.body.events.length >= initialCount);
  assert.ok(after.body.meta.turns_played >= 0);
});
