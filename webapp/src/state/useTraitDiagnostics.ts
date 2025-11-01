import { computed, reactive, type ComputedRef } from 'vue';
import { fetchTraitDiagnostics } from '../services/traitDiagnosticsService.js';
import { determineFallbackLabel } from './useSnapshotLoader';

type FlowLogger = {
  log?: (event: string, payload?: Record<string, unknown>) => void;
  on?: (event: string, handler: (payload?: unknown) => void) => (() => void) | void;
  off?: (event: string, handler?: (payload?: unknown) => void) => void;
};

type TraitDiagnosticsResponse = {
  diagnostics?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

type TraitDiagnosticsService = (
  options?: Record<string, unknown>,
) => Promise<TraitDiagnosticsResponse>;

interface TraitDiagnosticsState {
  diagnostics: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  loading: boolean;
  error: Error | null;
  source: 'remote' | 'fallback' | null;
  fallbackLabel: string | null;
  lastUpdatedAt: number | null;
}

export interface TraitDiagnosticsOptions {
  logger?: FlowLogger | null;
  service?: TraitDiagnosticsService;
  traitDiagnosticsOptions?: Record<string, unknown>;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  const error = new Error('errors.traitDiagnostics.unknown');
  Object.defineProperty(error, 'cause', { value, configurable: true });
  return error;
}

export function useTraitDiagnostics(options: TraitDiagnosticsOptions = {}) {
  const logger = options.logger || null;
  const service: TraitDiagnosticsService = options.service || fetchTraitDiagnostics;
  const traitOptions = options.traitDiagnosticsOptions || {};
  const state = reactive<TraitDiagnosticsState>({
    diagnostics: null,
    meta: null,
    loading: false,
    error: null,
    source: null,
    fallbackLabel: null,
    lastUpdatedAt: null,
  });

  const log = (event: string, details: Record<string, unknown> = {}) => {
    if (logger && typeof logger.log === 'function') {
      logger.log(event, { scope: 'quality', ...details });
    }
  };

  async function load({ force = false, refresh = false }: { force?: boolean; refresh?: boolean } = {}): Promise<
    Record<string, unknown>
  > {
    if (state.diagnostics && !force && !refresh) {
      return state.diagnostics;
    }
    state.loading = true;
    state.error = null;
    log('traitDiagnostics.requested', {
      level: 'info',
      message: refresh ? 'log.traitDiagnostics.refresh' : 'log.traitDiagnostics.requested',
      meta: { refresh },
    });
    try {
      const { diagnostics, meta } = await service({ ...traitOptions, refresh });
      state.diagnostics = diagnostics || {};
      state.meta = meta || {};
      state.source = (meta?.endpoint_source as 'remote' | 'fallback' | undefined) || 'remote';
      const endpointUrl = (meta as Record<string, unknown>)?.endpoint_url as string | undefined;
      state.fallbackLabel = state.source === 'fallback' ? determineFallbackLabel(endpointUrl || null) : null;
      state.lastUpdatedAt = Date.now();
      log('traitDiagnostics.success', {
        level: state.source === 'fallback' ? 'warning' : 'info',
        message: state.source === 'fallback'
          ? 'log.traitDiagnostics.success_fallback'
          : 'log.traitDiagnostics.success',
        meta,
      });
      if (state.source === 'fallback') {
        log('traitDiagnostics.fallback', {
          level: 'warning',
          message: 'log.traitDiagnostics.fallback',
          meta,
        });
      }
      return state.diagnostics;
    } catch (error) {
      const err = toError(error);
      state.error = err;
      log('traitDiagnostics.failed', {
        level: 'error',
        message: 'log.traitDiagnostics.failed',
      });
      throw err;
    } finally {
      state.loading = false;
    }
  }

  async function reload(): Promise<Record<string, unknown>> {
    return load({ force: true, refresh: true });
  }

  const diagnostics: ComputedRef<Record<string, unknown>> = computed(
    () => state.diagnostics || {},
  );
  const meta: ComputedRef<Record<string, unknown>> = computed(() => state.meta || {});
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);
  const source = computed(() => state.source || 'remote');
  const fallbackLabel = computed(() => state.fallbackLabel);
  const lastUpdatedAt = computed(() => state.lastUpdatedAt);
  const traitCatalog = computed(() => {
    const traits = Array.isArray(diagnostics.value?.traits)
      ? diagnostics.value.traits
      : [];
    const labels: Record<string, string> = {};
    const synergyMap: Record<string, string[]> = {};
    const usageTags: Record<string, string[]> = {};
    const completionFlags: Record<string, Record<string, boolean>> = {};
    const speciesAffinity: Record<string, unknown[]> = {};
    for (const entry of traits as Array<Record<string, unknown>>) {
      if (!entry || typeof entry !== 'object') continue;
      const id = (entry.id as string | undefined) || undefined;
      if (!id) continue;
      labels[id] = (entry.label as string) || id;
      if (Array.isArray(entry.synergies)) {
        synergyMap[id] = (entry.synergies as string[]).filter(Boolean);
      }
      if (Array.isArray(entry.usage_tags)) {
        usageTags[id] = (entry.usage_tags as string[]).filter(Boolean);
      }
      if (entry.completion_flags && typeof entry.completion_flags === 'object') {
        completionFlags[id] = entry.completion_flags as Record<string, boolean>;
      }
      if (Array.isArray(entry.species_affinity)) {
        speciesAffinity[id] = entry.species_affinity as unknown[];
      }
    }
    return {
      traits,
      labels,
      synergyMap,
      usageTags,
      completionFlags,
      speciesAffinity,
    };
  });
  const traitCompliance = computed(() => {
    const summary = diagnostics.value?.summary || {};
    const total = Number(summary.total_traits) || 0;
    const glossaryOk = Number(summary.glossary_ok) || 0;
    const glossaryMissing = Math.max(total - glossaryOk, 0);
    const matrixMismatch = Number(summary.matrix_mismatch) || 0;
    const matrixOnly = Number(summary.matrix_only_traits) || 0;
    const conflicts = Number(summary.with_conflicts) || 0;
    const badges = [];
    if (total > 0) {
      badges.push({
        id: 'glossary',
        label: glossaryMissing === 0 ? 'Glossario OK' : 'Glossario incompleto',
        value: `${glossaryOk}/${total}`,
        tone: glossaryMissing === 0 ? 'success' : 'warning',
      });
    }
    const matrixIssues = matrixMismatch + matrixOnly;
    badges.push({
      id: 'matrix',
      label: matrixIssues === 0 ? 'Matrix OK' : 'Matrix mismatch',
      value: matrixIssues === 0 ? '0 mismatch' : `${matrixIssues} mismatch`,
      tone: matrixIssues === 0 ? 'success' : 'warning',
    });
    badges.push({
      id: 'conflicts',
      label: conflicts === 0 ? 'Conflicts OK' : 'Conflicts attivi',
      value: `${conflicts}`,
      tone: conflicts === 0 ? 'neutral' : 'warning',
    });
    return {
      badges,
      summary,
      generatedAt: diagnostics.value?.generated_at || diagnostics.value?.generatedAt || null,
      matrixOnlyTraits: diagnostics.value?.matrix_only_traits || [],
    };
  });

  return {
    state,
    diagnostics,
    meta,
    loading,
    error,
    source,
    fallbackLabel,
    lastUpdatedAt,
    traitCatalog,
    traitCompliance,
    load,
    reload,
  };
}

export const __internals__ = { toError };
