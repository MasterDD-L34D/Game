'use strict';

// SPEC-J sez.5 -- CoopOrchestrator lethal-consent integration. Wraps the pure
// lethalConsent state machine with the orchestrator's event stream (_emit) so
// the coop transport (REST open + WS confirm intent) can drive it and broadcast
// the anonymous waiting snapshot.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');

// The orchestrator exposes a listener set via _listeners (most coop tests use
// orch.subscribe). Provide a resilient hookup that works with either.
function listen(orch) {
  const events = [];
  if (typeof orch.subscribe === 'function') orch.subscribe((e) => events.push(e));
  else orch._listeners.add((e) => events.push(e));
  return events;
}

test('openLethalConsent: opens a pending round + emits lethal_consent_open', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1', now: () => 100 });
  const events = listen(orch);
  const snap = orch.openLethalConsent(['p1', 'p2'], { timeoutMs: 5000 });
  assert.equal(snap.total, 2);
  assert.equal(snap.confirmed_count, 0);
  assert.equal(snap.status, 'pending');
  assert.ok(events.some((e) => e.kind === 'lethal_consent_open'));
});

test('confirmLethalConsent: all at-risk confirm -> granted + resolved event', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1', now: () => 1 });
  const events = listen(orch);
  orch.openLethalConsent(['p1', 'p2'], { timeoutMs: 5000 });
  orch.confirmLethalConsent('p1');
  assert.equal(orch.lethalConsentOutcome(), 'soft'); // not all yet
  const snap = orch.confirmLethalConsent('p2');
  assert.equal(snap.all_confirmed, true);
  assert.equal(orch.lethalConsentOutcome(), 'granted');
  assert.ok(events.some((e) => e.kind === 'lethal_consent_confirmed'));
  assert.ok(events.some((e) => e.kind === 'lethal_consent_resolved'));
});

test('confirmLethalConsent: throws when no round is open', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  assert.throws(() => orch.confirmLethalConsent('p1'), /lethal_consent_not_open/);
});

test('evalLethalConsentTimeout: timeout -> soft + resolved event', () => {
  const clock = { t: 0 };
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1', now: () => clock.t });
  const events = listen(orch);
  orch.openLethalConsent(['p1'], { timeoutMs: 1000 });
  clock.t = 1000;
  const snap = orch.evalLethalConsentTimeout();
  assert.equal(snap.status, 'timeout_soft');
  assert.equal(orch.lethalConsentOutcome(), 'soft');
  assert.ok(events.some((e) => e.kind === 'lethal_consent_resolved'));
});

test('evalLethalConsentTimeout: delivery failed -> immediate soft fallback', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1', now: () => 0 });
  orch.openLethalConsent(['p1'], { timeoutMs: 999999 });
  const snap = orch.evalLethalConsentTimeout({ deliveryFailed: true });
  assert.equal(snap.status, 'fallback_soft');
  assert.equal(orch.lethalConsentOutcome(), 'soft');
});

test('lethalConsentSnapshot: null-safe before any round', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  assert.equal(orch.lethalConsentSnapshot(), null);
  assert.equal(orch.lethalConsentOutcome(), 'soft');
});

test('startRun clears a stale consent round (no carry-over across runs)', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1', now: () => 0 });
  orch.openLethalConsent(['p1'], { timeoutMs: 5000 });
  assert.ok(orch.lethalConsentSnapshot());
  orch.startRun({ scenarioStack: ['e1'] });
  assert.equal(orch.lethalConsentSnapshot(), null, 'pending round must not survive a new run');
});

test('evalLethalConsentTimeout (deliveryFailed) resolves a pending round to soft (host-cancel path)', () => {
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1', now: () => 0 });
  const events = listen(orch);
  orch.openLethalConsent(['p1', 'p2'], { timeoutMs: 999999 });
  const snap = orch.evalLethalConsentTimeout({ deliveryFailed: true });
  assert.equal(snap.status, 'fallback_soft');
  assert.equal(orch.lethalConsentOutcome(), 'soft');
  assert.ok(events.some((e) => e.kind === 'lethal_consent_resolved'));
});
