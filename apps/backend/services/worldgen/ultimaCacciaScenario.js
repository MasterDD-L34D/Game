// SPEC-J first lethal mission scenario-builder -- enc_badlands_ultima_caccia_01.
//
// Materializes "L'Ultima Caccia" into battle-ready units the same way the badlands
// pilot does (badlandsPilotScenario.js): the authored quartet players + ENEMIES
// derived by ecologyCombatAdapter.deriveCombatStats() from REAL badlands species YAML
// (the canonical real-play stats, NOT the ai-driven-sim tier-table approximation).
//
// The /api/session/start encounter_id path supplies only objective/lethal metadata;
// the caller provides the combat units. So a lethal mission needs this builder to be
// playable at the calibrated difficulty (served via GET /api/tutorial/<id>).
//
// Roster = the #3107 roster (master-dd 2026-06-30 verdict: gate on creature-KO-rate,
// keep #3107): apex Skiv (dune-stalker) + 2 echo-wing + 2 rust-scavenger. Canonical
// KO-rate ~0.40 (top edge of the hardcore band [0.25,0.40]); WR ~0.82 -- the party
// usually clears the hunt but ~40% of its creatures fall (permadeath stakes without a
// guaranteed wipe). Evidence: docs/playtest/2026-06-30-ultima-caccia-canonical-wr.md.
//
// lethal: true rides on the scenario object so /session/start arms the per-mission
// lethal flag (inert until LETHAL_MISSIONS_ENABLED + per-player consent; band-neutral).

'use strict';

const { deriveCombatStats } = require('./ecologyCombatAdapter');
const { loadBadlandsSpecies } = require('./badlandsPilotScenario');

// #3107 roster as canonical species (the tier labels in the YAML map to duplicate
// species here; the adapter gives each its real stats). Apex first.
const ULTIMA_CACCIA_ENEMY_IDS = [
  'dune-stalker', // apex Skiv -- the hunted/hunter
  'echo-wing',
  'echo-wing',
  'rust-scavenger',
  'rust-scavenger',
];

const ENEMY_POSITIONS = [
  { x: 8, y: 8 },
  { x: 8, y: 5 },
  { x: 8, y: 2 },
  { x: 6, y: 6 },
  { x: 6, y: 3 },
];

const ULTIMA_CACCIA_SCENARIO = {
  id: 'enc_badlands_ultima_caccia_01',
  name: "L'Ultima Caccia",
  biome_id: 'badlands',
  encounter_class: 'hardcore',
  difficulty_rating: 5,
  estimated_turns: 16,
  grid_size: 10,
  objective: { type: 'elimination' },
  objective_text: "Sopravvivi all'apex delle Brulle Ferrose -- la caccia dove la posta e' reale.",
  sistema_pressure_start: 75,
  recommended_modulation: 'full',
  // SPEC-J: per-mission lethal flag. Inert until LETHAL_MISSIONS_ENABLED && per-player
  // consent (services/combat/lethalDeath.js); a KO is soft-death otherwise (band-neutral).
  lethal: true,
  calibration_status: 'ko-gate-ratified-2026-06-30', // KO-rate ~0.40 in [0.25,0.40]
};

function _quartetPlayers() {
  const mk = (id, job, position, stats) => ({
    id,
    species: 'player',
    job,
    controlled_by: 'player',
    ai_profile: 'player',
    hp: stats.hp,
    max_hp: stats.hp,
    ap: stats.ap,
    mod: stats.mod,
    dc: stats.dc,
    guardia: stats.guardia,
    attack_range: stats.attack_range,
    position,
    facing: 'E',
    elevation: 0,
    traits: [],
  });
  return [
    mk(
      'p_skirmisher',
      'skirmisher',
      { x: 1, y: 8 },
      { hp: 10, ap: 2, mod: 3, dc: 12, guardia: 0, attack_range: 1 },
    ),
    mk(
      'p_ranger',
      'ranger',
      { x: 1, y: 6 },
      { hp: 10, ap: 2, mod: 3, dc: 12, guardia: 0, attack_range: 2 },
    ),
    mk(
      'p_vanguard',
      'vanguard',
      { x: 1, y: 4 },
      { hp: 14, ap: 2, mod: 2, dc: 14, guardia: 1, attack_range: 1 },
    ),
    mk(
      'p_warden',
      'warden',
      { x: 1, y: 2 },
      { hp: 11, ap: 2, mod: 2, dc: 13, guardia: 1, attack_range: 2 },
    ),
  ];
}

function _buildEnemies() {
  return ULTIMA_CACCIA_ENEMY_IDS.map((id, i) => {
    const stats = deriveCombatStats(loadBadlandsSpecies(id));
    return {
      ...stats,
      id: `e_${id.replace(/-/g, '_')}_${i}`,
      species: id,
      max_hp: stats.hp,
      position: ENEMY_POSITIONS[i] || { x: 7, y: 7 },
      facing: 'W',
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      elevation: 0,
      job: stats.job || 'vanguard',
    };
  });
}

/** Full roster: authored quartet players + adapter-derived #3107 enemies. */
function buildUltimaCacciaUnits01() {
  return [..._quartetPlayers(), ..._buildEnemies()];
}

module.exports = {
  ULTIMA_CACCIA_SCENARIO,
  ULTIMA_CACCIA_ENEMY_IDS,
  buildUltimaCacciaUnits01,
};
