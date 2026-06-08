// Chronicle run_failed wiring integration -- SPEC-Q M-7 (A3 failure-as-lore).
// Ending a session in defeat appends a run_failed chronicle event (best-effort).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const { getChronicle } = require('../../apps/backend/services/chronicle/chronicleStore');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chron-wire-'));
}

test('session /end with defeat (wipe) appends run_failed to the campaign chronicle', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // player unit already dead -> elimination outcome = wipe
  const units = [
    { id: 'p1', controlled_by: 'player', hp: 0, max_hp: 10, position: { x: 0, y: 0 } },
    { id: 's1', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 5, y: 5 } },
  ];
  const start = await request(app)
    .post('/api/session/start')
    .send({ units, campaign_id: 'run_wire_test' });
  assert.equal(start.status, 200);

  const end = await request(app)
    .post('/api/session/end')
    .send({ session_id: start.body.session_id });
  assert.equal(end.status, 200);
  assert.equal(end.body.outcome, 'wipe');

  const chron = getChronicle('run_wire_test', { baseDir });
  assert.equal(chron.length, 1);
  assert.equal(chron[0].type, 'run_failed');
  assert.equal(chron[0].payload.outcome, 'wipe');
});

test('session /end with no campaign_id -> no chronicle event (no_campaign_id no-op)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = [
    { id: 'p1', controlled_by: 'player', hp: 0, max_hp: 10, position: { x: 0, y: 0 } },
    { id: 's1', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 5, y: 5 } },
  ];
  const start = await request(app).post('/api/session/start').send({ units });
  const end = await request(app)
    .post('/api/session/end')
    .send({ session_id: start.body.session_id });
  assert.equal(end.status, 200);
  // no campaign_id -> emitter no-op; no chronicle file written for any run
  assert.equal(fs.readdirSync(baseDir).length, 0);
});
