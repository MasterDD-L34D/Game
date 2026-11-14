// M13 P6 — hardcore scenario + mission timer integration tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const {
  HARDCORE_SCENARIO_06,
  HARDCORE_SCENARIO_07_POD_RUSH,
  buildHardcoreUnits07,
} = require('../../apps/backend/services/hardcoreScenario');

function startTutorialServer(t) {
  const { createTutorialRouter } = require('../../apps/backend/routes/tutorial');
  const app = express();
  app.use(express.json());
  app.use('/api/tutorial', createTutorialRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return { url: `http://127.0.0.1:${port}` };
}

function get(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    http
      .get(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        },
      )
      .on('error', reject);
  });
}

test('HARDCORE_SCENARIO_06 exports mission_timer iter3', () => {
  assert.ok(HARDCORE_SCENARIO_06.mission_timer);
  assert.equal(HARDCORE_SCENARIO_06.mission_timer.enabled, true);
  assert.equal(HARDCORE_SCENARIO_06.mission_timer.turn_limit, 15);
  assert.equal(HARDCORE_SCENARIO_06.mission_timer.on_expire, 'escalate_pressure');
  assert.equal(HARDCORE_SCENARIO_06.mission_timer.on_expire_payload.pressure_delta, 30);
});

test('HARDCORE_SCENARIO_07 pod_rush: timer + reinforcement policy wired', () => {
  // M14-C iter2 (2026-04-25 sera): turn_limit 10→8, max_spawns 6→8, cooldown 1→0,
  // min_distance 4→2 dopo N=10 iter1 90% WR (target 30-50%).
  assert.equal(HARDCORE_SCENARIO_07_POD_RUSH.mission_timer.turn_limit, 8);
  assert.equal(HARDCORE_SCENARIO_07_POD_RUSH.mission_timer.on_expire, 'escalate_pressure');
  assert.equal(HARDCORE_SCENARIO_07_POD_RUSH.reinforcement_policy.enabled, true);
  assert.equal(HARDCORE_SCENARIO_07_POD_RUSH.reinforcement_policy.max_total_spawns, 8);
  assert.equal(HARDCORE_SCENARIO_07_POD_RUSH.reinforcement_policy.cooldown_rounds, 0);
  assert.equal(HARDCORE_SCENARIO_07_POD_RUSH.reinforcement_policy.min_distance_from_pg, 2);
  assert.ok(HARDCORE_SCENARIO_07_POD_RUSH.reinforcement_pool.length >= 2);
  assert.ok(HARDCORE_SCENARIO_07_POD_RUSH.reinforcement_entry_tiles.length >= 2);
});

test('buildHardcoreUnits07: 4p quartet + 4 initial enemies (M14-C iter1)', () => {
  const units = buildHardcoreUnits07();
  const players = units.filter((u) => u.controlled_by === 'player');
  const enemies = units.filter((u) => u.controlled_by === 'sistema');
  assert.equal(players.length, 4);
  // M14-C iter1: 3→4 initial (+1 predone scout_3) per anticipare pressure
  // vs iter0 100% greedy win (reinforcement mai triggerato).
  assert.equal(enemies.length, 4);
  // Party composition: skirmisher + ranger + vanguard + warden.
  const jobs = players.map((p) => p.job).sort();
  assert.deepEqual(jobs, ['ranger', 'skirmisher', 'vanguard', 'warden']);
});

test('GET /api/tutorial/enc_tutorial_07_hardcore_pod_rush serves scenario', async (t) => {
  const { url } = startTutorialServer(t);
  const res = await get(`${url}/api/tutorial/enc_tutorial_07_hardcore_pod_rush`);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'enc_tutorial_07_hardcore_pod_rush');
  assert.ok(res.body.mission_timer);
  assert.equal(res.body.mission_timer.turn_limit, 8); // M14-C iter2
  assert.equal(res.body.units.length, 8); // 4 player + 4 initial enemy (iter1+2)
});

test('GET /api/tutorial/enc_tutorial_06_hardcore now includes mission_timer', async (t) => {
  const { url } = startTutorialServer(t);
  const res = await get(`${url}/api/tutorial/enc_tutorial_06_hardcore`);
  assert.equal(res.status, 200);
  assert.equal(res.body.mission_timer.turn_limit, 15);
  assert.equal(res.body.mission_timer.on_expire, 'escalate_pressure');
});
