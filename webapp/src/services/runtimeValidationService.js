import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints.js';
import { fetchJsonWithFallback } from './fetchWithFallback.js';
import { resolveDataSource } from '../config/dataSources.js';

const DATA_SOURCE_BY_KIND = {
  species: 'runtimeValidatorSpecies',
  biome: 'runtimeValidatorBiome',
  foodweb: 'runtimeValidatorFoodweb',
};

function resolveFallback(kind, options, fallback) {
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
  return fallback;
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
  const dataSourceId = DATA_SOURCE_BY_KIND[kind] || 'runtimeValidatorSpecies';
  const config = resolveDataSource(dataSourceId, {
    endpoint: Object.prototype.hasOwnProperty.call(options, 'endpoint') ? options.endpoint : undefined,
    fallback: undefined,
  });
  const endpoint = resolveApiUrl(options.endpoint || config.endpoint);
  const fallbackPath = resolveFallback(kind, options, config.fallback);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const response = await fetchJsonWithFallback(endpoint, {
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
  const { data: body, error } = response;
  const endpointSource = response.source;
  const payloadBody = body && typeof body === 'object' ? { ...body } : body;
  const result = payloadBody && typeof payloadBody === 'object' && Object.prototype.hasOwnProperty.call(payloadBody, 'result')
    ? payloadBody.result
    : payloadBody;
  if (result && typeof result === 'object') {
    const meta = { ...(result.meta || {}), ...(payloadBody?.meta || {}) };
    meta.endpoint_source = endpointSource;
    meta.endpoint_url = endpointSource === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
    if (endpointSource === 'fallback') {
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
