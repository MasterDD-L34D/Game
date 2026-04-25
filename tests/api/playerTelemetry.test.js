// CAP-12 — Test API PlayerRunTelemetry endpoint.
// In-memory fallback (no DATABASE_URL): copertura completa.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createPlayerTelemetryRouter } = require('../../apps/backend/routes/playerTelemetry');
const store = require('../../apps/backend/services/telemetry/playerRunTelemetryStore');

function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', createPlayerTelemetryRouter());
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: data
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
          : {},
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null });
          } catch (e) {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('POST /api/v1/player/:playerId/telemetry — happy path victory', async (t) => {
  store._resetForTests();
  const { server, port } = await startServer();
  t.after(() => server.close());

  const r = await request(port, 'POST', '/api/v1/player/u_alpha/telemetry', {
    unitId: 'unit_42',
    runId: 'run_xyz',
    campaignId: 'camp_1',
    vcSnapshot: {
      per_actor: { unit_42: { raw_metrics: { attacks: 5 }, mbti_axes: { E_I: 0.7 } } },
      meta: { events_count: 12 },
    },
    selectedForm: 'intj_stratega',
    outcome: 'victory',
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.ok, true);
  assert.ok(r.body.row.id);
  assert.equal(r.body.row.player_id, 'u_alpha');
  assert.equal(r.body.row.outcome, 'victory');
  assert.equal(r.body.row.selected_form, 'intj_stratega');
  assert.deepEqual(r.body.row.vc_snapshot.meta, { events_count: 12 });
});

test('POST telemetry — missing required fields → 400', async (t) => {
  store._resetForTests();
  const { server, port } = await startServer();
  t.after(() => server.close());

  const r = await request(port, 'POST', '/api/v1/player/u_alpha/telemetry', {
    // missing unitId, runId, vcSnapshot
    outcome: 'victory',
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.match(r.body.error, /required/);
});

test('POST telemetry — invalid outcome → 400', async (t) => {
  store._resetForTests();
  const { server, port } = await startServer();
  t.after(() => server.close());

  const r = await request(port, 'POST', '/api/v1/player/u_alpha/telemetry', {
    unitId: 'unit_42',
    runId: 'run_xyz',
    vcSnapshot: {},
    outcome: 'CHEATED',
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /invalid outcome/);
});

test('GET /api/v1/player/:id/telemetry — listByPlayer ordered desc', async (t) => {
  store._resetForTests();
  const { server, port } = await startServer();
  t.after(() => server.close());

  // 3 entries diversi per stesso player
  for (let i = 0; i < 3; i++) {
    await request(port, 'POST', '/api/v1/player/u_beta/telemetry', {
      unitId: `unit_${i}`,
      runId: `run_${i}`,
      vcSnapshot: { per_actor: {}, meta: { i } },
      outcome: 'victory',
    });
    // Piccolo delay per ordering deterministic
    await new Promise((r) => setTimeout(r, 5));
  }

  const r = await request(port, 'GET', '/api/v1/player/u_beta/telemetry');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 3);
  assert.equal(r.body.rows.length, 3);
  // Più recente primo
  assert.equal(r.body.rows[0].run_id, 'run_2');
  assert.equal(r.body.rows[2].run_id, 'run_0');
});

test('GET /api/v1/player/:id/telemetry — limit query param respected', async (t) => {
  store._resetForTests();
  const { server, port } = await startServer();
  t.after(() => server.close());

  for (let i = 0; i < 5; i++) {
    await request(port, 'POST', '/api/v1/player/u_gamma/telemetry', {
      unitId: 'u',
      runId: `r${i}`,
      vcSnapshot: {},
      outcome: 'defeat',
    });
  }

  const r = await request(port, 'GET', '/api/v1/player/u_gamma/telemetry?limit=2');
  assert.equal(r.body.count, 2);
});

test('GET /api/v1/run/:runId/telemetry — listByRun (4 player same run)', async (t) => {
  store._resetForTests();
  const { server, port } = await startServer();
  t.after(() => server.close());

  // 4 player nello stesso run
  for (const p of ['u_p1', 'u_p2', 'u_p3', 'u_p4']) {
    await request(port, 'POST', `/api/v1/player/${p}/telemetry`, {
      unitId: `unit_${p}`,
      runId: 'run_shared',
      vcSnapshot: { per_actor: {}, meta: {} },
      outcome: 'victory',
    });
  }

  const r = await request(port, 'GET', '/api/v1/run/run_shared/telemetry');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 4);
  const playerIds = r.body.rows.map((row) => row.player_id).sort();
  assert.deepEqual(playerIds, ['u_p1', 'u_p2', 'u_p3', 'u_p4']);
});

test('vcSnapshot accepted as JSON object or stringified', async (t) => {
  store._resetForTests();
  const { server, port } = await startServer();
  t.after(() => server.close());

  // As object
  let r = await request(port, 'POST', '/api/v1/player/u_obj/telemetry', {
    unitId: 'u',
    runId: 'r1',
    vcSnapshot: { meta: { type: 'object' } },
  });
  assert.equal(r.body.row.vc_snapshot.meta.type, 'object');

  // As string
  r = await request(port, 'POST', '/api/v1/player/u_obj/telemetry', {
    unitId: 'u',
    runId: 'r2',
    vcSnapshot: JSON.stringify({ meta: { type: 'string' } }),
  });
  assert.equal(r.body.row.vc_snapshot.meta.type, 'string');
});
