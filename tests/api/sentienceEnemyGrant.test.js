// OD-024 D3 (master-dd #2941 ratification: grant extended player-only -> enemies).
// Verifies the sentience interoception grant is applied to enemy/sistema units at
// /start (player chars get it at submitCharacter), flag-gated -> band-neutral OFF.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

const FLAG = 'SENTIENCE_INTEROCEPTION_GRANT_ENABLED';
// anguis_magnetica is T1 in species_catalog -> progressive subset = prop + vestibolare.
const T1_SUBSET = ['propriocezione', 'equilibrio_vestibolare'];

function units() {
  return [
    {
      id: 'p1',
      controlled_by: 'player',
      species: 'guardiano_caverna',
      hp: 10,
      max_hp: 10,
      position: { x: 0, y: 0 },
    },
    {
      id: 's1',
      controlled_by: 'sistema',
      species: 'anguis_magnetica',
      traits: [],
      hp: 5,
      max_hp: 5,
      position: { x: 5, y: 5 },
    },
  ];
}

async function startEnemy(app) {
  const ss = await request(app).post('/api/session/start').send({ units: units() });
  return (ss.body.state?.units || []).find((u) => u.id === 's1');
}

test('D3: sistema unit gains the interoception subset at /start (flag ON)', async (t) => {
  const prev = process.env[FLAG];
  process.env[FLAG] = 'true';
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
    if (typeof close === 'function') await close().catch(() => {});
  });
  const enemy = await startEnemy(app);
  assert.ok(enemy, 'sistema unit present in state');
  for (const id of T1_SUBSET) {
    assert.ok(enemy.traits.includes(id), `enemy should be granted ${id} at T1`);
  }
});

test('D3: flag OFF -> sistema unit traits unchanged (band-neutral)', async (t) => {
  const prev = process.env[FLAG];
  delete process.env[FLAG];
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (prev !== undefined) process.env[FLAG] = prev;
    if (typeof close === 'function') await close().catch(() => {});
  });
  const enemy = await startEnemy(app);
  assert.ok(enemy, 'sistema unit present in state');
  for (const id of T1_SUBSET) {
    assert.ok(!enemy.traits.includes(id), `${id} must NOT be granted when flag OFF`);
  }
});
