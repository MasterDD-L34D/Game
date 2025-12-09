import { readEnvString } from '../services/apiEndpoints';

type NullableString = string | null;

export type DataSourceId =
  | 'flowSnapshot'
  | 'generationSpecies'
  | 'generationSpeciesBatch'
  | 'generationSpeciesPreview'
  | 'traitDiagnostics'
  | 'nebulaAtlas'
  | (string & {});

export interface DataSourceConfig {
  id: DataSourceId;
  endpoint: NullableString;
  fallback: NullableString;
  mock: NullableString;
}

const defaults: Record<DataSourceId, DataSourceConfig> = {
  flowSnapshot: {
    id: 'flowSnapshot',
    endpoint: '/api/v1/generation/snapshot',
    fallback: 'data/flow/snapshots/flow-shell-snapshot.json',
    mock: null,
  },
  generationSpecies: {
    id: 'generationSpecies',
    endpoint: '/api/v1/generation/species',
    fallback: null,
    mock: null,
  },
  generationSpeciesBatch: {
    id: 'generationSpeciesBatch',
    endpoint: '/api/v1/generation/species/batch',
    fallback: null,
    mock: null,
  },
  generationSpeciesPreview: {
    id: 'generationSpeciesPreview',
    endpoint: '/api/v1/generation/species/batch',
    fallback: null,
    mock: null,
  },
  traitDiagnostics: {
    id: 'traitDiagnostics',
    endpoint: '/api/traits/diagnostics',
    fallback: 'data/flow/traits/diagnostics.json',
    mock: null,
  },
  nebulaAtlas: {
    id: 'nebulaAtlas',
    endpoint: '/api/v1/atlas',
    fallback: 'data/nebula/atlas.json',
    mock: 'data/nebula/telemetry.json',
  },
};

function parseNullable(value: string | undefined): NullableString | undefined {
  if (value === undefined) return undefined;
  if (value.toLowerCase() === 'null') return null;
  return value;
}

function mergeConfig(
  base: DataSourceConfig,
  overrides: Partial<DataSourceConfig>,
): DataSourceConfig {
  const result: DataSourceConfig = { ...base };
  if (Object.prototype.hasOwnProperty.call(overrides, 'endpoint')) {
    result.endpoint = overrides.endpoint ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'fallback')) {
    result.fallback = overrides.fallback ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'mock')) {
    result.mock = overrides.mock ?? null;
  }
  return result;
}

function getEnvOverrides(id: DataSourceId): Partial<DataSourceConfig> {
  switch (id) {
    case 'flowSnapshot': {
      const endpoint = parseNullable(readEnvString('VITE_FLOW_SNAPSHOT_URL'));
      const fallback = parseNullable(readEnvString('VITE_FLOW_SNAPSHOT_FALLBACK'));
      const overrides: Partial<DataSourceConfig> = {};
      if (endpoint !== undefined) overrides.endpoint = endpoint;
      if (fallback !== undefined) overrides.fallback = fallback;
      return overrides;
    }
    case 'nebulaAtlas': {
      const fallback = parseNullable(readEnvString('VITE_NEBULA_ATLAS_FALLBACK'));
      const mock = parseNullable(readEnvString('VITE_NEBULA_TELEMETRY_MOCK'));
      const overrides: Partial<DataSourceConfig> = {};
      if (fallback !== undefined) overrides.fallback = fallback;
      if (mock !== undefined) overrides.mock = mock;
      return overrides;
    }
    default:
      return {};
  }
}

function ensureDataSource(id: DataSourceId): DataSourceConfig {
  const base = defaults[id];
  if (!base) {
    throw new Error(`Data source "${String(id)}" non configurato.`);
  }
  return base;
}

export function getDataSource(id: DataSourceId): DataSourceConfig {
  const base = ensureDataSource(id);
  const envOverrides = getEnvOverrides(id);
  return mergeConfig(base, envOverrides);
}

export function resolveDataSource(
  id: DataSourceId,
  overrides: Partial<DataSourceConfig> = {},
): DataSourceConfig {
  const base = ensureDataSource(id);
  const envOverrides = getEnvOverrides(id);
  const withEnv = mergeConfig(base, envOverrides);
  return mergeConfig(withEnv, overrides);
}

export function listDataSourceIds(): DataSourceId[] {
  return Object.keys(defaults) as DataSourceId[];
}
