// V2 Tri-Sorgente — reward card power-level resolver (SPEC-G sez. 4).
//
// Master-DD ratified 2026-06-17. Inert declarative metadata: this field has
// ZERO behavioral consumer (no scoring/selection/application reads it) — it is a
// UX-safety declaration ("niente furto di agency opaco"). The actual control path
// (controllo_reale + consent on private device) is SPEC-K, not built here.
//
// Power levels (data/core/rewards/*.yaml `power_level:` field):
//   suggerimento   — soft bias (FairMath/weight) on future scoring/options.
//   vista          — reveals information (telegraph, lore, intel).
//   controllo_reale— grants tangible control over ANOTHER actor; requires explicit
//                    consent on a private device (SPEC-K). ZERO such cards today.
//
// Fail-closed default: a card missing/invalid power_level is treated as the safest
// level (`suggerimento`).

'use strict';

const POWER_LEVELS = Object.freeze(['suggerimento', 'vista', 'controllo_reale']);
const DEFAULT_POWER_LEVEL = 'suggerimento';

/**
 * Resolve a card's power_level fail-closed.
 *
 * @param {object} card — reward card definition
 * @returns {string} the card's power_level if a valid enum member, else
 *   `suggerimento` (the safest, lowest-authority level).
 */
function resolvePowerLevel(card) {
  const declared = card && card.power_level;
  if (POWER_LEVELS.includes(declared)) return declared;
  return DEFAULT_POWER_LEVEL;
}

module.exports = {
  resolvePowerLevel,
  POWER_LEVELS,
  DEFAULT_POWER_LEVEL,
};
