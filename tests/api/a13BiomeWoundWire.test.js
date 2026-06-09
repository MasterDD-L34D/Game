// A13 biome-wound wiring integration -- SPEC-P (session-end triggers wound/heal,
// persisted cross-run on the campaign; emits biome_wound to the chronicle).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const { getCampaign } = require('../../apps/backend/services/campaign/campaignStore');
const { getChronicle } = require('../../apps/backend/services/chronicle/chronicleStore');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'a13-wire-'));
}
const DEAD = [
  { id: 'p1', controlled_by: 'player', hp: 0, max_hp: 10, position: { x: 0, y: 0 } },
  { id: 's1', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 5, y: 5 } },
];
const WIN = [
  { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 0 } },
  { id: 's1', controlled_by: 'sistema', hp: 0, max_hp: 5, position: { x: 5, y: 5 } },
];

async function runEnd(app, campaignId, units, biomeId) {
  const ss = await request(app)
    .post('/api/session/start')
    .send({ units, campaign_id: campaignId, biome_id: biomeId });
  return request(app).post('/api/session/end').send({ session_id: ss.body.session_id });
}

test('A13: defeat in a biome wounds it (persist on campaign + biome_wound chronicle)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'a13_pl1' });
  const cid = start.body.campaign.id;
  const end = await runEnd(app, cid, DEAD, 'badlands');
  assert.equal(end.body.outcome, 'wipe');
  assert.deepEqual(getCampaign(cid).woundedBiomes, ['badlands']);
  const wounds = getChronicle(cid, { baseDir }).filter((e) => e.type === 'biome_wound');
  assert.equal(wounds.length, 1);
  assert.equal(wounds[0].payload.biome_id, 'badlands');
});

test('A13: win in a wounded biome heals it (recovery, anti-brick)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'a13_pl2' });
  const cid = start.body.campaign.id;
  await runEnd(app, cid, DEAD, 'tundra'); // wound it
  assert.deepEqual(getCampaign(cid).woundedBiomes, ['tundra']);
  await runEnd(app, cid, WIN, 'tundra'); // win there -> heal
  assert.deepEqual(getCampaign(cid).woundedBiomes, []);
});

test('A13: cap respected -- 3rd wounded biome rejected (max 2)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'a13_pl3' });
  const cid = start.body.campaign.id;
  await runEnd(app, cid, DEAD, 'b_one');
  await runEnd(app, cid, DEAD, 'b_two');
  await runEnd(app, cid, DEAD, 'b_three'); // over cap -> not added
  assert.deepEqual(getCampaign(cid).woundedBiomes.sort(), ['b_one', 'b_two']);
});

// SPEC-I read-side: a session in a wounded biome gets a harsher eco (within ER2).
const LIVE_ECO = [
  {
    id: 'p1',
    controlled_by: 'player',
    hp: 10,
    max_hp: 10,
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    position: { x: 0, y: 0 },
  },
  { id: 's1', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 5, y: 5 } },
];

test('A13 read-side: session in a wounded biome gets a harsher eco debuff (within ER2)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'a13_rs' });
  const cid = start.body.campaign.id;
  await runEnd(app, cid, DEAD, 'savana'); // wound savana
  const ss = await request(app)
    .post('/api/session/start')
    .send({ units: LIVE_ECO, campaign_id: cid, biome_id: 'savana' });
  const log = (ss.body.biomeCostsLog || []).find((x) => x.unit_id === 'p1');
  assert.ok(log, 'wounded biome surfaces an eco cost log');
  assert.equal(log.combined_delta.attack_mod_bonus, -1); // wounded debuff, capped at ER2
});

test('A13 read-side: non-wounded biome -> no wounded eco debuff (backward compat)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'a13_rs2' });
  const cid = start.body.campaign.id;
  const ss = await request(app)
    .post('/api/session/start')
    .send({ units: LIVE_ECO, campaign_id: cid, biome_id: 'savana' });
  assert.deepEqual(ss.body.biomeCostsLog || [], []); // fresh biome -> no debuff
});

// SPEC-P PA3 read-side: the wounded-biome state is telegraphed (anti-brick) -- the
// player must SEE pre/in-run that the biome is wounded, not just feel the debuff.
test('A13 PA3: wounded biome exposes biome_wounded:true in /session/state', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'a13_pa3' });
  const cid = start.body.campaign.id;
  await runEnd(app, cid, DEAD, 'savana'); // wound savana
  const ss = await request(app)
    .post('/api/session/start')
    .send({ units: LIVE_ECO, campaign_id: cid, biome_id: 'savana' });
  const sid = ss.body.session_id || ss.body.id;
  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(state.body.biome_wounded, true, 'wounded biome telegraphed in /state');
});

test('A13 PA3: fresh biome -> biome_wounded:false (backward compat)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'a13_pa3b' });
  const cid = start.body.campaign.id;
  const ss = await request(app)
    .post('/api/session/start')
    .send({ units: LIVE_ECO, campaign_id: cid, biome_id: 'savana' });
  const sid = ss.body.session_id || ss.body.id;
  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(state.body.biome_wounded, false);
});
