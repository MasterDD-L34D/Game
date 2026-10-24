'use strict';
// fase-1b-3a recruit->combat stat-resolution. Turns a recruited NPC (id + species)
// into a battle-ready PLAYER unit using the SAME canonical derivation the worldgen
// pilot and the fase-2 enemy scaling use: ecologyCombatAdapter.deriveCombatStats()
// from REAL species YAML. So a recruited combatant carries FAITHFUL base stats (no
// invented numbers) -> attrition replacements are measured on canon, not a guess.
//
// Recruit pool (MVP) = the badlands species, so we reuse the existing, tested
// loadBadlandsSpecies loader (5 species, diverse role_class). fase-2 can broaden the
// pool to a general species loader without changing this unit's shape.
//
// deriveCombatStats is tolerant (soft-defaults every missing ecology field, never
// throws) -> a missing/odd species still yields a viable unit (T1 PREDATOR baseline).

const { deriveCombatStats } = require('../../apps/backend/services/worldgen/ecologyCombatAdapter');
const {
  loadBadlandsSpecies,
} = require('../../apps/backend/services/worldgen/badlandsPilotScenario');

// Mirror of badlandsPilotScenario unit assembly, but controlled_by 'player'. Adds the
// session-engine fields deriveCombatStats omits (max_hp, position, controlled_by,
// status). initiative is intentionally omitted (the engine defaults it, as the
// badlands enemies do).
function resolveRecruitUnit({ npcId, speciesId, position } = {}) {
  const stats = deriveCombatStats(loadBadlandsSpecies(speciesId));
  return {
    ...stats, // hp, ap, mod, dc, guardia, attack_range, traits, job, _adapter
    id: npcId,
    species: speciesId,
    max_hp: stats.hp,
    position: position || { x: 2, y: 1 },
    facing: 'E',
    controlled_by: 'player',
    ai_profile: 'player',
    elevation: 0,
    // enemies need a job for AI bias; players keep one too (fallback when jobs_bias
    // is empty, mirroring badlandsPilotScenario).
    job: stats.job || 'vanguard',
    status: {},
  };
}

module.exports = { resolveRecruitUnit };
