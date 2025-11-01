import { computed, reactive, type ComputedRef } from 'vue';
import {
  generateSpecies,
  generateSpeciesBatch,
  summariseValidation,
  __testables__ as orchestratorInternals,
} from '../services/generationOrchestratorService.js';

const { normaliseRequest, normaliseBatchEntries } = orchestratorInternals;

type FlowLogger = {
  log?: (event: string, payload?: Record<string, unknown>) => void;
  on?: (event: string, handler: (payload?: unknown) => void) => (() => void) | void;
  off?: (event: string, handler?: (payload?: unknown) => void) => void;
};

type GenerationOptions = {
  endpoint?: string | null;
  fallback?: string | null;
  allowFallback?: boolean;
};

type SpeciesResult = {
  blueprint?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

type SpeciesBatchResult = {
  results: Array<Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
  endpoint_source?: string;
  endpoint_url?: string | null;
  [key: string]: unknown;
};

interface SpeciesState {
  loading: boolean;
  error: Error | null;
  result: SpeciesResult | null;
  lastRequest: Record<string, unknown> | null;
  loadingBatch: boolean;
  batchError: Error | null;
  lastBatchResult: SpeciesBatchResult | null;
  source: 'remote' | 'fallback' | null;
  lastUpdatedAt: number | null;
}

export interface SpeciesGeneratorOptions {
  logger?: FlowLogger | null;
  speciesOptions?: GenerationOptions;
  batchOptions?: GenerationOptions;
}

const DEFAULT_SPECIES_OPTIONS: GenerationOptions = {
  endpoint: undefined,
  fallback: undefined,
  allowFallback: undefined,
};

const DEFAULT_BATCH_OPTIONS: GenerationOptions = {
  endpoint: undefined,
  fallback: undefined,
  allowFallback: undefined,
};

const speciesCache = new Map<
  string,
  {
    result: SpeciesResult;
    request: Record<string, unknown>;
    timestamp: number;
  }
>();
const batchCache = new Map<
  string,
  {
    result: SpeciesBatchResult;
    entries: Array<Record<string, unknown>>;
    timestamp: number;
  }
>();

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  const error = new Error('errors.species.unknown');
  Object.defineProperty(error, 'cause', { value, configurable: true });
  return error;
}

function createCacheKey(payload: Record<string, unknown>): string {
  const serialisable = {
    ...payload,
    trait_ids: Array.isArray(payload.trait_ids) ? [...payload.trait_ids].sort() : [],
    fallback_trait_ids: Array.isArray(payload.fallback_trait_ids)
      ? [...payload.fallback_trait_ids].sort()
      : [],
  };
  return JSON.stringify(serialisable);
}

function createBatchCacheKey(entries: Array<Record<string, unknown>>): string {
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

function baseValidation(): { corrected: unknown; messages: unknown[]; discarded: unknown[] } {
  return { corrected: null, messages: [], discarded: [] };
}

export function useSpeciesGenerator(options: SpeciesGeneratorOptions = {}) {
  const logger = options.logger || null;
  const speciesOptions = { ...DEFAULT_SPECIES_OPTIONS, ...(options.speciesOptions || {}) };
  const batchOptions = { ...DEFAULT_BATCH_OPTIONS, ...(options.batchOptions || {}) };
  const state = reactive<SpeciesState>({
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

  const log = (event: string, details: Record<string, unknown> = {}) => {
    if (logger && typeof logger.log === 'function') {
      logger.log(event, { scope: 'species', ...details });
    }
  };

  async function runSpecies(
    request: Record<string, unknown>,
    { force = false }: { force?: boolean } = {},
  ): Promise<SpeciesResult> {
    const normalised = normaliseRequest(request || {});
    if (!Array.isArray(normalised.trait_ids) || !normalised.trait_ids.length) {
      const error = new Error('errors.species.trait_ids_required');
      state.error = error;
      return Promise.reject(error);
    }
    const cacheKey = createCacheKey(normalised);
    if (!force && speciesCache.has(cacheKey)) {
      const cached = speciesCache.get(cacheKey)!;
      state.result = cached.result;
      state.lastRequest = cached.request;
      state.source = (cached.result?.meta?.endpoint_source as 'remote' | 'fallback' | undefined) || 'remote';
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
      const result = (await generateSpecies(normalised, speciesOptions)) as SpeciesResult;
      const summary = summariseValidation(result.validation);
      speciesCache.set(cacheKey, { result, request: normalised, timestamp: Date.now() });
      state.result = result;
      state.lastRequest = normalised;
      state.source = (result.meta?.endpoint_source as 'remote' | 'fallback' | undefined) || 'remote';
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
      if (logger && typeof logger.log === 'function') {
        logger.log('snapshot.invalidate', {
          scope: 'snapshot',
          level: 'info',
          meta: {
            source: 'species',
            request_id: result.meta?.request_id || normalised.request_id || null,
          },
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

  async function runSpeciesBatch(
    entries: Array<Record<string, unknown>>,
    { force = false }: { force?: boolean } = {},
  ): Promise<SpeciesBatchResult> {
    const batchEntries = normaliseBatchEntries(Array.isArray(entries) ? entries : []);
    if (!batchEntries.length) {
      return { results: [], errors: [] };
    }
    const cacheKey = createBatchCacheKey(batchEntries);
    if (!force && batchCache.has(cacheKey)) {
      const cached = batchCache.get(cacheKey)!;
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
      const result = (await generateSpeciesBatch({ batch: batchEntries }, batchOptions)) as SpeciesBatchResult;
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

  function canRetry(): boolean {
    return Boolean(state.lastRequest && state.lastRequest.trait_ids?.length);
  }

  async function retry({ force = true }: { force?: boolean } = {}): Promise<SpeciesResult> {
    if (!canRetry()) {
      const error = new Error('errors.species.retry_unavailable');
      throw error;
    }
    return runSpecies(state.lastRequest as Record<string, unknown>, { force });
  }

  const blueprint = computed(() => state.result?.blueprint || null);
  const meta: ComputedRef<Record<string, unknown>> = computed(
    () => state.result?.meta || {},
  );
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
