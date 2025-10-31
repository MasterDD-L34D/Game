import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints.js';
import { fetchJsonWithFallback } from './fetchWithFallback.js';

const DEFAULT_ENDPOINT = '/api/generation/species/batch';
const DEFAULT_FALLBACK = 'api-mock/generation/species-preview.json';

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error('fetch non disponibile nell\'ambiente corrente');
}

function resolveFallback(options) {
  if (options && Object.prototype.hasOwnProperty.call(options, 'fallback')) {
    if (options.fallback === null) {
      return null;
    }
    if (typeof options.fallback === 'string' && options.fallback.trim()) {
      return options.fallback.trim();
    }
  }
  return DEFAULT_FALLBACK;
}

function resolveAllowFallback(options) {
  if (options && Object.prototype.hasOwnProperty.call(options, 'allowFallback')) {
    return Boolean(options.allowFallback);
  }
  return isStaticDeployment();
}

function normaliseEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .filter((entry) => entry && Array.isArray(entry.trait_ids) && entry.trait_ids.length)
    .map((entry) => ({
      trait_ids: entry.trait_ids,
      biome_id: entry.biome_id ?? null,
      seed: entry.seed ?? null,
      base_name: entry.base_name ?? null,
      request_id: entry.request_id ?? null,
      fallback_trait_ids: entry.fallback_trait_ids,
    }));
}

export async function requestSpeciesPreviewBatch(entries, options = {}) {
  const batch = normaliseEntries(entries);
  if (!batch.length) {
    return { previews: [], errors: [] };
  }
  const endpoint = resolveApiUrl(options.endpoint || DEFAULT_ENDPOINT);
  const fallbackPath = resolveFallback(options);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const fetchImpl = ensureFetch();
  const { data: payload, source, error } = await fetchJsonWithFallback(endpoint, {
    fetchImpl,
    requestInit: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch }),
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore richiesta anteprime specie',
    fallbackErrorMessage: 'Anteprime specie locali non disponibili',
  });
  const previews = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.previews)
      ? payload.previews
      : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  return {
    previews,
    errors,
    endpoint_source: source,
    endpoint_url: source === 'fallback' && fallbackUrl ? fallbackUrl : endpoint,
    fallback_error: source === 'fallback' && error ? error.message : undefined,
  };
}
