// tests/ai/statusEffectsBurning.test.js
// Unit tests for Status Effects v2 Phase A: burning (PR-3).
// Pattern: spec-reimplementation — logic mirrored locally, no server needed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── burning spec ──────────────────────────────────────────────────────────────

function applyBurningSpec(unit, bleedingEvents) {
  if (!unit || !unit.status || unit.hp <= 0) return;
  const burnTurns = Number(unit.status.burning) || 0;
  if (burnTurns <= 0) return;
  const dmg = 2;
  unit.hp = Math.max(0, unit.hp - dmg);
  bleedingEvents.push({ unit_id: unit.id, damage: dmg, hp_after: unit.hp, killed: unit.hp === 0 });
}

describe('burning DoT', () => {
  it('burning active: -2 HP per turno', () => {
    const unit = { id: 'u1', hp: 8, status: { burning: 3 } };
    const events = [];
    applyBurningSpec(unit, events);
    assert.equal(unit.hp, 6);
    assert.equal(events.length, 1);
    assert.equal(events[0].damage, 2);
    assert.equal(events[0].killed, false);
  });

  it('burning a 0 turns = nessun danno', () => {
    const unit = { id: 'u2', hp: 5, status: { burning: 0 } };
    const events = [];
    applyBurningSpec(unit, events);
    assert.equal(unit.hp, 5);
    assert.equal(events.length, 0);
  });

  it('burning riduce HP a 0 (non sotto)', () => {
    const unit = { id: 'u3', hp: 1, status: { burning: 2 } };
    const events = [];
    applyBurningSpec(unit, events);
    assert.equal(unit.hp, 0);
    assert.equal(events[0].killed, true);
  });

  it('burning assente in status: nessun danno', () => {
    const unit = { id: 'u4', hp: 5, status: {} };
    const events = [];
    applyBurningSpec(unit, events);
    assert.equal(unit.hp, 5);
    assert.equal(events.length, 0);
  });

  it("unit gia' morta: burning non applicato", () => {
    const unit = { id: 'u5', hp: 0, status: { burning: 3 } };
    const events = [];
    applyBurningSpec(unit, events);
    assert.equal(unit.hp, 0);
    assert.equal(events.length, 0);
  });
});

// ── STATUS_DURATION_CAPS spec per burning ────────────────────────────────────

function applyStatusWithCapSpec(unit, stato, turns, caps) {
  if (!unit || !unit.status) return;
  const current = Number(unit.status[stato]) || 0;
  const cap = caps[stato];
  const merged = Math.max(current, turns);
  unit.status[stato] = cap !== undefined ? Math.min(cap, merged) : merged;
}

describe('burning duration cap', () => {
  const CAPS = { burning: 3 };

  it('burning cap a 3 turni massimi', () => {
    const unit = { status: { burning: 0 } };
    applyStatusWithCapSpec(unit, 'burning', 5, CAPS);
    assert.equal(unit.status.burning, 3);
  });

  it('burning max-merge: prende il maggiore (ma cappato)', () => {
    const unit = { status: { burning: 2 } };
    applyStatusWithCapSpec(unit, 'burning', 1, CAPS);
    assert.equal(unit.status.burning, 2);
  });

  it('burning applicato correttamente sotto cap', () => {
    const unit = { status: { burning: 0 } };
    applyStatusWithCapSpec(unit, 'burning', 3, CAPS);
    assert.equal(unit.status.burning, 3);
  });
});
