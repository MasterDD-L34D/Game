import { describe, expect, it, vi } from 'vitest';

import { fetchTraitRegistry } from '../../../services/api/generatorClient.ts';

function createJsonResponse(data: unknown, init: ResponseInit = {}) {
  const body = JSON.stringify(data);
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

describe('generator client resource fetching', () => {
  it('normalises candidate URLs through the provided context', async () => {
    const context = {
      resolvedBase: 'https://cdn.example.com/packs/demo/',
      docsBase: 'https://cdn.example.com/packs/demo/docs/catalog/',
      catalogUrl: 'https://cdn.example.com/packs/demo/docs/catalog/catalog_data.json',
      resolveDocHref: (relativePath: string) =>
        new URL(relativePath, 'https://cdn.example.com/packs/demo/docs/catalog/').toString(),
      resolvePackHref: (relativePath: string) =>
        new URL(relativePath, 'https://cdn.example.com/packs/demo/').toString(),
    };

    const responsePayload = { ok: true };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      expect(url).toBe('https://cdn.example.com/packs/demo/docs/catalog/trait-registry.json');
      return createJsonResponse(responsePayload);
    });

    const result = await fetchTraitRegistry({
      context,
      candidates: ['trait-registry.json'],
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data: responsePayload,
      url: 'https://cdn.example.com/packs/demo/docs/catalog/trait-registry.json',
      fromFallback: false,
    });
  });

  it('uses fallback candidates and flags relative sources as fallbacks', async () => {
    const responses = new Map<string, Response>([
      ['docs/catalog/missing.json', new Response('not found', { status: 404 })],
      ['../fallback.json', createJsonResponse({ fallback: true })],
    ]);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      return responses.get(url) ?? new Response('missing', { status: 404 });
    });

    const result = await fetchTraitRegistry({
      context: null,
      candidates: ['docs/catalog/missing.json', '../fallback.json'],
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.url).toBe('../fallback.json');
    expect(result.fromFallback).toBe(true);
    expect(result.data).toEqual({ fallback: true });
  });

  it('propagates the last fetch error when every candidate fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('error', { status: 500 }));

    await expect(
      fetchTraitRegistry({
        context: null,
        candidates: ['docs/catalog/registry.json'],
        fetchImpl,
      }),
    ).rejects.toThrow('HTTP 500');

    expect(fetchImpl).toHaveBeenCalled();
  });
});
