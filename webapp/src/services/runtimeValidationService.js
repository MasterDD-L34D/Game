import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints.js';
import { fetchJsonWithFallback } from './fetchWithFallback.js';

const DEFAULT_ENDPOINT = '/api/validators/runtime';
const DEFAULT_FALLBACKS = {
  species: 'api-mock/validators/species.json',
  biome: 'api-mock/validators/biome.json',
  foodweb: 'api-mock/validators/foodweb.json',
};

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error("fetch non disponibile nell'ambiente corrente");
}

function resolveFallback(kind, options) {
  if (options && Object.prototype.hasOwnProperty.call(options, 'fallback')) {
    if (options.fallback === null) {
      return null;
    }
    if (typeof options.fallback === 'string' && options.fallback.trim()) {
      return options.fallback.trim();
    }
  }
  if (options && options.fallbacks && Object.prototype.hasOwnProperty.call(options.fallbacks, kind)) {
    const value = options.fallbacks[kind];
    if (value === null) {
      return null;
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return DEFAULT_FALLBACKS[kind] || null;
}

function resolveAllowFallback(options) {
  if (options && Object.prototype.hasOwnProperty.call(options, 'allowFallback')) {
    return Boolean(options.allowFallback);
  }
  return isStaticDeployment();
}

async function postRuntime(kind, payload, options = {}) {
  if (!kind) {
    throw new Error("Parametro 'kind' richiesto per la validazione runtime");
  }
  const endpoint = resolveApiUrl(options.endpoint || DEFAULT_ENDPOINT);
  const fallbackPath = resolveFallback(kind, options);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const fetchImpl = ensureFetch();
  const { data: body, source, error } = await fetchJsonWithFallback(endpoint, {
    fetchImpl,
    requestInit: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, payload }),
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore validazione runtime',
    fallbackErrorMessage: 'Validator runtime locale non disponibile',
  });
  const payloadBody = body && typeof body === 'object' ? { ...body } : body;
  const result = payloadBody && typeof payloadBody === 'object' && Object.prototype.hasOwnProperty.call(payloadBody, 'result')
    ? payloadBody.result
    : payloadBody;
  if (result && typeof result === 'object') {
    const meta = { ...(result.meta || {}), ...(payloadBody?.meta || {}) };
    meta.endpoint_source = source;
    meta.endpoint_url = source === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
    if (source === 'fallback') {
      meta.fallback_error = error ? error.message : 'Richiesta remota non disponibile';
    }
    result.meta = meta;
  }
  return result;
}

export async function validateSpeciesBatch(entries, context = {}, options = {}) {
  const payload = {
    entries: Array.isArray(entries) ? entries : [],
    biomeId: context.biomeId || null,
  };
  return postRuntime('species', payload, options);
}

export async function validateBiome(biome, context = {}, options = {}) {
  const payload = {
    biome: biome || null,
    defaultHazard: context.defaultHazard || null,
  };
  return postRuntime('biome', payload, options);
}

export async function validateFoodweb(foodweb, options = {}) {
  const payload = { foodweb: foodweb || null };
  return postRuntime('foodweb', payload, options);
}
