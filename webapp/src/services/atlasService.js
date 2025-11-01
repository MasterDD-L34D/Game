import { resolveApiUrl } from './apiEndpoints';
import { fetchJsonWithFallback } from './fetchWithFallback.js';

const DEFAULT_BASE = '/api/v1/atlas';
const DEFAULT_DATASET = `${DEFAULT_BASE}/dataset`;
const DEFAULT_TELEMETRY = `${DEFAULT_BASE}/telemetry`;
const DEFAULT_GENERATOR = `${DEFAULT_BASE}/generator`;
const DEFAULT_AGGREGATE = '/api/nebula/atlas';

function isAggregateEndpoint(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const lower = value.trim().toLowerCase();
  return lower.includes('/api/nebula/atlas') || lower.endsWith('atlas.json');
}

function stripKnownSegments(value) {
  return value.replace(/\/(?:dataset|telemetry|generator)\/?$/i, '');
}

function normaliseSegmentEndpoint(candidate, segment, fallback) {
  if (!candidate || typeof candidate !== 'string') {
    return fallback;
  }
  const trimmed = candidate.trim();
  if (!trimmed) {
    return fallback;
  }
  const lower = trimmed.toLowerCase();
  if (lower.endsWith(`/${segment}`)) {
    return trimmed;
  }
  if (isAggregateEndpoint(lower)) {
    return fallback;
  }
  if (/(?:\/dataset|\/telemetry|\/generator)\/?$/i.test(lower)) {
    const basePath = stripKnownSegments(trimmed);
    return `${basePath}/${segment}`;
  }
  return `${trimmed.replace(/\/+$/, '')}/${segment}`;
}

function resolveAtlasEndpoints(options = {}) {
  const base = typeof options.baseEndpoint === 'string' ? options.baseEndpoint : null;
  const datasetCandidate = options.datasetEndpoint || base || DEFAULT_DATASET;
  const telemetryCandidate = options.telemetryEndpoint || base || DEFAULT_TELEMETRY;
  const generatorCandidate = options.generatorEndpoint || base || DEFAULT_GENERATOR;
  const aggregateCandidate =
    options.aggregateEndpoint || options.legacyEndpoint || options.endpoint || DEFAULT_AGGREGATE;

  const datasetEndpoint = resolveApiUrl(normaliseSegmentEndpoint(datasetCandidate, 'dataset', DEFAULT_DATASET));
  const telemetryEndpoint = resolveApiUrl(normaliseSegmentEndpoint(telemetryCandidate, 'telemetry', DEFAULT_TELEMETRY));
  const generatorEndpoint = resolveApiUrl(normaliseSegmentEndpoint(generatorCandidate, 'generator', DEFAULT_GENERATOR));
  const aggregateEndpoint = aggregateCandidate ? resolveApiUrl(aggregateCandidate) : null;

  return {
    dataset: datasetEndpoint,
    telemetry: telemetryEndpoint,
    generator: generatorEndpoint,
    aggregate: aggregateEndpoint,
  };
}

function unwrapDatasetPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  if (payload.dataset && typeof payload.dataset === 'object' && !Array.isArray(payload.dataset)) {
    return payload.dataset;
  }
  return payload;
}

function extractFromAggregate(payload, segment) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  if (segment === 'dataset') {
    return unwrapDatasetPayload(payload);
  }
  const value = payload[segment];
  return value && typeof value === 'object' ? value : null;
}

async function fetchAtlasSegment(segment, options = {}) {
  const endpoints = resolveAtlasEndpoints(options);
  const endpoint = endpoints[segment];
  const legacyFallback = endpoints.aggregate;
  const requestInit = {
    headers: { Accept: 'application/json' },
    ...(options.requestInit || {}),
  };
  const fallbackUrl =
    options.fallbackUrl || options.fallback || (options.allowLegacyFallback === false ? null : legacyFallback);

  const allowFallback = Boolean(fallbackUrl);

  const result = await fetchJsonWithFallback(endpoint, {
    fetchImpl: options.fetchImpl,
    requestInit,
    fallbackUrl: allowFallback ? fallbackUrl : undefined,
    fallbackInit: allowFallback ? { headers: { Accept: 'application/json' }, ...(options.fallbackInit || {}) } : undefined,
    allowFallback,
    errorMessage: options.errorMessage,
    fallbackErrorMessage: options.fallbackErrorMessage,
    buildErrorMessage: options.buildErrorMessage,
    buildFallbackErrorMessage: options.buildFallbackErrorMessage,
  });

  const usedLegacyFallback = allowFallback && result.source === 'fallback' && fallbackUrl === legacyFallback;

  let data = result.data;
  if (usedLegacyFallback) {
    data = extractFromAggregate(result.data, segment);
  } else if (segment === 'dataset') {
    data = unwrapDatasetPayload(result.data);
  }

  return {
    data: data ?? null,
    meta: {
      endpoint,
      fallbackEndpoint: allowFallback ? fallbackUrl : null,
      response: result.response,
      source: result.source,
      error: result.error,
      usedLegacyFallback,
    },
  };
}

async function fetchAtlasDataset(options = {}) {
  const { data, meta } = await fetchAtlasSegment('dataset', options);
  return { data, meta };
}

async function fetchAtlasTelemetry(options = {}) {
  const { data, meta } = await fetchAtlasSegment('telemetry', options);
  return { data, meta };
}

async function fetchAtlasGenerator(options = {}) {
  const { data, meta } = await fetchAtlasSegment('generator', options);
  return { data, meta };
}

async function fetchAtlasBundle(options = {}) {
  const [datasetResult, telemetryResult, generatorResult] = await Promise.allSettled([
    fetchAtlasSegment('dataset', options),
    fetchAtlasSegment('telemetry', options),
    fetchAtlasSegment('generator', options),
  ]);

  const payload = {
    dataset: null,
    telemetry: null,
    generator: null,
    errors: [],
  };

  function assignResult(result, key) {
    if (result.status === 'fulfilled') {
      payload[key] = result.value.data;
      return result.value.meta;
    }
    payload.errors.push(result.reason instanceof Error ? result.reason : new Error(String(result.reason)));
    return null;
  }

  const datasetMeta = assignResult(datasetResult, 'dataset');
  const telemetryMeta = assignResult(telemetryResult, 'telemetry');
  const generatorMeta = assignResult(generatorResult, 'generator');

  return {
    data: payload,
    meta: {
      dataset: datasetMeta,
      telemetry: telemetryMeta,
      generator: generatorMeta,
    },
  };
}

export {
  resolveAtlasEndpoints,
  fetchAtlasSegment,
  fetchAtlasDataset,
  fetchAtlasTelemetry,
  fetchAtlasGenerator,
  fetchAtlasBundle,
  unwrapDatasetPayload,
  extractFromAggregate,
};
