// AI War Defender's advantage modifier — Tier S #10 quick win.
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #10 AI War.
// Decision: Sprint 1 §I autonomous plan 2026-04-27.
//
// Pattern: AI defensive units get +50% attack_mod when defending vs
// player aggressive intent. Mirrors AI War "defender's advantage" rule
// — encourages player to think before attacking entrenched positions.
//
// Wire: resolveAttack via getDefenderAdvantage(attacker, target).
// Trigger conditions:
//   1. target.controlled_by === 'sistema'  (AI side)
//   2. target.role === 'defender' OR target.position is on cover terrain
//   3. attacker.controlled_by === 'player' (only player attacks gated)
//
// Constant: +1 attack_mod (~50% relative to base d20+mod). NOT stack with
// other terrain bonuses — pure attacker-side handicap.

'use strict';

const DEFENDER_ADVANTAGE_BONUS = 1;

const DEFENSIVE_ROLES = new Set(['defender', 'tank', 'guardian', 'sentinel']);

/**
 * Check if target qualifies for defender's advantage.
 *
 * @param {object} attacker - { controlled_by, position }
 * @param {object} target - { controlled_by, role, position, terrain_type? }
 * @param {object} terrainCover - optional terrain info { cover: 0..1 }
 * @returns {{ active: boolean, bonus: number, reason: string }}
 */
function getDefenderAdvantage(attacker, target, terrainCover = null) {
  if (!attacker || !target) return { active: false, bonus: 0, reason: 'missing_units' };
  if (attacker.controlled_by !== 'player') {
    return { active: false, bonus: 0, reason: 'attacker_not_player' };
  }
  if (target.controlled_by !== 'sistema') {
    return { active: false, bonus: 0, reason: 'target_not_sistema' };
  }
  // Eligible if (a) role is defensive OR (b) target is on terrain with cover >= 0.5
  const role = String(target.role || '').toLowerCase();
  const isDefensiveRole = DEFENSIVE_ROLES.has(role);
  const cover = terrainCover && Number(terrainCover.cover) >= 0.5;
  if (!isDefensiveRole && !cover) {
    return { active: false, bonus: 0, reason: 'no_defensive_role_no_cover' };
  }
  return {
    active: true,
    bonus: DEFENDER_ADVANTAGE_BONUS,
    reason: isDefensiveRole ? `defensive_role:${role}` : `terrain_cover:${terrainCover?.cover}`,
  };
}

module.exports = { getDefenderAdvantage, DEFENDER_ADVANTAGE_BONUS, DEFENSIVE_ROLES };
