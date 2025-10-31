import { computed, reactive } from 'vue';
import {
  generateSpecies,
  generateSpeciesBatch,
  summariseValidation,
  __testables__ as orchestratorInternals,
} from '../services/generationOrchestratorService.js';

const { normaliseRequest, normaliseBatchEntries } = orchestratorInternals;

const DEFAULT_SPECIES_OPTIONS = {
  endpoint: undefined,
  fallback: undefined,
  allowFallback: undefined,
};

const DEFAULT_BATCH_OPTIONS = {
  endpoint: undefined,
  fallback: undefined,
  allowFallback: undefined,
};

const speciesCache = new Map();
const batchCache = new Map();

function toError(value) {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  const error = new Error('errors.species.unknown');
  error.cause = value;
  return error;
}

function createCacheKey(payload) {
  const serialisable = {
    ...payload,
    trait_ids: Array.isArray(payload.trait_ids) ? [...payload.trait_ids].sort() : [],
    fallback_trait_ids: Array.isArray(payload.fallback_trait_ids)
      ? [...payload.fallback_trait_ids].sort()
      : [],
  };
  return JSON.stringify(serialisable);
}

function createBatchCacheKey(entries) {
  const ordered = entries
    .map((entry) => ({
      ...entry,
      trait_ids: Array.isArray(entry.trait_ids) ? [...entry.trait_ids].sort() : [],
      fallback_trait_ids: Array.isArray(entry.fallback_trait_ids)
        ? [...entry.fallback_trait_ids].sort()
        : [],
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify(ordered);
}

function baseValidation() {
  return { corrected: null, messages: [], discarded: [] };
}

export function useSpeciesGenerator(options = {}) {
  const logger = options.logger || null;
  const speciesOptions = { ...DEFAULT_SPECIES_OPTIONS, ...(options.speciesOptions || {}) };
  const batchOptions = { ...DEFAULT_BATCH_OPTIONS, ...(options.batchOptions || {}) };
  const state = reactive({
    loading: false,
    error: null,
    result: null,
    lastRequest: null,
    loadingBatch: false,
    batchError: null,
    lastBatchResult: null,
    source: null,
    lastUpdatedAt: null,
  });

  const log = (event, details = {}) => {
    if (logger && typeof logger.log === 'function') {
      logger.log(event, { scope: 'species', ...details });
    }
  };

  async function runSpecies(request, { force = false } = {}) {
    const normalised = normaliseRequest(request || {});
    if (!Array.isArray(normalised.trait_ids) || !normalised.trait_ids.length) {
      const error = new Error('errors.species.trait_ids_required');
      state.error = error;
      return Promise.reject(error);
    }
    const cacheKey = createCacheKey(normalised);
    if (!force && speciesCache.has(cacheKey)) {
      const cached = speciesCache.get(cacheKey);
      state.result = cached.result;
      state.lastRequest = cached.request;
      state.source = cached.result?.meta?.endpoint_source || 'remote';
      state.lastUpdatedAt = cached.timestamp;
      const cachedSummary = summariseValidation(cached.result?.validation || {});
      const fallbackUsed = Boolean(
        cached.result?.meta?.fallback_used ??
          cached.result?.meta?.fallbackUsed ??
          cached.result?.meta?.fallback_active,
      );
      log('species.cache.hit', {
        level: 'info',
        message: fallbackUsed ? 'log.species.cache_fallback' : 'log.species.cache_hit',
        request_id: cached.result?.meta?.request_id || cached.request?.request_id || null,
        meta: cached.result?.meta || null,
        validation: cachedSummary,
      });
      if (fallbackUsed) {
        log('species.fallback.cached', {
          level: 'warning',
          message: 'log.species.fallback_cached',
          request_id: cached.result?.meta?.request_id || cached.request?.request_id || null,
          meta: cached.result?.meta || null,
        });
      }
      if (cachedSummary.warnings > 0) {
        log('species.validation.cached', {
          level: 'warning',
          message: 'log.species.validation_cached',
          request_id: cached.result?.meta?.request_id || cached.request?.request_id || null,
          validation: cachedSummary,
        });
      }
      return cached.result;
    }
    state.loading = true;
    state.error = null;
    log('species.requested', {
      level: 'info',
      message: 'log.species.requested',
      request_id: normalised.request_id || null,
      meta: {
        biome_id: normalised.biome_id,
        trait_ids: normalised.trait_ids,
        seed: normalised.seed,
      },
    });
    try {
      const result = await generateSpecies(normalised, speciesOptions);
      const summary = summariseValidation(result.validation);
      speciesCache.set(cacheKey, { result, request: normalised, timestamp: Date.now() });
      state.result = result;
      state.lastRequest = normalised;
      state.source = result.meta?.endpoint_source || 'remote';
      state.lastUpdatedAt = Date.now();
      log('species.success', {
        level: summary.errors > 0 ? 'warning' : 'success',
        message: summary.errors > 0 ? 'log.species.success_with_errors' : 'log.species.success',
        request_id: result.meta?.request_id || normalised.request_id || null,
        meta: result.meta || null,
        validation: summary,
      });
      const fallbackUsed = Boolean(
        result.meta?.fallback_used ?? result.meta?.fallbackUsed ?? result.meta?.fallback_active,
      );
      if (fallbackUsed) {
        log('species.fallback', {
          level: 'warning',
          message: 'log.species.fallback_triggered',
          request_id: result.meta?.request_id || normalised.request_id || null,
          meta: result.meta || null,
        });
      }
      if (summary.warnings > 0) {
        log('species.validation.warning', {
          level: 'warning',
          message: 'log.species.validation_warning',
          request_id: result.meta?.request_id || normalised.request_id || null,
          validation: summary,
        });
      }
      return result;
    } catch (error) {
      const err = toError(error);
      state.error = err;
      log('species.failed', {
        level: 'error',
        message: 'log.species.failed',
        request_id: normalised.request_id || null,
        meta: {
          biome_id: normalised.biome_id,
          trait_ids: normalised.trait_ids,
        },
      });
      throw err;
    } finally {
      state.loading = false;
    }
  }

  async function runSpeciesBatch(entries, { force = false } = {}) {
    const batchEntries = normaliseBatchEntries(Array.isArray(entries) ? entries : []);
    if (!batchEntries.length) {
      return { results: [], errors: [] };
    }
    const cacheKey = createBatchCacheKey(batchEntries);
    if (!force && batchCache.has(cacheKey)) {
      const cached = batchCache.get(cacheKey);
      state.lastBatchResult = cached.result;
      log('species.batch.cache', {
        scope: 'flow',
        level: 'info',
        message: 'log.species.batch_cache_hit',
        meta: {
          entries: batchEntries.length,
          endpoint_source: cached.result?.endpoint_source || null,
          endpoint_url: cached.result?.endpoint_url || null,
        },
      });
      return cached.result;
    }
    state.loadingBatch = true;
    state.batchError = null;
    log('species.batch.requested', {
      scope: 'flow',
      level: 'info',
      message: 'log.species.batch_requested',
      meta: { entries: batchEntries.length },
    });
    try {
      const result = await generateSpeciesBatch({ batch: batchEntries }, batchOptions);
      batchCache.set(cacheKey, { result, entries: batchEntries, timestamp: Date.now() });
      state.lastBatchResult = result;
      log('species.batch.success', {
        scope: 'flow',
        level: result.errors.length ? 'warning' : 'success',
        message: 'log.species.batch_success',
        meta: {
          entries: batchEntries.length,
          success: result.results.length,
          errors: result.errors.length,
          endpoint_source: result.endpoint_source,
          endpoint_url: result.endpoint_url,
        },
      });
      return result;
    } catch (error) {
      const err = toError(error);
      state.batchError = err;
      log('species.batch.failed', {
        scope: 'flow',
        level: 'error',
        message: 'log.species.batch_failed',
        meta: { entries: batchEntries.length },
      });
      throw err;
    } finally {
      state.loadingBatch = false;
    }
  }

  function canRetry() {
    return Boolean(state.lastRequest && state.lastRequest.trait_ids?.length);
  }

  async function retry({ force = true } = {}) {
    if (!canRetry()) {
      const error = new Error('errors.species.retry_unavailable');
      throw error;
    }
    return runSpecies(state.lastRequest, { force });
  }

  const blueprint = computed(() => state.result?.blueprint || null);
  const meta = computed(() => state.result?.meta || {});
  const validation = computed(() => state.result?.validation || baseValidation());
  const requestId = computed(() => meta.value?.request_id || meta.value?.requestId || null);
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);
  const loadingBatch = computed(() => state.loadingBatch);
  const batchError = computed(() => state.batchError);
  const lastBatchResult = computed(() => state.lastBatchResult);
  const source = computed(() => state.source || 'remote');
  const lastUpdatedAt = computed(() => state.lastUpdatedAt);
  const fallbackActive = computed(() => source.value === 'fallback');

  return {
    state,
    blueprint,
    meta,
    validation,
    requestId,
    loading,
    error,
    source,
    fallbackActive,
    lastUpdatedAt,
    loadingBatch,
    batchError,
    lastBatchResult,
    runSpecies,
    runSpeciesBatch,
    retry,
    canRetry,
  };
}

export const __internals__ = {
  toError,
  createCacheKey,
  createBatchCacheKey,
  baseValidation,
  speciesCache,
  batchCache,
};
