'use strict';

// SPEC-J sez.5 trigger-(a) -- automatic lethal-consent timeout timer.
//
// Until now the only way a still-`pending` consent round resolved was: every
// at-risk player confirms (granted), the host aborts via POST /coop/lethal/cancel
// (delivery-fail soft), or some caller manually pokes evalLethalConsentTimeout.
// A device that is ONLINE but whose player simply never responds left the round
// pending forever (the spec's trigger-(a): "device online ma nessuna risposta ->
// timeout post delivery-receipt -> fallback"). This wires a one-shot wall-clock
// timer at openLethalConsent that auto-resolves the round to `timeout_soft` after
// the round's timeout_ms, with NO host intervention. "Mai loop bloccato."
//
// The scheduler (setTimeout/clearTimeout) is injected so the timer is testable
// without real wall-clock. The timeout VALUE remains a master-dd design-call
// (lethalConsent.DEFAULT_TIMEOUT_MS, PROPOSED); this only wires the firing.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CoopOrchestrator } = require('../../../apps/backend/services/coop/coopOrchestrator');
const { createCoopStore } = require('../../../apps/backend/services/coop/coopStore');

// Deterministic fake scheduler: setTimeoutFn records (cb, delay) and returns a
// handle the test can fire/clear manually. unref() is a no-op stub so the
// orchestrator's unref guard is exercised.
function fakeScheduler() {
  const timers = [];
  return {
    timers,
    setTimeoutFn(cb, delay) {
      const handle = { cb, delay, cleared: false, unrefed: false };
      handle.unref = () => {
        handle.unrefed = true;
        return handle;
      };
      timers.push(handle);
      return handle;
    },
    clearTimeoutFn(handle) {
      if (handle) handle.cleared = true;
    },
    fire(handle) {
      if (handle && !handle.cleared) handle.cb();
    },
  };
}

function listen(orch) {
  const events = [];
  orch._listeners.add((e) => events.push(e));
  return events;
}

test('auto-timer: open schedules a one-shot timer at the round timeout_ms', () => {
  const sched = fakeScheduler();
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => 0,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.openLethalConsent(['p1', 'p2'], { timeoutMs: 5000 });
  assert.equal(sched.timers.length, 1, 'one timer scheduled');
  assert.equal(sched.timers[0].delay, 5000, 'delay = round timeout_ms');
  assert.equal(sched.timers[0].unrefed, true, 'timer unref()ed so it never blocks process exit');
});

test('auto-timer: firing it auto-resolves a non-responsive round to timeout_soft', () => {
  const clock = { t: 0 };
  const sched = fakeScheduler();
  const resolved = [];
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => clock.t,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  const events = listen(orch);
  orch.openLethalConsent(['p1', 'p2'], {
    timeoutMs: 1000,
    onTimeout: (snapshot, outcome) => resolved.push({ snapshot, outcome }),
  });
  // Player never responds; wall-clock advances past the timeout, timer fires.
  clock.t = 1000;
  sched.fire(sched.timers[0]);

  assert.equal(orch.lethalConsentSnapshot().status, 'timeout_soft');
  assert.equal(orch.lethalConsentOutcome(), 'soft', 'lethal does NOT proceed');
  assert.equal(resolved.length, 1, 'onTimeout fired exactly once');
  assert.equal(resolved[0].outcome, 'soft');
  assert.equal(resolved[0].snapshot.status, 'timeout_soft');
  assert.ok(
    events.some((e) => e.kind === 'lethal_consent_resolved'),
    'emits lethal_consent_resolved',
  );
});

test('auto-timer: all-confirm before the timer fires clears it (no soft override)', () => {
  const clock = { t: 0 };
  const sched = fakeScheduler();
  const resolved = [];
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => clock.t,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.openLethalConsent(['p1'], {
    timeoutMs: 1000,
    onTimeout: (snapshot, outcome) => resolved.push({ snapshot, outcome }),
  });
  orch.confirmLethalConsent('p1'); // last at-risk -> granted
  assert.equal(orch.lethalConsentOutcome(), 'granted');
  assert.equal(sched.timers[0].cleared, true, 'timer cleared on granted');

  // Even a stray fire must NOT downgrade a granted round nor call onTimeout.
  clock.t = 5000;
  sched.fire(sched.timers[0]); // cleared -> fake no-op anyway
  assert.equal(orch.lethalConsentOutcome(), 'granted');
  assert.equal(resolved.length, 0, 'onTimeout never called after granted');
});

test('auto-timer: host cancel (delivery-fail) clears the timer', () => {
  const sched = fakeScheduler();
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => 0,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.openLethalConsent(['p1'], { timeoutMs: 1000 });
  orch.evalLethalConsentTimeout({ deliveryFailed: true }); // cancel path
  assert.equal(orch.lethalConsentOutcome(), 'soft');
  assert.equal(sched.timers[0].cleared, true, 'timer cleared on cancel resolution');
});

test('auto-timer: starting a new run clears a dangling timer', () => {
  const sched = fakeScheduler();
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => 0,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.openLethalConsent(['p1'], { timeoutMs: 1000 });
  orch.startRun({ scenarioStack: ['enc_a'] });
  assert.equal(sched.timers[0].cleared, true, 'timer cleared on run reset');
  assert.equal(orch.lethalConsentSnapshot(), null, 'consent round dropped on reset');
});

test('auto-timer: no at-risk players -> granted, no timer scheduled', () => {
  const sched = fakeScheduler();
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => 0,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  const snap = orch.openLethalConsent([], { timeoutMs: 1000 });
  assert.equal(snap.status, 'granted');
  assert.equal(sched.timers.length, 0, 'no timer for a trivially-granted round');
});

test('auto-timer: re-opening clears the previous timer before scheduling a new one', () => {
  const sched = fakeScheduler();
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => 0,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.openLethalConsent(['p1'], { timeoutMs: 1000 });
  orch.openLethalConsent(['p2'], { timeoutMs: 2000 });
  assert.equal(sched.timers[0].cleared, true, 'first timer cleared on re-open');
  assert.equal(sched.timers.length, 2, 'second timer scheduled');
  assert.equal(sched.timers[1].delay, 2000);
});

test('auto-timer: stray fire on an already-soft round does not double-emit or call onTimeout', () => {
  const clock = { t: 0 };
  const sched = fakeScheduler();
  const resolved = [];
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => clock.t,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.openLethalConsent(['p1'], {
    timeoutMs: 1000,
    onTimeout: (snapshot, outcome) => resolved.push({ snapshot, outcome }),
  });
  // Resolve to soft via the cancel path first (clears the handle).
  orch.evalLethalConsentTimeout({ deliveryFailed: true });
  // Force-fire the (now cleared) handle to simulate a race; must be inert.
  clock.t = 1000;
  sched.timers[0].cb(); // bypass cleared guard to prove orchestrator-side guard
  assert.equal(resolved.length, 0, 'onTimeout not called when round already resolved');
});

test('auto-timer: a sub-ms-early fire still resolves (deadline-pinned, no silent hang)', () => {
  // Regression for the dual-clock race: libuv fires the timer ~1ms before
  // Date.now() shows the full elapse. The orchestrator pins `now` to the exact
  // deadline so the round resolves anyway (the "unattended fallback" must not
  // silently fail). Without the fix evalTimeout would read elapsed < timeout_ms
  // and leave the round stuck `pending` with the handle already nulled.
  const clock = { t: 0 };
  const sched = fakeScheduler();
  const resolved = [];
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => clock.t,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.openLethalConsent(['p1'], {
    timeoutMs: 1000,
    onTimeout: (snapshot, outcome) => resolved.push({ snapshot, outcome }),
  });
  clock.t = 999; // 1ms early relative to wall-clock at fire time
  sched.fire(sched.timers[0]);
  assert.equal(orch.lethalConsentSnapshot().status, 'timeout_soft', 'resolves despite early fire');
  assert.equal(resolved.length, 1, 'onTimeout still fires');
  assert.equal(resolved[0].outcome, 'soft');
});

test('auto-timer: advancing the scenario clears a dangling timer (per-scenario consent)', () => {
  const sched = fakeScheduler();
  const orch = new CoopOrchestrator({
    roomCode: 'ABCD',
    hostId: 'h1',
    now: () => 0,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.startRun({ scenarioStack: ['enc_a', 'enc_b'] });
  orch.openLethalConsent(['p1'], { timeoutMs: 1000 });
  const armed = sched.timers[sched.timers.length - 1];
  orch.advanceScenarioOrEnd(); // next_scenario branch
  assert.equal(armed.cleared, true, 'timer cleared on scenario advance');
  assert.equal(orch.lethalConsentSnapshot(), null, 'consent round dropped on advance');
});

test('auto-timer: coopStore.remove drains an armed timer before evicting the orchestrator', () => {
  const sched = fakeScheduler();
  const store = createCoopStore({
    lobby: { getRoom: () => ({ hostId: 'h1' }) },
    orchestratorOptions: {
      now: () => 0,
      setTimeoutFn: sched.setTimeoutFn,
      clearTimeoutFn: sched.clearTimeoutFn,
    },
  });
  const orch = store.getOrCreate('ABCD');
  orch.openLethalConsent(['p1'], { timeoutMs: 1000 });
  assert.equal(sched.timers.length, 1, 'timer armed');
  store.remove('ABCD');
  assert.equal(sched.timers[0].cleared, true, 'timer cleared on room teardown (no pinned orch)');
});

test('auto-timer: default scheduler wires real global timers (smoke)', () => {
  // No injection -> the orchestrator must default to the real global timer fns
  // and arm a genuine handle. We do NOT await the real fire here: the handle is
  // unref()ed (so it never blocks process exit), and the firing path itself is
  // already proven deterministically by the fake-scheduler tests above.
  const orch = new CoopOrchestrator({ roomCode: 'ABCD', hostId: 'h1' });
  assert.equal(orch._setTimeoutFn, setTimeout, 'defaults to global setTimeout');
  assert.equal(orch._clearTimeoutFn, clearTimeout, 'defaults to global clearTimeout');
  orch.openLethalConsent(['p1'], { timeoutMs: 60000 });
  assert.ok(orch._lethalConsentTimer, 'a real timer handle is armed');
  // Clean up: resolving the round must clear the real timer (no dangling timer).
  orch.evalLethalConsentTimeout({ deliveryFailed: true });
  assert.equal(orch._lethalConsentTimer, null, 'real timer cleared on resolution');
});
