import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints.js';
import { fetchJsonWithFallback } from './fetchWithFallback.js';

const DEFAULT_ENDPOINT = '/api/quality/suggestions/apply';
const DEFAULT_FALLBACK = 'api-mock/quality/suggestions/apply.json';

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error("fetch non disponibile nell'ambiente corrente");
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

export async function applyQualitySuggestion(suggestion, options = {}) {
  if (!suggestion || typeof suggestion !== 'object') {
    throw new Error("Suggerimento non valido per l'applicazione");
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
      body: JSON.stringify({ suggestion }),
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore applicazione suggerimento',
    fallbackErrorMessage: 'Suggerimenti locali non disponibili',
  });
  const result = payload && typeof payload === 'object' ? { ...payload } : payload;
  if (result && typeof result === 'object') {
    const meta = { ...(result.meta || {}) };
    meta.endpoint_source = source;
    meta.endpoint_url = source === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
    if (source === 'fallback') {
      meta.fallback_error = error ? error.message : 'Richiesta remota non disponibile';
    }
    result.meta = meta;
  }
  return result;
}
