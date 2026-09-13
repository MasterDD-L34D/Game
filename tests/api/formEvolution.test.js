// M12 Phase A — FormEvolutionEngine unit tests.
// ADR-2026-04-23-m12-phase-a.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { FormEvolutionEngine } = require('../../apps/backend/services/forms/formEvolution');

function vcAxes({ E_I = 0.5, S_N = 0.5, T_F = 0.5, J_P = 0.5 } = {}) {
  return {
    mbti_axes: {
      E_I: { value: E_I },
      S_N: { value: S_N },
      T_F: { value: T_F },
      J_P: { value: J_P },
    },
  };
}

// Baseline — registry loads all 16 MBTI forms (+ NEUTRA if present in YAML).
test('FormEvolutionEngine.snapshot lists 16 forms with metadata', () => {
  const engine = new FormEvolutionEngine();
  const snap = engine.snapshot();
  assert.ok(snap.forms.length >= 16, `expected >=16 forms, got ${snap.forms.length}`);
  for (const f of snap.forms) {
    assert.ok(f.id, 'form has id');
    assert.ok(f.label, `form ${f.id} has label`);
    assert.ok(['NT', 'NF', 'SJ', 'SP'].includes(f.temperament), `form ${f.id} temperament valid`);
    assert.ok(f.axes && typeof f.axes.E_I === 'number', `form ${f.id} axes present`);
  }
});

test('FormEvolutionEngine.getForm returns form or null', () => {
  const engine = new FormEvolutionEngine();
  assert.equal(engine.getForm('INTJ').id, 'INTJ');
  assert.equal(engine.getForm('NOPE'), null);
});

// Evaluate — confidence threshold + PE + cooldown + same-form guards.
test('evaluate: eligible when axes match INTJ and PE sufficient', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 10, current_form_id: null };
  const report = engine.evaluate(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
  );
  assert.equal(report.eligible, true, `reasons=${report.reasons.join(',')}`);
  assert.equal(report.target_form_id, 'INTJ');
  assert.ok(report.confidence_to_target >= 0.55);
  assert.equal(report.pe_cost, 8);
});

test('evaluate: insufficient_pe when PE < cost', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 3, current_form_id: null };
  const report = engine.evaluate(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
  );
  assert.equal(report.eligible, false);
  assert.ok(report.reasons.includes('insufficient_pe'));
});

test('evaluate: confidence_below_threshold when axes far from target', () => {
  const engine = new FormEvolutionEngine();
  // ESFP axes: E_I:0.3, S_N:0.75, T_F:0.3, J_P:0.3 — very far from INTJ.
  const unit = { id: 'u1', pe: 20, current_form_id: null };
  const report = engine.evaluate(unit, vcAxes({ E_I: 0.3, S_N: 0.75, T_F: 0.3, J_P: 0.3 }), 'INTJ');
  assert.equal(report.eligible, false);
  assert.ok(report.reasons.includes('confidence_below_threshold'));
});

test('evaluate: cooldown_active when last_evolve_round within cooldownRounds', () => {
  const engine = new FormEvolutionEngine();
  const unit = {
    id: 'u1',
    pe: 20,
    current_form_id: null,
    last_evolve_round: 5,
  };
  const report = engine.evaluate(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
    { currentRound: 6 }, // only 1 round gap, cooldownRounds=3
  );
  assert.equal(report.eligible, false);
  assert.ok(report.reasons.includes('cooldown_active'));
  assert.ok(report.cooldown_remaining > 0);
});

test('evaluate: already_current_form when unit already in target', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 20, current_form_id: 'INTJ' };
  const report = engine.evaluate(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
  );
  assert.equal(report.eligible, false);
  assert.ok(report.reasons.includes('already_current_form'));
});

test('evaluate: form_not_found for unknown targetFormId', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 20, current_form_id: null };
  const report = engine.evaluate(unit, vcAxes(), 'ZZZZ');
  assert.equal(report.eligible, false);
  assert.ok(report.reasons.includes('form_not_found'));
});

test('evaluate: max_evolutions_reached when cap hit', () => {
  const engine = new FormEvolutionEngine({ options: { maxEvolutions: 2 } });
  const unit = {
    id: 'u1',
    pe: 20,
    current_form_id: 'ESFP',
    evolve_count: 2,
  };
  const report = engine.evaluate(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
  );
  assert.equal(report.eligible, false);
  assert.ok(report.reasons.includes('max_evolutions_reached'));
});

// Options — sorted list for UI.
test('options: returns all forms sorted by confidence desc', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 20, current_form_id: null };
  const scored = engine.evaluateAll(unit, vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }));
  assert.ok(scored.length >= 16);
  // Top candidate: INTJ expected.
  assert.equal(scored[0].target_form_id, 'INTJ');
  // Monotonic non-increasing confidence.
  for (let i = 1; i < scored.length; i += 1) {
    assert.ok(
      scored[i].confidence_to_target <= scored[i - 1].confidence_to_target,
      `order violation at ${i}`,
    );
  }
});

// Evolve — state mutation + deltas.
test('evolve: success mutates unit + returns delta with pe_spent', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 10, current_form_id: null, evolve_count: 0 };
  const result = engine.evolve(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
    { currentRound: 4 },
  );
  assert.equal(result.ok, true, `reason=${result.reason}`);
  assert.equal(unit.current_form_id, 'INTJ');
  assert.equal(unit.pe, 2);
  assert.equal(unit.last_evolve_round, 4);
  assert.equal(unit.evolve_count, 1);
  assert.equal(result.delta.pe_spent, 8);
  assert.equal(result.delta.old_form_id, null);
  assert.equal(result.delta.new_form_id, 'INTJ');
  assert.equal(result.delta.label, 'Stratega');
});

test('evolve: failure preserves unit state', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 3, current_form_id: 'ESFP' };
  const before = { ...unit };
  const result = engine.evolve(unit, vcAxes(), 'INTJ');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient_pe');
  assert.deepEqual(unit, before);
});

test('evolve: chained evolutions respect cooldown', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 20, current_form_id: null };
  // First evolve at round 1.
  const r1 = engine.evolve(unit, vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }), 'INTJ', {
    currentRound: 1,
  });
  assert.equal(r1.ok, true);
  // Attempt another at round 2 (cooldown=3 → fails).
  const r2 = engine.evolve(unit, vcAxes({ E_I: 0.3, S_N: 0.3, T_F: 0.3, J_P: 0.3 }), 'ENFP', {
    currentRound: 2,
  });
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'cooldown_active');
  // Retry at round 5 (gap=4 ≥ 3).
  const r3 = engine.evolve(unit, vcAxes({ E_I: 0.3, S_N: 0.25, T_F: 0.3, J_P: 0.25 }), 'ENFP', {
    currentRound: 5,
  });
  assert.equal(r3.ok, true);
  assert.equal(unit.current_form_id, 'ENFP');
  assert.equal(unit.evolve_count, 2);
});

// Option overrides — custom engine config.
test('engine honors custom options.peCost + options.cooldownRounds', () => {
  const engine = new FormEvolutionEngine({
    options: { peCost: 4, cooldownRounds: 0 },
  });
  const unit = { id: 'u1', pe: 5, current_form_id: null };
  const result = engine.evolve(unit, vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }), 'INTJ');
  assert.equal(result.ok, true);
  assert.equal(result.delta.pe_spent, 4);
});

test('engine allowSameForm option bypasses already_current_form', () => {
  const engine = new FormEvolutionEngine({ options: { allowSameForm: true } });
  const unit = { id: 'u1', pe: 20, current_form_id: 'INTJ' };
  const report = engine.evaluate(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
  );
  assert.ok(!report.reasons.includes('already_current_form'));
});

test('extraPe parameter unlocks evolution when unit.pe insufficient', () => {
  const engine = new FormEvolutionEngine();
  const unit = { id: 'u1', pe: 3, current_form_id: null };
  const report = engine.evaluate(
    unit,
    vcAxes({ E_I: 0.75, S_N: 0.35, T_F: 0.8, J_P: 0.75 }),
    'INTJ',
    { extraPe: 10 },
  );
  assert.equal(report.eligible, true);
  assert.equal(report.pe_available, 13);
});
