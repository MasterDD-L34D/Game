// =============================================================================
// Biome Resonance — Skiv ticket #4 (Sprint A) + tier values (P1 follow-up).
//
// Pillar 4 (Identità) bonus: when a unit's species `biome_affinity` matches
// the current scenario `biome_id`, the actor "feels" the environment.
//
// Tier system:
//   perfect    — exact biome_affinity match → -1 research_cost (min 1)
//   secondary  — same biome family group    → cosmetic badge only
//   class_match— archetype matches biome dominant archetype → badge only
//   none       — no connection
//
// Pure: no I/O at runtime once cached.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULT_SPECIES_YAML = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'species.yaml',
);

// Biome family groups for secondary resonance.
const BIOME_FAMILIES = {
  open: ['savana', 'pianura_aperta', 'steppa', 'prateria', 'desertico'],
  cold: ['cryosteppe', 'tundra', 'ghiacciaio', 'alpino'],
  forest: ['foresta_temperata', 'foresta_tropicale', 'giungla'],
  desert: ['deserto_caldo', 'badlands', 'saline', 'aride'],
  aquatic: ['acquatico_costiero', 'palude', 'lagunare', 'corallino'],
  deep: ['frattura_abissale_sinaptica', 'caverna', 'grotta_bioluminescente', 'abissale'],
};

// Dominant archetype per biome for class-match resonance.
const BIOME_ARCHETYPE_AFFINITY = {
  savana: 'skirmisher',
  pianura_aperta: 'skirmisher',
  steppa: 'skirmisher',
  prateria: 'skirmisher',
  desertico: 'skirmisher',
  deserto_caldo: 'skirmisher',
  cryosteppe: 'tank',
  tundra: 'tank',
  ghiacciaio: 'tank',
  alpino: 'tank',
  badlands: 'tank',
  frattura_abissale_sinaptica: 'tank',
  caverna: 'tank',
  abissale: 'tank',
  foresta_temperata: 'support',
  foresta_tropicale: 'support',
  giungla: 'support',
  acquatico_costiero: 'support',
  palude: 'support',
  lagunare: 'support',
  corallino: 'support',
  grotta_bioluminescente: 'support',
};

const TIER_LABELS = {
  perfect: 'Risonanza Perfetta',
  secondary: 'Risonanza Secondaria',
  class_match: 'Sintonia di Classe',
  none: '',
};

let _cache = null;

function loadSpeciesAffinityMap({ filepath = DEFAULT_SPECIES_YAML, force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = yaml.load(raw) || {};
  const map = {};
  for (const sp of parsed.species || []) {
    if (!sp || !sp.id) continue;
    if (typeof sp.biome_affinity === 'string' && sp.biome_affinity) {
      map[sp.id] = sp.biome_affinity;
    }
  }
  _cache = map;
  return _cache;
}

function resetCache() {
  _cache = null;
}

/**
 * Returns the species' declared biome_affinity, or null.
 */
function getSpeciesBiomeAffinity(speciesId, opts = {}) {
  if (!speciesId || typeof speciesId !== 'string') return null;
  const map = opts.map || loadSpeciesAffinityMap();
  return map[speciesId] || null;
}

/**
 * Returns the family name for a biome, or null if not grouped.
 */
function getBiomeFamily(biomeId) {
  if (!biomeId || typeof biomeId !== 'string') return null;
  for (const [family, members] of Object.entries(BIOME_FAMILIES)) {
    if (members.includes(biomeId)) return family;
  }
  return null;
}

/**
 * True iff the species declares a biome_affinity matching biomeId (case-sensitive,
 * exact string compare). Both inputs must be non-empty strings.
 */
function hasResonance(speciesId, biomeId, opts = {}) {
  if (!speciesId || !biomeId) return false;
  if (typeof speciesId !== 'string' || typeof biomeId !== 'string') return false;
  const affinity = getSpeciesBiomeAffinity(speciesId, opts);
  if (!affinity) return false;
  return affinity === biomeId;
}

/**
 * Returns { tier, label_it, discount } for a unit in a given biome.
 *   tier: 'perfect' | 'secondary' | 'class_match' | 'none'
 *   label_it: Italian display string
 *   discount: research_cost reduction (1 for perfect, 0 otherwise)
 *
 * @param {string} speciesId
 * @param {string} biomeId
 * @param {string|null} archetype  - unit archetype for class_match check
 * @param {object} opts            - { map } override for species affinity map
 */
function computeResonanceTier(speciesId, biomeId, archetype = null, opts = {}) {
  const none = { tier: 'none', label_it: TIER_LABELS.none, discount: 0 };
  if (!speciesId || !biomeId) return none;
  if (typeof speciesId !== 'string' || typeof biomeId !== 'string') return none;

  const affinity = getSpeciesBiomeAffinity(speciesId, opts);

  // Perfect: exact match
  if (affinity && affinity === biomeId) {
    return { tier: 'perfect', label_it: TIER_LABELS.perfect, discount: 1 };
  }

  // Secondary: same biome family
  if (affinity) {
    const affinityFamily = getBiomeFamily(affinity);
    const biomeFamily = getBiomeFamily(biomeId);
    if (affinityFamily && biomeFamily && affinityFamily === biomeFamily) {
      return { tier: 'secondary', label_it: TIER_LABELS.secondary, discount: 0 };
    }
  }

  // Class-match: archetype matches biome dominant archetype
  if (archetype && typeof archetype === 'string') {
    const dominant = BIOME_ARCHETYPE_AFFINITY[biomeId];
    if (dominant && dominant === archetype) {
      return { tier: 'class_match', label_it: TIER_LABELS.class_match, discount: 0 };
    }
  }

  return none;
}

module.exports = {
  loadSpeciesAffinityMap,
  resetCache,
  getSpeciesBiomeAffinity,
  getBiomeFamily,
  hasResonance,
  computeResonanceTier,
  BIOME_FAMILIES,
  BIOME_ARCHETYPE_AFFINITY,
};
