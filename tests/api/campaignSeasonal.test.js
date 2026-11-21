// TKT-P2 Brigandine seasonal — Phase C routes integration tests.
//
// Cover 6 endpoints: state, advance-phase, advance-season, modifiers,
// phase-spec, events. State storage in-memory Map (POC).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter, _resetSeasonalState } = require('../../apps/backend/routes/campaign');
const { _resetCache } = require('../../apps/backend/services/campaign/seasonalContentLoader');

function startTestServer(t) {
  _resetSeasonalState();
  _resetCache();
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return { url: `http://127.0.0.1:${port}` };
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
        } catch (e) {
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

test('GET /api/campaign/seasonal/state: returns initial year 1 spring organization', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/seasonal/state?campaign_id=c1`);
  assert.equal(res.status, 200);
  assert.equal(res.body.campaign_id, 'c1');
  assert.equal(res.body.state.current_year, 1);
  assert.equal(res.body.state.current_season, 'spring');
  assert.equal(res.body.state.current_phase, 'organization');
  assert.equal(res.body.state.season_index, 0);
});

test('GET /api/campaign/seasonal/state: missing campaign_id = 400', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/seasonal/state`);
  assert.equal(res.status, 400);
});

test('POST /api/campaign/seasonal/advance-phase: organization → battle (same season)', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/seasonal/advance-phase`, {
    campaign_id: 'c1',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.current_phase, 'battle');
  assert.equal(res.body.state.current_season, 'spring');
  assert.equal(res.body.state.current_year, 1);
});

test('POST /api/campaign/seasonal/advance-phase: battle → organization + next season', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/campaign/seasonal/advance-phase`, { campaign_id: 'c1' });
  const res = await request('POST', `${url}/api/campaign/seasonal/advance-phase`, {
    campaign_id: 'c1',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.current_phase, 'organization');
  assert.equal(res.body.state.current_season, 'summer');
  assert.equal(res.body.state.current_year, 1);
});

test('POST /api/campaign/seasonal/advance-season: spring → summer', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/seasonal/advance-season`, {
    campaign_id: 'c1',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.state.current_season, 'summer');
  assert.equal(res.body.state.season_index, 1);
  assert.equal(res.body.state.current_year, 1);
});

test('POST /api/campaign/seasonal/advance-season: winter → spring + year++', async (t) => {
  const { url } = startTestServer(t);
  // Advance 4 seasons to wrap.
  for (let i = 0; i < 4; i += 1) {
    await request('POST', `${url}/api/campaign/seasonal/advance-season`, { campaign_id: 'c1' });
  }
  const res = await request('GET', `${url}/api/campaign/seasonal/state?campaign_id=c1`);
  assert.equal(res.status, 200);
  assert.equal(res.body.state.current_season, 'spring');
  assert.equal(res.body.state.current_year, 2);
});

test('GET /api/campaign/seasonal/modifiers: spring resource_yield 1.2', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/seasonal/modifiers?campaign_id=c1`);
  assert.equal(res.status, 200);
  assert.equal(res.body.season, 'spring');
  assert.equal(res.body.modifiers.resource_yield, 1.2);
  assert.ok(Array.isArray(res.body.hazards));
  assert.ok(res.body.hazards.length >= 1);
  assert.equal(res.body.hazards[0].type, 'flood');
});

test('GET /api/campaign/seasonal/modifiers: winter recruit_pool_delta -1', async (t) => {
  const { url } = startTestServer(t);
  // Advance to winter: spring→summer→autumn→winter (3 season advances).
  for (let i = 0; i < 3; i += 1) {
    await request('POST', `${url}/api/campaign/seasonal/advance-season`, { campaign_id: 'c1' });
  }
  const res = await request('GET', `${url}/api/campaign/seasonal/modifiers?campaign_id=c1`);
  assert.equal(res.status, 200);
  assert.equal(res.body.season, 'winter');
  assert.equal(res.body.modifiers.recruit_pool_delta, -1);
});

test('GET /api/campaign/seasonal/phase-spec: organization actions includes recruit', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/seasonal/phase-spec?campaign_id=c1`);
  assert.equal(res.status, 200);
  assert.equal(res.body.phase, 'organization');
  assert.equal(res.body.combat_enabled, false);
  assert.ok(res.body.available_actions.includes('recruit'));
});

test('GET /api/campaign/seasonal/events?season=spring returns events_pool', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/seasonal/events?season=spring`);
  assert.equal(res.status, 200);
  assert.equal(res.body.season, 'spring');
  assert.ok(res.body.count >= 2);
  assert.ok(Array.isArray(res.body.events));
  for (const ev of res.body.events) {
    assert.ok(ev.id);
    assert.ok(ev.trigger);
  }
});

test('Multi-call round-trip: 5 years of advance-phase cycles preserve state integrity', async (t) => {
  const { url } = startTestServer(t);
  // Each year = 8 advance-phase calls (4 seasons × 2 phases each).
  const YEARS = 5;
  for (let y = 0; y < YEARS; y += 1) {
    for (let i = 0; i < 8; i += 1) {
      await request('POST', `${url}/api/campaign/seasonal/advance-phase`, { campaign_id: 'c1' });
    }
  }
  const res = await request('GET', `${url}/api/campaign/seasonal/state?campaign_id=c1`);
  assert.equal(res.status, 200);
  assert.equal(res.body.state.current_year, 1 + YEARS);
  assert.equal(res.body.state.current_season, 'spring');
  assert.equal(res.body.state.current_phase, 'organization');
});
