// tests/api/sessionWoundedPermaWire.test.js — TKT-ORPHAN-WOUNDPERMA wire.
//
// woundedPerma.js had a dead WRITE path: applyWound + initSessionMap were never
// called, so the persistent cross-encounter scar (reduced max_hp + wounded_perma
// status, READ live in statusModifiers.js) could never form. This pins the wire:
// a player wipe scars the KO'd player units into a campaign-scoped map, and the
// next encounter of the same campaign restores the scar at /start.
//
// Single-encounter sessions are deleted on /end, so the scar must survive on the
// campaign-keyed store — hence the cross-encounter (same campaign_id) assertion.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

async function startCampaign(app, campaignId, units) {
  const r = await request(app).post('/api/session/start').send({ campaign_id: campaignId, units });
  return r.body.session_id;
}

function squad(heroOver) {
  return [
    { id: 'hero', controlled_by: 'player', max_hp: 5, position: { x: 1, y: 1 }, ...heroOver },
    { id: 'foe', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 3, y: 3 } },
  ];
}

test('WOUNDPERMA wire: a player wipe scars the unit, restored next encounter (same campaign)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Encounter 1: hero already down (hp 0) + a living enemy -> /end = player wipe.
  const sid1 = await startCampaign(app, 'wp_c1', squad({ hp: 0 }));
  const end1 = await request(app).post('/api/session/end').send({ session_id: sid1 });
  assert.equal(end1.status, 200);
  assert.equal(end1.body.outcome, 'wipe', `outcome wipe (got ${end1.body.outcome})`);

  // Encounter 2: same campaign, fresh hero -> restore applies the scar (5 -> 4).
  const sid2 = await startCampaign(app, 'wp_c1', squad({ hp: 5 }));
  const st2 = await request(app).get('/api/session/state').query({ session_id: sid2 });
  const hero2 = st2.body.units.find((u) => u.id === 'hero');
  assert.equal(hero2.max_hp, 4, `scar reduced max_hp 5 -> 4 (got ${hero2.max_hp})`);
  assert.ok(hero2.status?.wounded_perma, 'wounded_perma status present (read by statusModifiers)');

  // Control: a different campaign is unaffected (campaign-scoped map).
  const sid3 = await startCampaign(app, 'wp_c2_clean', squad({ hp: 5 }));
  const st3 = await request(app).get('/api/session/state').query({ session_id: sid3 });
  const hero3 = st3.body.units.find((u) => u.id === 'hero');
  assert.equal(hero3.max_hp, 5, 'untouched campaign keeps full max_hp');
});

test('WOUNDPERMA wire: a non-wipe end does NOT scar the unit', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // Encounter 1: enemy already dead -> player wins (not a wipe), no scar.
  const sid1 = await startCampaign(app, 'wp_win', [
    { id: 'hero', controlled_by: 'player', hp: 5, max_hp: 5, position: { x: 1, y: 1 } },
    { id: 'foe', controlled_by: 'sistema', hp: 0, max_hp: 5, position: { x: 3, y: 3 } },
  ]);
  const end1 = await request(app).post('/api/session/end').send({ session_id: sid1 });
  assert.equal(end1.body.outcome, 'win', `outcome win (got ${end1.body.outcome})`);

  const sid2 = await startCampaign(app, 'wp_win', squad({ hp: 5 }));
  const st2 = await request(app).get('/api/session/state').query({ session_id: sid2 });
  const hero2 = st2.body.units.find((u) => u.id === 'hero');
  assert.equal(hero2.max_hp, 5, 'a win leaves max_hp intact');
  assert.ok(!hero2.status?.wounded_perma, 'no scar after a win');
});
