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

export async function fetchTraitDiagnostics(options = {}) {
  const config = resolveDataSource('traitDiagnostics', {
    endpoint: Object.prototype.hasOwnProperty.call(options, 'endpoint') ? options.endpoint : undefined,
    fallback: Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : undefined,
  });
  const endpoint = resolveApiUrl(options.endpoint || config.endpoint);
  const refresh = options.refresh ? '?refresh=true' : '';
  const targetUrl = `${endpoint}${refresh}`;
  const fallbackPath = resolveFallback(options, config.fallback);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const response = await fetchJsonWithFallback(targetUrl, {
    fetchImpl: options.fetchImpl,
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
  const { data, error } = response;
  const endpointSource = response.source;
  const payload = data || {};
  const diagnostics = payload?.diagnostics || payload || {};
  const meta = { ...(payload?.meta || {}) };
  meta.endpoint_source = endpointSource;
  meta.endpoint_url = endpointSource === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
  if (endpointSource === 'fallback') {
    meta.fallback_error = error ? error.message : 'Richiesta remota non disponibile';
  }
  return {
    diagnostics,
    meta,
  };
}

export const __internals__ = { resolveFallback };
