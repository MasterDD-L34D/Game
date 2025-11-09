import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FALLBACK_CACHE_TTL_MS, TraitDataService } from '../trait-data.service';
import { getSampleTraits } from '../../data/traits.sample';
import type { Trait } from '../../types/trait';

const createFakeQ = () => ({
  resolve: <T>(value: T) => Promise.resolve(value),
  reject: <T>(value: T) => Promise.reject(value),
  when: <T>(value: T | Promise<T>) => Promise.resolve(value),
});

describe('TraitDataService caching behaviour', () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    vi.stubEnv('VITE_TRAIT_DATA_SOURCE', 'remote');
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as typeof globalThis & { fetch?: typeof fetch }).fetch;
    }
  });

  it('falls back to mocks temporarily and retries the remote source after TTL', async () => {
    const remotePayload = {
      schema_version: '2.0',
      trait_glossary: 'remote/glossary.json',
      traits: {
        delta: {
          id: 'delta',
          label: 'Delta',
          tier: 'T1',
          famiglia_tipologia: 'Skirmisher',
          slot_profile: { core: 'Assalto', complementare: 'Supporto' },
          slot: ['assalto'],
          usage_tags: ['rapid'],
          completion_flags: {
            has_biome: false,
            has_data_origin: true,
            has_species_link: false,
            has_usage_tags: true,
          },
          data_origin: 'remote_index',
          debolezza: 'Esposizione a fuoco incrociato.',
          mutazione_indotta: 'Stimola riflessi e controllo vettoriale.',
          requisiti_ambientali: [],
          sinergie: ['Arc Shot'],
          sinergie_pi: {
            co_occorrenze: [],
            combo_totale: 1,
            forme: [],
            tabelle_random: [],
          },
          species_affinity: [],
          spinta_selettiva: 'Assalto mirato.',
          uso_funzione: 'Colpire e disimpegnarsi rapidamente.',
          fattore_mantenimento_energetico: 'Basso',
          conflitti: [],
        },
      },
    };

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, Promise<Response>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({
        ok: true,
        json: async () => remotePayload,
      } as unknown as Response);

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new TraitDataService(createFakeQ());
    const firstLoad = await service.getTraits();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.isUsingFallback()).toBe(true);
    expect(service.getLastError()).toBeInstanceOf(Error);
    expect(firstLoad.map((trait) => trait.id)).toEqual(getSampleTraits().map((trait) => trait.id));

    vi.advanceTimersByTime(FALLBACK_CACHE_TTL_MS + 1);

    const secondLoad = await service.getTraits();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(service.isUsingFallback()).toBe(false);
    expect(service.getLastError()).toBeNull();
    expect(secondLoad.find((trait) => trait.id === 'delta')).toMatchObject({
      name: 'Delta',
      entry: expect.objectContaining({ uso_funzione: 'Colpire e disimpegnarsi rapidamente.' }),
    } as Partial<Trait>);
  });
});
