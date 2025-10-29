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
};
