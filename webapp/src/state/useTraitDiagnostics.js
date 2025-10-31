import { computed, reactive } from 'vue';
import { fetchTraitDiagnostics } from '../services/traitDiagnosticsService.js';
import { determineFallbackLabel } from './useSnapshotLoader.js';

function toError(value) {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  const error = new Error('errors.traitDiagnostics.unknown');
  error.cause = value;
  return error;
}

export function useTraitDiagnostics(options = {}) {
  const logger = options.logger || null;
  const service = options.service || fetchTraitDiagnostics;
  const traitOptions = options.traitDiagnosticsOptions || {};
  const state = reactive({
    diagnostics: null,
    meta: null,
    loading: false,
    error: null,
    source: null,
    fallbackLabel: null,
    lastUpdatedAt: null,
  });

  const log = (event, details = {}) => {
    if (logger && typeof logger.log === 'function') {
      logger.log(event, { scope: 'quality', ...details });
    }
  };

  async function load({ force = false, refresh = false } = {}) {
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
      state.source = meta?.endpoint_source || 'remote';
      state.fallbackLabel = state.source === 'fallback' ? determineFallbackLabel(meta?.endpoint_url) : null;
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

  async function reload() {
    return load({ force: true, refresh: true });
  }

  const diagnostics = computed(() => state.diagnostics || {});
  const meta = computed(() => state.meta || {});
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);
  const source = computed(() => state.source || 'remote');
  const fallbackLabel = computed(() => state.fallbackLabel);
  const lastUpdatedAt = computed(() => state.lastUpdatedAt);
  const traitCatalog = computed(() => {
    const traits = Array.isArray(diagnostics.value?.traits)
      ? diagnostics.value.traits
      : [];
    const labels = {};
    const synergyMap = {};
    for (const entry of traits) {
      if (!entry || typeof entry !== 'object') continue;
      const id = entry.id;
      if (!id) continue;
      labels[id] = entry.label || id;
      if (Array.isArray(entry.synergies)) {
        synergyMap[id] = entry.synergies.filter(Boolean);
      }
    }
    return {
      traits,
      labels,
      synergyMap,
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
