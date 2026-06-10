// OD-058 D3 cutover wire (verdetti master-dd 2026-06-10): write-trigger
// crit->lieve / KO->grave + persistence grave cross-encounter + flip default ON.
// Determinismo: /start `seed` pinna l'RNG; mod 20 vs dc 2 = hit + MoS>=5 (crit)
// garantito a ogni colpo (pattern onHitStatusRoundPersist).
'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

function mkApp() {
  return createApp({ databasePath: null });
}

async function start(app, units, extra = {}) {
  const res = await request(app)
    .post('/api/session/start')
    .send({ units, seed: 4242, ...extra })
    .expect(200);
  return res.body.session_id;
}

test('D3 write: player attack crit on enemy does NOT wound the enemy; AI crit on player wounds lieve', async (t) => {
  delete process.env.WOUND_LOCATION_V2; // default ON
  const { app, close } = mkApp();
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  // Player fortissimo (mai colpito severamente) attacca; poi il sistema (mod 20)
  // attacca il player con dc 2 -> crit garantito -> wounds lieve sul player.
  const units = [
    {
      id: 'pg',
      controlled_by: 'player',
      hp: 60,
      max_hp: 60,
      mod: 2,
      dc: 2, // facilissimo da colpire (e crit-tare)
      ap: 2,
      position: { x: 0, y: 0 },
    },
    {
      id: 'sis',
      controlled_by: 'sistema',
      hp: 60,
      max_hp: 60,
      mod: 20, // colpisce sempre con MoS >= 5
      dc: 18,
      ap: 2,
      position: { x: 1, y: 0 },
    },
  ];
  const sid = await start(app, units);
  // Avanza turni finche' l'AI attacca (turn/end fa agire il sistema).
  for (let i = 0; i < 6; i += 1) {
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
    const st = await request(app).get('/api/session/state').query({ session_id: sid });
    const pg = st.body.units.find((u) => u.id === 'pg');
    if (pg.status && Array.isArray(pg.status.wounds) && pg.status.wounds.length) break;
  }
  const st = await request(app).get('/api/session/state').query({ session_id: sid });
  const pg = st.body.units.find((u) => u.id === 'pg');
  assert.ok(
    pg.status && Array.isArray(pg.status.wounds) && pg.status.wounds.length >= 1,
    `expected lieve wound on pg after AI crits: ${JSON.stringify(pg.status)}`,
  );
  assert.ok(pg.status.wounds.every((w) => ['lieve', 'grave'].includes(w.severity)));
  const sis = st.body.units.find((u) => u.id === 'sis');
  assert.ok(!sis.status || !sis.status.wounds, 'enemy never wounded');
});

test('D3 persistence: grave survives /end -> next /start same campaign; lieve does not', async (t) => {
  delete process.env.WOUND_LOCATION_V2;
  const { app, close } = mkApp();
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const campaign = 'camp-d3-test';
  const wounded = {
    id: 'pg',
    controlled_by: 'player',
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    status: {
      wounds: [
        { location: 'torso', severity: 'grave', stat: 'defense_mod', malus: -2 },
        { location: 'testa', severity: 'lieve', stat: 'accuracy', malus: -1 },
      ],
    },
  };
  const enemy = { id: 'e1', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 5, y: 5 } };
  const sid1 = await start(app, [wounded, enemy], { campaign_id: campaign });
  await request(app).post('/api/session/end').send({ session_id: sid1 }).expect(200);

  // Session 2: same campaign, same unit id, NO wounds in payload.
  const fresh = { id: 'pg', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 0 } };
  const sid2 = await start(app, [fresh, { ...enemy }], { campaign_id: campaign });
  const st = await request(app).get('/api/session/state').query({ session_id: sid2 });
  const pg = st.body.units.find((u) => u.id === 'pg');
  const wounds = (pg.status && pg.status.wounds) || [];
  assert.equal(wounds.length, 1, `only the grave scar restores: ${JSON.stringify(wounds)}`);
  assert.equal(wounds[0].severity, 'grave');
  assert.equal(wounds[0].location, 'torso');
});

test('D3 opt-out (WOUND_LOCATION_V2=false): no V2 write, no V2 restore (legacy path)', async (t) => {
  process.env.WOUND_LOCATION_V2 = 'false';
  const { app, close } = mkApp();
  t.after(async () => {
    delete process.env.WOUND_LOCATION_V2;
    if (typeof close === 'function') await close().catch(() => {});
  });
  const campaign = 'camp-d3-optout';
  const wounded = {
    id: 'pg',
    controlled_by: 'player',
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    status: { wounds: [{ location: 'torso', severity: 'grave', stat: 'defense_mod', malus: -2 }] },
  };
  const enemy = { id: 'e1', controlled_by: 'sistema', hp: 5, max_hp: 5, position: { x: 5, y: 5 } };
  const sid1 = await start(app, [wounded, enemy], { campaign_id: campaign });
  await request(app).post('/api/session/end').send({ session_id: sid1 }).expect(200);
  const fresh = { id: 'pg', controlled_by: 'player', hp: 10, max_hp: 10, position: { x: 0, y: 0 } };
  const sid2 = await start(app, [fresh, { ...enemy }], { campaign_id: campaign });
  const st = await request(app).get('/api/session/state').query({ session_id: sid2 });
  const pg = st.body.units.find((u) => u.id === 'pg');
  assert.ok(
    !pg.status || !pg.status.wounds || pg.status.wounds.length === 0,
    'no V2 restore on opt-out',
  );
});
