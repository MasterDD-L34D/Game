import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/apiEndpoints', () => ({
  resolveApiUrl: vi.fn((value: string) => value),
  resolveAssetUrl: vi.fn((value: string) => value),
  isStaticDeployment: vi.fn(() => false),
  readEnvString: vi.fn(() => undefined),
}));

const dataSourceMock = vi.hoisted(() => {
  const defaults = new Map<string, { endpoint: string | null; fallback: string | null; mock: string | null }>([
    [
      'flowSnapshot',
      { endpoint: '/api/v1/generation/snapshot', fallback: 'data/flow/snapshots/flow-shell-snapshot.json', mock: null },
    ],
    ['generationSpecies', { endpoint: '/api/v1/generation/species', fallback: null, mock: null }],
    ['generationSpeciesBatch', { endpoint: '/api/v1/generation/species/batch', fallback: null, mock: null }],
    ['generationSpeciesPreview', { endpoint: '/api/v1/generation/species/batch', fallback: null, mock: null }],
    [
      'traitDiagnostics',
      { endpoint: '/api/traits/diagnostics', fallback: 'data/flow/traits/diagnostics.json', mock: null },
    ],
  ]);
  return {
    resolveDataSource(id: string, overrides: Record<string, unknown> = {}) {
      const base = defaults.get(id) || { endpoint: null, fallback: null, mock: null };
      const result = {
        id,
        endpoint: base.endpoint,
        fallback: base.fallback,
        mock: base.mock,
      };
      if (Object.prototype.hasOwnProperty.call(overrides, 'endpoint')) {
        result.endpoint = (overrides.endpoint as string | null) ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'fallback')) {
        result.fallback = (overrides.fallback as string | null) ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'mock')) {
        result.mock = (overrides.mock as string | null) ?? null;
      }
      return result;
    },
  };
});

vi.mock('../../src/config/dataSources', () => dataSourceMock);

const orchestratorMocks = vi.hoisted(() => {
  const summarise = vi.fn((validation: any = {}) => {
    const messages = Array.isArray(validation?.messages) ? validation.messages : [];
    const warnings = messages.filter((msg) => msg?.level === 'warning').length;
    const errors = messages.filter((msg) => msg?.level === 'error').length;
    return {
      total: messages.length,
      warnings,
      errors,
      discarded: Array.isArray(validation?.discarded) ? validation.discarded.length : 0,
      corrected: validation?.corrected ? 1 : 0,
    };
  });
  return {
    generateSpecies: vi.fn(),
    generateSpeciesBatch: vi.fn(),
    summariseValidation: summarise,
  };
});

vi.mock('../../src/services/generationOrchestratorService.js', () => ({
  generateSpecies: orchestratorMocks.generateSpecies,
  generateSpeciesBatch: orchestratorMocks.generateSpeciesBatch,
  summariseValidation: orchestratorMocks.summariseValidation,
  __testables__: {
    normaliseRequest: (payload: any = {}) => ({
      trait_ids: Array.isArray(payload.trait_ids) ? payload.trait_ids : [],
      fallback_trait_ids: Array.isArray(payload.fallback_trait_ids) ? payload.fallback_trait_ids : [],
      biome_id: payload.biome_id ?? null,
      seed: payload.seed ?? null,
      request_id: payload.request_id ?? null,
      base_name: payload.base_name ?? null,
    }),
    normaliseBatchEntries: (entries: any[] = []) =>
      entries
        .map((entry) => ({
          trait_ids: Array.isArray(entry.trait_ids) ? entry.trait_ids : [],
          fallback_trait_ids: Array.isArray(entry.fallback_trait_ids) ? entry.fallback_trait_ids : [],
          biome_id: entry.biome_id ?? null,
          seed: entry.seed ?? null,
          request_id: entry.request_id ?? null,
        }))
        .filter((entry) => entry.trait_ids.length > 0),
  },
}));

const { generateSpecies, generateSpeciesBatch, summariseValidation } = orchestratorMocks;

import { useSnapshotLoader } from '../../src/state/useSnapshotLoader';
import { useSpeciesGenerator, __internals__ as speciesInternals } from '../../src/state/useSpeciesGenerator';
import { useTraitDiagnostics } from '../../src/state/useTraitDiagnostics';

describe('flow stores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    speciesInternals.speciesCache.clear();
    speciesInternals.batchCache.clear();
  });

  describe('useSnapshotLoader', () => {
    it('carica lo snapshot da endpoint remoto', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url === '/api/v1/generation/snapshot') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ overview: { completion: { total: 10, completed: 7 } } }),
          };
        }
        throw new Error(`unexpected url ${url}`);
      });
      const logger = { log: vi.fn() };
      const store = useSnapshotLoader({
        logger,
        fetch: fetchMock as unknown as typeof fetch,
        snapshotUrl: '/api/v1/generation/snapshot',
        fallbackSnapshotUrl: null,
      });
      await store.fetchSnapshot();
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/generation/snapshot', { cache: 'no-store' });
      expect(store.source.value).toBe('remote');
      expect(store.overview.value.completion.total).toBe(10);
      expect(logger.log).toHaveBeenCalledWith('snapshot.load.success', expect.any(Object));
    });

    it('applica il fallback locale se la richiesta remota fallisce', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url === '/api/v1/generation/snapshot') {
          return { ok: false, status: 503, json: async () => ({}) };
        }
        if (url === 'data/flow/snapshots/flow-shell-snapshot.json') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ overview: { completion: { total: 5, completed: 2 } } }),
          };
        }
        throw new Error(`unexpected url ${url}`);
      });
      const logger = { log: vi.fn() };
      const store = useSnapshotLoader({
        logger,
        fetch: fetchMock as unknown as typeof fetch,
        snapshotUrl: '/api/v1/generation/snapshot',
        fallbackSnapshotUrl: 'data/flow/snapshots/flow-shell-snapshot.json',
      });
      await store.fetchSnapshot();
      expect(store.source.value).toBe('fallback');
      expect(store.fallbackLabel.value).toBe('demo');
      expect(store.overview.value.completion.total).toBe(5);
      expect(logger.log).toHaveBeenCalledWith('snapshot.load.fallback.success', expect.any(Object));
    });

    it('usa il fallback quando il payload remoto è malformato', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url === '/api/v1/generation/snapshot') {
          return { ok: true, status: 200, json: async () => 42 };
        }
        if (url === 'data/flow/snapshots/flow-shell-snapshot.json') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ overview: { completion: { total: 4, completed: 1 } } }),
          };
        }
        throw new Error(`unexpected url ${url}`);
      });
      const logger = { log: vi.fn() };
      const store = useSnapshotLoader({
        logger,
        fetch: fetchMock as unknown as typeof fetch,
        snapshotUrl: '/api/v1/generation/snapshot',
        fallbackSnapshotUrl: 'data/flow/snapshots/flow-shell-snapshot.json',
      });
      await store.fetchSnapshot();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(store.source.value).toBe('fallback');
      expect(store.overview.value.completion.total).toBe(4);
      expect(logger.log).toHaveBeenCalledWith('snapshot.load.fallback.success', expect.any(Object));
    });
  });

  describe('useSpeciesGenerator', () => {
    it('normalizza la richiesta e usa la cache per chiamate ripetute', async () => {
      generateSpecies.mockResolvedValue({
        blueprint: { name: 'Specie Test' },
        validation: { messages: [] },
        meta: { request_id: 'req-1', endpoint_source: 'remote' },
      });
      const logger = { log: vi.fn() };
      const store = useSpeciesGenerator({ logger });
      await store.runSpecies({ trait_ids: ['alpha'] });
      expect(generateSpecies).toHaveBeenCalledTimes(1);
      expect(store.blueprint.value?.name).toBe('Specie Test');
      await store.runSpecies({ trait_ids: ['alpha'] });
      expect(generateSpecies).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('species.cache.hit', expect.any(Object));
    });

    it('propaga lo stato fallback dalle meta informazioni', async () => {
      generateSpecies.mockResolvedValueOnce({
        blueprint: { name: 'Fallback Specie' },
        validation: { messages: [] },
        meta: { request_id: 'req-2', endpoint_source: 'fallback', fallback_used: true },
      });
      const logger = { log: vi.fn() };
      const store = useSpeciesGenerator({ logger });
      await store.runSpecies({ trait_ids: ['beta'] });
      expect(store.fallbackActive.value).toBe(true);
      expect(logger.log).toHaveBeenCalledWith('species.fallback', expect.any(Object));
    });

    it('solleva errore se i trait mancano', async () => {
      const logger = { log: vi.fn() };
      const store = useSpeciesGenerator({ logger });
      await expect(store.runSpecies({ trait_ids: [] })).rejects.toThrow('errors.species.trait_ids_required');
    });
  });

  describe('useTraitDiagnostics', () => {
    it('carica e memorizza i diagnostics', async () => {
      const service = vi.fn(async () => ({
        diagnostics: { summary: { total_traits: 3, glossary_ok: 3 } },
        meta: { endpoint_source: 'remote' },
      }));
      const logger = { log: vi.fn() };
      const store = useTraitDiagnostics({ logger, service });
      await store.load();
      expect(service).toHaveBeenCalledTimes(1);
      expect(store.traitCompliance.value.summary.total_traits).toBe(3);
      expect(store.source.value).toBe('remote');
    });

    it('imposta il badge demo quando il fallback proviene da asset', async () => {
      const service = vi.fn()
        .mockResolvedValueOnce({
          diagnostics: { summary: { total_traits: 2, glossary_ok: 1 } },
          meta: { endpoint_source: 'remote' },
        })
        .mockResolvedValueOnce({
          diagnostics: { summary: { total_traits: 2, glossary_ok: 2 } },
        meta: { endpoint_source: 'fallback', endpoint_url: 'data/flow/traits/diagnostics.json' },
        });
      const logger = { log: vi.fn() };
      const store = useTraitDiagnostics({ logger, service });
      await store.load();
      await store.load({ force: true, refresh: true });
      expect(store.source.value).toBe('fallback');
      expect(store.fallbackLabel.value).toBe('demo');
      expect(logger.log).toHaveBeenCalledWith('traitDiagnostics.fallback', expect.any(Object));
    });
  });
});
