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
const { lineOfSightClear } = require('../grid/squareLos');
const { terrainAtFromFeatures } = require('./moveCost');
const { terrainBlocksLos } = require('./losBlockers');

function losClearOnGrid(grid, fromPos, toPos) {
  if (process.env.COMBAT_LOS_ENABLED !== 'true') return true;
  const terrainAt = terrainAtFromFeatures((grid && grid.terrain_features) || []);
  return lineOfSightClear(fromPos, toPos, (x, y) => terrainBlocksLos(terrainAt(x, y)));
}

module.exports = { losClearOnGrid };
