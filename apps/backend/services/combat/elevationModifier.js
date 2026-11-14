// TKT-M14-A 2026-05-11 — Triangle Strategy elevation + terrain hit modifier.
//
// Complementary to M14-B `computePositionalDamage` (damage multiplier).
// This module returns *attack-roll* modifiers (hit chance, not damage):
//   - elevation delta ±1 → ±1 attack_mod
//   - terrain_type at tile → defender or attacker modifier (cover, melee penalty,
//     elemental synergy)
//
// Pure stateless. Caller adds returned values to attack_mod_bonus / defense_mod_bonus
// before the d20 roll, reverts after (mirrors statusMods / timeMods pattern in
// session.js performAttack).
//
// Tile metadata reads from `unit._tile` (caller-populated) OR from
// `unit.terrain_type` directly. When missing → all modifiers = 0 (no-op).
//
// Ref: docs/planning/2026-05-11-big-items-scope-tickets-bundle.md (TKT-M14-A §1)

'use strict';

const TERRAIN_TYPES = ['none', 'forest', 'water', 'cinder', 'stone'];

/**
 * Compute elevation-based attack modifier.
 * High ground (delta ≥ +1) → +1 attack. Low ground (delta ≤ -1) → -1 attack.
 *
 * @param {{ elevation?: number }} attackerTile
 * @param {{ elevation?: number }} targetTile
 * @returns {{ attackBonus: number, elevationDelta: number, reason: string }}
 */
function computeElevationModifier(attackerTile, targetTile) {
  const aElev = Number.isFinite(Number(attackerTile?.elevation))
    ? Number(attackerTile.elevation)
    : 0;
  const tElev = Number.isFinite(Number(targetTile?.elevation)) ? Number(targetTile.elevation) : 0;
  const delta = aElev - tElev;
  let attackBonus = 0;
  let reason = 'level_ground';
  if (delta >= 1) {
    attackBonus = 1;
    reason = 'high_ground';
  } else if (delta <= -1) {
    attackBonus = -1;
    reason = 'low_ground';
  }
  return { attackBonus, elevationDelta: delta, reason };
}

/**
 * Compute terrain-type modifier for an attack resolution.
 * Bias bundle (Triangle Strategy + tactics RPG conventions):
 *   - target on forest → +1 defense (cover)
 *   - melee attacker on water → -1 attack (footing penalty)
 *   - fire-channel attacker on cinder tile → +1 damage_mod (ember boost)
 *   - melee attacker on stone → +1 attack (stable footing)
 *
 * @param {{ terrain_type?: string }} attackerTile
 * @param {{ terrain_type?: string }} targetTile
 * @param {{ channel?: string, attack_distance?: number }} attackOpts
 * @returns {{ attackBonus: number, defenseBonus: number, damageBonus: number, reasons: string[] }}
 *   attackBonus  — applied to attacker.attack_mod_bonus
 *   defenseBonus — applied to target.defense_mod_bonus (positive = harder to hit)
 *   damageBonus  — applied to flat damage step post-hit
 *   reasons      — log labels for telemetry
 */
function computeTerrainModifier(attackerTile, targetTile, attackOpts = {}) {
  let attackBonus = 0;
  let defenseBonus = 0;
  let damageBonus = 0;
  const reasons = [];
  const aTerrain = normalizeTerrain(attackerTile?.terrain_type);
  const tTerrain = normalizeTerrain(targetTile?.terrain_type);
  const channel = String(attackOpts?.channel || '').toLowerCase();
  const dist = Number.isFinite(Number(attackOpts?.attack_distance))
    ? Number(attackOpts.attack_distance)
    : null;
  const isMelee = dist === null ? true : dist <= 1;

  // Forest: defender +1 defense (cover bonus on TARGET tile).
  if (tTerrain === 'forest') {
    defenseBonus += 1;
    reasons.push('cover_forest');
  }
  // Water: melee attacker -1 attack (unstable footing on ATTACKER tile).
  if (aTerrain === 'water' && isMelee) {
    attackBonus -= 1;
    reasons.push('footing_water_melee');
  }
  // Cinder + fire channel: +1 damage on ATTACKER tile (ember synergy).
  if (aTerrain === 'cinder' && channel === 'fuoco') {
    damageBonus += 1;
    reasons.push('ember_synergy_fire');
  }
  // Stone: melee attacker +1 attack (stable footing on ATTACKER tile).
  if (aTerrain === 'stone' && isMelee) {
    attackBonus += 1;
    reasons.push('footing_stone_melee');
  }

  return { attackBonus, defenseBonus, damageBonus, reasons };
}

/**
 * Convenience: combined elevation + terrain delta in one call.
 * Useful for callers (session.js performAttack) to apply atomically.
 *
 * @returns {{ attackBonus, defenseBonus, damageBonus, elevationDelta, reasons }}
 */
function computeCombatPositionModifier(attackerTile, targetTile, attackOpts = {}) {
  const elev = computeElevationModifier(attackerTile, targetTile);
  const terr = computeTerrainModifier(attackerTile, targetTile, attackOpts);
  return {
    attackBonus: elev.attackBonus + terr.attackBonus,
    defenseBonus: terr.defenseBonus,
    damageBonus: terr.damageBonus,
    elevationDelta: elev.elevationDelta,
    elevationReason: elev.reason,
    terrainReasons: terr.reasons,
  };
}

function normalizeTerrain(raw) {
  const v = String(raw || 'none').toLowerCase();
  return TERRAIN_TYPES.includes(v) ? v : 'none';
}

module.exports = {
  computeElevationModifier,
  computeTerrainModifier,
  computeCombatPositionModifier,
  TERRAIN_TYPES,
};
