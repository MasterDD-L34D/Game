import { ZodError } from 'zod';

import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from './apiEndpoints';
import { fetchJsonWithFallback } from './fetchWithFallback.js';
import { resolveDataSource } from '../config/dataSources';
import { fromZodError, toServiceError } from './errorHandling';
import { parseRuntimeValidationResult, type RuntimeValidationResult } from '../validation/runtime';

const DATA_SOURCE_BY_KIND: Record<RuntimeValidationKind, string> = {
  species: 'runtimeValidatorSpecies',
  biome: 'runtimeValidatorBiome',
  foodweb: 'runtimeValidatorFoodweb',
};

export type RuntimeValidationKind = 'species' | 'biome' | 'foodweb';

export interface RuntimeValidationOptions {
  endpoint?: string | null;
  fallback?: string | null;
  allowFallback?: boolean;
  fallbacks?: Record<string, string | null | undefined>;
}

export interface SpeciesValidationContext {
  biomeId?: string | null;
}

export interface BiomeValidationContext {
  defaultHazard?: string | null;
}

function resolveFallback(
  kind: RuntimeValidationKind,
  options: RuntimeValidationOptions | undefined,
  fallback: string | null | undefined,
): string | null {
  if (options) {
    if (Object.prototype.hasOwnProperty.call(options, 'fallback')) {
      const explicit = options.fallback;
      if (explicit === null) {
        return null;
      }
      if (typeof explicit === 'string' && explicit.trim()) {
        return explicit.trim();
      }
    }
    if (options.fallbacks && Object.prototype.hasOwnProperty.call(options.fallbacks, kind)) {
      const value = options.fallbacks[kind];
      if (value === null) {
        return null;
      }
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return fallback ?? null;
}

function resolveAllowFallback(options: RuntimeValidationOptions | undefined): boolean {
  if (options && Object.prototype.hasOwnProperty.call(options, 'allowFallback')) {
    return Boolean(options.allowFallback);
  }
  return isStaticDeployment();
}

async function postRuntime(
  kind: RuntimeValidationKind,
  payload: Record<string, unknown>,
  options: RuntimeValidationOptions = {},
): Promise<RuntimeValidationResult> {
  const dataSourceId = DATA_SOURCE_BY_KIND[kind] ?? DATA_SOURCE_BY_KIND.species;
  const config = resolveDataSource(dataSourceId, {
    endpoint: Object.prototype.hasOwnProperty.call(options, 'endpoint') ? options.endpoint : undefined,
    fallback: undefined,
  });
  const endpoint = resolveApiUrl(options.endpoint ?? config.endpoint);
  const fallbackPath = resolveFallback(kind, options, config.fallback);
  const fallbackUrl = fallbackPath ? resolveAssetUrl(fallbackPath) : null;

  const response = (await fetchJsonWithFallback(endpoint, {
    requestInit: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, payload }),
    },
    fallbackUrl,
    allowFallback: resolveAllowFallback(options),
    errorMessage: 'Errore validazione runtime',
    fallbackErrorMessage: 'Validator runtime locale non disponibile',
  })) as {
    data: unknown;
    source: 'remote' | 'fallback';
    error?: Error;
  };

  const parsed = (() => {
    try {
      return parseRuntimeValidationResult(response.data);
    } catch (parseError) {
      if (parseError instanceof ZodError) {
        throw fromZodError(parseError, 'Risposta runtime non valida', { code: 'runtime.validation.invalid' });
      }
      throw toServiceError(parseError, 'Risposta runtime non valida', { code: 'runtime.validation.invalid' });
    }
  })();

  const meta = {
    ...(parsed.meta ?? {}),
    endpoint_source: response.source,
    endpoint_url: response.source === 'fallback' && fallbackUrl ? fallbackUrl : endpoint,
  } as Record<string, unknown>;

  if (response.source === 'fallback') {
    meta.fallback_error = response.error ? response.error.message : 'Richiesta remota non disponibile';
  }

  return {
    ...parsed,
    meta,
  };
}

export async function validateSpeciesBatch(
  entries: unknown,
  context: SpeciesValidationContext = {},
  options: RuntimeValidationOptions = {},
): Promise<RuntimeValidationResult> {
  const payload = {
    entries: Array.isArray(entries) ? entries : [],
    biomeId: context.biomeId ?? null,
  };
  return postRuntime('species', payload, options);
}

export async function validateBiome(
  biome: unknown,
  context: BiomeValidationContext = {},
  options: RuntimeValidationOptions = {},
): Promise<RuntimeValidationResult> {
  const payload = {
    biome: biome ?? null,
    defaultHazard: context.defaultHazard ?? null,
  };
  return postRuntime('biome', payload, options);
}

export async function validateFoodweb(
  foodweb: unknown,
  options: RuntimeValidationOptions = {},
): Promise<RuntimeValidationResult> {
  const payload = { foodweb: foodweb ?? null };
  return postRuntime('foodweb', payload, options);
}
