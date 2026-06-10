// SPEC-I ER7 -- wire integration: il season-tick (POST advance-season) avanza
// la popolazione discreta dei biomi-pilota. Flag ON: bioma ferito (A13) ->
// prey depleted; apex pressure (run vinto) -> apex depleted + segnale one-shot
// consumato; eventi -> permanentFlags. Flag OFF (default) -> biome_population
// null, nessuna mutazione del campaign (band-safe / back-compat).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter, _resetSeasonalState } = require('../../apps/backend/routes/campaign');
const campaignStore = require('../../apps/backend/services/campaign/campaignStore');

function startTestServer(t) {
  _resetSeasonalState();
  campaignStore._resetStore();
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

test('advance-season flag ON: wounded badlands -> prey depleted + local_extinction flag', async (t) => {
  process.env.BIOME_POPULATION_ENABLED = 'true';
  t.after(() => delete process.env.BIOME_POPULATION_ENABLED);
  const { url } = startTestServer(t);
  const camp = campaignStore.createCampaign('p1', 'def', { woundedBiomes: ['badlands'] });

  const res = await request('POST', `${url}/api/campaign/seasonal/advance-season`, {
    campaign_id: camp.id,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.biome_population.badlands.prey.state, 'depleted');

  const after = campaignStore.getCampaign(camp.id);
  assert.equal(after.biomePopulation.badlands.prey.state, 'depleted');
  assert.ok(after.permanentFlags.some((f) => f.key === 'local_extinction:badlands:prey'));
});

test('advance-season flag ON: apex pressure -> apex depleted + one-shot signal consumed', async (t) => {
  process.env.BIOME_POPULATION_ENABLED = 'true';
  t.after(() => delete process.env.BIOME_POPULATION_ENABLED);
  const { url } = startTestServer(t);
  const camp = campaignStore.createCampaign('p1', 'def', {
    apexPressureByBiome: { badlands: true },
  });

  const res = await request('POST', `${url}/api/campaign/seasonal/advance-season`, {
    campaign_id: camp.id,
  });
  assert.equal(res.body.biome_population.badlands.apex.state, 'depleted');

  const after = campaignStore.getCampaign(camp.id);
  assert.equal(after.apexPressureByBiome.badlands, undefined); // consumed
});

test('advance-season flag ON x2: apex stays depleted -> prey trophic release + population_boom', async (t) => {
  process.env.BIOME_POPULATION_ENABLED = 'true';
  t.after(() => delete process.env.BIOME_POPULATION_ENABLED);
  const { url } = startTestServer(t);
  const camp = campaignStore.createCampaign('p1', 'def', {
    apexPressureByBiome: { badlands: true },
  });

  await request('POST', `${url}/api/campaign/seasonal/advance-season`, { campaign_id: camp.id });
  const res2 = await request('POST', `${url}/api/campaign/seasonal/advance-season`, {
    campaign_id: camp.id,
  });
  assert.equal(res2.body.biome_population.badlands.prey.state, 'abundant');

  const after = campaignStore.getCampaign(camp.id);
  assert.ok(after.permanentFlags.some((f) => f.key === 'population_boom:badlands:prey'));
});

test('advance-season flag OFF (default): biome_population null, campaign untouched', async (t) => {
  delete process.env.BIOME_POPULATION_ENABLED;
  const { url } = startTestServer(t);
  const camp = campaignStore.createCampaign('p1', 'def', { woundedBiomes: ['badlands'] });

  const res = await request('POST', `${url}/api/campaign/seasonal/advance-season`, {
    campaign_id: camp.id,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.biome_population, null);
  assert.equal(res.body.state.current_season, 'summer'); // season still advances

  const after = campaignStore.getCampaign(camp.id);
  assert.deepEqual(after.biomePopulation, {}); // no mutation
});

module.exports = {};
