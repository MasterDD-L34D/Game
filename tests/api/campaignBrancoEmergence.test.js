// MA1 part 2 (ADR-2026-06-08) -- emergent branco trait wired into POST /campaign/start.
//
// The mechanism (brancoTraitEmergence) is unit-tested in tests/services. Here we
// verify the dormant plumb: when coopStore exposes a branco Form Pulse, /start
// emerges the shared branco trait (stored on the campaign + unioned into
// acquiredTraits); with no coopStore / no Form Pulse it stays dormant (null).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter } = require('../../apps/backend/routes/campaign');
const { _resetStore } = require('../../apps/backend/services/campaign/campaignStore');
const { _resetCache } = require('../../apps/backend/services/campaign/campaignLoader');

// coopStore stub: getFormPulses returns the seeded pulses for ANY campaign id
// (the real id is generated inside createCampaign, so the test cannot pre-seed it).
function startServer(t, coopStore) {
  _resetStore();
  _resetCache();
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter(coopStore ? { coopStore } : {}));
  const server = app.listen(0);
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: { 'content-type': 'application/json' },
      },
      (res) => {
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
      },
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('POST /campaign/start: Form Pulse leaning swarm -> emergent branco trait stored + unioned', async (t) => {
  const coopStore = {
    getFormPulses: () => ({
      p1: { axes: { solitary_swarm: 0.6 } },
      p2: { axes: { solitary_swarm: 0.5 } },
    }),
  };
  const url = startServer(t, coopStore);
  const res = await request('POST', `${url}/api/campaign/start`, { player_id: 'branco_swarm' });
  assert.equal(res.status, 201);
  const c = res.body.campaign;
  assert.ok(c.emergentBrancoTrait, 'emergentBrancoTrait should be set');
  assert.equal(c.emergentBrancoTrait.axis, 'solitary_swarm');
  assert.equal(c.emergentBrancoTrait.pole, '+');
  assert.ok(
    typeof c.emergentBrancoTrait.trait_id === 'string' && c.emergentBrancoTrait.trait_id.length,
  );
  assert.ok(
    c.acquiredTraits.includes(c.emergentBrancoTrait.trait_id),
    'emergent trait_id unioned into acquiredTraits (shared branco)',
  );
});

test('POST /campaign/start: indecisive branco (pulses cancel) -> dormant (null)', async (t) => {
  const coopStore = {
    getFormPulses: () => ({
      p1: { axes: { solitary_swarm: 0.6 } },
      p2: { axes: { solitary_swarm: -0.6 } }, // avg 0 < threshold
    }),
  };
  const url = startServer(t, coopStore);
  const res = await request('POST', `${url}/api/campaign/start`, { player_id: 'branco_split' });
  assert.equal(res.status, 201);
  assert.equal(res.body.campaign.emergentBrancoTrait, null);
});

test('POST /campaign/start: no coopStore -> dormant (null), per-creature traits only', async (t) => {
  const url = startServer(t, null);
  const res = await request('POST', `${url}/api/campaign/start`, { player_id: 'branco_none' });
  assert.equal(res.status, 201);
  assert.equal(res.body.campaign.emergentBrancoTrait, null);
});
