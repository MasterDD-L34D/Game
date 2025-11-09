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

describe('TraitDataService remote mutations', () => {
  let originalFetch: typeof fetch | undefined;

  const createJsonResponse = (status: number, body: unknown): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as unknown as Response;

  beforeEach(() => {
    vi.stubEnv('VITE_TRAIT_DATA_SOURCE', 'remote');
    vi.stubEnv('VITE_TRAIT_DATA_URL', 'https://example.com/data/traits/index.json?auth=1');
    vi.stubEnv('VITE_TRAIT_DATA_TOKEN_URL', 'https://example.com/api/auth/token');
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as typeof globalThis & { fetch?: typeof fetch }).fetch;
    }
  });

  it('refreshes the token after a 401 and updates metadata from the response', async () => {
    const deltaEntry = {
      id: 'delta',
      label: 'Delta',
      tier: 'T1',
      famiglia_tipologia: 'Skirmisher',
      slot_profile: { core: 'Assalto', complementare: 'Supporto' },
      slot: ['assalto'],
      usage_tags: ['rapid'],
      completion_flags: {
        has_biome: true,
        has_data_origin: true,
        has_species_link: true,
        has_usage_tags: true,
      },
      data_origin: 'remote_index',
      debolezza: 'Esposizione a fuoco incrociato.',
      mutazione_indotta: 'Stimola riflessi e controllo vettoriale.',
      requisiti_ambientali: [],
      sinergie: ['Arc Shot'],
      sinergie_pi: { co_occorrenze: [], combo_totale: 1, forme: [], tabelle_random: [] },
      species_affinity: [],
      spinta_selettiva: 'Assalto mirato.',
      uso_funzione: 'Colpire e disimpegnarsi rapidamente.',
      fattore_mantenimento_energetico: 'Basso',
      conflitti: [],
    };

    let currentEtag = 'etag-1';
    let currentVersion = 'v1';
    let latestEntry = { ...deltaEntry };
    let tokenCounter = 0;
    let putAttempts = 0;

    const fetchMock = vi.fn<Parameters<typeof fetch>, Promise<Response>>(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://example.com/api/auth/token') {
        tokenCounter += 1;
        return createJsonResponse(200, { token: `token-${tokenCounter}`, expiresIn: 60 });
      }
      if (url === 'https://example.com/data/traits/index.json?auth=1') {
        return createJsonResponse(200, {
          schema_version: '2.0',
          trait_glossary: 'remote/glossary.json',
          traits: { delta: latestEntry },
        });
      }
      if (url === 'https://example.com/api/traits/delta?auth=1' && (!init || init.method === 'GET')) {
        return createJsonResponse(200, {
          trait: latestEntry,
          meta: { etag: currentEtag, version: currentVersion },
        });
      }
      if (url === 'https://example.com/api/traits/delta?auth=1' && init?.method === 'PUT') {
        putAttempts += 1;
        const body = init.body ? JSON.parse(String(init.body)) : {};
        if (putAttempts === 1) {
          expect(body?.meta).toEqual({ etag: 'etag-1', version: 'v1' });
          return createJsonResponse(401, { error: 'token expired' });
        }
        currentEtag = 'etag-2';
        currentVersion = 'v2';
        latestEntry = { ...latestEntry, uso_funzione: body.entry?.uso_funzione ?? latestEntry.uso_funzione };
        return createJsonResponse(200, {
          trait: latestEntry,
          meta: { etag: currentEtag, version: currentVersion },
        });
      }
      throw new Error(`Unexpected fetch call ${url}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new TraitDataService(createFakeQ());
    await service.getTraits();
    const remoteTrait = await service.getTraitById('delta');
    expect(remoteTrait).not.toBeNull();

    const updatedTrait = {
      ...remoteTrait!,
      description: 'Aggiornato',
      entry: { ...remoteTrait!.entry, uso_funzione: 'Aggiornato' },
    } as Trait;

    const result = await service.saveTrait(updatedTrait);
    expect(result.entry.uso_funzione).toBe('Aggiornato');

    const secondUpdate = {
      ...result,
      description: 'Aggiornato due volte',
      entry: { ...result.entry, uso_funzione: 'Aggiornato due volte' },
    } as Trait;
    await service.saveTrait(secondUpdate);

    const putCalls = fetchMock.mock.calls.filter(
      ([input, init]) =>
        typeof input === 'string' &&
        input === 'https://example.com/api/traits/delta?auth=1' &&
        init?.method === 'PUT',
    );
    expect(putCalls).toHaveLength(3);
    expect(putCalls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token-1' });
    expect(putCalls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer token-2',
      'If-Match': 'etag-1',
      'X-Trait-Version': 'v1',
    });
    expect(putCalls[2][1]?.headers).toMatchObject({
      Authorization: 'Bearer token-2',
      'If-Match': 'etag-2',
      'X-Trait-Version': 'v2',
    });
  });

  it('handles 412 responses by syncing metadata and surfacing the backend message', async () => {
    const deltaEntry = {
      id: 'delta',
      label: 'Delta',
      tier: 'T1',
      famiglia_tipologia: 'Skirmisher',
      slot_profile: { core: 'Assalto', complementare: 'Supporto' },
      slot: ['assalto'],
      usage_tags: ['rapid'],
      completion_flags: {
        has_biome: true,
        has_data_origin: true,
        has_species_link: true,
        has_usage_tags: true,
      },
      data_origin: 'remote_index',
      debolezza: 'Esposizione a fuoco incrociato.',
      mutazione_indotta: 'Stimola riflessi e controllo vettoriale.',
      requisiti_ambientali: [],
      sinergie: ['Arc Shot'],
      sinergie_pi: { co_occorrenze: [], combo_totale: 1, forme: [], tabelle_random: [] },
      species_affinity: [],
      spinta_selettiva: 'Assalto mirato.',
      uso_funzione: 'Colpire e disimpegnarsi rapidamente.',
      fattore_mantenimento_energetico: 'Basso',
      conflitti: [],
    };

    let currentEtag = 'etag-10';
    let currentVersion = 'v10';
    let latestEntry = { ...deltaEntry };
    let tokenCounter = 0;
    let syncTriggered = 0;

    const fetchMock = vi.fn<Parameters<typeof fetch>, Promise<Response>>(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://example.com/api/auth/token') {
        tokenCounter += 1;
        return createJsonResponse(200, { token: `token-${tokenCounter}`, expiresIn: 60 });
      }
      if (url === 'https://example.com/data/traits/index.json?auth=1') {
        return createJsonResponse(200, {
          schema_version: '2.0',
          trait_glossary: 'remote/glossary.json',
          traits: { delta: latestEntry },
        });
      }
      if (url === 'https://example.com/api/traits/delta?auth=1' && (!init || init.method === 'GET')) {
        syncTriggered += 1;
        return createJsonResponse(200, {
          trait: latestEntry,
          meta: { etag: currentEtag, version: currentVersion },
        });
      }
      if (url === 'https://example.com/api/traits/delta?auth=1' && init?.method === 'PUT') {
        const body = init.body ? JSON.parse(String(init.body)) : {};
        if (syncTriggered === 1) {
          currentEtag = 'etag-11';
          currentVersion = 'v11';
          return createJsonResponse(412, {
            error: 'Versione del trait non aggiornata',
            meta: { etag: currentEtag, version: currentVersion },
          });
        }
        currentEtag = 'etag-11';
        currentVersion = 'v11';
        latestEntry = { ...latestEntry, uso_funzione: body.entry?.uso_funzione ?? latestEntry.uso_funzione };
        return createJsonResponse(200, {
          trait: latestEntry,
          meta: { etag: currentEtag, version: currentVersion },
        });
      }
      throw new Error(`Unexpected fetch call ${url}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new TraitDataService(createFakeQ());
    await service.getTraits();
    const remoteTrait = await service.getTraitById('delta');
    expect(remoteTrait).not.toBeNull();

    const updatedTrait = {
      ...remoteTrait!,
      entry: { ...remoteTrait!.entry, uso_funzione: 'Aggiornato' },
    } as Trait;

    await expect(service.saveTrait(updatedTrait)).rejects.toThrow('Versione del trait non aggiornata');

    const secondAttempt = {
      ...updatedTrait,
      description: 'Aggiornato due volte',
      entry: { ...updatedTrait.entry, uso_funzione: 'Aggiornato due volte' },
    } as Trait;
    await service.saveTrait(secondAttempt);

    const putCalls = fetchMock.mock.calls.filter(
      ([input, init]) =>
        typeof input === 'string' &&
        input === 'https://example.com/api/traits/delta?auth=1' &&
        init?.method === 'PUT',
    );
    expect(putCalls).toHaveLength(2);
    expect(putCalls[1][1]?.headers).toMatchObject({ 'If-Match': 'etag-11', 'X-Trait-Version': 'v11' });
    expect(syncTriggered).toBeGreaterThanOrEqual(2);
  });

  it('handles 428 responses by requesting fresh metadata and propagating the error', async () => {
    const deltaEntry = {
      id: 'delta',
      label: 'Delta',
      tier: 'T1',
      famiglia_tipologia: 'Skirmisher',
      slot_profile: { core: 'Assalto', complementare: 'Supporto' },
      slot: ['assalto'],
      usage_tags: ['rapid'],
      completion_flags: {
        has_biome: true,
        has_data_origin: true,
        has_species_link: true,
        has_usage_tags: true,
      },
      data_origin: 'remote_index',
      debolezza: 'Esposizione a fuoco incrociato.',
      mutazione_indotta: 'Stimola riflessi e controllo vettoriale.',
      requisiti_ambientali: [],
      sinergie: ['Arc Shot'],
      sinergie_pi: { co_occorrenze: [], combo_totale: 1, forme: [], tabelle_random: [] },
      species_affinity: [],
      spinta_selettiva: 'Assalto mirato.',
      uso_funzione: 'Colpire e disimpegnarsi rapidamente.',
      fattore_mantenimento_energetico: 'Basso',
      conflitti: [],
    };

    let currentEtag = 'etag-a';
    let currentVersion = 'v-a';
    let latestEntry = { ...deltaEntry };
    let tokenCounter = 0;
    let detailCalls = 0;

    const fetchMock = vi.fn<Parameters<typeof fetch>, Promise<Response>>(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://example.com/api/auth/token') {
        tokenCounter += 1;
        return createJsonResponse(200, { token: `token-${tokenCounter}`, expiresIn: 60 });
      }
      if (url === 'https://example.com/data/traits/index.json?auth=1') {
        return createJsonResponse(200, {
          schema_version: '2.0',
          trait_glossary: 'remote/glossary.json',
          traits: { delta: latestEntry },
        });
      }
      if (url === 'https://example.com/api/traits/delta?auth=1' && (!init || init.method === 'GET')) {
        detailCalls += 1;
        return createJsonResponse(200, {
          trait: latestEntry,
          meta: { etag: currentEtag, version: currentVersion },
        });
      }
      if (url === 'https://example.com/api/traits/delta?auth=1' && init?.method === 'PUT') {
        const body = init.body ? JSON.parse(String(init.body)) : {};
        if (detailCalls === 1) {
          return createJsonResponse(428, {
            error: 'Versione o ETag richiesto per aggiornare il trait',
          });
        }
        currentEtag = 'etag-b';
        currentVersion = 'v-b';
        latestEntry = { ...latestEntry, uso_funzione: body.entry?.uso_funzione ?? latestEntry.uso_funzione };
        return createJsonResponse(200, {
          trait: latestEntry,
          meta: { etag: currentEtag, version: currentVersion },
        });
      }
      throw new Error(`Unexpected fetch call ${url}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new TraitDataService(createFakeQ());
    await service.getTraits();
    const remoteTrait = await service.getTraitById('delta');
    expect(remoteTrait).not.toBeNull();

    const updatedTrait = {
      ...remoteTrait!,
      description: 'Aggiornato',
      entry: { ...remoteTrait!.entry, uso_funzione: 'Aggiornato' },
    } as Trait;

    await expect(service.saveTrait(updatedTrait)).rejects.toThrow(
      'Versione o ETag richiesto per aggiornare il trait',
    );

    const secondAttempt = {
      ...updatedTrait,
      description: 'Aggiornato due volte',
      entry: { ...updatedTrait.entry, uso_funzione: 'Aggiornato due volte' },
    } as Trait;
    await service.saveTrait(secondAttempt);

    const putCalls = fetchMock.mock.calls.filter(
      ([input, init]) =>
        typeof input === 'string' &&
        input === 'https://example.com/api/traits/delta?auth=1' &&
        init?.method === 'PUT',
    );
    expect(putCalls).toHaveLength(2);
    expect(putCalls[1][1]?.headers).toMatchObject({ 'If-Match': 'etag-a', 'X-Trait-Version': 'v-a' });
    expect(detailCalls).toBeGreaterThanOrEqual(2);
  });
});
