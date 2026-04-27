// tests/ai/statusEffectsPhaseA.test.js
// Unit tests for Status Effects v2 Phase A: chilled (PR-4).
// Pattern: spec-reimplementation — logic mirrored locally, no server needed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── applyApRefill spec (includes chilled) ────────────────────────────────────

function applyApRefillSpec(unit) {
  if (!unit) return;
  const fractureActive = Number(unit.status?.fracture) > 0;
  let cap = Number(unit.ap || 0);
  if (fractureActive) cap = Math.min(1, cap);
  if (Number(unit.status?.defy_penalty) > 0) cap = Math.max(0, cap - 1);
  if (Number(unit.status?.chilled) > 0) cap = Math.max(1, cap - 1);
  unit.ap_remaining = cap;
}

describe('chilled: AP reset', () => {
  it('chilled active: -1 AP al reset turno', () => {
    const unit = { ap: 2, status: { chilled: 2 } };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 1);
  });

  it('chilled non scende sotto 1 AP', () => {
    const unit = { ap: 1, status: { chilled: 1 } };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 1);
  });

  it('chilled a 0 turns: nessun effetto AP', () => {
    const unit = { ap: 2, status: { chilled: 0 } };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 2);
  });

  it('chilled + fracture: fracture cap 1 prima, chilled lascia a 1 (max 1)', () => {
    const unit = { ap: 3, status: { fracture: 1, chilled: 1 } };
    applyApRefillSpec(unit);
    // fracture: min(1, 3) = 1; chilled: max(1, 1-1) = max(1, 0) = 1
    assert.equal(unit.ap_remaining, 1);
  });

  it('assenza status: ap_remaining = ap pieno', () => {
    const unit = { ap: 2, status: {} };
    applyApRefillSpec(unit);
    assert.equal(unit.ap_remaining, 2);
  });
});

// ── chilled attack penalty spec ───────────────────────────────────────────────

function computeChilledPenaltySpec(actor) {
  return Number(actor?.status?.chilled) > 0 ? 1 : 0;
}

describe('chilled: attack penalty', () => {
  it("chilled active: penalita' 1 al tiro attacco", () => {
    const actor = { status: { chilled: 2 }, attack_mod_bonus: 0 };
    const penalty = computeChilledPenaltySpec(actor);
    assert.equal(penalty, 1);
  });

  it("chilled a 0 turns: nessuna penalita'", () => {
    const actor = { status: { chilled: 0 } };
    const penalty = computeChilledPenaltySpec(actor);
    assert.equal(penalty, 0);
  });

  it("chilled assente: nessuna penalita'", () => {
    const actor = { status: {} };
    const penalty = computeChilledPenaltySpec(actor);
    assert.equal(penalty, 0);
  });
});

// ── STATUS_DURATION_CAPS spec per chilled ─────────────────────────────────────

function applyStatusWithCapSpec(unit, stato, turns, caps) {
  if (!unit || !unit.status) return;
  const current = Number(unit.status[stato]) || 0;
  const cap = caps[stato];
  const merged = Math.max(current, turns);
  unit.status[stato] = cap !== undefined ? Math.min(cap, merged) : merged;
}

describe('chilled duration cap', () => {
  const CAPS = { chilled: 2 };

  it('chilled cap a 2 turni massimi', () => {
    const unit = { status: { chilled: 0 } };
    applyStatusWithCapSpec(unit, 'chilled', 5, CAPS);
    assert.equal(unit.status.chilled, 2);
  });

  it('chilled max-merge sotto cap', () => {
    const unit = { status: { chilled: 1 } };
    applyStatusWithCapSpec(unit, 'chilled', 2, CAPS);
    assert.equal(unit.status.chilled, 2);
  });
});
