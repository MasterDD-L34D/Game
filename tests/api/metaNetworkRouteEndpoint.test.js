// TKT-WORLDGEN-GAPC MVP fase 1 — GET /api/campaign/meta-network/next endpoint.
// Read-only diagnostic surface (Gate-5): proves the resolver + routing are
// reachable end-to-end via HTTP, flag-gated OFF by default (band-safe).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter } = require('../../apps/backend/routes/campaign');

function startTestServer(t) {
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return `http://127.0.0.1:${port}`;
}

function get(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let body = null;
          try {
            body = JSON.parse(data);
          } catch {
            body = data;
          }
          resolve({ status: res.statusCode, body });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

test('meta-network/next: flag OFF by default -> enabled:false, no candidates', async (t) => {
  delete process.env.META_NETWORK_ROUTING;
  const url = startTestServer(t);
  const r = await get(`${url}/api/campaign/meta-network/next?from=BADLANDS`);
  assert.equal(r.status, 200);
  assert.equal(r.body.enabled, false);
  assert.equal(r.body.reason, 'flag_off');
  assert.deepEqual(r.body.candidates, []);
});

test('meta-network/next: flag ON -> eligible candidates from the real alpha graph', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);
  const r = await get(`${url}/api/campaign/meta-network/next?from=BADLANDS`);
  assert.equal(r.status, 200);
  assert.equal(r.body.enabled, true);
  assert.equal(r.body.network_id, 'ET_NET_ALPHA');
  assert.equal(r.body.from, 'BADLANDS');
  assert.ok(Array.isArray(r.body.candidates) && r.body.candidates.length >= 2);
  const targets = r.body.candidates.map((c) => c.node_id);
  assert.ok(targets.includes('FORESTA_TEMPERATA'));
  assert.ok(targets.includes('DESERTO_CALDO'));
  // preview fields present
  const first = r.body.candidates[0];
  assert.ok(
    'biome_id' in first && 'weight' in first && 'edge_type' in first && 'resistance' in first,
  );
});

test('meta-network/next: flag ON + cleared filters a visited node', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);
  const r = await get(
    `${url}/api/campaign/meta-network/next?from=BADLANDS&cleared=FORESTA_TEMPERATA`,
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.enabled, true);
  const targets = r.body.candidates.map((c) => c.node_id);
  assert.ok(!targets.includes('FORESTA_TEMPERATA'), 'cleared node excluded');
  assert.ok(r.body.excluded.includes('FORESTA_TEMPERATA'));
});

test('meta-network/next: flag ON + allow_revisit keeps cleared node', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);
  const r = await get(
    `${url}/api/campaign/meta-network/next?from=BADLANDS&cleared=FORESTA_TEMPERATA&allow_revisit=1`,
  );
  assert.equal(r.status, 200);
  const targets = r.body.candidates.map((c) => c.node_id);
  assert.ok(targets.includes('FORESTA_TEMPERATA'), 'revisit allowed');
});

test('meta-network/next: flag ON + missing from -> 400', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);
  const r = await get(`${url}/api/campaign/meta-network/next`);
  assert.equal(r.status, 400);
});

test('meta-network/next: flag ON + unknown node -> applied:false no_node (back-compat)', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);
  const r = await get(`${url}/api/campaign/meta-network/next?from=GHOST`);
  assert.equal(r.status, 200);
  assert.equal(r.body.applied, false);
  assert.equal(r.body.reason, 'no_node');
});

// Fase 2 (arc-conditions, Stage 1, ADR-2026-05-31): the FORESTA_TEMPERATA ->
// CRYOSTEPPE seasonal_bridge is gated `season: [winter]` in the real alpha graph.
// The ?season= query param feeds the evaluator end-to-end (Gate-5 surface).
test('meta-network/next: season=winter opens the winter seasonal_bridge', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);
  const r = await get(`${url}/api/campaign/meta-network/next?from=FORESTA_TEMPERATA&season=winter`);
  assert.equal(r.status, 200);
  const targets = r.body.candidates.map((c) => c.node_id);
  assert.ok(targets.includes('CRYOSTEPPE'), 'winter -> CRYOSTEPPE bridge eligible');
});

test('meta-network/next: season=summer locks the winter bridge (blocked surfaced)', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);
  const r = await get(`${url}/api/campaign/meta-network/next?from=FORESTA_TEMPERATA&season=summer`);
  assert.equal(r.status, 200);
  const targets = r.body.candidates.map((c) => c.node_id);
  assert.ok(!targets.includes('CRYOSTEPPE'), 'summer -> CRYOSTEPPE bridge locked');
  assert.ok(
    Array.isArray(r.body.blocked) &&
      r.body.blocked.some((b) => b.node_id === 'CRYOSTEPPE' && b.blocked_by === 'season'),
    'CRYOSTEPPE blocked_by season surfaced',
  );
});
