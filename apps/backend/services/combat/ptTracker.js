// PT (Punti Tecnica) tracker — combat resource, per-ROUND.
//
// Canon: 26-ECONOMY_CANONICAL.md §PT (P0 Q51 default B):
//   - Pool 0..12 (POOL_MAX = PT_POOL_CAP), reset per-ROUND (round-model
//     ADR-2026-04-15), NOT per-encounter like PP/SG.
//   - Earn: the per-attack technique roll (nat 15-19 +1 / nat 20 +2 / +5 MoS +1)
//     computed in resolveAttack (sessionHelpers.js) and accumulated here.
//   - Spend: cost_pt abilities (3..10, gated numerically in
//     abilityExecutor.executeAbility) + maneuvers (perforazione/spinte/condizioni/
//     combo — canon spend paths, not yet built as discrete combat actions).
//
// Mirrors the ppTracker/sgTracker pattern: a tiny pure module so the earn path in
// session.js performAttack stays unit-testable. Earning is band-neutral — no sim
// party casts a cost_pt ability and the AI keys no decision off pt — so
// accumulating PT in sim runs changes no outcome. NB the same roll value also
// feeds attack damage (1 + pt, M14-A); the pool is an ADDITIVE super-meter on top
// (fighting-game pattern: a hit builds meter while it deals damage), so the damage
// model is untouched (HC scenarios byte-identical).

'use strict';

const POOL_MAX = 12;

// Ensure unit has the pt field. Idempotent (safe to call repeatedly); preserves
// an existing value so save-load + tests carry the pool through.
function initUnit(unit) {
  if (!unit || typeof unit !== 'object') return unit;
  if (typeof unit.pt !== 'number') unit.pt = 0;
  return unit;
}

// Clamp-add `amount` PT to a unit, capped at POOL_MAX. Returns the actual gain.
function earn(unit, amount) {
  if (!unit || !(Number(amount) > 0)) return 0;
  const before = Number(unit.pt) || 0;
  const after = Math.min(POOL_MAX, before + Number(amount));
  unit.pt = after;
  return after - before;
}

// Reset the pool to 0 at round start (per-round, NOT per-encounter).
function resetRound(unit) {
  initUnit(unit);
  unit.pt = 0;
  return unit;
}

// Spend PT. Returns true if sufficient + decrements; false (no-op) otherwise.
function spend(unit, amount = 1) {
  initUnit(unit);
  if (unit.pt < amount) return false;
  unit.pt -= amount;
  return true;
}

module.exports = { POOL_MAX, initUnit, earn, resetRound, spend };
