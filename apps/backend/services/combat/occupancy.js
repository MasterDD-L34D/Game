// apps/backend/services/combat/occupancy.js
'use strict';

// Shared occupancy-set builder: the "x,y" tile keys of LIVE positioned units.
// Extracted from 6 near-identical inline constructions (abilityExecutor spawn
// tiles, declareSistemaIntents LOS reposition, losForGrid._unitBlocker,
// tools/sim combat-policy occupiedSet + the los-repos / ultima-caccia probes)
// so the key format stays in lockstep with the consumers' contracts
// (stepToRegainLos opts.occupied, session.js "niente overlap" occupancy).
//
// Options mirror the original per-site semantics -- pure dedup, no new policy:
// - excludeId: skip the unit with this id (self-exclusion when planning the
//   actor's own move; the actor's current tile must not block its step).
// - requireFinite: also require Number.isFinite on both coordinates
//   (losForGrid._unitBlocker strictness; default off keeps the raw-key
//   behavior of the other sites).
function occupiedSetFromUnits(units, opts = {}) {
  const { excludeId, requireFinite = false } = opts;
  const occ = new Set();
  for (const u of units || []) {
    if (!u || !u.position || (u.hp ?? 0) <= 0) continue;
    if (excludeId !== undefined && u.id === excludeId) continue;
    if (requireFinite && !(Number.isFinite(u.position.x) && Number.isFinite(u.position.y))) {
      continue;
    }
    occ.add(`${u.position.x},${u.position.y}`);
  }
  return occ;
}

module.exports = { occupiedSetFromUnits };
