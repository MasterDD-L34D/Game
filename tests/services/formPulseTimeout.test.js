'use strict';

// Form-Pulse trait system v2 -- Piece 3: random-fill + 2-stage timeout (spec 2026-06-23).
// A player who never submits must not block the branco emergence forever. On timeout their
// bars are ROLLED at random (real random via an injectable seam, FROZEN by persisting them
// into formPulses -> reconnect-safe) and feed BOTH the branco aggregate and their own minor
// trait. Flag-gated (v2) so OFF = today's behavior (a non-submitter blocks until they submit).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  rollRandomFormAxes,
  formPulseTimeoutMs,
  PROPOSED_BRANCO_TRAIT_MAPPING,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

const AXES = Object.keys(PROPOSED_BRANCO_TRAIT_MAPPING);

// Deterministic fake scheduler (mirror coopOrchestratorLethalAutoTimer): record (cb,delay),
// fire/clear manually, unref() stub.
function fakeScheduler() {
  const timers = [];
  return {
    timers,
    setTimeoutFn(cb, delay) {
      const h = { cb, delay, cleared: false, unrefed: false };
      h.unref = () => ((h.unrefed = true), h);
      timers.push(h);
      return h;
    },
    clearTimeoutFn(h) {
      if (h) h.cleared = true;
    },
    fire(h) {
      if (h && !h.cleared) h.cb();
    },
  };
}

function mk(opts = {}) {
  const orch = new CoopOrchestrator({
    roomCode: 'FPT',
    hostId: 'h',
    now: () => 1,
    randomFn: opts.randomFn,
    setTimeoutFn: opts.setTimeoutFn,
    clearTimeoutFn: opts.clearTimeoutFn,
  });
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  return orch;
}

test('rollRandomFormAxes: all 5 axes, each in [-1, 1], driven by the injected rng', () => {
  let i = 0;
  const seq = [0.0, 0.5, 1.0, 0.25, 0.75];
  const out = rollRandomFormAxes(() => seq[i++]);
  assert.deepEqual(Object.keys(out).sort(), [...AXES].sort());
  for (const ax of AXES) {
    assert.ok(out[ax] >= -1 && out[ax] <= 1, `${ax} in range`);
  }
  // 2*v-1: 0.0 -> -1, 0.5 -> 0, 1.0 -> 1.
  assert.equal(out[AXES[0]], -1);
  assert.equal(out[AXES[1]], 0);
  assert.equal(out[AXES[2]], 1);
});

test('_autoFillFormPulses: a missing player gets rolled bars (persisted) + emergence runs', () => {
  // Constant rng 0.8 -> every rolled axis = 2*0.8-1 = 0.6 -> dominant = first axis (+).
  const orch = mk({ randomFn: () => 0.8 });
  process.env.FORM_PULSE_TRAIT_V2_ENABLED = 'true';
  try {
    const ALL = ['p1', 'p2'];
    orch.submitCharacter('p1', { name: 'p1', form_id: 'INTJ' }, { allPlayerIds: ALL });
    orch.submitCharacter('p2', { name: 'p2', form_id: 'INTJ' }, { allPlayerIds: ALL });
    // Only p1 submits; p2 never does.
    orch.submitFormPulse('p1', { axes: rollRandomFormAxes(() => 0.5) }, { allPlayerIds: ALL });
    assert.equal(orch.formPulses.has('p2'), false, 'p2 not yet present');

    const filled = orch.autoFillFormPulses(ALL);
    assert.deepEqual(filled, ['p2'], 'p2 was auto-filled');
    assert.ok(orch.formPulses.has('p2'), 'p2 bars persisted (frozen roll)');
    assert.equal(orch.formPulses.get('p2').auto, true, 'flagged auto');
    assert.ok(orch.emergentBrancoTrait, 'emergence ran after the fill');
  } finally {
    delete process.env.FORM_PULSE_TRAIT_V2_ENABLED;
  }
});

test('_autoFillFormPulses: nothing to fill when all present -> no-op', () => {
  const orch = mk({ randomFn: () => 0.5 });
  const ALL = ['p1'];
  orch.submitFormPulse('p1', { axes: rollRandomFormAxes(() => 0.5) }, { allPlayerIds: ALL });
  const filled = orch.autoFillFormPulses(ALL);
  assert.deepEqual(filled, [], 'no missing players -> nothing filled');
});

// --- Step B: 2-stage timer (warn -> auto) ---

function timed(extra = {}) {
  const sched = fakeScheduler();
  const orch = mk({
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
    randomFn: () => 0.8,
    ...extra,
  });
  return { sched, orch };
}

test('armFormPulseTimer: schedules warn + auto timers (unref-ed) at the given delays', () => {
  const { sched, orch } = timed();
  orch.armFormPulseTimer(['p1', 'p2'], { warnMs: 45000, autoMs: 75000 });
  assert.equal(sched.timers.length, 2);
  assert.equal(sched.timers[0].delay, 45000, 'warn delay');
  assert.equal(sched.timers[1].delay, 75000, 'auto delay');
  assert.ok(sched.timers[0].unrefed && sched.timers[1].unrefed, 'both unref()ed');
});

test('armFormPulseTimer: empty expected -> no timers', () => {
  const { sched, orch } = timed();
  orch.armFormPulseTimer([], { warnMs: 45000, autoMs: 75000 });
  assert.equal(sched.timers.length, 0);
});

test('armFormPulseTimer: warn fire emits a warning + onWarn(pending) while still pending', () => {
  const { sched, orch } = timed();
  const events = [];
  orch._listeners.add((e) => events.push(e));
  orch.submitFormPulse(
    'p1',
    { axes: rollRandomFormAxes(() => 0.8) },
    { allPlayerIds: ['p1', 'p2'] },
  );
  const warnCalls = [];
  orch.armFormPulseTimer(['p1', 'p2'], {
    warnMs: 45000,
    autoMs: 75000,
    onWarn: (p) => warnCalls.push(p),
  });
  sched.fire(sched.timers[0]);
  assert.ok(
    events.some((e) => e.kind === 'form_pulse_timeout_warning'),
    'warning emitted',
  );
  assert.deepEqual(warnCalls, [['p2']], 'onWarn got the pending list');
});

test('armFormPulseTimer: auto fire rolls + fills missing + onAuto(filled) + emergence runs', () => {
  process.env.FORM_PULSE_TRAIT_V2_ENABLED = 'true';
  try {
    const { sched, orch } = timed();
    const ALL = ['p1', 'p2'];
    orch.submitCharacter('p1', { name: 'p1', form_id: 'INTJ' }, { allPlayerIds: ALL });
    orch.submitCharacter('p2', { name: 'p2', form_id: 'INTJ' }, { allPlayerIds: ALL });
    orch.submitFormPulse('p1', { axes: rollRandomFormAxes(() => 0.8) }, { allPlayerIds: ALL });
    const autoCalls = [];
    orch.armFormPulseTimer(ALL, { warnMs: 45000, autoMs: 75000, onAuto: (f) => autoCalls.push(f) });
    sched.fire(sched.timers[1]);
    assert.ok(orch.formPulses.has('p2'), 'p2 auto-filled (rolled bars persisted)');
    assert.deepEqual(autoCalls, [['p2']], 'onAuto got the filled list');
    assert.ok(orch.emergentBrancoTrait, 'emergence ran after the auto-fill');
  } finally {
    delete process.env.FORM_PULSE_TRAIT_V2_ENABLED;
  }
});

test('armFormPulseTimer: all submitted before fire -> auto is inert (no extra fill)', () => {
  const { sched, orch } = timed();
  orch.submitFormPulse('p1', { axes: rollRandomFormAxes(() => 0.8) }, { allPlayerIds: ['p1'] });
  orch.armFormPulseTimer(['p1'], { warnMs: 45000, autoMs: 75000 });
  sched.timers[1].cb();
  assert.equal([...orch.formPulses.keys()].length, 1, 'no extra auto-fill when already ready');
});

test('armFormPulseTimer: re-arm clears the previous pair', () => {
  const { sched, orch } = timed();
  orch.armFormPulseTimer(['p1'], { warnMs: 1000, autoMs: 2000 });
  orch.armFormPulseTimer(['p1'], { warnMs: 3000, autoMs: 4000 });
  assert.ok(sched.timers[0].cleared && sched.timers[1].cleared, 'first pair cleared');
  assert.equal(sched.timers.length, 4);
});

test('armFormPulseTimer: starting a new run clears dangling form-pulse timers', () => {
  const sched = fakeScheduler();
  // Fresh orch (phase=lobby), arm BEFORE the run so startRun is the reset that clears it.
  const orch = new CoopOrchestrator({
    roomCode: 'FPT',
    hostId: 'h',
    now: () => 1,
    setTimeoutFn: sched.setTimeoutFn,
    clearTimeoutFn: sched.clearTimeoutFn,
  });
  orch.armFormPulseTimer(['p1'], { warnMs: 1000, autoMs: 2000 });
  orch.startRun({ scenarioStack: ['enc_a'] });
  assert.ok(sched.timers[0].cleared && sched.timers[1].cleared, 'cleared on run reset');
});

test('formPulseTimeoutMs: defaults 45s/+30s; env overrides + opt-in per-player scaling', () => {
  const d = formPulseTimeoutMs({}, 2);
  assert.equal(d.warnMs, 45000);
  assert.equal(d.autoMs, 75000);
  const scaled = formPulseTimeoutMs({ FORM_PULSE_PER_PLAYER_MS: '10000' }, 4);
  assert.equal(scaled.warnMs, 45000 + 40000, 'per-player scaling when opted in');
  assert.equal(scaled.autoMs, 45000 + 40000 + 30000);
  const custom = formPulseTimeoutMs(
    { FORM_PULSE_WARN_MS: '20000', FORM_PULSE_GRACE_MS: '5000' },
    2,
  );
  assert.equal(custom.warnMs, 20000);
  assert.equal(custom.autoMs, 25000);
});
