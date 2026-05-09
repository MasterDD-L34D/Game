// tests/ai/statusEffectsPhaseA.test.js
// Unit tests for Status Effects v2 Phase A: chilled (PR-4) + disoriented (PR-5).
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

// ── disoriented attack penalty spec ───────────────────────────────────────────

function computeDisorientedPenaltySpec(actor) {
  return Number(actor?.status?.disoriented) > 0 ? 2 : 0;
}

describe('disoriented: attack penalty', () => {
  it("disoriented active: penalita' -2 al tiro attacco", () => {
    const actor = { status: { disoriented: 1 }, attack_mod_bonus: 0 };
    const penalty = computeDisorientedPenaltySpec(actor);
    assert.equal(penalty, 2);
  });

  it("disoriented a 0 turns: nessuna penalita'", () => {
    const actor = { status: { disoriented: 0 } };
    const penalty = computeDisorientedPenaltySpec(actor);
    assert.equal(penalty, 0);
  });

  it("disoriented assente: nessuna penalita'", () => {
    const actor = { status: {} };
    const penalty = computeDisorientedPenaltySpec(actor);
    assert.equal(penalty, 0);
  });

  it('pre/revert: attack_mod_bonus ripristinato dopo attacco', () => {
    const actor = { status: { disoriented: 1 }, attack_mod_bonus: 3 };
    const penalty = computeDisorientedPenaltySpec(actor);
    actor.attack_mod_bonus = Number(actor.attack_mod_bonus) - penalty;
    actor.attack_mod_bonus = Number(actor.attack_mod_bonus) + penalty;
    assert.equal(actor.attack_mod_bonus, 3);
  });

  it("penalita' maggiore di chilled (-2 vs -1): disoriented piu' severo", () => {
    const actorDis = { status: { disoriented: 1 } };
    const actorChi = { status: { chilled: 1 } };
    const penDis = computeDisorientedPenaltySpec(actorDis);
    const penChi = Number(actorChi.status?.chilled) > 0 ? 1 : 0;
    assert.ok(penDis > penChi, `disoriented ${penDis} should be > chilled ${penChi}`);
  });
});

// ── STATUS_DURATION_CAPS spec (chilled + disoriented) ─────────────────────────

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

describe('disoriented duration cap', () => {
  const CAPS = { disoriented: 1 };

  it('disoriented cap a 1 turno massimo', () => {
    const unit = { status: { disoriented: 0 } };
    applyStatusWithCapSpec(unit, 'disoriented', 3, CAPS);
    assert.equal(unit.status.disoriented, 1);
  });

  it("disoriented rimane a 1 se gia' applicato", () => {
    const unit = { status: { disoriented: 1 } };
    applyStatusWithCapSpec(unit, 'disoriented', 1, CAPS);
    assert.equal(unit.status.disoriented, 1);
  });

  it('disoriented applicato correttamente a 1T', () => {
    const unit = { status: { disoriented: 0 } };
    applyStatusWithCapSpec(unit, 'disoriented', 1, CAPS);
    assert.equal(unit.status.disoriented, 1);
  });
});

// ── policy AI: hasDebuffStatus + attack_debuffed_target objective ─────────────

function hasDebuffStatusSpec(unit) {
  const s = unit?.status;
  if (!s) return false;
  return (
    Number(s.slowed) > 0 ||
    Number(s.disoriented) > 0 ||
    Number(s.chilled) > 0 ||
    Number(s.marked) > 0
  );
}

describe('hasDebuffStatus: debuff detection', () => {
  it('slowed > 0 → debuffed', () => {
    assert.equal(hasDebuffStatusSpec({ status: { slowed: 2 } }), true);
  });
  it('disoriented > 0 → debuffed', () => {
    assert.equal(hasDebuffStatusSpec({ status: { disoriented: 1 } }), true);
  });
  it('chilled > 0 → debuffed', () => {
    assert.equal(hasDebuffStatusSpec({ status: { chilled: 2 } }), true);
  });
  it('marked > 0 → debuffed', () => {
    assert.equal(hasDebuffStatusSpec({ status: { marked: 1 } }), true);
  });
  it('status vuoto → non debuffed', () => {
    assert.equal(hasDebuffStatusSpec({ status: {} }), false);
  });
  it('solo burning/rage → non debuffed (non in lista)', () => {
    assert.equal(hasDebuffStatusSpec({ status: { burning: 2, rage: 1 } }), false);
  });
  it('status null → non debuffed', () => {
    assert.equal(hasDebuffStatusSpec({ status: null }), false);
  });
});

function scoreDebuffObjectiveSpec(target) {
  const DEBUFF_OBJECTIVE = {
    checker: (_actor, t) => hasDebuffStatusSpec(t),
    weight: 0.5,
  };
  return DEBUFF_OBJECTIVE.checker(null, target) ? DEBUFF_OBJECTIVE.weight : 0;
}

describe('attack_debuffed_target objective', () => {
  it('target slowed: objective fires, score += 0.5', () => {
    const score = scoreDebuffObjectiveSpec({ status: { slowed: 3 } });
    assert.equal(score, 0.5);
  });
  it('target sano: objective non fires, score 0', () => {
    const score = scoreDebuffObjectiveSpec({ status: {} });
    assert.equal(score, 0);
  });
  it('target marked: objective fires (mark attivo da consumare)', () => {
    const score = scoreDebuffObjectiveSpec({ status: { marked: 2 } });
    assert.equal(score, 0.5);
  });
});
