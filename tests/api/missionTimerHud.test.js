// M13 P6 Phase B — mission timer HUD + auto-timeout inference tests.
// Unit-level: pure logic helpers (no DOM).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Mirror: client-side inference logic matches server-side tick contract.
function inferOutcomeFromTimer(timer, declaredOutcome) {
  if (declaredOutcome === 'defeat') return declaredOutcome;
  if (timer?.expired && (!declaredOutcome || declaredOutcome === 'victory')) {
    return 'timeout';
  }
  return declaredOutcome || null;
}

test('inferOutcome: no timer → passthrough', () => {
  assert.equal(inferOutcomeFromTimer(null, 'victory'), 'victory');
  assert.equal(inferOutcomeFromTimer({ expired: false }, 'victory'), 'victory');
});

test('inferOutcome: expired + no declared → timeout', () => {
  assert.equal(inferOutcomeFromTimer({ expired: true }, null), 'timeout');
  assert.equal(inferOutcomeFromTimer({ expired: true }, undefined), 'timeout');
});

test('inferOutcome: expired + victory declared → override to timeout', () => {
  assert.equal(inferOutcomeFromTimer({ expired: true }, 'victory'), 'timeout');
});

test('inferOutcome: expired + defeat declared → respect defeat (not overridden)', () => {
  assert.equal(inferOutcomeFromTimer({ expired: true }, 'defeat'), 'defeat');
});

test('inferOutcome: not expired → passthrough', () => {
  assert.equal(inferOutcomeFromTimer({ expired: false, warning: true }, 'victory'), 'victory');
});

// Timer HUD state determination (pure logic for CSS class selection).
function hudClassFromTimer(timer) {
  if (!timer || !timer.enabled) return 'hidden';
  const classes = [];
  const remaining = Number(timer.remaining_turns ?? 0);
  if (timer.warning === true || remaining <= 3) classes.push('mt-warning');
  if (timer.expired === true) classes.push('mt-expired');
  return classes.join(' ') || 'mt-active';
}

test('hudClass: disabled → hidden', () => {
  assert.equal(hudClassFromTimer({ enabled: false }), 'hidden');
  assert.equal(hudClassFromTimer(null), 'hidden');
});

test('hudClass: enabled + high remaining → mt-active (no warning)', () => {
  assert.equal(hudClassFromTimer({ enabled: true, remaining_turns: 12 }), 'mt-active');
});

test('hudClass: remaining ≤ 3 → mt-warning', () => {
  assert.equal(hudClassFromTimer({ enabled: true, remaining_turns: 3 }), 'mt-warning');
  assert.equal(hudClassFromTimer({ enabled: true, remaining_turns: 1 }), 'mt-warning');
});

test('hudClass: warning flag explicit → mt-warning even high remaining', () => {
  assert.equal(
    hudClassFromTimer({ enabled: true, remaining_turns: 10, warning: true }),
    'mt-warning',
  );
});

test('hudClass: expired stacks with warning', () => {
  assert.equal(
    hudClassFromTimer({ enabled: true, remaining_turns: 0, expired: true }),
    'mt-warning mt-expired',
  );
});
