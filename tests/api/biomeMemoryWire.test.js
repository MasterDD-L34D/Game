// biomeMemory wiring integration -- OD-059 (#1673). Two /start->/end cycles under
// the SAME campaign_id + biome_id accumulate the campaign-scoped familiarity
// (cross-encounter carry-over). READ-ONLY NARRATIVE: surfaced as STRUCTURED DATA
// in the /end debrief payload, never written into combat state. Mirror of
// a13BiomeWoundWire.test.js harness.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const {
  getCampaign,
  getBiomeMemory,
} = require('../../apps/backend/services/campaign/campaignStore');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bmem-wire-'));
}

// Both factions alive at /end -> board 'abandon' (no wipe wound noise); the
// player unit p1 survives so it earns familiarity.
const ALIVE = [
  { id: 'p1', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 0 } },
  { id: 's1', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 5, y: 5 } },
];

async function runEnd(app, campaignId, units, biomeId) {
  const ss = await request(app)
    .post('/api/session/start')
    .send({ units, campaign_id: campaignId, biome_id: biomeId });
  const end = await request(app).post('/api/session/end').send({ session_id: ss.body.session_id });
  return end;
}

test('OD-059 wire: two /start->/end cycles, same campaign + biome -> familiarity accumulates', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'bmem_pl1' });
  const cid = start.body.campaign.id;

  await runEnd(app, cid, ALIVE, 'savana'); // encounter #1
  const after1 = getBiomeMemory(cid, 'p1').savana;
  assert.ok(after1 >= 0, 'familiarity recorded after first encounter');

  await runEnd(app, cid, ALIVE, 'savana'); // encounter #2 (separate session, same biome)
  const after2 = getBiomeMemory(cid, 'p1').savana;
  assert.equal(after2, after1 * 2, 'cross-encounter carry-over accumulates');
});

test('OD-059 wire: /end debrief payload exposes structured biome_familiarity (no prose)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'bmem_pl2' });
  const cid = start.body.campaign.id;
  const end = await runEnd(app, cid, ALIVE, 'caverna');

  const fam = end.body.biome_familiarity;
  assert.ok(fam && typeof fam === 'object', 'biome_familiarity present in /end payload');
  // Structured data only: { [unitId]: { [biomeId]: turns } }. No prose strings.
  assert.ok('p1' in fam, 'surviving player unit keyed');
  assert.equal(typeof fam.p1.caverna, 'number', 'familiarity is a structured turn count');
});

test('OD-059 wire: no campaign_id -> no familiarity write, no payload (backward compat)', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const ss = await request(app)
    .post('/api/session/start')
    .send({ units: ALIVE, biome_id: 'savana' }); // no campaign_id
  const end = await request(app).post('/api/session/end').send({ session_id: ss.body.session_id });
  assert.equal(end.body.finalized, true);
  // No campaign -> the surface is an empty object, never throws.
  assert.deepEqual(end.body.biome_familiarity, {});
});

// GUARDRAIL (band-safety): the wire must NOT write the mechanical/inert unit
// primitive `cumulative_biome_turns`, and the read accessor must not mutate it.
test('GUARDRAIL: the wire never sets unit.cumulative_biome_turns on the campaign', async (t) => {
  const baseDir = tmp();
  const { app, close } = createApp({ databasePath: null, chronicle: { baseDir } });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const start = await request(app).post('/api/campaign/start').send({ player_id: 'bmem_guard' });
  const cid = start.body.campaign.id;
  await runEnd(app, cid, ALIVE, 'savana');
  const camp = getCampaign(cid);
  // Campaign carries familiarity ONLY under biomeMemory; never a cumulative_biome_turns field.
  assert.equal('cumulative_biome_turns' in camp, false);
  assert.ok(camp.biomeMemory && typeof camp.biomeMemory === 'object');
  assert.equal(typeof getBiomeMemory(cid, 'p1').savana, 'number');
});
