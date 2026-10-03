// apps/backend/services/combat/losForGrid.js
'use strict';

// Combat LOS shared rule (COMBAT_LOS_ENABLED, default ON since the 2026-07-06
// owner flip -- ratify N=40 in docs/research/2026-07-06-los-flip-ratify-n40.md;
// explicit opt-out via COMBAT_LOS_ENABLED=false for probes/A-B).
// Single source of truth for "can the attacker at `from` see the target at `to`
// on this grid" -- consumed by the human attack path (routes/session.js
// losGateBlocks), the AI target seam (services/ai/policy.js losClearForAi) and
// the batch-sim (tools/sim/combat-policy.js) so all three run the identical
// predicate. Extracted at the 3rd consumer (slice-1 QUALITY.md fast-follow) to
// drop the duplicated 2-line body and the implicit sim -> ai/policy.js coupling.
//
// Returns true when the target is VISIBLE. Flag opted-out ('false') -> always
// true (byte-identical to pre-LOS behavior). Pure + exported for tests.
//
// unit-blocking fast-follow (closes the slice-1 "shoot-through-allies" known
// gap): takes an optional `units` arg (live units on this grid). A strictly-
// interposed live unit blocks LOS same as a terrain blocker, gated by the
// `units_block_los` config (data/core/balance/los.yaml, default false) so this
// stays dormant/byte-identical until an owner explicitly flips the config.
const { lineOfSightClear } = require('../grid/squareLos');
const { terrainAtFromFeatures } = require('./moveCost');
const { terrainBlocksLos, unitsBlockLos } = require('./losBlockers');
const { occupiedSetFromUnits } = require('./occupancy');

// Pure occupancy predicate from live units, gated by `enabled` (the units_block_los
// config). Disabled OR no units -> no-op (keeps terrain-only slice-1 behavior
// byte-identical). Endpoints are excluded by lineOfSightClear, so a unit on the
// attacker/target cell never self-blocks. Exported for testing.
function _unitBlocker(units, enabled) {
  if (!enabled || !Array.isArray(units) || units.length === 0) return () => false;
  const occ = occupiedSetFromUnits(units, { requireFinite: true });
  return (x, y) => occ.has(`${x},${y}`);
}

function losClearOnGrid(grid, fromPos, toPos, units) {
  if (process.env.COMBAT_LOS_ENABLED === 'false') return true;
  const terrainAt = terrainAtFromFeatures((grid && grid.terrain_features) || []);
  const unitBlocks = _unitBlocker(units, unitsBlockLos());
  return lineOfSightClear(
    fromPos,
    toPos,
    (x, y) => terrainBlocksLos(terrainAt(x, y)) || unitBlocks(x, y),
  );
}

module.exports = { losClearOnGrid, _unitBlocker };
