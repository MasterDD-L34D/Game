// tests/api/sessionMoraleWire.test.js — TKT-ORPHAN-MORALE wire.
//
// The morale module (services/combat/morale.js) was only half-wired: the
// ally_killed_adjacent event fires from postResolveKills, but enemy_critical_hit
// + status_panic_high had no callers (and combat had no is_critical signal). This
// suite pins the three additions:
//   1. resolveAttack surfaces is_critical (hit && MoS >= CRIT_MOS_THRESHOLD).
//   2. A critical hit on a surviving target routes through checkMorale
//      (enemy_critical_hit) — panic is now gated by morale_mod, not unconditional.
//   3. End-of-round panic contagion fires status_panic_high on steady allies when
//      a team is routing (>= 3 panicked).
//
// Determinism: morale_mod = -99 forces every morale check to trigger, +99 forces
// none — so the assertions hold regardless of the d20 stream.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const { resolveAttack, CRIT_MOS_THRESHOLD } = require('../../apps/backend/routes/sessionHelpers');

// ── 1. crit signal (pure) ──────────────────────────────────────────────────
test('MORALE signal: resolveAttack sets is_critical on a high-MoS hit', () => {
  const actor = { mod: 20 };
  const target = { dc: 2 };
  // die forced via rng: floor(rng()*20)+1. 0.99 -> 20, 0 -> 1.
  const crit = resolveAttack({ actor, target, rng: () => 0.99 });
  assert.equal(crit.hit, true);
  assert.ok(crit.mos >= CRIT_MOS_THRESHOLD, `mos ${crit.mos} >= ${CRIT_MOS_THRESHOLD}`);
  assert.equal(crit.is_critical, true, 'nat-high roll vs low DC is a crit');

  // Low MoS hit (exactly on the line) is NOT a crit.
  const grazing = resolveAttack({ actor: { mod: 0 }, target: { dc: 1 }, rng: () => 0 });
  assert.equal(grazing.hit, true, 'die 1 + mod 0 vs dc 1 -> mos 0, still a hit');
  assert.equal(grazing.is_critical, false, 'mos 0 is below crit threshold');
});

// ── integration harness ─────────────────────────────────────────────────────
async function startWith(app, units) {
  const startRes = await request(app).post('/api/session/start').send({ units });
  return startRes.body.session_id;
}
function critAttacker(over = {}) {
  return {
    id: 'atk',
    controlled_by: 'player',
    hp: 20,
    max_hp: 20,
    mod: 20, // huge attack mod -> every hit clears the crit MoS threshold
    position: { x: 1, y: 1 },
    attack_range: 2,
    ap: 3,
    ...over,
  };
}

// ── 2. crit-morale routing ──────────────────────────────────────────────────
test('MORALE wire: a critical hit panics a target with low morale (morale_mod -99)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startWith(app, [
    critAttacker(),
    {
      id: 'vic',
      controlled_by: 'sistema',
      hp: 50,
      max_hp: 50,
      mod: 0,
      dc: 2,
      morale_mod: -99, // always fails the morale check -> panic
      position: { x: 1, y: 2 },
      attack_range: 1,
      ap: 3,
      status: {},
    },
  ]);

  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [{ actor_id: 'atk', action: { type: 'attack', target_id: 'vic' } }],
      ai_auto: false,
    });
  assert.equal(res.status, 200, `attack ok: ${JSON.stringify(res.body).slice(0, 200)}`);

  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  const vic = state.body.units.find((u) => u.id === 'vic');
  assert.ok(vic.hp > 0, 'victim survived the crit (morale only applies to the living)');
  assert.ok(
    Number(vic.status?.panic) >= 2,
    `crit routed through morale -> panic (got ${vic.status?.panic})`,
  );
});

test('MORALE wire: a critical hit does NOT panic a steely target (morale_mod +99)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const sid = await startWith(app, [
    critAttacker(),
    {
      id: 'vic',
      controlled_by: 'sistema',
      hp: 50,
      max_hp: 50,
      mod: 0,
      dc: 2,
      morale_mod: 99, // never fails the morale check
      position: { x: 1, y: 2 },
      attack_range: 1,
      ap: 3,
      status: {},
    },
  ]);

  await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [{ actor_id: 'atk', action: { type: 'attack', target_id: 'vic' } }],
      ai_auto: false,
    });

  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  const vic = state.body.units.find((u) => u.id === 'vic');
  // Proves the crit panic is morale-gated now, not the old unconditional panic.
  assert.ok(
    !Number(vic.status?.panic),
    `steely target shrugs off the crit (got ${vic.status?.panic})`,
  );
});

// ── 3. panic contagion (status_panic_high) ──────────────────────────────────
test('MORALE wire: end-of-round panic contagion spreads to a steady ally when team routs', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // 3 already-panicked players (>= contagion threshold) + 1 steady ally that
  // always fails the morale roll (morale_mod -99) + 1 enemy so combat is valid.
  const sid = await startWith(app, [
    {
      id: 'pp1',
      controlled_by: 'player',
      hp: 10,
      max_hp: 10,
      position: { x: 1, y: 1 },
      status: { panic: 2 },
    },
    {
      id: 'pp2',
      controlled_by: 'player',
      hp: 10,
      max_hp: 10,
      position: { x: 2, y: 1 },
      status: { panic: 2 },
    },
    {
      id: 'pp3',
      controlled_by: 'player',
      hp: 10,
      max_hp: 10,
      position: { x: 3, y: 1 },
      status: { panic: 2 },
    },
    {
      id: 'steady',
      controlled_by: 'player',
      hp: 10,
      max_hp: 10,
      morale_mod: -99,
      position: { x: 4, y: 1 },
      status: {},
    },
    { id: 'enemy', controlled_by: 'sistema', hp: 10, max_hp: 10, position: { x: 1, y: 5 } },
  ]);

  // No player intents + ai_auto -> fires end-of-round side effects (contagion).
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({ session_id: sid, player_intents: [], ai_auto: true });
  assert.equal(res.status, 200, `round ok: ${JSON.stringify(res.body).slice(0, 200)}`);

  const state = await request(app).get('/api/session/state').query({ session_id: sid });
  const steady = state.body.units.find((u) => u.id === 'steady');
  assert.ok(
    Number(steady.status?.panic) > 0,
    `contagion spread panic to steady ally (got ${steady.status?.panic})`,
  );
});

// Note: the crit-morale panic survives the round-state sync because it is
// re-applied inside syncStatusesFromRoundState, which EVERY attack resolver
// (player, AI, legacy) calls — so the AI direction (enemy crit -> player panic)
// works through the exact same code path proven above. A dedicated AI test would
// only exercise the AI target-selection policy (which may move instead of attack),
// not the morale wire, so it is intentionally omitted.
