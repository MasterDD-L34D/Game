// Verifica auto-log tutorial_start + tutorial_complete in logs/telemetry_YYYYMMDD.jsonl
// via session.js hooks (agent telemetry-viz-illuminator P0 #2).
//
// Contract: quando /session/start riceve scenario_id matching `/^enc_tutorial_\d+/`,
// append entry `tutorial_start` al JSONL. /session/end stesso scenario → `tutorial_complete`.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

function todayYyyymmdd() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

async function readTelemetryJsonl(logsDir) {
  const file = path.join(logsDir, `telemetry_${todayYyyymmdd()}.jsonl`);
  try {
    const content = await fs.readFile(file, 'utf8');
    return content
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

async function mkTempLogsDir() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'evo-telemetry-'));
  return tmp;
}

test('/session/start con tutorial scenario emette tutorial_start al telemetry JSONL', async () => {
  const logsDir = await mkTempLogsDir();
  const { app, close } = createApp({ databasePath: null, session: { logsDir } });
  try {
    const scenarioRes = await request(app).get('/api/tutorial/enc_tutorial_01').expect(200);
    await request(app)
      .post('/api/session/start')
      .send({
        scenario_id: 'enc_tutorial_01',
        units: scenarioRes.body.units,
      })
      .expect(200);
    // Allow async append to flush (non-blocking helper).
    await new Promise((r) => setTimeout(r, 50));
    const events = await readTelemetryJsonl(logsDir);
    const tutorialStart = events.find((e) => e.type === 'tutorial_start');
    assert.ok(tutorialStart, 'tutorial_start event deve essere presente');
    assert.equal(tutorialStart.payload?.scenario_id, 'enc_tutorial_01');
    assert.equal(tutorialStart.payload?.party_size, 2);
    assert.ok(tutorialStart.ts, 'timestamp presente');
    assert.ok(tutorialStart.session_id, 'session_id presente');
  } finally {
    await close();
  }
});

test('/session/end con tutorial scenario emette tutorial_complete + outcome', async () => {
  const logsDir = await mkTempLogsDir();
  const { app, close } = createApp({ databasePath: null, session: { logsDir } });
  try {
    const scenarioRes = await request(app).get('/api/tutorial/enc_tutorial_01').expect(200);
    const startRes = await request(app)
      .post('/api/session/start')
      .send({ scenario_id: 'enc_tutorial_01', units: scenarioRes.body.units })
      .expect(200);
    const sid = startRes.body.session_id;
    await request(app).post('/api/session/end').send({ session_id: sid }).expect(200);
    await new Promise((r) => setTimeout(r, 50));
    const events = await readTelemetryJsonl(logsDir);
    const tutorialComplete = events.find((e) => e.type === 'tutorial_complete');
    assert.ok(tutorialComplete, 'tutorial_complete event deve essere presente');
    assert.equal(tutorialComplete.payload?.scenario_id, 'enc_tutorial_01');
    assert.ok(
      ['win', 'wipe', 'draw', 'abandon'].includes(tutorialComplete.payload?.outcome),
      `outcome valido: ${tutorialComplete.payload?.outcome}`,
    );
  } finally {
    await close();
  }
});

test('/session/start con scenario non-tutorial NON emette tutorial_start', async () => {
  const logsDir = await mkTempLogsDir();
  const { app, close } = createApp({ databasePath: null, session: { logsDir } });
  try {
    await request(app)
      .post('/api/session/start')
      .send({
        scenario_id: 'custom_encounter_xyz',
        units: [{ id: 'u1', controlled_by: 'player', hp: 10 }],
      })
      .expect(200);
    await new Promise((r) => setTimeout(r, 50));
    const events = await readTelemetryJsonl(logsDir);
    const tutorialEvents = events.filter((e) => e.type === 'tutorial_start');
    assert.equal(
      tutorialEvents.length,
      0,
      'non deve emettere tutorial_start per scenario non-tutorial',
    );
  } finally {
    await close();
  }
});

test('/session/start senza scenario_id NON emette tutorial_start', async () => {
  const logsDir = await mkTempLogsDir();
  const { app, close } = createApp({ databasePath: null, session: { logsDir } });
  try {
    await request(app)
      .post('/api/session/start')
      .send({ units: [{ id: 'u1', controlled_by: 'player', hp: 10 }] })
      .expect(200);
    await new Promise((r) => setTimeout(r, 50));
    const events = await readTelemetryJsonl(logsDir);
    const tutorialEvents = events.filter((e) => e.type === 'tutorial_start');
    assert.equal(tutorialEvents.length, 0, 'scenario_id null → no tutorial_start');
  } finally {
    await close();
  }
});
