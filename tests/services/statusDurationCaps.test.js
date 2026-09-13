// Audit 2026-04-25 sera (balance-auditor) — kill chain rage stacking review.
// 13 trait on_kill rage sources detected. Pattern Math.max(current, turns)
// re-apply → sustained rage durante kill chain. Cap totale per status type
// previene "permanent rage" scenario.
//
// Test la regola Math.min(CAP, Math.max(current, turns)) è corretta —
// non testa il flow apply_status full (vedi tests/api/* per integration).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// Replica STATUS_DURATION_CAPS shape da apps/backend/routes/session.js.
// Test guard contro drift: aggiornare entrambi i constant + test list se
// si aggiungono nuovi cap.
const STATUS_DURATION_CAPS = {
  rage: 5,
  frenzy: 5,
  panic: 4,
  stunned: 3,
  confused: 3,
  bleeding: 5,
};

function applyStatusWithCap(unit, stato, turns) {
  if (!unit || !unit.status) return null;
  const current = Number(unit.status[stato]) || 0;
  const cap = STATUS_DURATION_CAPS[stato];
  const merged = Math.max(current, turns);
  unit.status[stato] = cap !== undefined ? Math.min(cap, merged) : merged;
  return unit.status[stato];
}

test('rage cap: kill chain non eccede 5 turn anche con re-apply', () => {
  const unit = { status: {} };
  applyStatusWithCap(unit, 'rage', 3); // kill1
  assert.equal(unit.status.rage, 3);
  applyStatusWithCap(unit, 'rage', 5); // kill2 trait con duration 5
  assert.equal(unit.status.rage, 5); // saturated cap
  applyStatusWithCap(unit, 'rage', 7); // kill3 trait con duration 7 (hypothetical)
  assert.equal(unit.status.rage, 5); // capped, NON 7
});

test('rage cap: 4 trait on_kill sequenza non escala oltre cap', () => {
  const unit = { status: {} };
  // simula 4 kill consecutivi, ognuno applica rage 3 turns
  for (let i = 0; i < 4; i += 1) {
    applyStatusWithCap(unit, 'rage', 3);
  }
  assert.equal(unit.status.rage, 3);
  // Ora 1 trait con turns 8 (oltre cap)
  applyStatusWithCap(unit, 'rage', 8);
  assert.equal(unit.status.rage, 5); // hard cap
});

test('frenzy cap mirror rage: 5 turn max', () => {
  const unit = { status: {} };
  applyStatusWithCap(unit, 'frenzy', 10);
  assert.equal(unit.status.frenzy, 5);
});

test('panic cap 4: short caps preservati', () => {
  const unit = { status: {} };
  applyStatusWithCap(unit, 'panic', 6);
  assert.equal(unit.status.panic, 4);
  applyStatusWithCap(unit, 'panic', 2);
  assert.equal(unit.status.panic, 4); // re-apply mantiene cap (Math.max poi Math.min)
});

test('stunned cap 3 + confused cap 3', () => {
  const unit = { status: {} };
  applyStatusWithCap(unit, 'stunned', 5);
  applyStatusWithCap(unit, 'confused', 10);
  assert.equal(unit.status.stunned, 3);
  assert.equal(unit.status.confused, 3);
});

test('bleeding cap 5', () => {
  const unit = { status: {} };
  applyStatusWithCap(unit, 'bleeding', 3);
  applyStatusWithCap(unit, 'bleeding', 7);
  assert.equal(unit.status.bleeding, 5);
});

test('status NON listato in caps: no limit (backward-compat)', () => {
  const unit = { status: {} };
  // focused/linked/fed/healing/attuned/sensed/telepatic_link → no cap
  applyStatusWithCap(unit, 'focused', 10);
  assert.equal(unit.status.focused, 10);
  applyStatusWithCap(unit, 'linked', 99);
  assert.equal(unit.status.linked, 99);
});

test('cap NON danneggia status già al cap (idempotent)', () => {
  const unit = { status: { rage: 5 } };
  applyStatusWithCap(unit, 'rage', 3); // turns < current
  assert.equal(unit.status.rage, 5); // Math.max preserva 5
  applyStatusWithCap(unit, 'rage', 5); // turns == cap
  assert.equal(unit.status.rage, 5);
});

test('cap NON modifica unit senza status field', () => {
  const unit = { hp: 10 }; // no status
  const result = applyStatusWithCap(unit, 'rage', 3);
  assert.equal(result, null);
});

test('registry guard: tutti cap value > 0 + finite', () => {
  for (const [name, cap] of Object.entries(STATUS_DURATION_CAPS)) {
    assert.ok(Number.isFinite(cap), `cap "${name}" non finite: ${cap}`);
    assert.ok(cap > 0, `cap "${name}" non positivo: ${cap}`);
    assert.ok(cap <= 10, `cap "${name}" troppo alto >10: ${cap}`);
  }
});
