// TKT-ADAPTER-ECO-COMBAT phase 2a (spec #2457) -- badlands pilot scenario.
//
// enc_badlands_pilot_01: a NEW badlands encounter whose ENEMIES are populated by
// ecologyCombatAdapter.deriveCombatStats() from REAL badlands species YAML. This is
// the vertical-slice proof that the adapter turns ecology data into battle-ready
// combat units. Players are authored (a fixed quartet) -- only enemies are derived.
//
// NOT hardcore_06/07: this is a fresh scenario with its OWN (provisional) band, so it
// never touches the ratified hardcore bands (census anti-pattern 5).
//
// Band calibration = phase 2b (RATIFIED 2026-05-30): encounter_class 'badlands' with a
// dedicated band (win_rate [0.40,0.60]) in damage_curves.yaml. Three independent N=40
// calibrate_parallel passes landed WR 0.475-0.525 (pooled ~0.51) -> GREEN.
// Finding: the adapter BASELINE stats are correct as-is -- no HP/MOD knob override was
// needed. The combat naturally runs ~30 rounds, so the calibration lever was the
// 'badlands' class turn_limit_defeat=37 stalemate-breaker (timeout band -> ~0). See
// docs/playtest/2026-05-30-badlands-pilot-calibration.md.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const { deriveCombatStats } = require('./ecologyCombatAdapter');

const SPECIES_DIR = path.join(
  process.cwd(),
  'packs',
  'evo_tactics_pack',
  'data',
  'species',
  'badlands',
);

// The pilot enemy roster -- all 5 are in data/ecosystems/badlands.ecosystem.yaml
// (GAP-A: the foodweb accepts them, no all_excluded_fallback). Diverse role_class:
// APEX / HAZARD / PREDATOR / PREY / SUPPORT.
const BADLANDS_ENEMY_IDS = [
  'dune-stalker', // T3 predatore_terziario_apex -> APEX
  'nano-rust-bloom', // T3 minaccia_microbica -> HAZARD
  'ferrocolonia-magnetotattica', // T2 predatore_regolatore_simbionte -> PREDATOR
  'sand-burrower', // T1 erbivoro_primario -> PREY
  'rust-scavenger', // T1 ingegneri_ecosistema -> SUPPORT
];

const _speciesCache = Object.create(null);

/**
 * Load a badlands species YAML and NORMALIZE it to the adapter's input contract.
 * The YAML nests threat_tier under `balance:` (not top-level), so we lift it.
 * @param {string} id species id (== filename without .yaml)
 * @returns {{id, threat_tier, role_trofico, genetic_traits, jobs_bias, morphotype}}
 */
function loadBadlandsSpecies(id) {
  if (_speciesCache[id]) return _speciesCache[id];
  const fpath = path.join(SPECIES_DIR, `${id}.yaml`);
  const parsed = yaml.load(fs.readFileSync(fpath, 'utf8')) || {};
  const norm = {
    id: parsed.id || id,
    threat_tier: (parsed.balance && parsed.balance.threat_tier) || parsed.threat_tier || null,
    role_trofico: parsed.role_trofico || null,
    genetic_traits:
      parsed.genetic_traits && Array.isArray(parsed.genetic_traits.core)
        ? parsed.genetic_traits
        : { core: [] },
    jobs_bias: Array.isArray(parsed.jobs_bias) ? parsed.jobs_bias : [],
    morphotype: parsed.morphotype || null,
  };
  _speciesCache[id] = norm;
  return norm;
}

/** Reset species cache (per test / reload). */
function _resetCache() {
  for (const k of Object.keys(_speciesCache)) delete _speciesCache[k];
}

const BADLANDS_SCENARIO_01 = {
  id: 'enc_badlands_pilot_01',
  name: 'Brulle Ferrose -- Pilota Adapter',
  biome_id: 'badlands',
  encounter_class: 'badlands', // phase 2b: dedicated calibrated band (damage_curves.yaml)
  difficulty_rating: 5,
  estimated_turns: 14,
  grid_size: 10,
  objective: { type: 'elimination' },
  objective_text: 'Elimina la fauna ostile delle Brulle Ferrose.',
  sistema_pressure_start: 70,
  recommended_modulation: 'quartet',
  calibration_status: 'ratified-2026-05-30', // phase 2b N=40x3 GREEN, WR ~0.51
};

function _player(id, job, position, stats) {
  return {
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
  };
}

const ENEMY_POSITIONS = [
  { x: 8, y: 8 },
  { x: 8, y: 5 },
  { x: 8, y: 2 },
  { x: 6, y: 6 },
  { x: 6, y: 3 },
];

/**
 * Build the full roster: authored quartet players + adapter-derived badlands enemies.
 * @returns {Array<object>} battle-ready units (players first, then enemies)
 */
function buildBadlandsUnits01() {
  const players = [
    _player(
      'p_skirmisher',
      'skirmisher',
      { x: 1, y: 8 },
      {
        hp: 10,
        ap: 2,
        mod: 3,
        dc: 12,
        guardia: 0,
        attack_range: 1,
      },
    ),
    _player(
      'p_ranger',
      'ranger',
      { x: 1, y: 6 },
      {
        hp: 10,
        ap: 2,
        mod: 3,
        dc: 12,
        guardia: 0,
        attack_range: 2,
      },
    ),
    _player(
      'p_vanguard',
      'vanguard',
      { x: 1, y: 4 },
      {
        hp: 14,
        ap: 2,
        mod: 2,
        dc: 14,
        guardia: 1,
        attack_range: 1,
      },
    ),
    _player(
      'p_warden',
      'warden',
      { x: 1, y: 2 },
      {
        hp: 11,
        ap: 2,
        mod: 2,
        dc: 13,
        guardia: 1,
        attack_range: 2,
      },
    ),
  ];

  const enemies = BADLANDS_ENEMY_IDS.map((id, i) => {
    const stats = deriveCombatStats(loadBadlandsSpecies(id));
    return {
      ...stats, // hp, ap, mod, dc, guardia, attack_range, traits, job, _adapter
      id: `e_${id.replace(/-/g, '_')}`,
      species: id,
      max_hp: stats.hp,
      position: ENEMY_POSITIONS[i] || { x: 7, y: 7 },
      facing: 'W',
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      elevation: 0,
      // enemy needs a job for AI bias; fall back when jobs_bias is empty (e.g. rust-scavenger)
      job: stats.job || 'vanguard',
    };
  });

  return [...players, ...enemies];
}

// --- S1 calibration scenarios (2026-06-18): ferrimordax elite + ambient pair. ---
// NEW scenarios (NOT the ratified pilot): give the #2850 species their own dedicated
// per-role bands without disturbing enc_badlands_pilot_01's ratified [0.40,0.60].
// Reuse loadBadlandsSpecies + deriveCombatStats + the authored quartet.

// Elite: ferrimordax-rutilus (T3 -> APEX) anchors a harder encounter. Band [0.15,0.30].
const BADLANDS_ELITE_ENEMY_IDS = [
  'ferrimordax-rutilus', // T3 predatore_terziario -> APEX (sole elite anchor)
  'ferrocolonia-magnetotattica', // T2 predatore_regolatore_simbionte -> PREDATOR
  'sand-burrower', // T1 erbivoro_primario -> PREY
  'nano-rust-bloom', // T3 minaccia_microbica -> HAZARD
];

// Ambient: the two new ambient badlands species carry their derived stats into the
// roster; sand-burrower/ferrocolonia fill it to a real encounter. Designed-winnable,
// winnable-floor [0.70,1.00] (NOT a balance-oracle -- the T1 flavor pair sweep).
const BADLANDS_AMBIENT_ENEMY_IDS = [
  'rubrospina-velox', // T1 consumatore_secondario -> PREDATOR
  'ferriscroba-detrita', // T1 decompositore -> SUPPORT
  'sand-burrower', // T1 erbivoro_primario -> PREY
  'ferrocolonia-magnetotattica', // T2 predatore_regolatore_simbionte -> PREDATOR
];

const BADLANDS_ELITE_SCENARIO_01 = {
  id: 'enc_badlands_elite_01',
  name: 'Brulle Ferrose -- Martellatore Apex',
  biome_id: 'badlands',
  encounter_class: 'badlands_elite',
  difficulty_rating: 8,
  estimated_turns: 16,
  grid_size: 10,
  objective: { type: 'elimination' },
  objective_text: 'Sopravvivi al Martellatore Ferroso e alla sua scorta.',
  sistema_pressure_start: 85,
  recommended_modulation: 'quartet',
  calibration_status: 'ratified-2026-06-18', // S1: N=100 WR 0.16 in-band [0.15,0.30] (edm 1.85)
};

const BADLANDS_AMBIENT_SCENARIO_01 = {
  id: 'enc_badlands_ambient_01',
  name: 'Brulle Ferrose -- Fauna Minore',
  biome_id: 'badlands',
  encounter_class: 'badlands_ambient',
  difficulty_rating: 4,
  estimated_turns: 14,
  grid_size: 10,
  objective: { type: 'elimination' },
  objective_text: 'Disperdi la fauna minore delle Brulle Ferrose.',
  sistema_pressure_start: 60,
  recommended_modulation: 'quartet',
  calibration_status: 'designed-winnable', // S1: not a balance-oracle (winnable flavor, master-dd 2026-06-18)
};

/** The fixed authored player quartet (identical to the pilot; biome-orthogonal). */
function _quartetPlayers() {
  return [
    _player(
      'p_skirmisher',
      'skirmisher',
      { x: 1, y: 8 },
      { hp: 10, ap: 2, mod: 3, dc: 12, guardia: 0, attack_range: 1 },
    ),
    _player(
      'p_ranger',
      'ranger',
      { x: 1, y: 6 },
      { hp: 10, ap: 2, mod: 3, dc: 12, guardia: 0, attack_range: 2 },
    ),
    _player(
      'p_vanguard',
      'vanguard',
      { x: 1, y: 4 },
      { hp: 14, ap: 2, mod: 2, dc: 14, guardia: 1, attack_range: 1 },
    ),
    _player(
      'p_warden',
      'warden',
      { x: 1, y: 2 },
      { hp: 11, ap: 2, mod: 2, dc: 13, guardia: 1, attack_range: 2 },
    ),
  ];
}

/** Build adapter-derived enemies from a roster id list (shares ENEMY_POSITIONS). */
function _buildEnemiesFrom(enemyIds) {
  return enemyIds.map((id, i) => {
    const stats = deriveCombatStats(loadBadlandsSpecies(id));
    return {
      ...stats,
      id: `e_${id.replace(/-/g, '_')}`,
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

function buildBadlandsEliteUnits01() {
  return [..._quartetPlayers(), ..._buildEnemiesFrom(BADLANDS_ELITE_ENEMY_IDS)];
}

function buildBadlandsAmbientUnits01() {
  return [..._quartetPlayers(), ..._buildEnemiesFrom(BADLANDS_AMBIENT_ENEMY_IDS)];
}

module.exports = {
  BADLANDS_SCENARIO_01,
  BADLANDS_ENEMY_IDS,
  buildBadlandsUnits01,
  loadBadlandsSpecies,
  _resetCache,
  // S1 calibration scenarios
  BADLANDS_ELITE_SCENARIO_01,
  BADLANDS_ELITE_ENEMY_IDS,
  buildBadlandsEliteUnits01,
  BADLANDS_AMBIENT_SCENARIO_01,
  BADLANDS_AMBIENT_ENEMY_IDS,
  buildBadlandsAmbientUnits01,
};
