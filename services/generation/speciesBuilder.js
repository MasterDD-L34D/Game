const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_CATALOG_PATH = path.resolve(__dirname, '..', '..', 'docs', 'catalog', 'catalog_data.json');

const FAMILY_KEYWORDS = new Map([
  ['locomotorio', 'locomotor'],
  ['prensile', 'prehensile'],
  ['strutturale', 'structural'],
  ['difensivo', 'defensive'],
  ['sensoriale', 'sensorial'],
  ['nervoso', 'neural'],
  ['metabolico', 'metabolic'],
  ['supporto', 'support'],
  ['empatico', 'social'],
  ['cognitivo', 'cognitive'],
  ['offensivo', 'offensive'],
  ['biotico', 'biotic'],
]);

const BEHAVIOUR_KEYWORDS = new Map([
  ['coordin', 'coordinated'],
  ['pred', 'predatory'],
  ['difes', 'defensive'],
  ['support', 'supportive'],
  ['simbi', 'symbiotic'],
  ['migraz', 'migratory'],
  ['arramp', 'climber'],
  ['vol', 'aerial'],
  ['echo', 'echolocator'],
  ['dispers', 'disperser'],
  ['scav', 'scavenger'],
]);

const ENERGY_ORDER = ['basso', 'medio', 'alto', 'estremo'];

function normaliseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }
  return [];
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function normaliseEnergy(value) {
  if (!value) return null;
  const lowered = value.toLowerCase();
  for (const token of ENERGY_ORDER) {
    if (lowered.includes(token)) {
      return token;
    }
  }
  return lowered.trim() || null;
}

function scoreEnergy(values) {
  let picked = null;
  for (const value of values) {
    const normalised = normaliseEnergy(value);
    if (!normalised) continue;
    if (!picked) {
      picked = normalised;
      continue;
    }
    if (ENERGY_ORDER.indexOf(normalised) > ENERGY_ORDER.indexOf(picked)) {
      picked = normalised;
    }
  }
  return picked;
}

function tierValue(tier) {
  if (!tier) return null;
  if (typeof tier === 'number') return tier;
  const str = String(tier);
  if (/^[Tt]\d+/.test(str)) {
    return Number.parseInt(str.slice(1), 10);
  }
  const num = Number.parseInt(str, 10);
  return Number.isFinite(num) ? num : null;
}

function rarityFromTraits(traits) {
  const highTiers = traits.reduce((count, trait) => {
    const value = tierValue(trait.tier);
    return value && value >= 3 ? count + 1 : count;
  }, 0);
  if (highTiers >= 3) return 'R4';
  if (highTiers === 2) return 'R3';
  if (highTiers === 1) return 'R2';
  return 'R1';
}

function threatFromTraits(traits) {
  const values = traits
    .map((trait) => tierValue(trait.tier))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return 'T1';
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const tier = Math.max(1, Math.min(5, Math.round(avg)));
  return `T${tier}`;
}

function synergyScore(traits) {
  if (!traits.length) return 0;
  let total = 0;
  traits.forEach((trait) => {
    const overlap = traits.filter((candidate) => trait.synergies.includes(candidate.id)).length;
    total += overlap;
  });
  return Math.round((total / (traits.length * Math.max(traits.length - 1, 1))) * 1000) / 1000;
}

function deriveMorphology(traits) {
  const families = [];
  const adaptations = [];
  const environments = new Set();

  traits.forEach((trait) => {
    (trait.families || []).forEach((family) => {
      const lowered = family.toLowerCase();
      for (const [token, mapped] of FAMILY_KEYWORDS.entries()) {
        if (lowered.includes(token)) {
          families.push(mapped);
          return;
        }
      }
      families.push(lowered);
    });
    if (trait.mutation) {
      adaptations.push(trait.mutation);
    }
    if (trait.weakness) {
      adaptations.push(`Precauzione: ${trait.weakness}`);
    }
    (trait.environments || []).forEach((env) => environments.add(env));
  });

  return {
    families: uniqueSorted(families),
    adaptations,
    environments: uniqueSorted(Array.from(environments)),
  };
}

function deriveBehaviour(traits) {
  const tags = new Set();
  const drives = [];

  traits.forEach((trait) => {
    [trait.usage, trait.selective_drive].forEach((field) => {
      if (!field) return;
      drives.push(field);
      const lowered = field.toLowerCase();
      for (const [token, label] of BEHAVIOUR_KEYWORDS.entries()) {
        if (lowered.includes(token)) {
          tags.add(label);
        }
      }
    });
  });

  return { tags: Array.from(tags), drives };
}

function composeSummary(traits) {
  return traits.slice(0, 3).map((trait) => trait.label).join(', ');
}

function composeDescription(traits, morphology, behaviour) {
  if (!traits.length) {
    return 'Specie sintetica generata da trait sconosciuti.';
  }
  let lead = `Sintesi genetica focalizzata su ${traits[0].label}`;
  if (traits.length > 1) {
    lead += ` e ${traits[1].label}`;
  }
  const families = morphology.families || [];
  const tags = behaviour.tags || [];
  const environments = morphology.environments || [];
  let morpho = '';
  if (families.length) {
    morpho = ` con impronta morfologica ${families.join(', ')}`;
  }
  if (tags.length) {
    morpho += `; comportamento ${tags.join(', ')}`;
  }
  const envPart = environments.length
    ? ` Ottimizzata per biomi: ${environments.join(', ')}.`
    : ' Ottimizzata per biomi vari.';
  return `${lead}${morpho}.${envPart}`;
}

function clampScore(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(Math.round(numeric * 1000) / 1000, 1));
}

function threatTierFromScore(score) {
  const clamped = clampScore(score);
  const tier = Math.max(1, Math.min(5, Math.round(clamped * 4) + 1));
  return `T${tier}`;
}

function rarityFromScore(score) {
  const clamped = clampScore(score);
  if (clamped >= 0.85) return 'R4';
  if (clamped >= 0.65) return 'R3';
  if (clamped >= 0.4) return 'R2';
  return 'R1';
}

function vcFromAxes(axes = {}) {
  const threat = clampScore(axes.threat);
  const defense = clampScore(axes.defense);
  const mobility = clampScore(axes.mobility);
  const perception = clampScore(axes.perception);
  const magic = clampScore(axes.magic);
  const social = clampScore(axes.social);
  const stealth = clampScore(axes.stealth);
  const environment = clampScore(axes.environment);
  const versatility = clampScore(axes.versatility);
  return {
    aggro: threat,
    risk: clampScore(1 - defense),
    cohesion: social,
    setup: Math.max(magic, versatility),
    explore: Math.max(mobility, environment),
    tilt: Math.max(perception, stealth),
  };
}

function roleFromType(entry = {}) {
  const type = String(entry.type || '').toLowerCase();
  if (['dragon', 'magical beast', 'outsider', 'aberration'].includes(type)) {
    return 'predatore_terziario_apex';
  }
  if (['plant', 'ooze', 'vermin'].includes(type)) {
    return 'ingegneri_ecosistema';
  }
  if (['construct', 'undead'].includes(type)) {
    return 'minaccia_microbica';
  }
  return 'evento_ecologico';
}

function buildPathfinderProfile(statblock, options = {}) {
  if (!statblock || typeof statblock !== 'object') {
    throw new Error('Statblock Pathfinder non valido');
  }
  const axes = statblock.axes || {};
  const vc = vcFromAxes(axes);
  const threatTier = threatTierFromScore(axes.threat);
  const rarity = rarityFromScore(axes.versatility);
  const fallbackTraits = Array.isArray(options.fallbackTraits) ? options.fallbackTraits : [];
  const geneticTraits = Array.isArray(statblock.genetic_traits) ? statblock.genetic_traits : [];
  const abilities = Array.isArray(statblock.special_abilities) ? statblock.special_abilities.filter(Boolean) : [];
  const environmentTags = Array.isArray(statblock.environment_tags)
    ? statblock.environment_tags.filter(Boolean)
    : [];

  return {
    id: `pathfinder-${statblock.id}`,
    display_name: statblock.name || statblock.id || 'Creatura Pathfinder',
    summary: abilities.length ? `Capacità chiave: ${abilities.slice(0, 3).join(', ')}` : null,
    description: statblock.visual_description || null,
    role_trofico: roleFromType(statblock),
    functional_tags: ['pathfinder', String(statblock.type || '').toLowerCase(), String(statblock.subtype || '').toLowerCase()].filter(Boolean),
    biomes: options.biomeId ? [options.biomeId] : [],
    vc,
    playable_unit: false,
    spawn_rules: { densita: 'moderata' },
    balance: {
      threat_tier: threatTier,
      rarity,
      encounter_role: 'ambient',
    },
    statistics: {
      threat_tier: threatTier,
      rarity,
      energy_profile: null,
      synergy_score: clampScore(axes.versatility),
    },
    traits: {
      core: Array.from(new Set(['pathfinder', ...geneticTraits, ...fallbackTraits])),
      derived: [],
      conflicts: [],
    },
    morphology: {
      families: [String(statblock.type || '').toLowerCase()],
      adaptations: geneticTraits,
      environments: environmentTags,
    },
    behavior: {
      tags: ['pathfinder'],
      drives: abilities.slice(0, 2),
    },
    special_abilities: abilities,
    environment_affinity: {
      biome_class: options.biomeId || 'pathfinder_unknown',
      source_tags: environmentTags,
    },
    derived_from_environment: {
      suggested_traits: geneticTraits,
      optional_traits: [],
      synergy_traits: ['pathfinder'],
    },
    source_dataset: {
      id: 'pathfinder',
      profile_id: statblock.id,
      cr: statblock.cr,
      axes,
    },
  };
}

async function loadCatalog(catalogPath = DEFAULT_CATALOG_PATH) {
  const buffer = await fs.readFile(catalogPath, 'utf8');
  const payload = JSON.parse(buffer);
  const entries = payload?.traits || {};
  const traits = new Map();
  Object.entries(entries).forEach(([traitId, raw]) => {
    traits.set(traitId, {
      id: traitId,
      label: raw.label || traitId,
      tier: raw.tier || null,
      families: normaliseList(raw.families),
      energy_profile: raw.energy_profile || null,
      usage: raw.usage || null,
      selective_drive: raw.selective_drive || null,
      mutation: raw.mutation || null,
      synergies: normaliseList(raw.synergies),
      conflicts: normaliseList(raw.conflicts),
      environments: normaliseList(raw.environments),
      weakness: raw.weakness || null,
    });
  });
  return traits;
}

function createSpeciesBuilder(options = {}) {
  const catalogPath = options.catalogPath || DEFAULT_CATALOG_PATH;
  let traitCatalog = null;
  let loading = null;

  async function ensureCatalog() {
    if (traitCatalog) return traitCatalog;
    if (!loading) {
      loading = loadCatalog(catalogPath).then((map) => {
        traitCatalog = map;
        return map;
      });
    }
    return loading;
  }

  async function buildProfile(traitIds, buildOptions = {}) {
    if (!Array.isArray(traitIds) || !traitIds.length) {
      throw new Error('Impossibile generare specie: nessun tratto fornito');
    }
    const catalog = await ensureCatalog();
    const traits = traitIds
      .map((traitId) => catalog.get(traitId))
      .filter(Boolean);
    if (!traits.length) {
      throw new Error('Impossibile generare specie: tratti sconosciuti');
    }
    const rng = buildOptions.random || Math.random;
    const morphology = deriveMorphology(traits);
    const behaviour = deriveBehaviour(traits);
    const energy = scoreEnergy(traits.map((trait) => trait.energy_profile));
    const threat = threatFromTraits(traits);
    const rarity = rarityFromTraits(traits);
    const synergy = synergyScore(traits);
    const summary = composeSummary(traits);
    const description = composeDescription(traits, morphology, behaviour);

    const baseName = buildOptions.baseName || traits[0].label;
    let displayName = baseName;
    if (traits.length > 1) {
      const alternate = traits[Math.floor(rng() * (traits.length - 1)) + 1]?.label;
      if (alternate) {
        displayName = `${displayName} / ${alternate}`;
      }
    }

    const derived = uniqueSorted(
      traits.flatMap((trait) => trait.synergies || [])
    );
    const conflicts = uniqueSorted(
      traits.flatMap((trait) => trait.conflicts || [])
    );
    const identifierSeed = `${displayName}-${threat}-${rarity}-${rng().toFixed(4)}`;
    const digest = Buffer.from(identifierSeed).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 10);
    const identifier = `synthetic-${digest || '0000000000'}`;

    return {
      id: identifier,
      display_name: displayName,
      summary,
      description,
      morphology,
      behavior: behaviour,
      statistics: {
        threat_tier: threat,
        rarity,
        energy_profile: energy,
        synergy_score: synergy,
      },
      traits: {
        core: traits.map((trait) => trait.id),
        derived,
        conflicts,
      },
    };
  }

  return {
    buildProfile,
    ensureCatalog,
  };
}

module.exports = {
  createSpeciesBuilder,
  buildPathfinderProfile,
};
