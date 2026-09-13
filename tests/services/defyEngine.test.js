// Defy engine — pure unit tests for Skiv ticket #5 (Sprint B [2/2]) + Sistema Pushback.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFY_SG_COST,
  DEFY_PRESSURE_RELIEF,
  DEFY_AP_PENALTY_TURNS,
  DEFY_COUNTER_CHARGE,
  PUSHBACK_THRESHOLD,
  PUSHBACK_PRESSURE_RESTORE,
  ERR_NOT_FOUND,
  ERR_NOT_PLAYER,
  ERR_KO,
  ERR_INSUFFICIENT_SG,
  ERR_NO_PRESSURE,
  canDefy,
  applyDefy,
  applySystemaPushback,
} = require('../../apps/backend/services/combat/defyEngine');

function buildPlayer(overrides = {}) {
  return {
    id: 'p1',
    controlled_by: 'player',
    hp: 10,
    sg: DEFY_SG_COST,
    status: {},
    ap: 2,
    ...overrides,
  };
}

function buildSession(overrides = {}) {
  return { sistema_pressure: 50, ...overrides };
}

test('constants — cost 2 SG, relief 25, penalty 2 status counters', () => {
  assert.equal(DEFY_SG_COST, 2);
  assert.equal(DEFY_PRESSURE_RELIEF, 25);
  assert.equal(DEFY_AP_PENALTY_TURNS, 2);
});

test('canDefy: null actor → actor_not_found', () => {
  assert.deepEqual(canDefy(null, buildSession()), { ok: false, error: ERR_NOT_FOUND });
});

test('canDefy: sistema actor → not_player_controlled', () => {
  const sis = buildPlayer({ controlled_by: 'sistema' });
  assert.deepEqual(canDefy(sis, buildSession()), { ok: false, error: ERR_NOT_PLAYER });
});

test('canDefy: KO actor (hp=0) → actor_ko', () => {
  const dead = buildPlayer({ hp: 0 });
  assert.deepEqual(canDefy(dead, buildSession()), { ok: false, error: ERR_KO });
});

test('canDefy: insufficient SG → insufficient_sg with detail', () => {
  const lowSg = buildPlayer({ sg: 1 });
  const r = canDefy(lowSg, buildSession());
  assert.equal(r.ok, false);
  assert.equal(r.error, ERR_INSUFFICIENT_SG);
  assert.equal(r.detail.sg, 1);
  assert.equal(r.detail.required, 2);
});

test('canDefy: pressure 0 → no_pressure_to_relieve (no-op forbidden)', () => {
  assert.equal(
    canDefy(buildPlayer(), buildSession({ sistema_pressure: 0 })).error,
    ERR_NO_PRESSURE,
  );
});

test('canDefy: happy path → ok:true', () => {
  assert.deepEqual(canDefy(buildPlayer(), buildSession()), { ok: true });
});

test('applyDefy: spends SG and drops pressure by relief amount', () => {
  const actor = buildPlayer({ sg: 3 });
  const sess = buildSession({ sistema_pressure: 75 });
  const out = applyDefy(actor, sess);
  assert.equal(out.ok, true);
  assert.equal(actor.sg, 1); // 3 - 2
  assert.equal(sess.sistema_pressure, 50); // 75 - 25
  assert.equal(out.relief, 25);
  assert.equal(out.before.sg, 3);
  assert.equal(out.before.pressure, 75);
  assert.equal(out.after.sg, 1);
  assert.equal(out.after.pressure, 50);
});

test('applyDefy: pressure clamps at 0 even if relief overshoots', () => {
  const actor = buildPlayer();
  const sess = buildSession({ sistema_pressure: 10 });
  const out = applyDefy(actor, sess);
  assert.equal(out.ok, true);
  assert.equal(sess.sistema_pressure, 0);
  assert.equal(out.relief, 10); // partial relief reported
});

test('applyDefy: sets actor.status.defy_penalty for AP throttle', () => {
  const actor = buildPlayer();
  const sess = buildSession();
  applyDefy(actor, sess);
  assert.equal(actor.status.defy_penalty, DEFY_AP_PENALTY_TURNS);
});

test('applyDefy: existing defy_penalty taken as max (no double-stacking down)', () => {
  const actor = buildPlayer({ status: { defy_penalty: 3 } });
  const sess = buildSession();
  applyDefy(actor, sess);
  assert.equal(actor.status.defy_penalty, 3); // existing higher kept
});

test('applyDefy: validation error returns { ok:false, error } without mutation', () => {
  const actor = buildPlayer({ sg: 0 });
  const sess = buildSession();
  const out = applyDefy(actor, sess);
  assert.equal(out.ok, false);
  assert.equal(out.error, ERR_INSUFFICIENT_SG);
  assert.equal(actor.sg, 0); // unchanged
  assert.equal(sess.sistema_pressure, 50); // unchanged
  assert.ok(!actor.status.defy_penalty);
});

test('applyDefy: returns cost shape { sg, ap_next_turn }', () => {
  const actor = buildPlayer();
  const sess = buildSession();
  const out = applyDefy(actor, sess);
  assert.deepEqual(out.cost, { sg: 2, ap_next_turn: 1 });
});

test('applyDefy: actor without status object → creates status', () => {
  const actor = buildPlayer();
  delete actor.status;
  const sess = buildSession();
  applyDefy(actor, sess);
  assert.equal(typeof actor.status, 'object');
  assert.equal(actor.status.defy_penalty, DEFY_AP_PENALTY_TURNS);
});

test('canDefy: non-finite pressure treated as 0 → blocked', () => {
  const sess = { sistema_pressure: 'invalid' };
  assert.equal(canDefy(buildPlayer(), sess).error, ERR_NO_PRESSURE);
});

// ─── Sistema Pushback (symmetric Defy extension) ────────────────────────────

test('pushback constants — charge 15, threshold 30, restore 15', () => {
  assert.equal(DEFY_COUNTER_CHARGE, 15);
  assert.equal(PUSHBACK_THRESHOLD, 30);
  assert.equal(PUSHBACK_PRESSURE_RESTORE, 15);
});

test('applyDefy: charges sistema_counter by DEFY_COUNTER_CHARGE on success', () => {
  const actor = buildPlayer();
  const sess = buildSession({ sistema_counter: 0 });
  applyDefy(actor, sess);
  assert.equal(sess.sistema_counter, DEFY_COUNTER_CHARGE);
});

test('applyDefy: counter accumulates across two Defys (capped at PUSHBACK_THRESHOLD)', () => {
  const actor1 = buildPlayer({ sg: 10 });
  const sess = buildSession({ sistema_pressure: 80, sistema_counter: 0 });
  applyDefy(actor1, sess); // first: counter → 15
  assert.equal(sess.sistema_counter, 15);
  applyDefy(actor1, sess); // second: counter → 30 (capped at threshold)
  assert.equal(sess.sistema_counter, PUSHBACK_THRESHOLD);
});

test('applyDefy: counter does not exceed PUSHBACK_THRESHOLD', () => {
  const actor = buildPlayer();
  const sess = buildSession({ sistema_counter: PUSHBACK_THRESHOLD });
  applyDefy(actor, sess);
  assert.equal(sess.sistema_counter, PUSHBACK_THRESHOLD);
});

test('applyDefy: failed Defy does not charge counter', () => {
  const actor = buildPlayer({ sg: 0 });
  const sess = buildSession({ sistema_counter: 0 });
  applyDefy(actor, sess);
  assert.equal(sess.sistema_counter, 0); // unchanged
});

test('applyDefy: after exposes sistema_counter in result', () => {
  const actor = buildPlayer();
  const sess = buildSession({ sistema_counter: 0 });
  const out = applyDefy(actor, sess);
  assert.equal(out.after.sistema_counter, DEFY_COUNTER_CHARGE);
  assert.equal(out.before.sistema_counter, 0);
});

test('applySystemaPushback: no trigger when counter < threshold', () => {
  const sess = buildSession({ sistema_counter: 15 });
  const out = applySystemaPushback(sess);
  assert.equal(out.triggered, false);
  assert.equal(sess.sistema_counter, 15); // unchanged
  assert.equal(sess.sistema_pressure, 50); // unchanged
});

test('applySystemaPushback: triggers at threshold — resets counter, restores pressure', () => {
  const sess = buildSession({ sistema_pressure: 40, sistema_counter: 30 });
  const out = applySystemaPushback(sess);
  assert.equal(out.triggered, true);
  assert.equal(sess.sistema_counter, 0);
  assert.equal(sess.sistema_pressure, 40 + PUSHBACK_PRESSURE_RESTORE);
  assert.equal(out.pressure_restored, PUSHBACK_PRESSURE_RESTORE);
});

test('applySystemaPushback: pressure clamps at 100', () => {
  const sess = buildSession({ sistema_pressure: 95, sistema_counter: 30 });
  const out = applySystemaPushback(sess);
  assert.equal(out.triggered, true);
  assert.equal(sess.sistema_pressure, 100);
  assert.equal(out.pressure_restored, 5); // only 5 restored (clamped)
});

test('applySystemaPushback: missing sistema_counter (legacy session) → no trigger', () => {
  const sess = buildSession({}); // no sistema_counter field
  const out = applySystemaPushback(sess);
  assert.equal(out.triggered, false);
});

test('applySystemaPushback: reports before/after correctly', () => {
  const sess = buildSession({ sistema_pressure: 30, sistema_counter: 30 });
  const out = applySystemaPushback(sess);
  assert.equal(out.before.sistema_counter, 30);
  assert.equal(out.before.pressure, 30);
  assert.equal(out.after.sistema_counter, 0);
  assert.equal(out.after.pressure, 30 + PUSHBACK_PRESSURE_RESTORE);
});
