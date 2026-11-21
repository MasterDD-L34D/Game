// tests/ai/statusEffectsSlowed.test.js
// Unit tests for Status Effects v2 Phase A: slowed (PR-1).
// Pattern: spec-reimplementation — logic mirrored locally, no server needed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── applyApRefill spec (includes slowed) ─────────────────────────────────────

function applyApRefillSpec(unit) {
  if (!unit) return;
  const fractureActive = Number(unit.status?.fracture) > 0;
  let cap = Number(unit.ap || 0);
  if (fractureActive) cap = Math.min(1, cap);
  if (Number(unit.status?.defy_penalty) > 0) cap = Math.max(0, cap - 1);
  if (Number(unit.status?.chilled) > 0) cap = Math.max(1, cap - 1);
  if (Number(unit.status?.slowed) > 0) cap = Math.max(1, cap - 1);
  unit.ap_remaining = cap;
}

describe('slowed: AP reset', () => {
  it('slowed active: -1 AP al reset turno', () => {
    const unit = { ap: 2, status: { slowed: 2 } };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 1);
  });

  it('slowed non scende sotto 1 AP', () => {
    const unit = { ap: 1, status: { slowed: 3 } };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 1);
  });

  it('slowed a 0 turns: nessun effetto AP', () => {
    const unit = { ap: 2, status: { slowed: 0 } };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 2);
  });

  it('slowed + fracture: fracture cap 1 prima, slowed lascia a 1 (max 1)', () => {
    const unit = { ap: 3, status: { fracture: 1, slowed: 1 } };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 1);
  });

  it('assenza status: ap_remaining = ap pieno', () => {
    const unit = { ap: 2, status: {} };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 2);
  });
});

// ── STATUS_DURATION_CAPS spec per slowed ─────────────────────────────────────

function applyStatusWithCapSpec(unit, stato, turns, caps) {
  if (!unit || !unit.status) return;
  const current = Number(unit.status[stato]) || 0;
  const cap = caps[stato];
  const merged = Math.max(current, turns);
  unit.status[stato] = cap !== undefined ? Math.min(cap, merged) : merged;
}

describe('slowed duration cap', () => {
  const CAPS = { slowed: 3 };

  it('slowed cap a 3 turni massimi', () => {
    const unit = { status: { slowed: 0 } };
    applyStatusWithCapSpec(unit, 'slowed', 5, CAPS);
    assert.equal(unit.status.slowed, 3);
  });

  it('slowed max-merge sotto cap', () => {
    const unit = { status: { slowed: 2 } };
    applyStatusWithCapSpec(unit, 'slowed', 1, CAPS);
    assert.equal(unit.status.slowed, 2);
  });

  it('slowed applicato correttamente a 3T', () => {
    const unit = { status: { slowed: 0 } };
    applyStatusWithCapSpec(unit, 'slowed', 3, CAPS);
    assert.equal(unit.status.slowed, 3);
  });
});
