// M14-A 2026-04-25 — elevation damage multiplier unit tests.
// Pure helper in apps/backend/services/grid/hexGrid.js.
// Ref: docs/research/triangle-strategy-transfer-plan.md:185
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { elevationDamageMultiplier } = require('../../apps/backend/services/grid/hexGrid');

test('elevation: attacker above by 1 → 1.30 (default)', () => {
  const m = elevationDamageMultiplier({ attackerElevation: 2, targetElevation: 1 });
  assert.equal(m, 1.3);
});

test('elevation: attacker above by 2 → still 1.30 (binary gate, not linear)', () => {
  const m = elevationDamageMultiplier({ attackerElevation: 2, targetElevation: 0 });
  assert.equal(m, 1.3);
});

test('elevation: same level → 1.00', () => {
  const m = elevationDamageMultiplier({ attackerElevation: 1, targetElevation: 1 });
  assert.equal(m, 1.0);
});

test('elevation: attacker below → 0.85 (default penalty)', () => {
  const m = elevationDamageMultiplier({ attackerElevation: 0, targetElevation: 2 });
  assert.equal(m, 0.85);
});

test('elevation: custom bonus/penalty honored', () => {
  const above = elevationDamageMultiplier({
    attackerElevation: 2,
    targetElevation: 0,
    bonus: 0.5,
    penalty: -0.25,
  });
  assert.equal(above, 1.5);
  const below = elevationDamageMultiplier({
    attackerElevation: 0,
    targetElevation: 2,
    bonus: 0.5,
    penalty: -0.25,
  });
  assert.equal(below, 0.75);
});

test('elevation: missing elevations default to 0', () => {
  const m = elevationDamageMultiplier({});
  assert.equal(m, 1.0);
  const mAttackerOnly = elevationDamageMultiplier({ attackerElevation: 1 });
  assert.equal(mAttackerOnly, 1.3);
});

test('elevation: never returns below 0.1 floor', () => {
  const m = elevationDamageMultiplier({
    attackerElevation: 0,
    targetElevation: 5,
    bonus: 0.3,
    penalty: -5,
  });
  assert.equal(m, 0.1);
});
