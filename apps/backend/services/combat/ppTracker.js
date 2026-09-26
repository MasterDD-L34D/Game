// PP (Power Pool) tracker — combat resource, per-encounter.
//
// Canon: 26-ECONOMY_CANONICAL.md §PP (P0 Q54 default A):
//   - Pool 0..3 (POOL_MAX), reset per-encounter.
//   - Earn: +1 on crit, +1 on kill.
//   - Spend: Ultimate = 3 PP consume all (gated in abilityExecutor.executeAbility).
//
// This mirrors the sgTracker pattern: a tiny pure module so the earn paths in
// session.js performAttack stay unit-testable. Earning is band-neutral (no sim
// party casts a cost_pp ability, and the AI does not key decisions off pp), so
// accumulating PP in sim runs changes no outcome.

'use strict';

const POOL_MAX = 3;

// Clamp-add `amount` PP to a unit, capped at POOL_MAX. Returns the actual gain.
function earn(unit, amount) {
  if (!unit || !(Number(amount) > 0)) return 0;
  const before = Number(unit.pp) || 0;
  const after = Math.min(POOL_MAX, before + Number(amount));
  unit.pp = after;
  return after - before;
}

// +1 PP on a kill (canon). Returns the actual gain (0 if already at cap).
function earnKill(unit) {
  return earn(unit, 1);
}

// +1 PP on a critical hit (canon). Returns the actual gain (0 if already at cap).
function earnCrit(unit) {
  return earn(unit, 1);
}

module.exports = { POOL_MAX, earn, earnKill, earnCrit };
