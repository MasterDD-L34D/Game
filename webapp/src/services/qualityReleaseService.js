import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints.js';
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

export async function applyQualitySuggestion(suggestion, options = {}) {
  if (!suggestion || typeof suggestion !== 'object') {
    throw new Error("Suggerimento non valido per l'applicazione");
  }
  const config = resolveDataSource('qualitySuggestionsApply', {
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
      body: JSON.stringify({ suggestion }),
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore applicazione suggerimento',
    fallbackErrorMessage: 'Suggerimenti locali non disponibili',
  });
  const { data: payload, error } = response;
  const endpointSource = response.source;
  const result = payload && typeof payload === 'object' ? { ...payload } : payload;
  if (result && typeof result === 'object') {
    const meta = { ...(result.meta || {}) };
    meta.endpoint_source = endpointSource;
    meta.endpoint_url = endpointSource === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
    if (endpointSource === 'fallback') {
      meta.fallback_error = error ? error.message : 'Richiesta remota non disponibile';
    }
    result.meta = meta;
  }
  return result;
}
