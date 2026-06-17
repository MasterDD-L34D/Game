// =============================================================================
// biomeMemory -- OD-059 (#1673): campaign-scoped READ-ONLY NARRATIVE
// biome-familiarity carry-over.
//
// WHY (issue #1673 / OD-059): the only "biome turns" primitive in the build is
// the per-UNIT, MECHANICAL `unit.cumulative_biome_turns` -- which is session-
// scoped and inert (no cross-encounter carry-over, no consumer). #1673 asked for
// a campaign-scoped familiarity that PERSISTS across encounters of the same run.
// Master-dd verdict (OD-059) = option A: reuse the pure-fn PATTERN (mirror of
// `services/worldgen/biomeWound.js`) and build a SEPARATE carry-over layer.
//
// HARD CONSTRAINT (SoT 19.3 narrative freeze) -- band-safe BY CONSTRUCTION:
//   * This layer is READ-ONLY NARRATIVE. It writes ONLY to `campaign.biomeMemory`
//     and surfaces STRUCTURED DATA. It must NEVER write `unit.cumulative_biome_turns`,
//     touch a combat resolver / mutationTriggerEvaluator / reinforcementSpawner /
//     biomePopulation / pressure. The AI combat sim reads NONE of these fields =>
//     no N=40 needed.
//   * `biomeMemory` (campaign, narrative) and `cumulative_biome_turns` (unit,
//     mechanical, inert) are SEPARATE namespaces -- intentionally NOT coupled.
//   * Structured data only: `{ [unitId]: { [biomeId]: turns } }`. Narrative
//     rendering + thresholds = master-dd / Godot design-call, flagged downstream.
// =============================================================================

'use strict';

/**
 * Accumulate per-unit per-biome familiarity turns. Pure: returns a NEW nested
 * object, never mutates the input. Tolerant of garbage input (treated as empty /
 * no-op). Mirror of `biomeWound.woundBiome` immutable shape.
 *
 * @param {object} memory prior state `{ [unitId]: { [biomeId]: int } }` (or garbage)
 * @param {string} unitId player unit id
 * @param {string} biomeId biome id
 * @param {number} delta turns to add for this encounter (coerced to non-neg int)
 * @returns {object} a new `{ [unitId]: { [biomeId]: int } }`
 */
function accumulate(memory, unitId, biomeId, delta) {
  // Tolerant clone: any non-object (null/undefined/string/number) -> empty base.
  const base = memory && typeof memory === 'object' ? memory : {};
  const next = {};
  for (const uid of Object.keys(base)) {
    const inner = base[uid];
    next[uid] = inner && typeof inner === 'object' ? { ...inner } : {};
  }
  // No-op (return the clone) when the keys are missing -- never write garbage keys.
  if (!unitId || !biomeId) return next;
  // Coerce delta: non-finite -> no-op add (0); floor floats; clamp negatives to 0.
  const d = Number(delta);
  const add = Number.isFinite(d) ? Math.max(0, Math.floor(d)) : 0;
  if (!next[unitId]) next[unitId] = {};
  const cur = Number(next[unitId][biomeId]) || 0;
  next[unitId][biomeId] = cur + add;
  return next;
}

module.exports = { accumulate };
