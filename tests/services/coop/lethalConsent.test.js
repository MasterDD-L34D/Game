'use strict';

// SPEC-J sez.5 -- lethal consent state machine (per-player device confirm, NOT
// quorum; SPEC-K 6.4). Pure: no transport. Anti-deadlock (sez.5): two distinct
// fallback triggers -- (a) timeout post delivery-receipt, (b) delivery failed
// -> immediate fallback. Fallback default = NON parte lethal (soft). The
// snapshot is anonymous/aggregated (F5: no names, just counts).
//
// The timeout VALUE is a tuning design-call (master-dd); here it is a parameter
// with a PROPOSED default -- the state machine logic is value-neutral.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const lc = require('../../../apps/backend/services/coop/lethalConsent');

// --- open ----------------------------------------------------------------

test('open: pending with the dedup-ed at-risk roster', () => {
  const s = lc.open(['p1', 'p2', 'p2', '', null], { now: 1000, timeoutMs: 5000 });
  assert.deepEqual(s.at_risk, ['p1', 'p2']);
  assert.equal(s.status, 'pending');
  assert.equal(s.opened_at, 1000);
  assert.equal(s.timeout_ms, 5000);
});

test('open: no at-risk players -> trivially granted (nobody to consent)', () => {
  const s = lc.open([], { now: 0 });
  assert.equal(s.status, 'granted');
  assert.equal(lc.outcome(s), 'granted');
});

test('open: default timeout is a finite proposed value (design-call param)', () => {
  const s = lc.open(['p1']);
  assert.ok(Number.isFinite(s.timeout_ms) && s.timeout_ms > 0);
});

// --- confirm -------------------------------------------------------------

test('confirm: an at-risk player confirms; all confirmed -> granted', () => {
  let s = lc.open(['p1', 'p2'], { now: 0, timeoutMs: 5000 });
  s = lc.confirm(s, 'p1', { now: 10 });
  assert.equal(s.status, 'pending');
  assert.equal(lc.outcome(s), 'soft'); // not all yet -> still soft
  s = lc.confirm(s, 'p2', { now: 20 });
  assert.equal(s.status, 'granted');
  assert.equal(s.resolved_at, 20);
  assert.equal(lc.outcome(s), 'granted');
});

test('confirm: a non-at-risk player is ignored (cannot grant for others)', () => {
  let s = lc.open(['p1'], { now: 0 });
  s = lc.confirm(s, 'intruder', { now: 5 });
  assert.equal(s.status, 'pending');
  assert.equal(Object.keys(s.confirmed).length, 0);
});

test('confirm: idempotent re-confirm does not double-resolve / change ts', () => {
  let s = lc.open(['p1'], { now: 0 });
  s = lc.confirm(s, 'p1', { now: 5 });
  const firstResolved = s.resolved_at;
  s = lc.confirm(s, 'p1', { now: 99 });
  assert.equal(s.status, 'granted');
  assert.equal(s.resolved_at, firstResolved); // unchanged
});

// --- anti-deadlock (sez.5) -----------------------------------------------

test('evalTimeout: timeout post-receipt -> soft fallback (status timeout_soft)', () => {
  let s = lc.open(['p1'], { now: 0, timeoutMs: 1000 });
  s = lc.evalTimeout(s, { now: 999 });
  assert.equal(s.status, 'pending'); // not yet
  s = lc.evalTimeout(s, { now: 1000 });
  assert.equal(s.status, 'timeout_soft');
  assert.equal(lc.outcome(s), 'soft');
});

test('markDeliveryFailed + evalTimeout: delivery fail -> immediate soft fallback', () => {
  let s = lc.open(['p1'], { now: 0, timeoutMs: 999999 });
  s = lc.markDeliveryFailed(s);
  s = lc.evalTimeout(s, { now: 1 }); // well before timeout
  assert.equal(s.status, 'fallback_soft');
  assert.equal(lc.outcome(s), 'soft');
});

test('evalTimeout: already granted is not downgraded by a late timeout check', () => {
  let s = lc.open(['p1'], { now: 0, timeoutMs: 100 });
  s = lc.confirm(s, 'p1', { now: 10 });
  s = lc.evalTimeout(s, { now: 99999 });
  assert.equal(s.status, 'granted');
  assert.equal(lc.outcome(s), 'granted');
});

// --- snapshot (F5 anonymous aggregate) -----------------------------------

test('snapshot: anonymous counts only, no player ids/names leaked', () => {
  let s = lc.open(['p1', 'p2', 'p3'], { now: 0 });
  s = lc.confirm(s, 'p1', { now: 1 });
  const snap = lc.snapshot(s);
  assert.equal(snap.total, 3);
  assert.equal(snap.confirmed_count, 1);
  assert.equal(snap.pending_count, 2);
  assert.equal(snap.all_confirmed, false);
  assert.equal(snap.status, 'pending');
  // F5: no roster of who confirmed / who is pending.
  assert.equal(snap.at_risk, undefined);
  assert.equal(snap.confirmed, undefined);
});

// --- outcome / isGranted -------------------------------------------------

test('isGranted: true only on granted, false on every soft state', () => {
  assert.equal(lc.isGranted(lc.open([], { now: 0 })), true); // trivial
  assert.equal(lc.isGranted(lc.open(['p1'], { now: 0 })), false); // pending
});
