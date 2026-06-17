// tests/api/nidoRitualWire.test.js -- SPEC-J sez.6 Nido ritual endpoint (J3).
//
// POST /api/session/:id/nido/ritual { unit_id, location, kind } heals or
// transforms a creature's grave scar. Resource cost (SPEC-E E6) is NOT enforced
// (campaign resources are Godot-owned). The scar transformation logic itself is
// unit-tested in tests/services/combat/nidoRitual; this proves the wire +
// validation + the chronicle esito.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

// Start a session, seeding a grave scar onto the first player unit so the ritual
// has something to act on (start preserves player-unit status; only sistema
// units are cloned for the damage multiplier).
async function startWithScar(app, location = 'torso') {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const units = JSON.parse(JSON.stringify(scenario.body.units));
  const pg = units.find((u) => u && u.controlled_by === 'player');
  pg.status = pg.status || {};
  pg.status.wounds = [{ location, severity: 'grave', stat: 'defense_mod', malus: -2 }];
  const res = await request(app).post('/api/session/start').send({ units });
  return { sid: res.body.session_id, pgId: pg.id };
}

test('nido/ritual heal: removes the grave scar, esito 200', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid, pgId } = await startWithScar(app);
  const res = await request(app)
    .post(`/api/session/${sid}/nido/ritual`)
    .send({ unit_id: pgId, location: 'torso', kind: 'heal' });
  assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.equal(res.body.ritual.kind, 'heal');
  assert.equal(res.body.ritual.unit_id, pgId);
  const pg = res.body.state.units.find((u) => u.id === pgId);
  assert.equal(
    (pg.status.wounds || []).some((w) => w.location === 'torso' && w.severity === 'grave'),
    false,
    'grave scar healed in the public state',
  );
});

test('nido/ritual transform: removes scar + returns the narrative mark', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid, pgId } = await startWithScar(app, 'arti_anteriori');
  const res = await request(app)
    .post(`/api/session/${sid}/nido/ritual`)
    .send({ unit_id: pgId, location: 'arti_anteriori', kind: 'transform' });
  assert.equal(res.status, 200);
  assert.equal(res.body.ritual.kind, 'transform');
  assert.ok(res.body.ritual.mark && res.body.ritual.mark.id);
  assert.equal(res.body.ritual.mark.origin_location, 'arti_anteriori');
});

test('nido/ritual: no scar at location -> 409 ritual_unavailable (no_scar)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid, pgId } = await startWithScar(app);
  const res = await request(app)
    .post(`/api/session/${sid}/nido/ritual`)
    .send({ unit_id: pgId, location: 'arti_posteriori', kind: 'heal' });
  assert.equal(res.status, 409);
  assert.equal(res.body.reason, 'no_scar');
});

test('nido/ritual: invalid kind -> 400; unknown unit -> 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const { sid, pgId } = await startWithScar(app);
  const bad = await request(app)
    .post(`/api/session/${sid}/nido/ritual`)
    .send({ unit_id: pgId, location: 'torso', kind: 'banish' });
  assert.equal(bad.status, 400);
  const ghost = await request(app)
    .post(`/api/session/${sid}/nido/ritual`)
    .send({ unit_id: 'no_such_unit', location: 'torso', kind: 'heal' });
  assert.equal(ghost.status, 404);
});
