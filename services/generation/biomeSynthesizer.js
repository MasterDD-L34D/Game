const fs = require('node:fs/promises');
const path = require('node:path');

const { createSpeciesBuilder } = require('./speciesBuilder');

const ROLE_FLAG_SET = new Set(['apex', 'keystone', 'bridge', 'threat', 'event']);
const ROLE_TROPHIC_LABELS = {
  apex: 'predatore_apice',
  keystone: 'specie_chiave',
  bridge: 'specie_ponte',
  threat: 'minaccia_dinamica',
  event: 'evento_dinamico',
};

function slugify(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function titleCase(value) {
  if (!value) return '';
  return String(value)
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function hashSeed(seed) {
  if (seed === null || seed === undefined) {
    return null;
  }
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function createRng(seed) {
  const hashed = hashSeed(seed);
  if (!hashed) {
    return Math.random;
  }
  let state = hashed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function randomId(prefix, rng) {
  const suffix = Math.floor((rng() || Math.random()) * 1e8)
    .toString(36)
    .padStart(5, '0')
    .slice(-5);
  return `${prefix}_${suffix}`;
}

async function loadJson(filePath) {
  const buffer = await fs.readFile(filePath, 'utf8');
  return JSON.parse(buffer);
}

function normaliseTraitGlossary(glossary) {
  const map = new Map();
  if (!glossary || typeof glossary !== 'object' || !glossary.traits) {
    return map;
  }
  Object.entries(glossary.traits).forEach(([id, entry]) => {
    if (!id) return;
    const label = entry?.label_it || entry?.label_en || titleCase(id);
    map.set(id, { id, label });
  });
  return map;
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function pickMany(array, count, rng) {
  const source = Array.from(array ?? []);
  const picked = [];
  for (let i = 0; i < count && source.length; i += 1) {
    const index = Math.floor((rng() || Math.random()) * source.length);
    picked.push(source.splice(index, 1)[0]);
  }
  return picked;
}

function shuffle(array, rng) {
  const clone = Array.from(array ?? []);
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor((rng() || Math.random()) * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function matchesClimate(pool, requested) {
  if (!requested) return true;
  const tags = ensureArray(pool?.climate_tags).map((tag) => String(tag).toLowerCase());
  const wanted = String(requested).toLowerCase();
  if (!tags.length) return false;
  return tags.some((tag) => tag === wanted || tag.includes(wanted) || wanted.includes(tag));
}

function computeScore(pool, constraints, traitGlossary) {
  let score = 1;
  if (constraints.hazard && pool?.hazard?.severity === constraints.hazard) {
    score += 6;
  }
  if (constraints.climate && matchesClimate(pool, constraints.climate)) {
    score += 4;
  }
  const requiredRoles = ensureArray(constraints.requiredRoles).filter((role) => ROLE_FLAG_SET.has(role));
  if (requiredRoles.length) {
    const roles = new Set((pool?.role_templates ?? []).map((template) => template.role));
    requiredRoles.forEach((role) => {
      if (roles.has(role)) {
        score += 2;
      }
    });
  }
  const preferredTags = ensureArray(constraints.preferredTags)
    .map((tag) => String(tag).toLowerCase())
    .filter(Boolean);
  if (preferredTags.length) {
    const traitIds = [
      ...(pool?.traits?.core ?? []),
      ...(pool?.traits?.support ?? []),
    ];
    const labels = traitIds.map((traitId) =>
      (traitGlossary.get(traitId)?.label || traitId).toLowerCase()
    );
    preferredTags.forEach((tag) => {
      if (labels.some((label) => label.includes(tag) || tag.includes(label))) {
        score += 1;
      }
    });
  }
  return score;
}

function pickCandidatePools(pools, constraints, traitGlossary) {
  const minSize = Number.isFinite(constraints.minSize) ? constraints.minSize : 0;
  const requiredRoles = ensureArray(constraints.requiredRoles).filter((role) => ROLE_FLAG_SET.has(role));
  const filtered = (pools ?? []).filter((pool) => {
    if (!pool) return false;
    const maxSize = pool?.size?.max ?? pool?.size?.min ?? 0;
    if (minSize && maxSize < minSize) {
      return false;
    }
    if (constraints.hazard && pool?.hazard?.severity !== constraints.hazard) {
      return false;
    }
    if (constraints.climate && !matchesClimate(pool, constraints.climate)) {
      return false;
    }
    if (
      requiredRoles.length &&
      requiredRoles.some((role) => !(pool?.role_templates ?? []).some((template) => template.role === role))
    ) {
      return false;
    }
    return true;
  });
  const candidates = (filtered.length ? filtered : pools ?? []).map((pool) => ({
    pool,
    score: computeScore(pool, constraints, traitGlossary),
  }));
  if (!candidates.length) {
    throw new Error('Nessun pool di tratti disponibile per la sintesi dei biomi');
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function buildFlags(role) {
  const flags = {};
  if (ROLE_FLAG_SET.has(role)) {
    flags[role] = true;
  }
  if (role === 'apex') {
    flags.threat = true;
  }
  return flags;
}

function ensureTraits(pool) {
  const core = Array.isArray(pool?.traits?.core) ? pool.traits.core : [];
  const support = Array.isArray(pool?.traits?.support) ? pool.traits.support : [];
  return { core, support };
}

function selectTraits(pool, rng) {
  const { core, support } = ensureTraits(pool);
  const supportPick = pickMany(support, Math.min(2, support.length), rng);
  const combined = Array.from(new Set([...core, ...supportPick]));
  return combined;
}

function mapTraitDetails(traits, traitGlossary) {
  return traits.map((traitId) => ({
    id: traitId,
    label: traitGlossary.get(traitId)?.label || titleCase(traitId),
  }));
}

function inferTier(role, explicitTier) {
  if (Number.isFinite(explicitTier)) {
    return explicitTier;
  }
  switch (role) {
    case 'apex':
      return 4;
    case 'keystone':
      return 3;
    case 'threat':
      return 3;
    case 'bridge':
      return 2;
    case 'event':
      return 2;
    default:
      return 2;
  }
}

async function buildSpecies(pool, biomeId, traitGlossary, constraints, rng, speciesBuilder) {
  const templates = Array.isArray(pool?.role_templates) ? pool.role_templates : [];
  const preferredRoles = ensureArray(constraints.requiredRoles).filter((role) => ROLE_FLAG_SET.has(role));
  const shuffled = shuffle(templates, rng);
  const species = [];
  const takenRoles = new Set();

  const register = async (template) => {
    if (!template) return;
    const role = template.role || 'specialist';
    const baseId = slugify(`${pool.id}-${role}-${template.label || role}`) || randomId('spec', rng);
    const id = `${baseId}-${Math.floor((rng() || Math.random()) * 1e5)
      .toString(36)
      .padStart(3, '0')}`;
    const flags = buildFlags(role);
    const tier = inferTier(role, template.tier);
    const preferredTraits = ensureArray(template.preferred_traits);
    const traitLabels = mapTraitDetails(preferredTraits, traitGlossary);
    let builderProfile = null;
    if (speciesBuilder) {
      try {
        builderProfile = await speciesBuilder.buildProfile(preferredTraits, {
          baseName: template.label || titleCase(`${role}-${pool.id}`),
          random: () => rng(),
        });
      } catch (error) {
        builderProfile = null;
      }
    }

    const profile = builderProfile || {
      id,
      display_name: template.label || titleCase(`${role}-${pool.id}`),
      summary: template.summary || null,
      description: template.summary || null,
      morphology: null,
      behavior: null,
      statistics: { threat_tier: `T${tier}`, rarity: null, energy_profile: null, synergy_score: null },
      traits: { core: preferredTraits, derived: [], conflicts: [] },
    };

    species.push({
      id: profile.id || id,
      display_name: profile.display_name || template.label || titleCase(`${role}-${pool.id}`),
      role_trofico: `${ROLE_TROPHIC_LABELS[role] || role}_${pool.id}`,
      functional_tags: ensureArray(template.functional_tags),
      flags,
      summary: profile.summary || template.summary || null,
      description: profile.description || template.summary || null,
      biomes: [biomeId],
      synthetic: true,
      syntheticTier: tier,
      balance: { threat_tier: profile.statistics?.threat_tier || `T${tier}` },
      source_traits: preferredTraits,
      source_pool: pool.id,
      trait_labels: traitLabels,
      derived_traits: profile.traits?.derived || [],
      conflicting_traits: profile.traits?.conflicts || [],
      morphology: profile.morphology || null,
      behavior_profile: profile.behavior || null,
      statistics: profile.statistics || { threat_tier: `T${tier}` },
    });
    takenRoles.add(role);
  };

  for (const template of shuffled) {
    // eslint-disable-next-line no-await-in-loop
    await register(template);
  }

  for (const role of preferredRoles) {
    if (takenRoles.has(role)) continue;
    const fallback = templates.find((template) => template.role === role);
    if (fallback) {
      // eslint-disable-next-line no-await-in-loop
      await register(fallback);
    }
  }

  return species;
}

function countRoles(species) {
  const counts = { apex: 0, keystone: 0, bridge: 0, threat: 0, event: 0 };
  species.forEach((entry) => {
    const flags = entry?.flags ?? {};
    Object.entries(flags).forEach(([flag, active]) => {
      if (active && counts[flag] !== undefined) {
        counts[flag] += 1;
      }
    });
  });
  return counts;
}

function summariseRolePresence(species) {
  const presence = new Set();
  species.forEach((entry) => {
    Object.entries(entry?.flags ?? {}).forEach(([flag, active]) => {
      if (active) {
        presence.add(flag);
      }
    });
  });
  return Array.from(presence);
}

async function buildBiomeFromPool(pool, context, traitGlossary, rng, speciesBuilder) {
  const traits = selectTraits(pool, rng);
  const traitDetails = mapTraitDetails(traits, traitGlossary);
  const id = randomId(slugify(pool.id) || 'bioma', rng);
  const poolMin = pool?.size?.min ?? 3;
  const poolMax = pool?.size?.max ?? poolMin;
  const requestedMin = Number.isFinite(context?.minSize) ? context.minSize : poolMin;
  const effectiveMin = Math.min(poolMax, Math.max(poolMin, requestedMin));
  const range = Math.max(poolMax - effectiveMin, 0);
  const zoneCount = effectiveMin + (range > 0 ? Math.floor((rng() || Math.random()) * (range + 1)) : 0);
  const species = await buildSpecies(pool, id, traitGlossary, context, rng, speciesBuilder);
  const roleCounts = countRoles(species);
  const rolePresence = summariseRolePresence(species);
  const signature = traitDetails.map((trait) => trait.label).join(' · ');

  return {
    id,
    label: `${pool.label} sintetico`,
    synthetic: true,
    summary: pool.summary || null,
    description: pool.summary || null,
    parents: [
      {
        id: pool.id,
        label: pool.label,
        type: 'trait_pool',
        climate: pool.climate_tags ?? [],
      },
    ],
    affixes: traits.map((traitId) => slugify(traitId)),
    hazard: pool.hazard || null,
    ecology: pool.ecology || null,
    traits: {
      ids: traits,
      details: traitDetails,
      climate: pool.climate_tags ?? [],
    },
    manifest: {
      trait_pool: pool.id,
      trait_count: traits.length,
      species_counts: roleCounts,
      role_presence: rolePresence,
    },
    metrics: {
      zoneCount,
      hazardSeverity: pool?.hazard?.severity || 'unknown',
      resourceRichness: ensureArray(pool?.ecology?.primary_resources).length,
    },
    signature,
    species,
  };
}

function createBiomeSynthesizer(options = {}) {
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', '..', 'data');
  const traitGlossaryPath = options.traitGlossaryPath || path.join(dataRoot, 'traits', 'glossary.json');
  const traitPoolPath = options.traitPoolPath || path.join(dataRoot, 'traits', 'biome_pools.json');
  const speciesBuilderInstance = createSpeciesBuilder(
    options.speciesBuilder || {
      catalogPath: path.resolve(__dirname, '..', '..', 'docs', 'catalog', 'catalog_data.json'),
    }
  );

  let loaded = null;
  let loadingPromise = null;

  async function load() {
    if (loaded) return loaded;
    if (loadingPromise) return loadingPromise;
    loadingPromise = Promise.all([
      loadJson(traitGlossaryPath),
      loadJson(traitPoolPath),
      speciesBuilderInstance.ensureCatalog(),
    ])
      .then(([glossary, pools]) => {
        const traitGlossary = normaliseTraitGlossary(glossary);
        const poolList = Array.isArray(pools?.pools) ? pools.pools : [];
        loaded = { traitGlossary, poolList };
        return loaded;
      })
      .finally(() => {
        loadingPromise = null;
      });
    return loadingPromise;
  }

  async function generate(options = {}) {
    const { traitGlossary, poolList } = await load();
    const { count = 1, constraints = {}, seed = null } = options;
    if (!poolList.length) {
      throw new Error('Nessun pool definito per la generazione dei biomi');
    }
    const rng = createRng(seed);
    const candidates = pickCandidatePools(poolList, constraints, traitGlossary);
    const queue = [...candidates];
    const result = [];

    for (let i = 0; i < Math.max(1, count); i += 1) {
      if (!queue.length) {
        queue.push(...candidates);
      }
      const total = queue.reduce((sum, entry) => sum + (entry.score || 1), 0);
      const threshold = (rng() || Math.random()) * (total || queue.length);
      let cumulative = 0;
      let pickedIndex = 0;
      for (let index = 0; index < queue.length; index += 1) {
        const weight = queue[index].score || 1;
        cumulative += weight;
        if (threshold <= cumulative) {
          pickedIndex = index;
          break;
        }
      }
      const [entry] = queue.splice(pickedIndex, 1);
      // eslint-disable-next-line no-await-in-loop
      const biome = await buildBiomeFromPool(entry.pool, constraints, traitGlossary, rng, speciesBuilderInstance);
      result.push(biome);
    }

    return {
      biomes: result,
      constraints: {
        requested: constraints,
        applied: {
          hazard: constraints.hazard || null,
          climate: constraints.climate || null,
          requiredRoles: ensureArray(constraints.requiredRoles).filter((role) => ROLE_FLAG_SET.has(role)),
          preferredTags: ensureArray(constraints.preferredTags),
          minSize: Number.isFinite(constraints.minSize) ? constraints.minSize : null,
        },
        poolCount: poolList.length,
      },
    };
  }

  async function reload() {
    loaded = null;
    return load();
  }

  return {
    load,
    reload,
    generate,
  };
}

module.exports = {
  createBiomeSynthesizer,
};
