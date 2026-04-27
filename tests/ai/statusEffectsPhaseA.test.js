// Status Effects Phase A — unit tests per 5 stati Tier 1.
// Pattern: spec reimplementation isolata (no server, no session state).
// Ogni gruppo testa la logica canonica del suo stato con fixture minimali.
//
// Stati coperti (uno per PR sequenziale):
//   PR-2 marked      → prossimo attacco +1 dmg, mark consumato su hit

const test = require('node:test');
const assert = require('node:assert/strict');

// ──────────────────────────────────────────────────────────────────────────
// PR-2 : marked
// Spec: se target.status.marked > 0 al momento del hit → bonus +1, mark = 0.
// Rispecchia la logica in session.js performAttack damage block.
// ──────────────────────────────────────────────────────────────────────────
function computeMarkedBonusSpec(target) {
  if (!target?.status || !(Number(target.status.marked) > 0)) return 0;
  target.status.marked = 0;
  return 1;
}

test('marked: target marcato → +1 dmg, mark azzerato dopo hit', () => {
  const target = { status: { marked: 2 } };
  const bonus = computeMarkedBonusSpec(target);
  assert.equal(bonus, 1);
  assert.equal(target.status.marked, 0);
});

test('marked: target non marcato → 0 bonus, nessun effetto', () => {
  const target = { status: {} };
  const bonus = computeMarkedBonusSpec(target);
  assert.equal(bonus, 0);
  assert.deepEqual(target.status, {});
});

test('marked: target status null → 0 bonus (graceful)', () => {
  const target = { status: null };
  const bonus = computeMarkedBonusSpec(target);
  assert.equal(bonus, 0);
});
