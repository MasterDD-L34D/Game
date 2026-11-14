// tests/api/onHitStatusRoundPersist.test.js
//
// TKT-D4-ENRICH (#2533) — round-model persistence + surface for attacker-trait
// status producers. Repro of the wipe found while building the electric probe:
//
//   1. performAttack applies on_hit_status (GAP-1 producer, trait_mechanics
//      `on_hit_status`) and SPRINT_018 `apply_status` trait effects by writing
//      target.status[...] mid-resolve on the session units.
//   2. handleLegacyAttackViaRound (the priority_queue per-attack mini-round)
//      then calls syncStatusesFromRoundState, which REBUILDS each unit.status
//      dict from the round orchestrator's tracked `statuses` array, deleting
//      every key the orchestrator never saw — the status evaporates before
//      the next action of the same round even runs.
//
// Morale (panic/rage) survived the same wipe via the pending-drain channel
// (session._pendingStatusApplies, re-applied after the sync). This suite pins
// the SAME guarantee for the trait producers, plus the surface contract:
// the /round/execute attack result must expose `on_hit_status` and
// `status_applies` (they were captured nowhere, so probes/telemetry could
// not even see the apply).
//
// Determinism: /session/start `seed` pins the combat RNG stream (the fix adds
// zero RNG draws, so the stream is identical pre/post fix). mod 20 vs dc 2
// forces hit + MoS >= 5 on every swing; saves vs trigger_dc resolve on the
// pinned stream — across 3 guaranteed hits a never-failing save would need a
// pathological seed, and the chosen one was verified locally.
//
// Status semantics pinned here (characterized, NOT invented):
//   - STATUS_DURATION_CAPS.disorient = 1 → the electric control window is
//     intra-round (next acting unit), gone from the post-round state.
//   - bleeding (cap 5, duration 2 on denti_silice_termici) survives the
//     end-of-round decay → visible in the post-round state. Initiative is
//     pinned so the victim acts BEFORE the attacker: the apply lands on the
//     round's last mini-resolve and eats only the single end-of-round decay.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

function units(attackerTraits) {
  return [
    {
      id: 'atk',
      controlled_by: 'player',
      species: 'chimera_probe_b',
      job: 'ranger',
      traits: attackerTraits,
      hp: 60,
      max_hp: 60,
      mod: 20,
      dc: 18,
      ap: 3,
      attack_range: 2,
      initiative: 1, // acts LAST: status applied on the round's final mini-resolve
      position: { x: 1, y: 1 },
    },
    {
      id: 'vic',
      controlled_by: 'sistema',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      resistance_archetype: 'corazzato',
      traits: [],
      hp: 80,
      max_hp: 80,
      mod: 0,
      dc: 2,
      ap: 2,
      attack_range: 1,
      initiative: 99, // acts first
      position: { x: 1, y: 2 },
      status: {},
    },
  ];
}

async function startSession(app, traits, seed) {
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: units(traits), seed, modulation: 'full', sistema_pressure_start: 75 });
  assert.equal(res.status, 200, `start ok: ${JSON.stringify(res.body).slice(0, 200)}`);
  return res.body.session_id;
}

async function execRound(app, sid, withAttack = true) {
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: withAttack
        ? [{ actor_id: 'atk', action: { type: 'attack', target_id: 'vic', channel: 'elettrico' } }]
        : [],
      ai_auto: true,
      priority_queue: true,
    });
  assert.equal(res.status, 200, `round exec ok: ${JSON.stringify(res.body).slice(0, 200)}`);
  return res.body;
}

function attackResults(body) {
  return (body.results || []).filter((r) => r.actor_id === 'atk' && r.action_type === 'attack');
}

function unitById(state, id) {
  return ((state && state.units) || []).find((u) => u.id === id);
}

test('round result surfaces on_hit_status + status_applies from attacker traits', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, ['seta_conduttiva_elettrica'], 31337);

  let sawOnHit = false;
  let sawStatusApply = false;
  for (let round = 1; round <= 3 && !(sawOnHit && sawStatusApply); round += 1) {
    const body = await execRound(app, sid);
    for (const r of attackResults(body)) {
      const res = r.result || {};
      const applied = (res.on_hit_status && res.on_hit_status.applied) || [];
      if (applied.some((a) => a.status_id === 'disorient')) sawOnHit = true;
      const statusApplies = res.status_applies || [];
      if (statusApplies.some((s) => s.stato === 'disorient')) sawStatusApply = true;
    }
  }

  assert.ok(
    sawOnHit,
    'on_hit_status.applied (trait_mechanics producer, trigger_dc 13) must be surfaced in the attack result',
  );
  assert.ok(
    sawStatusApply,
    'status_applies (active_effects apply_status producer, MoS >= 5) must be surfaced in the attack result',
  );
});

test('drained status (bleeding 2T) survives the round-state sync into the post-round state', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, ['denti_silice_termici'], 31337);

  let sawBleeding = false;
  for (let round = 1; round <= 3 && !sawBleeding; round += 1) {
    const body = await execRound(app, sid);
    const vic = unitById(body.state, 'vic');
    assert.ok(vic, 'victim present in round state');
    if (Number(vic.status && vic.status.bleeding) > 0) sawBleeding = true;
  }

  assert.ok(
    sawBleeding,
    'bleeding applied by on_hit_status must survive syncStatusesFromRoundState into the post-round ' +
      'state (duration 2 - end-of-round decay 1 = 1): without the pending-drain the sync deletes it',
  );
});

test('drained status decays back out (no immortal status from the drain channel)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, ['denti_silice_termici'], 31337);

  let landed = false;
  for (let round = 1; round <= 3 && !landed; round += 1) {
    const body = await execRound(app, sid);
    const vic = unitById(body.state, 'vic');
    landed = Number(vic.status && vic.status.bleeding) > 0;
  }
  assert.ok(landed, 'precondition: bleeding landed within 3 rounds');

  // Idle rounds (no player attack): remaining duration 1 must decay out and
  // NOT be re-applied by a stale drain queue.
  let still = true;
  for (let i = 0; i < 2 && still; i += 1) {
    const body = await execRound(app, sid, false);
    const vic = unitById(body.state, 'vic');
    still = Number(vic && vic.status && vic.status.bleeding) > 0;
  }
  assert.equal(still, false, 'bleeding decayed back out of the status dict');
});

test('attacker is not contaminated by the status it applies', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startSession(app, ['seta_conduttiva_elettrica'], 31337);

  const body = await execRound(app, sid);
  const atk = unitById(body.state, 'atk');
  assert.ok(atk, 'attacker present');
  assert.ok(!Number(atk.status && atk.status.disorient), 'attacker has no disorient');
});
