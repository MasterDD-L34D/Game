// apps/backend/services/combat/losForGrid.js
'use strict';

// Combat LOS slice-1 shared rule (COMBAT_LOS_ENABLED, default OFF).
// Single source of truth for "can the attacker at `from` see the target at `to`
// on this grid" -- consumed by the human attack path (routes/session.js
// losGateBlocks), the AI target seam (services/ai/policy.js losClearForAi) and
// the batch-sim (tools/sim/combat-policy.js) so all three run the identical
// predicate. Extracted at the 3rd consumer (slice-1 QUALITY.md fast-follow) to
// drop the duplicated 2-line body and the implicit sim -> ai/policy.js coupling.
//
// Returns true when the target is VISIBLE. Flag OFF -> always true
// (band-neutral, byte-identical to pre-LOS behavior). Pure + exported for tests.
//
// unit-blocking fast-follow (closes the slice-1 "shoot-through-allies" known
// gap): takes an optional `units` arg (live units on this grid). A strictly-
// interposed live unit blocks LOS same as a terrain blocker, gated by the
// `units_block_los` config (data/core/balance/los.yaml, default false) so this
// stays dormant/byte-identical until an owner explicitly flips the config.
const { lineOfSightClear } = require('../grid/squareLos');
const { terrainAtFromFeatures } = require('./moveCost');
const { terrainBlocksLos, unitsBlockLos } = require('./losBlockers');

// Pure occupancy predicate from live units, gated by `enabled` (the units_block_los
// config). Disabled OR no units -> no-op (keeps terrain-only slice-1 behavior
// byte-identical). Endpoints are excluded by lineOfSightClear, so a unit on the
// attacker/target cell never self-blocks. Exported for testing.
function _unitBlocker(units, enabled) {
  if (!enabled || !Array.isArray(units) || units.length === 0) return () => false;
  const occ = new Set();
  for (const u of units) {
    if (
      u &&
      u.position &&
      (u.hp ?? 0) > 0 &&
      Number.isFinite(u.position.x) &&
      Number.isFinite(u.position.y)
    ) {
      occ.add(`${u.position.x},${u.position.y}`);
    }
  }
  return (x, y) => occ.has(`${x},${y}`);
}

function losClearOnGrid(grid, fromPos, toPos, units) {
  if (process.env.COMBAT_LOS_ENABLED !== 'true') return true;
  const terrainAt = terrainAtFromFeatures((grid && grid.terrain_features) || []);
  const unitBlocks = _unitBlocker(units, unitsBlockLos());
  return lineOfSightClear(
    fromPos,
    toPos,
    (x, y) => terrainBlocksLos(terrainAt(x, y)) || unitBlocks(x, y),
  );
}

module.exports = { losClearOnGrid, _unitBlocker };
