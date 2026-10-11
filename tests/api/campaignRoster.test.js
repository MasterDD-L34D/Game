// N2 roster-display -- GET /api/campaign/roster read route. Empty-safe (no DB
// in CI -> rosterStore returns []); 400 on missing campaign_id.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter } = require('../../apps/backend/routes/campaign');

function startServer(t) {
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  const server = app.listen(0);
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET' },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

test('GET roster returns { roster: [] } for an unknown/fresh campaign', async (t) => {
  const base = startServer(t);
  const res = await get(`${base}/api/campaign/roster?campaign_id=run_fresh`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { roster: [] });
});

test('GET roster 400 without campaign_id', async (t) => {
  const base = startServer(t);
  const res = await get(`${base}/api/campaign/roster`);
  assert.equal(res.status, 400);
});
