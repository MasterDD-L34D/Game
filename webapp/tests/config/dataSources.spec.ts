import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({
  values: {} as Record<string, string | undefined>,
}));

vi.mock('../../src/services/apiEndpoints.js', () => ({
  readEnvString: (key: string) => env.values[key],
}));

afterEach(() => {
  env.values = {};
});

describe('data sources registry', () => {
  beforeEach(() => {
    env.values = {};
    vi.resetModules();
  });

  it('espone le configurazioni di default', async () => {
    const { getDataSource, listDataSourceIds } = await import('../../src/config/dataSources.ts');
    expect(listDataSourceIds()).toContain('flowSnapshot');
    expect(listDataSourceIds()).toContain('generationSpecies');
    expect(listDataSourceIds()).toContain('nebulaAtlas');

    const flowSnapshot = getDataSource('flowSnapshot');
    expect(flowSnapshot).toEqual({
      id: 'flowSnapshot',
      endpoint: '/api/generation/snapshot',
      fallback: 'data/flow/snapshots/flow-shell-snapshot.json',
      mock: null,
    });

    const nebula = getDataSource('nebulaAtlas');
    expect(nebula.endpoint).toBe('/api/nebula/atlas');
    expect(nebula.fallback).toBe('data/nebula/atlas.json');
    expect(nebula.mock).toBe('data/nebula/telemetry.json');
  });

  it('applica le variabili di ambiente se presenti', async () => {
    env.values = {
      VITE_FLOW_SNAPSHOT_URL: 'https://example.test/api/snapshot',
      VITE_FLOW_SNAPSHOT_FALLBACK: 'null',
      VITE_NEBULA_ATLAS_FALLBACK: '/custom/atlas.json',
      VITE_NEBULA_TELEMETRY_MOCK: '/custom/mock.json',
    };
    vi.resetModules();
    const { getDataSource } = await import('../../src/config/dataSources.ts');

    const snapshot = getDataSource('flowSnapshot');
    expect(snapshot.endpoint).toBe('https://example.test/api/snapshot');
    expect(snapshot.fallback).toBeNull();

    const nebula = getDataSource('nebulaAtlas');
    expect(nebula.fallback).toBe('/custom/atlas.json');
    expect(nebula.mock).toBe('/custom/mock.json');
  });

  it('consente override puntuali tramite resolveDataSource', async () => {
    const { resolveDataSource } = await import('../../src/config/dataSources.ts');
    const overridden = resolveDataSource('generationSpecies', {
      endpoint: 'https://override.test/species',
      fallback: 'data/custom/species.json',
    });
    expect(overridden.endpoint).toBe('https://override.test/species');
    expect(overridden.fallback).toBe('data/custom/species.json');
    expect(overridden.mock).toBeNull();
  });

  it('solleva errore per sorgenti non configurate', async () => {
    const { getDataSource } = await import('../../src/config/dataSources.ts');
    expect(() => getDataSource('unknown-source' as any)).toThrow(/non configurato/);
  });
});
