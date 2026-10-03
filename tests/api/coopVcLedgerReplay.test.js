// OD-058 D3 (issue #2531) -- /coop/combat/end server-side ledger replay wire
// + parity-check coop<->single (Node mirror of the Godot parity-contract
// pattern, test_combat_engine_parity_contract.gd #371).
//
// Boxes covered:
//   D3.1 server rebuilds the vcSnapshot from ITS OWN event ledger (the combat
//        session linked via coopStore.linkSession), not from the host blob;
//   D3.2 vcSnapshotToDebriefPayload is produced by the replay path (not only
//        by the host-driven flow);
//   D3.3 parity contract: the coop replay debrief == the single-flow
//        GET /:id/vc debrief_payload on the SAME ledger.
//
// Policy (Opzione 2, combat resolution stays client-side):
//   - linked session + actor-attributed events -> server replay AUTHORITATIVE
//     (host payload ignored; divergence surfaced);
//   - no linked session / inert ledger (lifecycle-only) / kill switch
//     COOP_VC_LEDGER_REPLAY=0 -> legacy host fallback (back-compat).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

function mkApp(t) {
  const created = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof created.close === 'function') await created.close().catch(() => {});
  });
  return created;
}

async function setupCoopAtCombat(app) {
  let r = await request(app).post('/api/lobby/create').send({ host_name: 'Host', max_players: 4 });
  const code = r.body.code;
  const hostToken = r.body.host_token;
  r = await request(app).post('/api/lobby/join').send({ code, player_name: 'A' });
  const playerId = r.body.player_id;
  const playerToken = r.body.player_token;
  r = await request(app)
    .post('/api/coop/run/start')
    .send({ code, host_token: hostToken, scenario_stack: ['enc_demo_01'] });
  const runId = r.body.run_id;
  await request(app).post('/api/coop/character/create').send({
    code,
    player_id: playerId,
    player_token: playerToken,
    name: 'A',
    form_id: 'istj',
    species_id: 'x',
    job_id: 'guerriero',
  });
  await request(app)
    .post('/api/coop/world/confirm')
    .send({ code, host_token: hostToken, scenario_id: 'enc_demo_01' });
  return { code, hostToken, runId };
}

// Start a server combat session linked to the coop run (campaign_id == run.id
// -> coopStore.linkSession -> orch.sessionId).
async function startLinkedSession(app, runId) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, campaign_id: runId });
  return startRes.body.session_id;
}

// Generate real attributed combat events on the server ledger.
async function fightOneRound(app, sid) {
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [{ actor_id: 'p_scout', action: { type: 'attack', target_id: 'e_nomad_1' } }],
      ai_auto: false,
    });
  assert.equal(res.status, 200, `round/execute ok: ${JSON.stringify(res.body).slice(0, 200)}`);
}

const BOGUS_HOST_PAYLOAD = {
  per_actor: {
    spoofed_unit: {
      sentience_tier: 'T6',
      conviction_axis: { utility: 99, liberty: 99, morality: 99 },
      ennea_archetype: 'Riformatore',
    },
  },
};

test('D3 wire: linked fought session -> run.debrief rebuilt from server ledger (no host payload)', async (t) => {
  const { app, coopStore } = mkApp(t);
  const { code, hostToken, runId } = await setupCoopAtCombat(app);
  const sid = await startLinkedSession(app, runId);
  await fightOneRound(app, sid);

  const res = await request(app)
    .post('/api/coop/combat/end')
    .send({ code, host_token: hostToken, outcome: 'victory' });
  assert.equal(res.status, 200);
  assert.equal(res.body.debrief_source, 'ledger_replay');

  const orch = coopStore.get(code);
  assert.ok(orch.run.debrief, 'run.debrief populated server-side from the ledger replay');
  assert.ok(
    orch.run.debrief.per_actor && typeof orch.run.debrief.per_actor === 'object',
    'pinned shape per_actor',
  );
  // Real roster ids (tutorial scenario), not host-invented ones.
  assert.ok(
    Object.keys(orch.run.debrief.per_actor).length > 0,
    'per_actor carries the server roster actors',
  );
});

test('D3 parity contract coop<->single: replay debrief == GET /:id/vc debrief_payload (same ledger)', async (t) => {
  const { app, coopStore } = mkApp(t);
  const { code, hostToken, runId } = await setupCoopAtCombat(app);
  const sid = await startLinkedSession(app, runId);
  await fightOneRound(app, sid);

  // Single-flow surface on the same ledger (session still alive, GET is
  // non-destructive).
  const vcRes = await request(app).get(`/api/session/${sid}/vc`);
  assert.equal(vcRes.status, 200);
  const singlePayload = vcRes.body.debrief_payload;
  assert.ok(singlePayload && singlePayload.per_actor, 'single-flow debrief_payload present');

  const res = await request(app)
    .post('/api/coop/combat/end')
    .send({ code, host_token: hostToken, outcome: 'victory' });
  assert.equal(res.status, 200);
  assert.equal(res.body.debrief_source, 'ledger_replay');

  const coopPayload = coopStore.get(code).run.debrief;
  // THE parity contract (Godot #371 pattern, Node side): same event ledger ->
  // byte-identical debrief payload across the coop and single flows.
  assert.deepEqual(coopPayload, singlePayload);
});

test('D3 wire: bogus host payload IGNORED when ledger replay available (+divergence surfaced)', async (t) => {
  const { app, coopStore } = mkApp(t);
  const { code, hostToken, runId } = await setupCoopAtCombat(app);
  const sid = await startLinkedSession(app, runId);
  await fightOneRound(app, sid);

  const res = await request(app).post('/api/coop/combat/end').send({
    code,
    host_token: hostToken,
    outcome: 'victory',
    debrief_payload: BOGUS_HOST_PAYLOAD,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.debrief_source, 'ledger_replay');
  assert.equal(res.body.host_payload_divergent, true);

  const orch = coopStore.get(code);
  assert.equal(
    'spoofed_unit' in orch.run.debrief.per_actor,
    false,
    'host-invented actor must NOT survive the server replay',
  );
});

test('D3 back-compat: no linked session -> legacy host passthrough', async (t) => {
  const { app, coopStore } = mkApp(t);
  const { code, hostToken } = await setupCoopAtCombat(app);

  const res = await request(app).post('/api/coop/combat/end').send({
    code,
    host_token: hostToken,
    outcome: 'victory',
    debrief_payload: BOGUS_HOST_PAYLOAD,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.debrief_source, 'host');
  assert.deepEqual(coopStore.get(code).run.debrief, BOGUS_HOST_PAYLOAD);
});

test('D3 back-compat: inert ledger (session_start only, no actor events) -> host fallback', async (t) => {
  const { app, coopStore } = mkApp(t);
  const { code, hostToken, runId } = await setupCoopAtCombat(app);
  await startLinkedSession(app, runId); // linked but NEVER fought server-side

  const res = await request(app).post('/api/coop/combat/end').send({
    code,
    host_token: hostToken,
    outcome: 'victory',
    debrief_payload: BOGUS_HOST_PAYLOAD,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.debrief_source, 'host');
  assert.deepEqual(coopStore.get(code).run.debrief, BOGUS_HOST_PAYLOAD);
});

test('D3 kill switch: COOP_VC_LEDGER_REPLAY=0 -> legacy host passthrough even with fought ledger', async (t) => {
  const prev = process.env.COOP_VC_LEDGER_REPLAY;
  process.env.COOP_VC_LEDGER_REPLAY = '0';
  t.after(() => {
    if (prev === undefined) delete process.env.COOP_VC_LEDGER_REPLAY;
    else process.env.COOP_VC_LEDGER_REPLAY = prev;
  });

  const { app, coopStore } = mkApp(t);
  const { code, hostToken, runId } = await setupCoopAtCombat(app);
  const sid = await startLinkedSession(app, runId);
  await fightOneRound(app, sid);

  const res = await request(app).post('/api/coop/combat/end').send({
    code,
    host_token: hostToken,
    outcome: 'victory',
    debrief_payload: BOGUS_HOST_PAYLOAD,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.debrief_source, 'host');
  assert.deepEqual(coopStore.get(code).run.debrief, BOGUS_HOST_PAYLOAD);
});

test('D3 FP plumb: replay path asks coopStore.getFormPulses(run_id) (SPEC-M parity with /end)', async (t) => {
  const { app, coopStore } = mkApp(t);
  const { code, hostToken, runId } = await setupCoopAtCombat(app);
  const sid = await startLinkedSession(app, runId);
  await fightOneRound(app, sid);

  const calls = [];
  const origGetFormPulses = coopStore.getFormPulses;
  coopStore.getFormPulses = (cid) => {
    calls.push(cid);
    return origGetFormPulses(cid);
  };
  t.after(() => {
    coopStore.getFormPulses = origGetFormPulses;
  });

  const res = await request(app)
    .post('/api/coop/combat/end')
    .send({ code, host_token: hostToken, outcome: 'victory' });
  assert.equal(res.status, 200);
  assert.equal(res.body.debrief_source, 'ledger_replay');
  assert.ok(calls.includes(runId), `getFormPulses called with run_id; got: ${calls}`);
});
