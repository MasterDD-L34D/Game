/**
 * Difficulty Calculator — Q-001 T2.3
 *
 * Implementa SoT §15.4 formula:
 *   raw_score       = (enemy_count × avg_enemy_tier) + terrain_penalty + hazard_count × 2
 *   biome_mult      = biomes[biome_id].difficulty_base
 *   objective_mult  = objective_multipliers[objective.type]
 *   difficulty      = clamp(raw_score × biome_mult × objective_mult, 1, 5)
 *
 * Plus player profile scaling (wesnoth-pattern Easy/Normal/Hard/Nightmare).
 *
 * API pure functions:
 *   const config = loadDifficultyConfig(yaml);
 *   const rating = calculateDifficultyRating(encounter, biomeData, config);
 *   const scaled = applyPlayerProfile(encounter, 'normal', config);
 *
 * Config source: data/core/difficulty.yaml
 * Schema: schemas/evo/difficulty.schema.json
 */

const DEFAULT_TIER_WEIGHTS = { base: 1.0, elite: 2.0, apex: 4.0 };
const DEFAULT_OBJ_MULT = {
  elimination: 1.0,
  capture_point: 1.1,
  escort: 1.5,
  sabotage: 1.3,
  survival: 1.2,
  escape: 1.1,
};
const DEFAULT_TERRAIN_PENALTY = {
  difficult_terrain: 0.1,
  hazard_tile: 0.3,
  elevation_plus_1: 0.15,
  elevation_plus_2: 0.3,
  fog_of_war: 0.5,
};

/**
 * Normalizza config YAML parsed. Accetta shape difficulty.yaml.
 */
function loadDifficultyConfig(yaml) {
  if (!yaml || typeof yaml !== 'object') {
    return {
      tier_weights: DEFAULT_TIER_WEIGHTS,
      objective_multipliers: DEFAULT_OBJ_MULT,
      terrain_penalty_per_cell: DEFAULT_TERRAIN_PENALTY,
      player_difficulty_profiles: {},
    };
  }
  return {
    tier_weights: yaml.tier_weights || DEFAULT_TIER_WEIGHTS,
    objective_multipliers: yaml.objective_multipliers || DEFAULT_OBJ_MULT,
    terrain_penalty_per_cell: yaml.terrain_penalty_per_cell || DEFAULT_TERRAIN_PENALTY,
    player_difficulty_profiles: yaml.player_difficulty_profiles || {},
  };
}

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Somma enemy_count × tier_weight per tutte le wave.
 */
function computeEnemyBudget(encounter, config) {
  if (!encounter || !Array.isArray(encounter.waves)) return 0;
  const weights = config.tier_weights || DEFAULT_TIER_WEIGHTS;
  let total = 0;
  for (const wave of encounter.waves) {
    if (!wave || !Array.isArray(wave.units)) continue;
    for (const u of wave.units) {
      if (!u) continue;
      const tier = u.tier || 'base';
      const weight = weights[tier] ?? DEFAULT_TIER_WEIGHTS.base;
      total += Number(u.count || 0) * weight;
    }
  }
  return total;
}

/**
 * Penalità terrain da condition/fog + conditions list.
 * Approssimazione: conta conditions type e applica penalty.
 */
function computeTerrainPenalty(encounter, config) {
  const penalty = config.terrain_penalty_per_cell || DEFAULT_TERRAIN_PENALTY;
  let total = 0;
  if (!encounter) return 0;
  const conditions = Array.isArray(encounter.conditions) ? encounter.conditions : [];
  for (const c of conditions) {
    if (!c || typeof c.type !== 'string') continue;
    if (c.type === 'fog_of_war') total += penalty.fog_of_war || 0;
    if (c.type === 'stress_wave') total += penalty.difficult_terrain || 0;
    if (c.type === 'terrain_collapse') total += penalty.elevation_plus_1 || 0;
  }
  return total;
}

/**
 * Calcola rating difficulty 1-5 (stars) usando formula SoT §15.4.
 *
 * @param encounter encounter YAML parsed
 * @param biomeData { difficulty_base: number } (default 1.0)
 * @param config output di loadDifficultyConfig
 * @returns integer 1-5
 */
function calculateDifficultyRating(encounter, biomeData, config) {
  const cfg = config || loadDifficultyConfig(null);
  const enemyBudget = computeEnemyBudget(encounter, cfg);
  const terrainPenalty = computeTerrainPenalty(encounter, cfg);
  const hazardCount = 0; // hazard-on-cell non in encounter schema; future enhancement
  const rawScore = enemyBudget + terrainPenalty + hazardCount * 2;

  const biomeMult = (biomeData && biomeData.difficulty_base) ?? 1.0;
  const objType = encounter && encounter.objective ? encounter.objective.type : 'elimination';
  const objMult = cfg.objective_multipliers[objType] ?? 1.0;

  // Normalizza: divisore empirico per mappare encounter shipping su 1-5.
  // Encounter tutorial (enc_tutorial_01: 2 enemies base) → ~2
  // Encounter boss (enc_frattura_03: ~10 enemies mix) → ~5
  const SCALE_DIVISOR = 2.0;
  const scaled = (rawScore / SCALE_DIVISOR) * biomeMult * objMult;
  return Math.round(clamp(scaled, 1, 5));
}

/**
 * Applica player difficulty profile a encounter.
 * Ritorna copia con enemy count scalato + _difficultyProfile field (spec-approved side-effect).
 */
function applyPlayerProfile(encounter, profileId, config) {
  const cfg = config || loadDifficultyConfig(null);
  const profile = cfg.player_difficulty_profiles[profileId];
  if (!encounter || !profile) {
    return encounter;
  }

  const countMult = profile.enemy_count_multiplier ?? 1.0;
  const waves = Array.isArray(encounter.waves) ? encounter.waves : [];
  const scaledWaves = waves.map((wave) => {
    if (!wave || !Array.isArray(wave.units)) return wave;
    return {
      ...wave,
      units: wave.units.map((u) => {
        if (!u) return u;
        const newCount = Math.max(1, Math.round(Number(u.count || 1) * countMult));
        return { ...u, count: newCount };
      }),
    };
  });

  return {
    ...encounter,
    waves: scaledWaves,
    _difficultyProfile: {
      id: profileId,
      label_it: profile.label_it,
      enemy_count_multiplier: countMult,
      enemy_hp_multiplier: profile.enemy_hp_multiplier ?? 1.0,
      enemy_damage_multiplier: profile.enemy_damage_multiplier ?? 1.0,
      player_hp_multiplier: profile.player_hp_multiplier ?? 1.0,
    },
  };
}

module.exports = {
  loadDifficultyConfig,
  calculateDifficultyRating,
  applyPlayerProfile,
  computeEnemyBudget,
  computeTerrainPenalty,
};
