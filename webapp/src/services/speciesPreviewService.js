import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints';
import { fetchJsonWithFallback } from './fetchWithFallback.js';
import { resolveDataSource } from '../config/dataSources.js';

function resolveFallback(options, fallback) {
  if (options && Object.prototype.hasOwnProperty.call(options, 'fallback')) {
    if (options.fallback === null) {
      return null;
    }
    if (typeof options.fallback === 'string' && options.fallback.trim()) {
      return options.fallback.trim();
    }
  }
  return fallback;
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
  const config = resolveDataSource('generationSpeciesPreview', {
    endpoint: Object.prototype.hasOwnProperty.call(options, 'endpoint') ? options.endpoint : undefined,
    fallback: Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : undefined,
  });
  const endpoint = resolveApiUrl(options.endpoint || config.endpoint);
  const fallbackPath = resolveFallback(options, config.fallback);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const response = await fetchJsonWithFallback(endpoint, {
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
  const { data: payload, error } = response;
  const endpointSource = response.source;
  const previews = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.previews)
      ? payload.previews
      : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  return {
    previews,
    errors,
    endpoint_source: endpointSource,
    endpoint_url: endpointSource === 'fallback' && fallbackUrl ? fallbackUrl : endpoint,
    fallback_error: endpointSource === 'fallback' && error ? error.message : undefined,
  };
}
