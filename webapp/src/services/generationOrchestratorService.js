import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints.js';
import { fetchJsonWithFallback } from './fetchWithFallback.js';
import { resolveDataSource } from '../config/dataSources.js';

function normaliseString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length ? text : null;
}

function normaliseStringList(values) {
  if (!values) {
    return [];
  }
  if (typeof values === 'string') {
    return values.trim() ? [values.trim()] : [];
  }
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry || '').trim()))
    .filter((entry) => Boolean(entry.length));
}

function normaliseValidation(payload = {}) {
  const corrected = payload && typeof payload.corrected === 'object' && payload.corrected !== null
    ? { ...payload.corrected }
    : null;
  const messages = Array.isArray(payload?.messages)
    ? payload.messages
        .filter(Boolean)
        .map((message) => {
          if (typeof message === 'string') {
            return { level: 'info', message };
          }
          const level = message.level || message.severity || 'info';
          const code = message.code || null;
          const subject = message.subject || message.scope || null;
          const context = message.context && typeof message.context === 'object' ? { ...message.context } : undefined;
          return {
            level,
            code: code || undefined,
            message: message.message || message.text || '',
            subject: subject || undefined,
            context,
          };
        })
    : [];
  const discarded = Array.isArray(payload?.discarded) ? [...payload.discarded] : [];
  return { corrected, messages, discarded };
}

function normaliseMeta(payload = {}) {
  const result = {};
  if (payload && typeof payload === 'object') {
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = value;
      }
    });
  }
  if (result.request_id && !result.requestId) {
    result.requestId = result.request_id;
  }
  if (!result.request_id && result.requestId) {
    result.request_id = result.requestId;
  }
  return result;
}

function normaliseBlueprint(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  return { ...payload };
}

function toGenerationResult(payload = {}) {
  const blueprint = normaliseBlueprint(payload.blueprint || payload);
  const validation = normaliseValidation(payload.validation || {});
  const meta = normaliseMeta(payload.meta || {});
  return { blueprint, validation, meta };
}

function toBatchError(payload = {}) {
  const index = Number.isFinite(payload.index) ? payload.index : 0;
  const error = typeof payload.error === 'string' ? payload.error : 'Errore generazione specie';
  const requestId = normaliseString(payload.request_id || payload.requestId);
  return { index, error, request_id: requestId, requestId: requestId || undefined };
}

function normaliseRequest(payload = {}) {
  const traitIds = normaliseStringList(payload.trait_ids || payload.traits);
  const fallbackTraitIds = normaliseStringList(payload.fallback_trait_ids || payload.fallbackTraits);
  return {
    trait_ids: traitIds,
    biome_id: normaliseString(payload.biome_id || payload.biomeId),
    seed: payload.seed ?? null,
    base_name: normaliseString(payload.base_name || payload.baseName),
    request_id: normaliseString(payload.request_id || payload.requestId),
    fallback_trait_ids: fallbackTraitIds,
    dataset_id: normaliseString(payload.dataset_id || payload.datasetId),
    profile_id: normaliseString(payload.profile_id || payload.profileId),
  };
}

function resolveEndpoint(options, fallback) {
  if (options && typeof options.endpoint === 'string' && options.endpoint.trim()) {
    return options.endpoint;
  }
  return fallback;
}

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

export async function generateSpecies(request, options = {}) {
  const payload = normaliseRequest(request || {});
  if (!payload.trait_ids.length) {
    throw new Error('trait_ids richiesti per la generazione specie');
  }
  const config = resolveDataSource('generationSpecies', {
    endpoint: Object.prototype.hasOwnProperty.call(options, 'endpoint') ? options.endpoint : undefined,
    fallback: Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : undefined,
  });
  const endpoint = resolveApiUrl(resolveEndpoint(options, config.endpoint));
  const fallbackPath = resolveFallback(options, config.fallback);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const response = await fetchJsonWithFallback(endpoint, {
    requestInit: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: options.signal,
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore generazione specie',
    fallbackErrorMessage: 'Snapshot specie di fallback non disponibile',
  });
  const { data, error } = response;
  const endpointSource = response.source;
  const result = toGenerationResult(data);
  const meta = { ...(result.meta || {}) };
  meta.endpoint_source = endpointSource;
  meta.endpoint_url = endpointSource === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
  if (endpointSource === 'fallback') {
    meta.fallback_used = true;
    meta.fallback_active = true;
    meta.fallback_error = error ? error.message : 'Richiesta remota non disponibile';
  }
  result.meta = meta;
  return result;
}

function normaliseBatchEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => normaliseRequest(entry))
    .filter((entry) => Array.isArray(entry.trait_ids) && entry.trait_ids.length);
}

export async function generateSpeciesBatch(batchPayload, options = {}) {
  const entries = Array.isArray(batchPayload?.batch)
    ? normaliseBatchEntries(batchPayload.batch)
    : normaliseBatchEntries(batchPayload);
  if (!entries.length) {
    return { results: [], errors: [] };
  }
  const config = resolveDataSource('generationSpeciesBatch', {
    endpoint: Object.prototype.hasOwnProperty.call(options, 'endpoint') ? options.endpoint : undefined,
    fallback: Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : undefined,
  });
  const endpoint = resolveApiUrl(resolveEndpoint(options, config.endpoint));
  const fallbackPath = resolveFallback(options, config.fallback);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;
  const body = { batch: entries };
  const batchResponse = await fetchJsonWithFallback(endpoint, {
    requestInit: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options.signal,
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore generazione batch specie',
    fallbackErrorMessage: 'Batch di fallback non disponibile',
  });
  const { data: payload, error } = batchResponse;
  const endpointSource = batchResponse.source;
  const results = Array.isArray(payload?.results)
    ? payload.results.map((item) => toGenerationResult(item))
    : [];
  const errors = Array.isArray(payload?.errors) ? payload.errors.map((item) => toBatchError(item)) : [];
  const endpointUrl = endpointSource === 'fallback' && fallbackUrl ? fallbackUrl : endpoint;
  const decoratedResults = results.map((item) => {
    const meta = { ...(item.meta || {}) };
    meta.endpoint_source = endpointSource;
    meta.endpoint_url = endpointUrl;
    if (endpointSource === 'fallback') {
      meta.fallback_used = true;
      meta.fallback_active = true;
      meta.fallback_error = error ? error.message : 'Richiesta remota non disponibile';
    }
    return { ...item, meta };
  });
  return { results: decoratedResults, errors, endpoint_source: endpointSource, endpoint_url: endpointUrl };
}

export function summariseValidation(validation = {}) {
  const bundle = normaliseValidation(validation);
  const total = bundle.messages.length;
  const warnings = bundle.messages.filter((message) => message.level === 'warning').length;
  const errors = bundle.messages.filter((message) => message.level === 'error').length;
  return {
    total,
    warnings,
    errors,
    discarded: Array.isArray(bundle.discarded) ? bundle.discarded.length : 0,
    corrected: bundle.corrected ? 1 : 0,
  };
}

export const __testables__ = {
  normaliseRequest,
  normaliseValidation,
  normaliseMeta,
  normaliseBlueprint,
  toGenerationResult,
  normaliseBatchEntries,
};
