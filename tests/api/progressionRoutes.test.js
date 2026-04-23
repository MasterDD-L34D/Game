// M13 P3 — progression routes integration tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createProgressionRouter } = require('../../apps/backend/routes/progression');

function startTestServer(t) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/progression', createProgressionRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return { port, url: `http://127.0.0.1:${port}` };
}

function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'content-type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsedBody = null;
        try {
          parsedBody = data ? JSON.parse(data) : null;
        } catch {
          parsedBody = data;
        }
        resolve({ status: res.statusCode, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('GET /registry exposes thresholds + jobs', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/v1/progression/registry`);
  assert.equal(res.status, 200);
  assert.equal(res.body.xp_max_level, 7);
  assert.equal(res.body.jobs.length, 7);
  assert.equal(res.body.xp_thresholds[2], 10);
});

test('GET /jobs/:jobId/perks 200 + 404 for unknown', async (t) => {
  const { url } = startTestServer(t);
  const ok = await request('GET', `${url}/api/v1/progression/jobs/skirmisher/perks`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.job_id, 'skirmisher');
  assert.ok(ok.body.perks.level_2);

  const miss = await request('GET', `${url}/api/v1/progression/jobs/nope/perks`);
  assert.equal(miss.status, 404);
});

test('POST /seed creates unit progression', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/v1/progression/u1/seed`, {
    job: 'skirmisher',
    xp_total: 10,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.unit_id, 'u1');
  assert.equal(res.body.level, 2);
});

test('POST /seed: unknown job = 400', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/v1/progression/u1/seed`, { job: 'nope' });
  assert.equal(res.status, 400);
});

test('POST /xp grants + levels up + returns pending', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/progression/u1/seed`, { job: 'vanguard' });
  const grant = await request('POST', `${url}/api/v1/progression/u1/xp`, { amount: 50 });
  assert.equal(grant.status, 200);
  assert.equal(grant.body.delta.leveled_up, true);
  assert.equal(grant.body.delta.level_after, 4);
  assert.equal(grant.body.pending_level_ups.length, 3);
});

test('POST /pick validates + persists', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/progression/u1/seed`, { job: 'warden' });
  await request('POST', `${url}/api/v1/progression/u1/xp`, { amount: 25 });
  const pick = await request('POST', `${url}/api/v1/progression/u1/pick`, {
    level: 2,
    choice: 'a',
  });
  assert.equal(pick.status, 200);
  assert.equal(pick.body.picked_perk.id, 'wa_r1_healer');

  const dup = await request('POST', `${url}/api/v1/progression/u1/pick`, {
    level: 2,
    choice: 'b',
  });
  assert.equal(dup.status, 409);
});

test('POST /pick: invalid choice = 400', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/progression/u1/seed`, { job: 'ranger' });
  await request('POST', `${url}/api/v1/progression/u1/xp`, { amount: 25 });
  const res = await request('POST', `${url}/api/v1/progression/u1/pick`, {
    level: 2,
    choice: 'x',
  });
  assert.equal(res.status, 400);
});

test('GET /:unitId/effective returns stats + passives + mods', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/progression/u1/seed`, { job: 'artificer' });
  await request('POST', `${url}/api/v1/progression/u1/xp`, { amount: 50 });
  await request('POST', `${url}/api/v1/progression/u1/pick`, { level: 2, choice: 'b' }); // precision → +1 attack_range
  await request('POST', `${url}/api/v1/progression/u1/pick`, { level: 4, choice: 'a' }); // engineer → +1 ap
  const res = await request('GET', `${url}/api/v1/progression/u1/effective`);
  assert.equal(res.status, 200);
  assert.equal(res.body.stats.attack_range, 1);
  assert.equal(res.body.stats.ap, 1);
  assert.equal(res.body.level, 4);
});

test('GET /:unitId 404 when not seeded', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/v1/progression/nope`);
  assert.equal(res.status, 404);
});

test('DELETE /campaign/:id clears scope only', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/progression/u1/seed`, {
    job: 'harvester',
    campaign_id: 'c1',
  });
  await request('POST', `${url}/api/v1/progression/u2/seed`, {
    job: 'skirmisher',
    campaign_id: 'c2',
  });
  const clear = await request('DELETE', `${url}/api/v1/progression/campaign/c1`);
  assert.equal(clear.status, 200);
  assert.equal(clear.body.removed, 1);
  const gone = await request('GET', `${url}/api/v1/progression/u1?campaign_id=c1`);
  assert.equal(gone.status, 404);
  const kept = await request('GET', `${url}/api/v1/progression/u2?campaign_id=c2`);
  assert.equal(kept.status, 200);
});

test('campaign scope isolation: same unit_id in different campaigns', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/v1/progression/u1/seed`, {
    job: 'skirmisher',
    campaign_id: 'cA',
  });
  await request('POST', `${url}/api/v1/progression/u1/seed`, {
    job: 'vanguard',
    campaign_id: 'cB',
  });
  const a = await request('GET', `${url}/api/v1/progression/u1?campaign_id=cA`);
  const b = await request('GET', `${url}/api/v1/progression/u1?campaign_id=cB`);
  assert.equal(a.body.job, 'skirmisher');
  assert.equal(b.body.job, 'vanguard');
});
