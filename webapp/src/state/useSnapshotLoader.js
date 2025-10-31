import { computed, reactive } from 'vue';
import {
  resolveApiUrl,
  resolveAssetUrl,
  isStaticDeployment,
  readEnvString,
} from '../services/apiEndpoints.js';
import { resolveWithFallback } from './fallbackHelper.js';

const DEFAULT_SNAPSHOT_ENDPOINT = '/api/generation/snapshot';
const DEFAULT_SNAPSHOT_FALLBACK = 'demo/flow-shell-snapshot.json';

function resolveFallbackEnv(value) {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' && value.toLowerCase() === 'null') {
    return null;
  }
  return value;
}

function ensureFetch(fetchOverride) {
  if (typeof fetchOverride === 'function') {
    return fetchOverride;
  }
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error('errors.snapshot.fetch_missing');
}

function buildSnapshotUrl(url, { refresh = false } = {}) {
  if (!refresh) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}refresh=1`;
}

function determineFallbackLabel(url) {
  if (!url) {
    return null;
  }
  if (url.includes('/demo/')) {
    return 'demo';
  }
  return 'fallback';
}

export { determineFallbackLabel };

export function useSnapshotLoader(options = {}) {
  const logger = options.logger || null;
  const snapshotEnvUrl = options.snapshotUrl || readEnvString('VITE_FLOW_SNAPSHOT_URL');
  const rawFallbackEnv = Object.prototype.hasOwnProperty.call(options, 'fallbackSnapshotUrl')
    ? options.fallbackSnapshotUrl
    : resolveFallbackEnv(readEnvString('VITE_FLOW_SNAPSHOT_FALLBACK'));
  const snapshotUrl = resolveApiUrl(snapshotEnvUrl || DEFAULT_SNAPSHOT_ENDPOINT);
  const fallbackSnapshotUrl = (() => {
    if (rawFallbackEnv === undefined) {
      return resolveAssetUrl(DEFAULT_SNAPSHOT_FALLBACK);
    }
    if (rawFallbackEnv === null) {
      return null;
    }
    if (typeof rawFallbackEnv === 'string' && rawFallbackEnv.trim()) {
      return resolveAssetUrl(rawFallbackEnv.trim());
    }
    return resolveAssetUrl(DEFAULT_SNAPSHOT_FALLBACK);
  })();
  const fetchImpl = ensureFetch(options.fetch);
  const state = reactive({
    snapshot: null,
    loading: false,
    error: null,
    source: null,
    fallbackLabel: null,
    lastUpdatedAt: null,
    meta: null,
  });

  const preferFallbackFirst =
    Boolean(options.preferFallbackFirst) ||
    (!options.forceRemote &&
      !options.preferRemote &&
      !options.disableFallbackPreference &&
      fallbackSnapshotUrl &&
      fallbackSnapshotUrl !== snapshotUrl &&
      isStaticDeployment());

  async function fetchSnapshot({ force = false, refresh = false } = {}) {
    if (state.snapshot && !force && !refresh) {
      return state.snapshot;
    }
    state.loading = true;
    state.error = null;
    const preferFallback = !force && !refresh && preferFallbackFirst;
    try {
      const result = await resolveWithFallback({
        attemptPrimary: async () => {
          const targetUrl = buildSnapshotUrl(snapshotUrl, { refresh: force || refresh });
          const response = await fetchImpl(targetUrl, { cache: 'no-store' });
          if (!response.ok) {
            const error = new Error('errors.snapshot.remote_unavailable');
            error.status = response.status;
            throw error;
          }
          const data = await response.json();
          return { data, meta: { url: targetUrl } };
        },
        attemptFallback: fallbackSnapshotUrl
          ? async () => {
              const response = await fetchImpl(fallbackSnapshotUrl, { cache: 'no-store' });
              if (!response.ok) {
                const error = new Error('errors.snapshot.fallback_unavailable');
                error.status = response.status;
                throw error;
              }
              const data = await response.json();
              return { data, meta: { url: fallbackSnapshotUrl } };
            }
          : null,
        preferFallbackFirst: preferFallback,
        logger,
        scope: 'snapshot',
        events: {
          primaryStart: { event: 'snapshot.load.start', message: 'log.snapshot.load.start' },
          primarySuccess: {
            event: 'snapshot.load.success',
            level: 'info',
            message: 'log.snapshot.load.success',
            metaBuilder: (payload) => ({ source: payload.meta?.url, fallback: false }),
          },
          primaryFailure: { event: 'snapshot.load.failed', level: 'error', message: 'log.snapshot.load.failed' },
          fallbackPreferred: {
            event: 'snapshot.load.preferred',
            level: 'info',
            message: 'log.snapshot.load.preferred',
          },
          fallbackFirstFailure: {
            event: 'snapshot.load.preferred.failed',
            level: 'warning',
            message: 'log.snapshot.load.preferred_failed',
          },
          fallbackStart: {
            event: 'snapshot.load.fallback.start',
            level: 'warning',
            message: 'log.snapshot.load.fallback_start',
          },
          fallbackSuccess: {
            event: 'snapshot.load.fallback.success',
            level: 'warning',
            message: 'log.snapshot.load.fallback_success',
            metaBuilder: (payload) => ({ source: payload.meta?.url, fallback: true }),
          },
          fallbackFailure: {
            event: 'snapshot.load.fallback.failed',
            level: 'error',
            message: 'log.snapshot.load.fallback_failed',
          },
        },
      });

      state.snapshot = result?.data || {};
      state.meta = result?.meta || {};
      state.source = result?.source || 'remote';
      state.error = null;
      state.lastUpdatedAt = Date.now();
      state.fallbackLabel = state.source === 'fallback' ? determineFallbackLabel(result?.meta?.url) : null;
      return state.snapshot;
    } catch (error) {
      state.error = error;
      state.snapshot = null;
      state.meta = null;
      state.source = null;
      state.fallbackLabel = null;
      throw error;
    } finally {
      state.loading = false;
    }
  }

  const snapshot = computed(() => state.snapshot || {});
  const overview = computed(() => snapshot.value?.overview || { objectives: [], blockers: [], completion: {} });
  const speciesStatus = computed(() => snapshot.value?.species || { curated: 0, total: 0, shortlist: [] });
  const biomeSetup = computed(() => snapshot.value?.biomeSetup || { config: {}, graph: {}, validators: [] });
  const biomes = computed(() => snapshot.value?.biomes || []);
  const biomeSummary = computed(() => snapshot.value?.biomeSummary || { validated: 0, pending: 0 });
  const encounter = computed(() => snapshot.value?.encounter || {});
  const encounterSummary = computed(() => snapshot.value?.encounterSummary || { variants: 0, seeds: 0 });
  const qualityRelease = computed(() => snapshot.value?.qualityRelease || { checks: {} });
  const publishing = computed(() => snapshot.value?.publishing || {});
  const suggestions = computed(() =>
    Array.isArray(snapshot.value?.suggestions) ? snapshot.value.suggestions : [],
  );
  const notifications = computed(() =>
    Array.isArray(snapshot.value?.notifications) ? snapshot.value.notifications : [],
  );
  const qualityContext = computed(() => snapshot.value?.qualityReleaseContext || {});
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
    const biomeTotal =
      (Number(biomeSummary.value?.validated) || 0) + (Number(biomeSummary.value?.pending) || 0);
    const encounterTotal =
      (Number(encounterSummary.value?.variants) || 0) + (Number(encounterSummary.value?.seeds) || 0);
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
        completed: Number(snapshot.value?.biomeSetup?.prepared) || 0,
        total: Number(snapshot.value?.biomeSetup?.total) || 0,
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

  const loading = computed(() => state.loading);
  const error = computed(() => state.error);
  const source = computed(() => state.source);
  const fallbackLabel = computed(() => state.fallbackLabel);
  const lastUpdatedAt = computed(() => state.lastUpdatedAt);

  return {
    state,
    snapshot,
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
    timeline,
    metrics,
    loading,
    error,
    source,
    fallbackLabel,
    lastUpdatedAt,
    fetchSnapshot,
  };
}

export const __internals__ = {
  ensureFetch,
  buildSnapshotUrl,
  determineFallbackLabel,
  resolveFallbackEnv,
};
