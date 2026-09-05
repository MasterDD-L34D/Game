// tests/ai/statusEffectsMarked.test.js
// Unit tests for Status Effects v2 Phase A: marked (PR-2).
// Pattern: spec-reimplementation — logic mirrored locally, no server needed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── marked bonus spec ─────────────────────────────────────────────────────────

function computeMarkedBonusSpec(target) {
  if (!target?.status || !(Number(target.status.marked) > 0)) return 0;
  target.status.marked = 0;
  return 1;
}

describe('marked: attack bonus', () => {
  it('marked active: +1 dmg al prossimo hit, mark consumato', () => {
    const target = { status: { marked: 2 } };
    const bonus = computeMarkedBonusSpec(target);
    assert.equal(bonus, 1);
    assert.equal(target.status.marked, 0);
  });

  it('marked a 0 turns: nessun bonus', () => {
    const target = { status: { marked: 0 } };
    const bonus = computeMarkedBonusSpec(target);
    assert.equal(bonus, 0);
    assert.equal(target.status.marked, 0);
  });

  it('marked assente: nessun bonus, status invariato', () => {
    const target = { status: {} };
    const bonus = computeMarkedBonusSpec(target);
    assert.equal(bonus, 0);
    assert.deepEqual(target.status, {});
  });

  it('marked status null: 0 bonus (graceful)', () => {
    const target = { status: null };
    const bonus = computeMarkedBonusSpec(target);
    assert.equal(bonus, 0);
  });

  it('marked: consumato al primo hit (non persiste)', () => {
    const target = { status: { marked: 1 } };
    computeMarkedBonusSpec(target);
    const secondBonus = computeMarkedBonusSpec(target);
    assert.equal(secondBonus, 0);
  });
});

// ── STATUS_DURATION_CAPS spec per marked ─────────────────────────────────────

function applyStatusWithCapSpec(unit, stato, turns, caps) {
  if (!unit || !unit.status) return;
  const current = Number(unit.status[stato]) || 0;
  const cap = caps[stato];
  const merged = Math.max(current, turns);
  unit.status[stato] = cap !== undefined ? Math.min(cap, merged) : merged;
}

describe('marked duration cap', () => {
  const CAPS = { marked: 2 };

  it('marked cap a 2 turni massimi', () => {
    const unit = { status: { marked: 0 } };
    applyStatusWithCapSpec(unit, 'marked', 5, CAPS);
    assert.equal(unit.status.marked, 2);
  });

  it('marked max-merge sotto cap', () => {
    const unit = { status: { marked: 1 } };
    applyStatusWithCapSpec(unit, 'marked', 2, CAPS);
    assert.equal(unit.status.marked, 2);
  });

  it('marked applicato correttamente a 2T', () => {
    const unit = { status: { marked: 0 } };
    applyStatusWithCapSpec(unit, 'marked', 2, CAPS);
    assert.equal(unit.status.marked, 2);
  });
});
