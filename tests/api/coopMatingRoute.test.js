'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('POST /coop/mating/vote records + returns mating_tally', async (t) => {
  const { app, lobby, coopStore, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (close) await close().catch(() => {});
  });
  const room = lobby.createRoom({ hostName: 'TV' });
  const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
  const orch = coopStore.getOrCreate(room.code);
  orch.startRun({ scenarioStack: ['enc_a'] });
  orch.phase = 'debrief';
  const res = await request(app).post('/api/coop/mating/vote').send({
    code: room.code,
    player_id: p1.player_id,
    player_token: p1.player_token,
    pair_id: 'a__b',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.tally.leading_pair_id, 'a__b');
});

test('POST /coop/mating/vote rejects bad auth', async (t) => {
  const { app, lobby, coopStore, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (close) await close().catch(() => {});
  });
  const room = lobby.createRoom({ hostName: 'TV' });
  const orch = coopStore.getOrCreate(room.code);
  orch.startRun({ scenarioStack: ['enc_a'] });
  orch.phase = 'debrief';
  const res = await request(app).post('/api/coop/mating/vote').send({
    code: room.code,
    player_id: 'ghost',
    player_token: 'bad',
    pair_id: 'a__b',
  });
  assert.equal(res.status, 403);
});
