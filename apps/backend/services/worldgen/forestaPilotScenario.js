// S2 (2026-06-18) -- foresta_temperata pilot scenario (#2850 follow-up).
//
// enc_foresta_pilot_01: a foresta encounter whose ENEMIES are populated by
// ecologyCombatAdapter.deriveCombatStats() from REAL foresta_temperata species YAML
// (the adapter is biome-agnostic -- same path as badlandsPilotScenario). This gives the
// two promoted foresta grazers (nebulocornis-mollis, arboryxis-lenis) a real calibration
// vehicle: they are exercised alongside the canonical foresta apex (lupus-temperatus) so
// their adapter-derived stats actually move the win-rate.
//
// NOT in the gated canonical-suite oracle manifest (mirrors the badlands adapter
// scenarios): ratified in damage_curves.yaml + docs/playtest, runnable via SCENARIO_MAP,
// but kept OUT of the per-PR combat gate.

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
  'foresta_temperata',
);

// Adapter-derived enemy roster -- the 2 promoted grazers + the canonical foresta apex +
// a hazard + a keystone support, for role_class diversity (APEX / HAZARD / PREY / SUPPORT).
const FORESTA_PILOT_ENEMY_IDS = [
  'lupus-temperatus', // T2 predatore_terziario_apex -> APEX (anchor)
  'evento-seme-uragano', // T4 evento_ecologico -> HAZARD (2nd real threat, edm-grip)
  'blight-micotico', // T3 minaccia_microbica -> HAZARD
  'nebulocornis-mollis', // T1 consumatore_primario -> PREY (#2850 grazer)
  'arboryxis-lenis', // T1 consumatore_primario -> PREY (#2850 grazer)
  'sentinella-radice', // T1 ingegneri_ecosistema -> SUPPORT
];

const _speciesCache = Object.create(null);

/**
 * Load a foresta_temperata species YAML and NORMALIZE it to the adapter input contract.
 * threat_tier nests under `balance:`; lift it (same as badlandsPilotScenario).
 * @param {string} id species id (== filename without .yaml)
 */
function loadForestaSpecies(id) {
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

const FORESTA_PILOT_SCENARIO_01 = {
  id: 'enc_foresta_pilot_01',
  name: 'Bosco Specchio -- Pilota Adapter',
  biome_id: 'foresta_temperata',
  encounter_class: 'foresta_pilot',
  difficulty_rating: 6,
  estimated_turns: 15,
  grid_size: 10,
  objective: { type: 'elimination' },
  objective_text: 'Disperdi la fauna ostile del Bosco Specchio.',
  sistema_pressure_start: 72,
  recommended_modulation: 'full', // 10x10 grid: enemy positions reach 8,8 (quartet=6x6 -> off-grid). The ratified calibration uses 'full'.
  calibration_status: 'ratified-2026-06-18', // S2: N=100 WR 0.50 in-band [0.40,0.60] (neutral edm)
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
  { x: 7, y: 4 },
];

/** The fixed authored player quartet (identical to the badlands pilot; biome-orthogonal). */
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

function _buildEnemiesFrom(enemyIds) {
  return enemyIds.map((id, i) => {
    const stats = deriveCombatStats(loadForestaSpecies(id));
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

/** Build the full roster: authored quartet players + adapter-derived foresta enemies. */
function buildForestaPilotUnits01() {
  return [..._quartetPlayers(), ..._buildEnemiesFrom(FORESTA_PILOT_ENEMY_IDS)];
}

module.exports = {
  FORESTA_PILOT_SCENARIO_01,
  FORESTA_PILOT_ENEMY_IDS,
  buildForestaPilotUnits01,
  loadForestaSpecies,
  _resetCache,
};
