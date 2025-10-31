import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints.js';
import { fetchJsonWithFallback } from './fetchWithFallback.js';

const DEFAULT_ENDPOINT = '/api/traits/diagnostics';
const DEFAULT_FALLBACK = 'api-mock/traits/diagnostics.json';

function resolveFetch() {
  if (typeof fetch === 'function') return fetch;
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error('fetch non disponibile per trait diagnostics');
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

export async function fetchTraitDiagnostics(options = {}) {
  const endpoint = resolveApiUrl(options.endpoint || DEFAULT_ENDPOINT);
  const refresh = options.refresh ? '?refresh=true' : '';
  const targetUrl = `${endpoint}${refresh}`;
  const fallbackPath = resolveFallback(options);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const fetchImpl = resolveFetch();
  const { data, source, error } = await fetchJsonWithFallback(targetUrl, {
    fetchImpl,
    requestInit: {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore caricamento trait diagnostics',
    fallbackErrorMessage: 'Trait diagnostics locali non disponibili',
  });
  const payload = data || {};
  const diagnostics = payload?.diagnostics || payload || {};
  const meta = { ...(payload?.meta || {}) };
  meta.endpoint_source = source;
  meta.endpoint_url = source === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
  if (source === 'fallback') {
    meta.fallback_error = error ? error.message : 'Richiesta remota non disponibile';
  }
  return {
    diagnostics,
    meta,
  };
}

export const __internals__ = { resolveFetch };
