// Status Effects Phase A — unit tests per 5 stati Tier 1.
// Pattern: spec reimplementation isolata (no server, no session state).
// Ogni gruppo testa la logica canonica del suo stato con fixture minimali.
//
// Stati coperti (uno per PR sequenziale):
//   PR-1 slowed      → AP cap -1 al reset turno (min 1)
//   PR-2 marked      → prossimo attacco +1 dmg, mark consumato
//   PR-3 burning     → 2 PT danno/turno (DoT)
//   PR-4 chilled     → -1 AP + -1 attack_mod_bonus
//   PR-5 disoriented → -2 attack_mod_bonus, turns: 1

const test = require('node:test');
const assert = require('node:assert/strict');

// ──────────────────────────────────────────────────────────────────────────
// PR-1 : slowed
// Spec: al reset AP, se unit.status.slowed > 0 → cap = max(1, base - 1)
// Questo rispecchia la logica in session.js resetAp + pqPath + roundBridge.
// ──────────────────────────────────────────────────────────────────────────
function applyApResetSpec(unit) {
  if (!unit) return;
  const fractureActive = Number(unit.status?.fracture) > 0;
  let apCap = fractureActive ? Math.min(1, Number(unit.ap || 0)) : Number(unit.ap || 0);
  if (Number(unit.status?.slowed) > 0) apCap = Math.max(1, apCap - 1);
  unit.ap_remaining = apCap;
}

test('slowed: -1 AP al reset turno', () => {
  const unit = { ap: 2, ap_remaining: 2, status: { slowed: 2 } };
  applyApResetSpec(unit);
  assert.equal(unit.ap_remaining, 1);
});

test('slowed: non scende sotto 1 AP (min garantito)', () => {
  const unit = { ap: 1, ap_remaining: 1, status: { slowed: 3 } };
  applyApResetSpec(unit);
  assert.equal(unit.ap_remaining, 1);
});

test('slowed: zero turns = nessun effetto su AP', () => {
  const unit = { ap: 2, ap_remaining: 2, status: { slowed: 0 } };
  applyApResetSpec(unit);
  assert.equal(unit.ap_remaining, 2);
});
