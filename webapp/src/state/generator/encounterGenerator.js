import { ENCOUNTER_BLUEPRINTS, getEncounterTemplate, getDefaultEncounterCopy } from './encounters.js';

function normalizeBiome(input) {
  if (!input) {
    return { id: 'unknown', name: 'Biome sconosciuto' };
  }
  if (typeof input === 'string') {
    return { id: input, name: input };
  }
  const name = input.display_name || input.name || input.id;
  return { id: input.id || name || 'unknown', name: name || 'Biome sconosciuto' };
}

function normalizeParameters(template, overrides = {}) {
  const parameters = {};
  for (const parameter of template.parameters || []) {
    const defaultValue = overrides[parameter.id] || parameter.default || parameter.values[0].value;
    const selected = parameter.values.find((value) => value.value === defaultValue) || parameter.values[0];
    parameters[parameter.id] = {
      value: selected.value,
      label: selected.label || selected.value,
      summary: selected.summary || '',
      description: selected.description || '',
    };
  }
  return parameters;
}

function applyVariantQuantity(baseQuantity, variantQuantity) {
  if (variantQuantity == null) {
    return baseQuantity;
  }
  if (typeof variantQuantity === 'number') {
    return variantQuantity;
  }
  return {
    min: variantQuantity.min ?? (typeof baseQuantity === 'object' ? baseQuantity.min : variantQuantity.max ?? 0),
    max: variantQuantity.max ?? (typeof baseQuantity === 'object' ? baseQuantity.max : variantQuantity.min ?? 0),
  };
}

function resolveQuantity(quantity, random) {
  if (typeof quantity === 'number') {
    return Math.max(0, Math.floor(quantity));
  }
  const min = Math.max(0, Math.floor(quantity.min));
  const max = Math.max(min, Math.floor(quantity.max));
  if (min === max) {
    return min;
  }
  const roll = typeof random === 'function' ? random() : Math.random();
  const clamped = Math.max(0, Math.min(1, roll));
  return Math.round(min + clamped * (max - min));
}

function adjustQuantityForVariants(slot, parameters) {
  let quantity = slot.quantity;
  if (slot.variants) {
    for (const [parameterId, options] of Object.entries(slot.variants)) {
      const selected = parameters[parameterId];
      if (selected && options[selected.value]) {
        quantity = applyVariantQuantity(quantity, options[selected.value].quantity);
      }
    }
  }
  return quantity;
}

function matchesSlotFilters(species, slotFilters, biomeId) {
  if (!species) {
    return false;
  }
  if (!slotFilters.roles.some((role) => role === species.role_trofico || role === species.role || role === species.roleId)) {
    return false;
  }
  if (slotFilters.tags && slotFilters.tags.length) {
    const speciesTags = new Set(
      ([])
        .concat(species.tags || [])
        .concat(species.functional_tags || [])
        .concat(species.behavior_profile?.tags || species.behavior?.tags || [])
    );
    for (const tag of slotFilters.tags) {
      if (!speciesTags.has(tag)) {
        return false;
      }
    }
  }
  if (slotFilters.rarity && slotFilters.rarity.length) {
    const rarity = species.statistics?.rarity || species.rarity;
    if (!rarity || !slotFilters.rarity.includes(rarity)) {
      return false;
    }
  }
  if (biomeId) {
    const biomes = new Set([].concat(species.biomes || []).concat(species.spawn_rules?.biomes || []));
    if (biomes.size && !biomes.has(biomeId)) {
      return false;
    }
  }
  return true;
}

function pickSpeciesForSlot(speciesPool, quantity, random) {
  if (quantity <= 0 || speciesPool.length === 0) {
    return [];
  }
  const sorted = speciesPool.slice().sort((a, b) => {
    const rarityA = a.statistics?.rarity || '';
    const rarityB = b.statistics?.rarity || '';
    if (rarityA === rarityB) {
      return (a.display_name || a.id).localeCompare(b.display_name || b.id);
    }
    return rarityA.localeCompare(rarityB);
  });
  const result = [];
  for (let i = 0; i < quantity; i += 1) {
    if (!sorted.length) {
      break;
    }
    const index = Math.floor((typeof random === 'function' ? random() : Math.random()) * sorted.length);
    result.push(sorted.splice(index, 1)[0]);
  }
  return result;
}

function parseThreatTier(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return 1;
}

function computeThreat(template, parameters, slotAssignments) {
  const threatConfig = template.dynamics?.threat || {};
  const slotWeight = threatConfig.slotWeight || {};
  let score = threatConfig.base ?? 0;
  for (const assignment of slotAssignments) {
    const weight = slotWeight[assignment.slot.id] ?? slotWeight.default ?? 1;
    const slotThreat = assignment.species.reduce((acc, specimen) => {
      const tier = parseThreatTier(specimen.statistics?.threat_tier || specimen.balance?.threat_tier);
      return acc + tier;
    }, 0);
    score += slotThreat * weight;
  }
  if (threatConfig.parameterMultipliers) {
    for (const [parameterId, multipliers] of Object.entries(threatConfig.parameterMultipliers)) {
      const selected = parameters[parameterId];
      if (selected && typeof multipliers[selected.value] === 'number') {
        score *= multipliers[selected.value];
      }
    }
  }
  const tier = Math.max(1, Math.round(score));
  return {
    score: Number(score.toFixed(2)),
    tier: `T${tier}`,
  };
}

function buildContext({ biome, template, parameters, assignments, threat }) {
  const slots = {};
  for (const assignment of assignments) {
    const primary = assignment.species[0] || null;
    slots[assignment.slot.id] = {
      quantity: assignment.quantity,
      species: assignment.species,
      primary,
      names: assignment.species.map((specimen) => specimen.display_name || specimen.id).join(', '),
    };
  }
  return {
    biome,
    template,
    parameters,
    slots,
    metrics: { threat },
  };
}

function resolvePath(target, path) {
  return path.split('.').reduce((acc, segment) => {
    if (acc == null) {
      return undefined;
    }
    if (segment.endsWith(']')) {
      const [key, indexPart] = segment.split('[');
      const index = Number.parseInt(indexPart.slice(0, -1), 10);
      const container = acc[key];
      return Array.isArray(container) ? container[index] : undefined;
    }
    return acc[segment];
  }, target);
}

function renderTemplateCopy(templateString, context) {
  if (!templateString) {
    return '';
  }
  return templateString.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, path) => {
    const value = resolvePath(context, path.trim());
    if (value == null) {
      return '';
    }
    if (typeof value === 'object') {
      if ('label' in value && typeof value.label === 'string') {
        return value.label;
      }
      return JSON.stringify(value);
    }
    return String(value);
  });
}

function buildLinks(template, biome) {
  return {
    template_id: template.id,
    biome_id: biome.id,
    category: template.category,
  };
}

export function generateEncounterSeed({
  templateId,
  biome,
  speciesPool,
  parameterSelections = {},
  random,
}) {
  const template = typeof templateId === 'string' ? getEncounterTemplate(templateId) : templateId;
  if (!template) {
    throw new Error(`Encounter template "${templateId}" not found`);
  }
  const normalizedBiome = normalizeBiome(biome);
  const parameters = normalizeParameters(template, parameterSelections);
  const assignments = [];
  const warnings = [];
  for (const slot of template.slots) {
    const quantityConfig = adjustQuantityForVariants(slot, parameters);
    const quantity = resolveQuantity(quantityConfig, random);
    if (quantity <= 0 && !slot.optional) {
      warnings.push({ code: 'encounter.slot.empty', slot: slot.id });
      continue;
    }
    const matches = speciesPool.filter((specimen) =>
      matchesSlotFilters(specimen, slot.filters, normalizedBiome.id)
    );
    if (!matches.length) {
      if (!slot.optional) {
        warnings.push({ code: 'encounter.slot.unfilled', slot: slot.id });
      }
      continue;
    }
    const selected = pickSpeciesForSlot(matches, quantity, random);
    if (!selected.length && !slot.optional) {
      warnings.push({ code: 'encounter.slot.unfilled', slot: slot.id });
      continue;
    }
    assignments.push({ slot, quantity, species: selected });
  }
  const threat = computeThreat(template, parameters, assignments);
  const context = buildContext({
    biome: normalizedBiome,
    template,
    parameters,
    assignments,
    threat,
  });
  const copy = getDefaultEncounterCopy(template);
  const summary = renderTemplateCopy(copy.summary, context);
  const description = renderTemplateCopy(copy.description, context);
  const payload = {
    id: `${template.id}:${normalizedBiome.id}:${parametersHash(parameters)}`,
    template_id: template.id,
    biome: normalizedBiome,
    parameters,
    slots: assignments.map((assignment) => ({
      id: assignment.slot.id,
      title: assignment.slot.title,
      quantity: assignment.quantity,
      species: assignment.species.map((specimen) => ({
        id: specimen.id,
        display_name: specimen.display_name || specimen.name || specimen.id,
        role_trofico: specimen.role_trofico || specimen.role || specimen.roleId,
        rarity: specimen.statistics?.rarity || null,
        threat_tier: specimen.statistics?.threat_tier || specimen.balance?.threat_tier || null,
      })),
    })),
    metrics: {
      threat,
      pacing: template.dynamics?.pacing?.base || null,
    },
    summary,
    description,
    links: buildLinks(template, normalizedBiome),
    warnings,
  };
  return payload;
}

function parametersHash(parameters) {
  const entries = Object.entries(parameters)
    .map(([key, value]) => `${key}=${value.value}`)
    .sort();
  return entries.join('|') || 'default';
}

export function generateEncounterSeedsForBiome({
  biome,
  species,
  templateIds,
  variantsByTemplate = {},
  random,
}) {
  const normalizedBiome = normalizeBiome(biome);
  const templates = (templateIds || ENCOUNTER_BLUEPRINTS.map((template) => template.id))
    .map((id) => getEncounterTemplate(id))
    .filter((template) => template && template.biomes.includes(normalizedBiome.id));
  const seeds = [];
  for (const template of templates) {
    const variantList = variantsByTemplate[template.id] || [{}];
    for (const selection of variantList) {
      const seed = generateEncounterSeed({
        templateId: template,
        biome: normalizedBiome,
        speciesPool: species,
        parameterSelections: selection,
        random,
      });
      seeds.push(seed);
    }
  }
  return seeds;
}

export function summarizeSeed(seed) {
  return {
    id: seed.id,
    summary: seed.summary,
    threatTier: seed.metrics?.threat?.tier || 'T?',
    biome: seed.biome?.name || seed.biome?.id,
    template: seed.template_id,
  };
}
