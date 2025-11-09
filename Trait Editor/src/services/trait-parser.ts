import type {
  Trait,
  TraitCompletionFlags,
  TraitIndexDocument,
  TraitIndexEntry,
  TraitRequirement,
  TraitRequirementConditions,
  TraitRequirementMeta,
  TraitSlotProfile,
  TraitSpeciesAffinity,
  TraitSynergyPi,
} from '../types/trait';
import { synchroniseTraitPresentation } from '../utils/trait-helpers';

const ensureString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const ensureNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : Number.isFinite(Number(value)) ? Number(value) : fallback;

const ensureBoolean = (value: unknown): boolean => value === true;

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const cloneConditions = (value: unknown): TraitRequirementConditions => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    result[key] = source[key];
  }
  return result as TraitRequirementConditions;
};

const cloneMeta = (value: unknown): TraitRequirementMeta | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    result[key] = source[key];
  }
  return result as TraitRequirementMeta;
};

const normaliseRequirement = (value: unknown): TraitRequirement => {
  if (!value || typeof value !== 'object') {
    return {
      capacita_richieste: [],
      condizioni: {},
      fonte: '',
    };
  }

  const source = value as Record<string, unknown>;
  return {
    capacita_richieste: ensureStringArray(source.capacita_richieste),
    condizioni: cloneConditions(source.condizioni),
    fonte: ensureString(source.fonte),
    meta: cloneMeta(source.meta),
  };
};

const normaliseSlotProfile = (value: unknown): TraitSlotProfile => {
  if (!value || typeof value !== 'object') {
    return { core: '', complementare: '' };
  }

  const source = value as Record<string, unknown>;
  return {
    core: ensureString(source.core),
    complementare: ensureString(source.complementare),
  };
};

const normaliseCompletionFlags = (value: unknown): TraitCompletionFlags => {
  if (!value || typeof value !== 'object') {
    return {
      has_biome: false,
      has_data_origin: false,
      has_species_link: false,
      has_usage_tags: false,
    };
  }

  const source = value as Record<string, unknown>;
  return {
    has_biome: ensureBoolean(source.has_biome),
    has_data_origin: ensureBoolean(source.has_data_origin),
    has_species_link: ensureBoolean(source.has_species_link),
    has_usage_tags: ensureBoolean(source.has_usage_tags),
  };
};

const normaliseSynergyPi = (value: unknown): TraitSynergyPi => {
  if (!value || typeof value !== 'object') {
    return {
      co_occorrenze: [],
      combo_totale: 0,
      forme: [],
      tabelle_random: [],
    };
  }

  const source = value as Record<string, unknown>;
  return {
    co_occorrenze: ensureStringArray(source.co_occorrenze),
    combo_totale: ensureNumber(source.combo_totale, 0),
    forme: ensureStringArray(source.forme),
    tabelle_random: ensureStringArray(source.tabelle_random),
  };
};

const normaliseSpeciesAffinity = (value: unknown): TraitSpeciesAffinity => {
  if (!value || typeof value !== 'object') {
    return {
      roles: [],
      species_id: '',
      weight: 0,
    };
  }

  const source = value as Record<string, unknown>;
  return {
    roles: ensureStringArray(source.roles),
    species_id: ensureString(source.species_id),
    weight: ensureNumber(source.weight, 0),
  };
};

const normaliseTraitIndexEntry = (value: unknown, fallbackId?: string): TraitIndexEntry => {
  if (!value || typeof value !== 'object') {
    const id = fallbackId ?? '';
    return {
      id,
      label: id,
      tier: '',
      famiglia_tipologia: '',
      slot_profile: { core: '', complementare: '' },
      slot: [],
      usage_tags: [],
      completion_flags: normaliseCompletionFlags(undefined),
      data_origin: '',
      debolezza: '',
      mutazione_indotta: '',
      requisiti_ambientali: [],
      sinergie: [],
      sinergie_pi: normaliseSynergyPi(undefined),
      species_affinity: [],
      spinta_selettiva: '',
      uso_funzione: '',
      fattore_mantenimento_energetico: '',
      conflitti: [],
      biome_tags: undefined,
    };
  }

  const source = value as Record<string, unknown>;
  const id = ensureString(source.id, fallbackId ?? '');
  const requisiti = Array.isArray(source.requisiti_ambientali)
    ? source.requisiti_ambientali.map((item) => normaliseRequirement(item))
    : [];
  const sinergiePi = normaliseSynergyPi(source.sinergie_pi);
  const speciesAffinity = Array.isArray(source.species_affinity)
    ? source.species_affinity.map((item) => normaliseSpeciesAffinity(item))
    : [];

  const entry: TraitIndexEntry = {
    id,
    label: ensureString(source.label, id),
    tier: ensureString(source.tier),
    famiglia_tipologia: ensureString(source.famiglia_tipologia),
    slot_profile: normaliseSlotProfile(source.slot_profile),
    slot: ensureStringArray(source.slot),
    usage_tags: ensureStringArray(source.usage_tags),
    completion_flags: normaliseCompletionFlags(source.completion_flags),
    data_origin: ensureString(source.data_origin),
    debolezza: ensureString(source.debolezza),
    mutazione_indotta: ensureString(source.mutazione_indotta),
    requisiti_ambientali: requisiti,
    sinergie: ensureStringArray(source.sinergie),
    sinergie_pi: sinergiePi,
    species_affinity: speciesAffinity,
    spinta_selettiva: ensureString(source.spinta_selettiva),
    uso_funzione: ensureString(source.uso_funzione),
    fattore_mantenimento_energetico: ensureString(source.fattore_mantenimento_energetico),
    conflitti: ensureStringArray(source.conflitti),
    biome_tags: Array.isArray(source.biome_tags) ? ensureStringArray(source.biome_tags) : undefined,
  };

  return entry;
};

const createTraitFromEntry = (entry: TraitIndexEntry): Trait => {
  const signatureMoves = [...entry.sinergie];
  const trait: Trait = {
    id: entry.id,
    name: entry.label,
    description: entry.uso_funzione || entry.mutazione_indotta || '',
    archetype: entry.famiglia_tipologia,
    playstyle: entry.spinta_selettiva,
    signatureMoves,
    entry: {
      ...entry,
      sinergie: [...signatureMoves],
    },
  };

  return synchroniseTraitPresentation(trait);
};

export const parseTraitIndexDocument = (document: TraitIndexDocument): Trait[] => {
  const entries = document?.traits ?? {};
  return Object.entries(entries).map(([key, raw]) => createTraitFromEntry(normaliseTraitIndexEntry(raw, key)));
};

export const parseTraitPayload = (payload: unknown): Trait[] => {
  if (Array.isArray(payload)) {
    return payload.map((entry, index) => createTraitFromEntry(normaliseTraitIndexEntry(entry, `legacy-${index}`)));
  }

  if (payload && typeof payload === 'object') {
    const container = payload as Record<string, unknown>;
    if (container.traits && typeof container.traits === 'object') {
      const document: TraitIndexDocument = {
        schema_version: ensureString(container.schema_version),
        trait_glossary: ensureString(container.trait_glossary),
        traits: container.traits as Record<string, TraitIndexEntry>,
      };
      return parseTraitIndexDocument(document);
    }
  }

  throw new Error('Formato della risposta dei tratti non riconosciuto.');
};
