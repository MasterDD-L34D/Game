// SPEC-K K-02 — co-op world lock-in (host proposes, device quorum commits).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');
const { createLobbyRouter } = require('../../apps/backend/routes/lobby');
const { createCoopRouter } = require('../../apps/backend/routes/coop');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');
const { LobbyService } = require('../../apps/backend/services/network/wsSession');

function worldOrch() {
  const co = new CoopOrchestrator({ roomCode: 'WRLD', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_test_01'] });
  co._setPhase('world_setup');
  return co;
}

// ---- orchestrator (direct, flag-agnostic) ----

test('proposeWorld throws outside world_setup', () => {
  const co = new CoopOrchestrator({ roomCode: 'WRLD', hostId: 'p_h' }); // lobby
  assert.throws(() => co.proposeWorld({}, {}), /not_in_world_setup/);
});

test('proposeWorld with zero connected voters commits immediately (solo/dev)', () => {
  const co = worldOrch();
  const r = co.proposeWorld({}, { connectedQuorumPids: [] });
  assert.equal(r.committed, true);
  assert.equal(co.phase, 'combat');
  assert.equal(co.proposedWorld, null);
});

test('proposeWorld force:true commits immediately even with connected voters', () => {
  const co = worldOrch();
  const r = co.proposeWorld({}, { connectedQuorumPids: ['p1', 'p2'], force: true });
  assert.equal(r.committed, true);
  assert.equal(co.phase, 'combat');
  assert.equal(co.proposedWorld, null);
});

test('proposeWorld co-op (>=1 connected voter) stashes proposal, no commit', () => {
  const co = worldOrch();
  const r = co.proposeWorld({ biomeId: 'foresta' }, { connectedQuorumPids: ['p1'] });
  assert.equal(r.committed, false);
  assert.equal(r.proposed, true);
  assert.equal(r.scenario_id, 'enc_test_01');
  assert.ok(co.proposedWorld);
  assert.equal(co.proposedWorld.biomeId, 'foresta');
  assert.equal(co.phase, 'world_setup'); // NOT advanced
});

test('tryAutoConfirmWorld returns null when nothing proposed', () => {
  const co = worldOrch();
  assert.equal(co.tryAutoConfirmWorld({ allPlayerIds: ['p1'], connectedPlayerIds: ['p1'] }), null);
  assert.equal(co.phase, 'world_setup');
});

test('tryAutoConfirmWorld returns null when proposed but quorum not met', () => {
  const co = worldOrch();
  co.proposeWorld({}, { connectedQuorumPids: ['p1', 'p2'] });
  // only p1 accepted -> p2 connected still pending
  co.voteWorld('p1', {
    accept: true,
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  const r = co.tryAutoConfirmWorld({
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  assert.equal(r, null);
  assert.equal(co.phase, 'world_setup');
  assert.ok(co.proposedWorld); // still pending
});

test('propose -> all connected accept -> tryAutoConfirmWorld commits + clears', () => {
  const co = worldOrch();
  co.proposeWorld({}, { connectedQuorumPids: ['p1', 'p2'] });
  co.voteWorld('p1', {
    accept: true,
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  co.voteWorld('p2', {
    accept: true,
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  const r = co.tryAutoConfirmWorld({
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  assert.ok(r);
  assert.equal(r.scenario_id, 'enc_test_01');
  assert.equal(co.phase, 'combat');
  assert.equal(co.proposedWorld, null);
});

test('a reject vote keeps the run in world_setup (no auto-confirm)', () => {
  const co = worldOrch();
  co.proposeWorld({}, { connectedQuorumPids: ['p1', 'p2'] });
  co.voteWorld('p1', {
    accept: true,
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  co.voteWorld('p2', {
    accept: false,
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  assert.equal(
    co.tryAutoConfirmWorld({ allPlayerIds: ['p1', 'p2'], connectedPlayerIds: ['p1', 'p2'] }),
    null,
  );
  assert.equal(co.phase, 'world_setup');
});

test('a disconnect dropping the last not-accepted voter completes the quorum', () => {
  const co = worldOrch();
  co.proposeWorld({}, { connectedQuorumPids: ['p1', 'p2'] });
  co.voteWorld('p1', {
    accept: true,
    allPlayerIds: ['p1', 'p2'],
    connectedPlayerIds: ['p1', 'p2'],
  });
  // p2 never voted; p2 disconnects -> connected = {p1}, p1 accepted -> quorum
  const r = co.tryAutoConfirmWorld({ allPlayerIds: ['p1', 'p2'], connectedPlayerIds: ['p1'] });
  assert.ok(r);
  assert.equal(co.phase, 'combat');
});

test('proposedWorld cleared on advanceScenarioOrEnd', () => {
  const co = worldOrch();
  // 2-scenario stack so advance lands in next world_setup, not ended.
  co.run.scenarioStack = ['enc_test_01', 'enc_test_02'];
  co.proposeWorld({}, { connectedQuorumPids: ['p1'] });
  assert.ok(co.proposedWorld);
  co._setPhase('debrief');
  co.advanceScenarioOrEnd();
  assert.equal(co.proposedWorld, null);
});

test('proposedWorld cleared on startRun', () => {
  const co = worldOrch();
  co.proposeWorld({}, { connectedQuorumPids: ['p1'] });
  assert.ok(co.proposedWorld);
  co._setPhase('ended');
  co.startRun({ scenarioStack: ['enc_test_01'] });
  assert.equal(co.proposedWorld, null);
});

test('confirmWorld clears any pending proposedWorld', () => {
  const co = worldOrch();
  co.proposeWorld({}, { connectedQuorumPids: ['p1'] });
  assert.ok(co.proposedWorld);
  co.confirmWorld({});
  assert.equal(co.proposedWorld, null);
  assert.equal(co.phase, 'combat');
});

test('re-propose overwrites the pending proposal; the second params commit', () => {
  const co = worldOrch();
  co.proposeWorld({ biomeId: 'foresta' }, { connectedQuorumPids: ['p1'] });
  co.proposeWorld({ biomeId: 'badlands' }, { connectedQuorumPids: ['p1'] });
  assert.equal(co.proposedWorld.biomeId, 'badlands'); // latest wins
  co.voteWorld('p1', { accept: true, allPlayerIds: ['p1'], connectedPlayerIds: ['p1'] });
  const r = co.tryAutoConfirmWorld({ allPlayerIds: ['p1'], connectedPlayerIds: ['p1'] });
  assert.ok(r);
  assert.equal(co.phase, 'combat');
});

// ---- route (flag-gated) ----

function buildApp() {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const app = express();
  app.use(express.json());
  app.use('/api', createLobbyRouter({ lobby }));
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  return { app, lobby };
}

async function bootstrapWorldSetup(app) {
  const { body: h } = await request(app).post('/api/lobby/create').send({ host_name: 'H' });
  const { body: j1 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Alice' });
  const { body: j2 } = await request(app)
    .post('/api/lobby/join')
    .send({ code: h.code, player_name: 'Bruno' });
  await request(app).post('/api/coop/run/start').send({ code: h.code, host_token: h.host_token });
  await request(app).post('/api/coop/character/create').send({
    code: h.code,
    player_id: j1.player_id,
    player_token: j1.player_token,
    name: 'Aria',
    form_id: 'istj',
  });
  await request(app).post('/api/coop/character/create').send({
    code: h.code,
    player_id: j2.player_id,
    player_token: j2.player_token,
    name: 'Bruno',
    form_id: 'enfp',
  });
  return { host: h, p1: j1, p2: j2 };
}

function markConnected(lobby, code) {
  const room = lobby.getRoom(code);
  for (const p of room.players.values()) {
    if (p.id !== room.hostId && p.role !== 'host') p.connected = true;
  }
  return room;
}

test('flag OFF: POST /coop/world/confirm commits immediately (legacy)', async () => {
  delete process.env.WORLD_CONFIRM_QUORUM_ENABLED;
  const { app, lobby } = buildApp();
  const { host } = await bootstrapWorldSetup(app);
  markConnected(lobby, host.code);
  const res = await request(app)
    .post('/api/coop/world/confirm')
    .send({ code: host.code, host_token: host.host_token });
  assert.equal(res.status, 200);
  assert.equal(res.body.phase, 'combat');
  assert.ok(res.body.session_start_payload);
  assert.equal(res.body.proposed, undefined);
});

test('flag ON + solo (no connected voters): /coop/world/confirm commits immediately', async () => {
  process.env.WORLD_CONFIRM_QUORUM_ENABLED = 'true';
  try {
    const { app } = buildApp();
    const { host } = await bootstrapWorldSetup(app); // players NOT marked connected
    const res = await request(app)
      .post('/api/coop/world/confirm')
      .send({ code: host.code, host_token: host.host_token });
    assert.equal(res.status, 200);
    assert.equal(res.body.phase, 'combat');
    assert.ok(res.body.session_start_payload);
  } finally {
    delete process.env.WORLD_CONFIRM_QUORUM_ENABLED;
  }
});

test('flag ON + force: /coop/world/confirm commits immediately despite voters', async () => {
  process.env.WORLD_CONFIRM_QUORUM_ENABLED = 'true';
  try {
    const { app, lobby } = buildApp();
    const { host } = await bootstrapWorldSetup(app);
    markConnected(lobby, host.code);
    const res = await request(app)
      .post('/api/coop/world/confirm')
      .send({ code: host.code, host_token: host.host_token, force: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.phase, 'combat');
    assert.ok(res.body.session_start_payload);
  } finally {
    delete process.env.WORLD_CONFIRM_QUORUM_ENABLED;
  }
});

test('flag ON + co-op: host confirm PROPOSES, device quorum auto-commits', async () => {
  process.env.WORLD_CONFIRM_QUORUM_ENABLED = 'true';
  try {
    const { app, lobby } = buildApp();
    const { host, p1, p2 } = await bootstrapWorldSetup(app);
    markConnected(lobby, host.code);
    // host confirm -> proposes (no commit, no session_start_payload)
    const propose = await request(app)
      .post('/api/coop/world/confirm')
      .send({ code: host.code, host_token: host.host_token });
    assert.equal(propose.status, 200);
    assert.equal(propose.body.proposed, true);
    assert.equal(propose.body.phase, 'world_setup');
    assert.equal(propose.body.session_start_payload, undefined);
    // p1 accepts -> still pending (p2 connected, not voted)
    const v1 = await request(app).post('/api/coop/world/vote').send({
      code: host.code,
      player_id: p1.player_id,
      player_token: p1.player_token,
      accept: true,
    });
    assert.equal(v1.body.phase, 'world_setup');
    assert.equal(v1.body.world_confirmed, undefined);
    // p2 accepts -> quorum -> auto-commit
    const v2 = await request(app).post('/api/coop/world/vote').send({
      code: host.code,
      player_id: p2.player_id,
      player_token: p2.player_token,
      accept: true,
    });
    assert.equal(v2.status, 200);
    assert.equal(v2.body.world_confirmed, true);
    assert.equal(v2.body.phase, 'combat');
    assert.ok(v2.body.session_start_payload);
  } finally {
    delete process.env.WORLD_CONFIRM_QUORUM_ENABLED;
  }
});
