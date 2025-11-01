import { readEnvString } from '../services/apiEndpoints.js';

export type DataSourceId =
  | 'flowSnapshot'
  | 'generationSpecies'
  | 'generationSpeciesBatch'
  | 'generationSpeciesPreview'
  | 'runtimeValidatorSpecies'
  | 'runtimeValidatorBiome'
  | 'runtimeValidatorFoodweb'
  | 'qualitySuggestionsApply'
  | 'traitDiagnostics'
  | 'nebulaAtlas';

export type DataSourceEntry = {
  id: DataSourceId;
  endpoint: string | null;
  fallback: string | null;
  mock: string | null;
};

export type DataSourceOverrides = Partial<Pick<DataSourceEntry, 'endpoint' | 'fallback' | 'mock'>>;

type DataSourceDefaults = {
  endpoint: string | null;
  fallback: string | null;
  mock?: string | null;
  env?: {
    endpoint?: string;
    fallback?: string;
    mock?: string;
  };
};

type DataSourceRegistry = Record<DataSourceId, DataSourceEntry>;

function normaliseOverride(key: string | undefined, { allowNull = true } = {}): string | null | undefined {
  if (!key) {
    return undefined;
  }
  const value = readEnvString(key);
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (allowNull && value.toLowerCase() === 'null') {
    return null;
  }
  return value;
}

function buildEntry(id: DataSourceId, defaults: DataSourceDefaults): DataSourceEntry {
  const endpointOverride = normaliseOverride(defaults.env?.endpoint, { allowNull: false });
  const fallbackOverride = normaliseOverride(defaults.env?.fallback);
  const mockOverride = normaliseOverride(defaults.env?.mock);
  return {
    id,
    endpoint: endpointOverride ?? defaults.endpoint ?? null,
    fallback: fallbackOverride === undefined ? defaults.fallback ?? null : fallbackOverride,
    mock: mockOverride === undefined ? defaults.mock ?? null : mockOverride,
  };
}

const defaults: Record<DataSourceId, DataSourceDefaults> = {
  flowSnapshot: {
    endpoint: '/api/generation/snapshot',
    fallback: 'data/flow/snapshots/flow-shell-snapshot.json',
    env: {
      endpoint: 'VITE_FLOW_SNAPSHOT_URL',
      fallback: 'VITE_FLOW_SNAPSHOT_FALLBACK',
    },
  },
  generationSpecies: {
    endpoint: '/api/generation/species',
    fallback: 'data/flow/generation/species.json',
    env: {
      endpoint: 'VITE_GENERATION_SPECIES_URL',
      fallback: 'VITE_GENERATION_SPECIES_FALLBACK',
    },
  },
  generationSpeciesBatch: {
    endpoint: '/api/generation/species/batch',
    fallback: 'data/flow/generation/species-batch.json',
    env: {
      endpoint: 'VITE_GENERATION_SPECIES_BATCH_URL',
      fallback: 'VITE_GENERATION_SPECIES_BATCH_FALLBACK',
    },
  },
  generationSpeciesPreview: {
    endpoint: '/api/generation/species/batch',
    fallback: 'data/flow/generation/species-preview.json',
    env: {
      endpoint: 'VITE_GENERATION_SPECIES_PREVIEW_URL',
      fallback: 'VITE_GENERATION_SPECIES_PREVIEW_FALLBACK',
    },
  },
  runtimeValidatorSpecies: {
    endpoint: '/api/validators/runtime',
    fallback: 'data/flow/validators/species.json',
    env: {
      endpoint: 'VITE_RUNTIME_VALIDATION_URL',
      fallback: 'VITE_RUNTIME_VALIDATION_SPECIES_FALLBACK',
    },
  },
  runtimeValidatorBiome: {
    endpoint: '/api/validators/runtime',
    fallback: 'data/flow/validators/biome.json',
    env: {
      endpoint: 'VITE_RUNTIME_VALIDATION_URL',
      fallback: 'VITE_RUNTIME_VALIDATION_BIOME_FALLBACK',
    },
  },
  runtimeValidatorFoodweb: {
    endpoint: '/api/validators/runtime',
    fallback: 'data/flow/validators/foodweb.json',
    env: {
      endpoint: 'VITE_RUNTIME_VALIDATION_URL',
      fallback: 'VITE_RUNTIME_VALIDATION_FOODWEB_FALLBACK',
    },
  },
  qualitySuggestionsApply: {
    endpoint: '/api/quality/suggestions/apply',
    fallback: 'data/flow/quality/suggestions/apply.json',
    env: {
      endpoint: 'VITE_QUALITY_SUGGESTIONS_URL',
      fallback: 'VITE_QUALITY_SUGGESTIONS_FALLBACK',
    },
  },
  traitDiagnostics: {
    endpoint: '/api/traits/diagnostics',
    fallback: 'data/flow/traits/diagnostics.json',
    env: {
      endpoint: 'VITE_TRAIT_DIAGNOSTICS_URL',
      fallback: 'VITE_TRAIT_DIAGNOSTICS_FALLBACK',
    },
  },
  nebulaAtlas: {
    endpoint: '/api/v1/atlas',
    fallback: 'data/nebula/atlas.json',
    mock: 'data/nebula/telemetry.json',
    env: {
      endpoint: 'VITE_NEBULA_ATLAS_URL',
      fallback: 'VITE_NEBULA_ATLAS_FALLBACK',
      mock: 'VITE_NEBULA_TELEMETRY_MOCK',
    },
  },
};

const registry: DataSourceRegistry = Object.entries(defaults).reduce((acc, [id, config]) => {
  const entry = buildEntry(id as DataSourceId, config);
  acc[id as DataSourceId] = entry;
  return acc;
}, {} as DataSourceRegistry);

export function getDataSource(id: DataSourceId): DataSourceEntry {
  const entry = registry[id];
  if (!entry) {
    throw new Error(`Data source non configurato: ${id}`);
  }
  return entry;
}

export function resolveDataSource(id: DataSourceId, overrides: DataSourceOverrides = {}): DataSourceEntry {
  const base = getDataSource(id);
  const resolved: DataSourceEntry = {
    id,
    endpoint: base.endpoint,
    fallback: base.fallback,
    mock: base.mock,
  };
  if (Object.prototype.hasOwnProperty.call(overrides, 'endpoint')) {
    const override = overrides.endpoint;
    if (override === null) {
      resolved.endpoint = null;
    } else if (typeof override === 'string' && override.trim()) {
      resolved.endpoint = override.trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'fallback')) {
    const override = overrides.fallback;
    if (override === null) {
      resolved.fallback = null;
    } else if (typeof override === 'string' && override.trim()) {
      resolved.fallback = override.trim();
    } else {
      resolved.fallback = null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'mock')) {
    const override = overrides.mock;
    if (override === null) {
      resolved.mock = null;
    } else if (typeof override === 'string' && override.trim()) {
      resolved.mock = override.trim();
    } else {
      resolved.mock = null;
    }
  }
  return resolved;
}

export const dataSourcesRegistry: DataSourceRegistry = registry;

export function listDataSourceIds(): DataSourceId[] {
  return Object.keys(registry) as DataSourceId[];
}
