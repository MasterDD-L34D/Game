import { computed, reactive } from 'vue';
import {
  generateSpecies,
  generateSpeciesBatch,
  summariseValidation,
  __testables__ as orchestratorInternals,
} from '../services/generationOrchestratorService.js';
import { logEvent as logClientEvent } from '../services/clientLogger.js';
import { fetchTraitDiagnostics } from '../services/traitDiagnosticsService.js';

const { normaliseRequest: normaliseSpeciesRequest, normaliseBatchEntries } = orchestratorInternals;

const DEFAULT_SNAPSHOT_ENDPOINT = '/api/generation/snapshot';
const LOCAL_FALLBACK_SNAPSHOT = '/demo/flow-shell-snapshot.json';
const speciesCache = new Map();
const batchCache = new Map();
let logSequence = 0;

function buildSnapshotUrl(baseUrl, { refresh = false } = {}) {
  if (!refresh) {
    return baseUrl;
  }
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}refresh=1`;
}

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error('fetch non disponibile per il caricamento dello snapshot orchestrator');
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
    .sort((a, b) => {
      return JSON.stringify(a).localeCompare(JSON.stringify(b));
    });
  return JSON.stringify(ordered);
}

function toError(value) {
  if (value instanceof Error) {
    return value;
  }
  const message = typeof value === 'string' ? value : 'Errore sconosciuto';
  return new Error(message);
}

function baseValidation() {
  return { corrected: null, messages: [], discarded: [] };
}

function pushLog(state, event, details = {}) {
  const entry = {
    id: `orchestrator-${Date.now()}-${logSequence++}`,
    event,
    scope: details.scope || 'species',
    level: details.level || 'info',
    message: details.message || '',
    request_id: details.request_id || details.requestId || null,
    meta: details.meta || null,
    validation: details.validation || null,
    timestamp: new Date().toISOString(),
    source: 'orchestrator',
  };
  state.logs.unshift(entry);
  if (state.logs.length > 200) {
    state.logs.length = 200;
  }
  logClientEvent(event, {
    id: entry.id,
    scope: entry.scope,
    level: entry.level,
    message: entry.message,
    request_id: entry.request_id,
    meta: entry.meta,
    validation: entry.validation,
    timestamp: entry.timestamp,
    source: entry.source,
  });
  return entry;
}

export function useFlowOrchestrator(options = {}) {
  const snapshotUrl = options.snapshotUrl || DEFAULT_SNAPSHOT_ENDPOINT;
  const fallbackSnapshotUrl =
    options.fallbackSnapshotUrl === null
      ? null
      : options.fallbackSnapshotUrl || LOCAL_FALLBACK_SNAPSHOT;
  const state = reactive({
    snapshot: null,
    loadingSnapshot: false,
    loadingSpecies: false,
    loadingBatch: false,
    error: null,
    speciesError: null,
    batchError: null,
    speciesResult: null,
    lastRequest: null,
    lastBatchResult: null,
    logs: [],
    traitDiagnostics: null,
    traitDiagnosticsMeta: null,
    loadingTraitDiagnostics: false,
    traitDiagnosticsError: null,
  });

  async function fetchSnapshot(force = false) {
    if (state.snapshot && !force) {
      return state.snapshot;
    }
    state.loadingSnapshot = true;
    state.error = null;
    const fetchImpl = ensureFetch();
    try {
      const targetUrl = buildSnapshotUrl(snapshotUrl, { refresh: force });
      const response = await fetchImpl(targetUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Impossibile caricare snapshot orchestrator (${response.status})`);
      }
      const data = await response.json();
      state.snapshot = data || {};
      pushLog(state, 'snapshot.loaded', {
        scope: 'flow',
        level: 'info',
        message: 'Snapshot orchestrator caricato',
        meta: { source: targetUrl, fallback: false },
      });
      return state.snapshot;
    } catch (error) {
      const err = toError(error);
      if (fallbackSnapshotUrl && fallbackSnapshotUrl !== snapshotUrl) {
        try {
          const fallbackResponse = await fetchImpl(fallbackSnapshotUrl, { cache: 'no-store' });
          if (!fallbackResponse.ok) {
            throw new Error(
              `Impossibile caricare snapshot fallback (${fallbackResponse.status})`,
            );
          }
          const fallbackData = await fallbackResponse.json();
          state.snapshot = fallbackData || {};
          pushLog(state, 'snapshot.fallback', {
            scope: 'flow',
            level: 'warning',
            message: `Endpoint snapshot non disponibile (${err.message}), applico fallback locale`,
            meta: { source: fallbackSnapshotUrl, fallback: true },
          });
          return state.snapshot;
        } catch (fallbackError) {
          const fallbackErr = toError(fallbackError);
          state.error = fallbackErr;
          pushLog(state, 'snapshot.failed', {
            scope: 'flow',
            level: 'error',
            message: fallbackErr.message,
          });
          throw fallbackErr;
        }
      }
      state.error = err;
      pushLog(state, 'snapshot.failed', {
        scope: 'flow',
        level: 'error',
        message: err.message,
      });
      throw err;
    } finally {
      state.loadingSnapshot = false;
    }
  }

  async function runSpecies(request, { force = false } = {}) {
    const normalised = normaliseSpeciesRequest(request || {});
    if (!Array.isArray(normalised.trait_ids) || !normalised.trait_ids.length) {
      const error = new Error('trait_ids richiesti per la generazione specie');
      state.speciesError = error;
      return Promise.reject(error);
    }
    const cacheKey = createCacheKey(normalised);
    if (!force && speciesCache.has(cacheKey)) {
      const cached = speciesCache.get(cacheKey);
      state.speciesResult = cached.result;
      state.lastRequest = cached.request;
      const cachedSummary = summariseValidation(cached.result?.validation || {});
      const fallbackUsed = Boolean(
        cached.result?.meta?.fallback_used ?? cached.result?.meta?.fallbackUsed ?? cached.result?.meta?.fallback_active,
      );
      pushLog(state, 'generation.cache.hit', {
        level: 'info',
        message: fallbackUsed
          ? 'Cache orchestrator con fallback attivo'
          : 'Risultato orchestrator recuperato dalla cache',
        request_id: cached.result?.meta?.request_id || cached.request?.request_id || null,
        meta: cached.result?.meta || null,
        validation: cachedSummary,
      });
      if (fallbackUsed) {
        pushLog(state, 'generation.fallback', {
          level: 'warning',
          message: 'Il fallback traits è stato utilizzato nella risposta cache.',
          request_id: cached.result?.meta?.request_id || cached.request?.request_id || null,
          meta: cached.result?.meta || null,
        });
      }
      if (cachedSummary.warnings > 0) {
        pushLog(state, 'generation.validation.warning', {
          level: 'warning',
          message: `Validator cache: ${cachedSummary.warnings} warning`,
          request_id: cached.result?.meta?.request_id || cached.request?.request_id || null,
          validation: cachedSummary,
        });
      }
      return cached.result;
    }
    state.loadingSpecies = true;
    state.speciesError = null;
    pushLog(state, 'generation.requested', {
      level: 'info',
      message: 'Richiesta generazione specie inviata',
      request_id: normalised.request_id || null,
      meta: {
        biome_id: normalised.biome_id,
        trait_ids: normalised.trait_ids,
        seed: normalised.seed,
      },
    });
    try {
      const result = await generateSpecies(normalised, options.speciesOptions || {});
      speciesCache.set(cacheKey, { result, request: normalised, timestamp: Date.now() });
      state.speciesResult = result;
      state.lastRequest = normalised;
      const summary = summariseValidation(result.validation);
      pushLog(state, 'generation.success', {
        level: summary.errors > 0 ? 'warning' : 'success',
        message: summary.errors > 0
          ? `Specie generata con ${summary.errors} errori di validazione`
          : `Specie generata in ${result.meta?.attempts || 1} tentativi`,
        request_id: result.meta?.request_id || normalised.request_id || null,
        meta: result.meta || null,
        validation: summary,
      });
      const fallbackUsed = Boolean(
        result.meta?.fallback_used ?? result.meta?.fallbackUsed ?? result.meta?.fallback_active,
      );
      if (fallbackUsed) {
        pushLog(state, 'generation.fallback', {
          level: 'warning',
          message: 'Il fallback traits è stato attivato dal runtime.',
          request_id: result.meta?.request_id || normalised.request_id || null,
          meta: result.meta || null,
        });
      }
      if (summary.warnings > 0) {
        pushLog(state, 'generation.validation.warning', {
          level: 'warning',
          message: `Validator ha emesso ${summary.warnings} warning per la specie generata`,
          request_id: result.meta?.request_id || normalised.request_id || null,
          validation: summary,
        });
      }
      return result;
    } catch (error) {
      const err = toError(error);
      state.speciesError = err;
      pushLog(state, 'generation.failed', {
        level: 'error',
        message: err.message,
        request_id: normalised.request_id || null,
        meta: {
          biome_id: normalised.biome_id,
          trait_ids: normalised.trait_ids,
        },
      });
      throw err;
    } finally {
      state.loadingSpecies = false;
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
      pushLog(state, 'generation.batch.cache.hit', {
        scope: 'flow',
        level: 'info',
        message: 'Batch orchestrator recuperato dalla cache',
        meta: { entries: batchEntries.length },
      });
      return cached.result;
    }
    state.loadingBatch = true;
    state.batchError = null;
    pushLog(state, 'generation.batch.requested', {
      scope: 'flow',
      level: 'info',
      message: `Richiesta batch orchestrator (${batchEntries.length} elementi)`
    });
    try {
      const result = await generateSpeciesBatch({ batch: batchEntries }, options.batchOptions || {});
      batchCache.set(cacheKey, { result, entries: batchEntries, timestamp: Date.now() });
      state.lastBatchResult = result;
      pushLog(state, 'generation.batch.success', {
        scope: 'flow',
        level: result.errors.length ? 'warning' : 'success',
        message: `Batch completato (${result.results.length} successi, ${result.errors.length} errori)`,
        meta: {
          entries: batchEntries.length,
          success: result.results.length,
          errors: result.errors.length,
        },
      });
      return result;
    } catch (error) {
      const err = toError(error);
      state.batchError = err;
      pushLog(state, 'generation.batch.failed', {
        scope: 'flow',
        level: 'error',
        message: err.message,
        meta: { entries: batchEntries.length },
      });
      throw err;
    } finally {
      state.loadingBatch = false;
    }
  }

  async function loadTraitDiagnostics({ force = false, refresh = false } = {}) {
    if (state.traitDiagnostics && !force && !refresh) {
      return state.traitDiagnostics;
    }
    state.loadingTraitDiagnostics = true;
    state.traitDiagnosticsError = null;
    try {
      const { diagnostics, meta } = await fetchTraitDiagnostics({
        ...(options.traitDiagnosticsOptions || {}),
        refresh,
      });
      state.traitDiagnostics = diagnostics || {};
      state.traitDiagnosticsMeta = meta || {};
      return state.traitDiagnostics;
    } catch (error) {
      const err = toError(error);
      state.traitDiagnosticsError = err;
      pushLog(state, 'trait.diagnostics.failed', {
        scope: 'quality',
        level: 'error',
        message: err.message,
      });
      throw err;
    } finally {
      state.loadingTraitDiagnostics = false;
    }
  }

  async function bootstrap() {
    await fetchSnapshot();
    const initialRequest = state.snapshot?.initialSpeciesRequest || {};
    try {
      if (Array.isArray(initialRequest?.trait_ids) && initialRequest.trait_ids.length) {
        await runSpecies(initialRequest);
      }
    } catch (error) {
      // l'errore è già tracciato nei log
    }
    try {
      await loadTraitDiagnostics();
      pushLog(state, 'trait.diagnostics.loaded', {
        scope: 'quality',
        level: 'info',
        message: 'Trait diagnostics sincronizzati',
      });
    } catch (error) {
      // già tracciato in loadTraitDiagnostics
    }
  }

  const overview = computed(() => state.snapshot?.overview || { objectives: [], blockers: [], completion: {} });
  const speciesStatus = computed(() => state.snapshot?.species || { curated: 0, total: 0, shortlist: [] });
  const biomeSetup = computed(() => state.snapshot?.biomeSetup || { config: {}, graph: {}, validators: [] });
  const biomes = computed(() => state.snapshot?.biomes || []);
  const biomeSummary = computed(() => state.snapshot?.biomeSummary || { validated: 0, pending: 0 });
  const encounter = computed(() => state.snapshot?.encounter || {});
  const encounterSummary = computed(() => state.snapshot?.encounterSummary || { variants: 0, seeds: 0 });
  const qualityRelease = computed(() => state.snapshot?.qualityRelease || { checks: {} });
  const publishing = computed(() => state.snapshot?.publishing || {});
  const suggestions = computed(() => Array.isArray(state.snapshot?.suggestions) ? state.snapshot.suggestions : []);
  const notifications = computed(() => Array.isArray(state.snapshot?.notifications) ? state.snapshot.notifications : []);
  const qualityContext = computed(() => state.snapshot?.qualityReleaseContext || {});
  const traitDiagnostics = computed(() => state.traitDiagnostics || null);
  const traitDiagnosticsMeta = computed(() => state.traitDiagnosticsMeta || {});
  const timeline = computed(() => {
    const completion = overview.value?.completion || {};
    const total = Number(completion.total) || 0;
    const completed = Number(completion.completed) || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      label: `Sincronizzazione ${percent}%`,
      percent,
    };
  });

  const speciesBlueprint = computed(() => state.speciesResult?.blueprint || null);
  const speciesMeta = computed(() => state.speciesResult?.meta || {});
  const speciesValidation = computed(() => state.speciesResult?.validation || baseValidation());
  const speciesRequestId = computed(() => speciesMeta.value?.request_id || speciesMeta.value?.requestId || null);

  const metrics = computed(() => {
    const qualityChecks = qualityRelease.value?.checks || {};
    const totalQuality = Object.values(qualityChecks).reduce(
      (acc, item) => acc + (Number(item?.total) || 0),
      0,
    );
    const completedQuality = Object.values(qualityChecks).reduce(
      (acc, item) => acc + (Number(item?.passed) || 0),
      0,
    );
    const biomeTotal = (Number(biomeSummary.value?.validated) || 0) + (Number(biomeSummary.value?.pending) || 0);
    const encounterTotal = (Number(encounterSummary.value?.variants) || 0) + (Number(encounterSummary.value?.seeds) || 0);
    return {
      overview: {
        completed: Number(overview.value?.completion?.completed) || 0,
        total: Number(overview.value?.completion?.total) || 0,
        label: 'Milestone',
      },
      species: {
        completed: Number(speciesStatus.value?.curated) || 0,
        total: Number(speciesStatus.value?.total) || 0,
        label: 'Specie',
      },
      biomeSetup: {
        completed: Number(state.snapshot?.biomeSetup?.prepared) || 0,
        total: Number(state.snapshot?.biomeSetup?.total) || 0,
        label: 'Preset',
      },
      biomes: {
        completed: Number(biomeSummary.value?.validated) || 0,
        total: biomeTotal,
        label: 'Biomi',
      },
      encounter: {
        completed: Number(encounterSummary.value?.variants) || 0,
        total: encounterTotal,
        label: 'Varianti',
      },
      qualityRelease: {
        completed: completedQuality,
        total: totalQuality,
        label: 'Check QA',
      },
      publishing: {
        completed: Number(publishing.value?.artifactsReady) || 0,
        total: Number(publishing.value?.totalArtifacts) || 0,
        label: 'Artefatti',
      },
    };
  });

  const uiLogs = computed(() => {
    return state.logs.map((entry) => ({
      id: entry.id,
      scope: entry.scope || 'species',
      level: entry.level || 'info',
      message: entry.message,
      timestamp: entry.timestamp,
      event: entry.event,
      request_id: entry.request_id || null,
      meta: entry.meta || null,
      validation: entry.validation || null,
      source: entry.source || 'orchestrator',
    }));
  });

  const traitCatalog = computed(() => {
    const traits = Array.isArray(traitDiagnostics.value?.traits)
      ? traitDiagnostics.value.traits
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
    const diagnostics = traitDiagnostics.value || {};
    const summary = diagnostics.summary || {};
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
      generatedAt: diagnostics.generated_at || diagnostics.generatedAt || null,
      matrixOnlyTraits: diagnostics.matrix_only_traits || [],
    };
  });

  return {
    state,
    snapshot: computed(() => state.snapshot || {}),
    overview,
    speciesStatus,
    biomeSetup,
    biomes,
    biomeSummary,
    encounter,
    encounterSummary,
    qualityRelease,
    publishing,
    suggestions,
    notifications,
    qualityContext,
    traitDiagnostics,
    traitDiagnosticsMeta,
    timeline,
    speciesBlueprint,
    speciesMeta,
    speciesValidation,
    speciesRequestId,
    metrics,
    logs: uiLogs,
    traitCatalog,
    traitCompliance,
    loadingTraitDiagnostics: computed(() => state.loadingTraitDiagnostics),
    traitDiagnosticsError: computed(() => state.traitDiagnosticsError),
    loadingSnapshot: computed(() => state.loadingSnapshot),
    loadingSpecies: computed(() => state.loadingSpecies),
    loadingBatch: computed(() => state.loadingBatch),
    error: computed(() => state.error),
    speciesError: computed(() => state.speciesError),
    batchError: computed(() => state.batchError),
    fetchSnapshot,
    runSpecies,
    runSpeciesBatch,
    bootstrap,
    loadTraitDiagnostics,
  };
}

export const __internals__ = {
  createCacheKey,
  createBatchCacheKey,
  pushLog,
};
