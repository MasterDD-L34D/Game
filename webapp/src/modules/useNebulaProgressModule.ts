import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  type ComputedRef,
  type Ref,
} from 'vue';

import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from '../services/apiEndpoints.js';
import { fetchJsonWithFallback } from '../services/fetchWithFallback.js';
import { atlasDataset as staticDataset } from '../state/atlasDataset.js';

type MaybeRef<T> = Ref<T> | { value: T } | T | undefined;

type NebulaTraits = {
  core?: string[];
  optional?: string[];
  synergy?: string[];
};

type NebulaSpecies = {
  id: string;
  name: string;
  readiness?: string;
  archetype?: string;
  telemetry?: {
    coverage?: number;
    lastValidation?: string;
    curatedBy?: string;
  };
  traits?: NebulaTraits;
};

type NebulaDataset = {
  id: string;
  title: string;
  summary: string;
  releaseWindow?: string;
  curator?: string;
  species?: NebulaSpecies[];
  highlights?: string[];
  metrics?: {
    species?: number;
    biomes?: number;
    encounters?: number;
  };
};

type TelemetrySummary = {
  totalEvents: number;
  openEvents: number;
  acknowledgedEvents: number;
  highPriorityEvents: number;
  lastEventAt: string | null;
};

type TelemetryCoverage = {
  average: number;
  history: number[];
  distribution: Record<'success' | 'warning' | 'neutral' | 'critical', number>;
};

type TelemetryIncidents = {
  timeline: Array<{ date: string; total: number; highPriority: number }>;
};

type NebulaTelemetry = {
  summary: TelemetrySummary;
  coverage: TelemetryCoverage;
  incidents: TelemetryIncidents;
  updatedAt: string | null;
  sample: unknown[];
};

type NebulaApiResponse = {
  dataset?: NebulaDataset;
  telemetry?: NebulaTelemetry;
};

type NebulaModuleSources = {
  overview?: MaybeRef<Record<string, unknown>>;
  qualityRelease?: MaybeRef<Record<string, unknown>>;
  timeline?: MaybeRef<Record<string, unknown>>;
};

type UseNebulaProgressOptions = {
  endpoint?: string;
  fallback?: string | null;
  allowFallback?: boolean;
  pollIntervalMs?: number;
  fetcher?: typeof fetch;
};

const DEFAULT_ENDPOINT = '/api/nebula/atlas';
const DEFAULT_FALLBACK = 'api-mock/nebula/atlas.json';

function normaliseArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter((value) => typeof value === 'string' && value.trim().length > 0) as string[];
}

function readinessTone(readiness?: string): 'success' | 'warning' | 'critical' | 'neutral' {
  if (!readiness) {
    return 'neutral';
  }
  const value = readiness.toLowerCase();
  if (value.includes('richiede')) {
    return 'critical';
  }
  if (value.includes('approvazione') || value.includes('attesa')) {
    return 'warning';
  }
  if (value.includes('freeze') || value.includes('validazione completata') || value.includes('pronto')) {
    return 'success';
  }
  return 'neutral';
}

function coverageStage(percent: number): string {
  if (percent >= 85) {
    return 'Mega';
  }
  if (percent >= 70) {
    return 'Ultimate';
  }
  if (percent >= 55) {
    return 'Champion';
  }
  return 'Rookie';
}

function computeHistory(percent: number, qaPercent: number): number[] {
  const finalPoint = Number.isFinite(percent) ? percent : 0;
  const qaReference = Number.isFinite(qaPercent) ? qaPercent : finalPoint * 0.6;
  const baseline = Math.max(Math.min(finalPoint - 12, finalPoint), 0);
  const history = [
    Math.max(Math.round(qaReference * 0.6), 0),
    Math.max(Math.round((qaReference + baseline) / 2), 0),
    Math.max(Math.round((baseline + finalPoint) / 2), 0),
    Math.max(Math.round(finalPoint), 0),
  ];
  const deduped = history.filter((value, index, array) => index === 0 || value !== array[index - 1]);
  return deduped.length >= 2 ? deduped : [Math.max(Math.round(finalPoint * 0.6), 0), Math.max(Math.round(finalPoint), 0)];
}

function formatRelativeTime(timestamp?: string | null): string {
  if (!timestamp) {
    return 'Sync non disponibile';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return `Sync: ${timestamp}`;
  }
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) {
    return 'Sync adesso';
  }
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `Sync ${minutes} min fa`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `Sync ${hours}h fa`;
  }
  const days = Math.round(diff / day);
  return `Sync ${days}g fa`;
}

function ensureFetch(fetcher?: typeof fetch): typeof fetch {
  if (fetcher) {
    return fetcher;
  }
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof (globalThis as unknown as { fetch?: typeof fetch }).fetch === 'function') {
    return (globalThis as unknown as { fetch: typeof fetch }).fetch;
  }
  throw new Error('fetch non disponibile per il caricamento del dataset Nebula');
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = typeof value === 'string' ? value : 'Errore sconosciuto';
  return new Error(message);
}

export function useNebulaProgressModule(
  sources: NebulaModuleSources = {},
  options: UseNebulaProgressOptions = {},
) {
  const endpoint = resolveApiUrl(options.endpoint || DEFAULT_ENDPOINT);
  const fallbackPath =
    options && Object.prototype.hasOwnProperty.call(options, 'fallback')
      ? options.fallback
      : DEFAULT_FALLBACK;
  const fallbackUrl =
    typeof fallbackPath === 'string' && fallbackPath.trim()
      ? resolveAssetUrl(fallbackPath.trim())
      : null;
  const allowFallback =
    options && Object.prototype.hasOwnProperty.call(options, 'allowFallback')
      ? Boolean(options.allowFallback)
      : isStaticDeployment();
  const pollIntervalMs = Number.isFinite(options.pollIntervalMs) ? Number(options.pollIntervalMs) : 15000;
  const fetchImpl = ensureFetch(options.fetcher);

  const dataset = ref<NebulaDataset | null>(null);
  const telemetry = ref<NebulaTelemetry | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const lastUpdated = ref<string | null>(null);
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  const overview = computed(() => (unref(sources.overview) as Record<string, unknown>) || {});
  const qualityRelease = computed(() => (unref(sources.qualityRelease) as Record<string, unknown>) || {});
  const timelineState = computed(() => (unref(sources.timeline) as Record<string, unknown>) || {});

  const activeDataset = computed<NebulaDataset>(() => dataset.value || staticDataset);

  async function loadAtlas() {
    loading.value = true;
    try {
      const { data: payload, source, error: remoteError } = await fetchJsonWithFallback(endpoint, {
        fetchImpl,
        requestInit: { cache: 'no-store' },
        fallbackUrl,
        allowFallback,
        errorMessage: 'Impossibile caricare dataset Nebula',
        fallbackErrorMessage: 'Dataset Nebula locale non disponibile',
      });
      const data = (payload ?? {}) as NebulaApiResponse;
      if (data?.dataset) {
        dataset.value = data.dataset;
      }
      if (data?.telemetry) {
        telemetry.value = data.telemetry;
        lastUpdated.value = data.telemetry.updatedAt || new Date().toISOString();
      } else {
        lastUpdated.value = new Date().toISOString();
      }
      error.value = null;
      if (source === 'fallback') {
        console.warn(
          '[nebula-progress] Dataset caricato da fallback locale',
          { source: fallbackUrl, reason: remoteError?.message || 'endpoint remoto non disponibile' },
        );
      } else {
        console.info('[nebula-progress] Dataset sincronizzato da endpoint remoto', { source: endpoint });
      }
    } catch (err) {
      error.value = toError(err);
    } finally {
      loading.value = false;
    }
  }

  function startPolling() {
    if (pollIntervalMs <= 0 || typeof setInterval !== 'function') {
      return;
    }
    pollHandle = setInterval(() => {
      loadAtlas().catch(() => {
        // error già gestito in loadAtlas
      });
    }, pollIntervalMs);
  }

  function stopPolling() {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  }

  onMounted(() => {
    loadAtlas().catch(() => {
      // error già gestito in loadAtlas
    });
    startPolling();
  });

  onBeforeUnmount(() => {
    stopPolling();
  });

  const objectives = computed(() => normaliseArray((overview.value as { objectives?: unknown })?.objectives));
  const blockers = computed(() => normaliseArray((overview.value as { blockers?: unknown })?.blockers));

  const qaChecks = computed(() => {
    const checks = ((qualityRelease.value as { checks?: Record<string, { passed?: unknown; total?: unknown }> })?.checks) || {};
    return Object.entries(checks)
      .map(([id, entry]) => ({
        id,
        passed: Number(entry?.passed) || 0,
        total: Number(entry?.total) || 0,
      }))
      .filter((entry) => entry.total > 0);
  });

  const qaSummary = computed(() => {
    const total = qaChecks.value.reduce((acc, entry) => acc + entry.total, 0);
    const completed = qaChecks.value.reduce((acc, entry) => acc + entry.passed, 0);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const lastRun = (qualityRelease.value as { lastRun?: string })?.lastRun || null;
    return {
      total,
      completed,
      percent,
      label: total > 0 ? `${completed}/${total} QA checks` : 'QA checks in setup',
      lastRun,
    };
  });

  const cards = computed(() => {
    const entries: Array<{
      id: string;
      title: string;
      body: string;
      tone: string;
      progress?: number;
    }> = [];
    objectives.value.forEach((objective, index) => {
      entries.push({
        id: `objective-${index}`,
        title: 'Obiettivo',
        body: objective,
        tone: 'objective',
      });
    });
    blockers.value.forEach((blocker, index) => {
      entries.push({
        id: `blocker-${index}`,
        title: 'Blocker',
        body: blocker,
        tone: 'blocker',
      });
    });
    entries.push({
      id: 'qa-progress',
      title: 'QA Sync',
      body: qaSummary.value.label,
      tone: qaSummary.value.percent >= 80 ? 'success' : qaSummary.value.percent >= 50 ? 'warning' : 'neutral',
      progress: qaSummary.value.percent,
    });
    const completion = (overview.value as { completion?: { total?: unknown; completed?: unknown } })?.completion || {};
    const total = Number(completion.total) || 0;
    const completed = Number(completion.completed) || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    entries.push({
      id: 'milestone-progress',
      title: 'Milestone',
      body: total > 0 ? `${completed}/${total} milestone confermate` : 'Milestone da definire',
      tone: percent >= 70 ? 'success' : 'neutral',
      progress: percent,
    });
    return entries;
  });

  const qaPercent = computed(() => qaSummary.value.percent);

  const evolutionMatrix = computed(() => {
    const species = Array.isArray(activeDataset.value.species) ? activeDataset.value.species : [];
    return species.map((entry) => {
      const coverage = Number(entry?.telemetry?.coverage) || 0;
      const percent = Math.round(coverage * 100);
      const tone = readinessTone(entry?.readiness);
      const history = computeHistory(percent, qaPercent.value);
      return {
        id: entry.id,
        name: entry.name,
        readiness: entry.readiness || 'In progress',
        readinessTone: tone,
        telemetryOwner: entry?.telemetry?.curatedBy || 'QA Core',
        telemetryCoverage: percent,
        telemetryHistory: history,
        telemetryLabel: `${percent}% copertura`,
        telemetryTimestamp: formatRelativeTime(entry?.telemetry?.lastValidation || null),
        stage: coverageStage(percent),
      };
    });
  });

  const timelineEntries = computed(() => {
    const entries: Array<{
      id: string;
      title: string;
      status: string;
      summary: string;
      timestamp: string | null;
      meta?: string | null;
    }> = [];
    const referenceTime = qaSummary.value.lastRun || (timelineState.value as { lastSync?: string })?.lastSync || null;

    objectives.value.forEach((objective, index) => {
      entries.push({
        id: `objective-${index}`,
        title: 'Obiettivo Nebula',
        status: 'info',
        summary: objective,
        timestamp: referenceTime,
      });
    });

    const species = Array.isArray(activeDataset.value.species) ? [...activeDataset.value.species] : [];
    species
      .sort((a, b) => {
        const timeA = new Date(a?.telemetry?.lastValidation || 0).getTime();
        const timeB = new Date(b?.telemetry?.lastValidation || 0).getTime();
        return timeB - timeA;
      })
      .forEach((entry) => {
        entries.push({
          id: `species-${entry.id}`,
          title: entry.name,
          status: readinessTone(entry?.readiness),
          summary: entry?.readiness || 'Readiness non definita',
          timestamp: entry?.telemetry?.lastValidation || referenceTime,
          meta: entry?.telemetry?.curatedBy ? `Curato da ${entry.telemetry.curatedBy}` : null,
        });
      });

    qaChecks.value.forEach((check) => {
      entries.push({
        id: `qa-${check.id}`,
        title: `QA · ${check.id}`,
        status: check.passed >= check.total ? 'success' : 'warning',
        summary: `${check.passed}/${check.total} verifiche completate`,
        timestamp: qaSummary.value.lastRun || referenceTime,
      });
    });

    blockers.value.forEach((blocker, index) => {
      entries.push({
        id: `blocker-${index}`,
        title: 'Blocker',
        status: 'critical',
        summary: blocker,
        timestamp: referenceTime,
      });
    });

    return entries;
  });

  const header = computed(() => ({
    datasetId: activeDataset.value.id,
    title: activeDataset.value.title,
    summary: activeDataset.value.summary,
    releaseWindow: activeDataset.value.releaseWindow,
    curator: activeDataset.value.curator,
  }));

  const share = computed(() => {
    const payload = {
      datasetId: activeDataset.value.id,
      generatedAt: new Date().toISOString(),
      overview: {
        objectives: objectives.value,
        blockers: blockers.value,
        completion: (overview.value as { completion?: Record<string, unknown> })?.completion || {},
      },
      qa: {
        percent: qaSummary.value.percent,
        completed: qaSummary.value.completed,
        total: qaSummary.value.total,
        lastRun: qaSummary.value.lastRun,
        checks: qaChecks.value,
      },
      timeline: timelineEntries.value.map((entry) => ({
        id: entry.id,
        title: entry.title,
        status: entry.status,
        summary: entry.summary,
        timestamp: entry.timestamp,
        meta: entry.meta || null,
      })),
      readiness: evolutionMatrix.value.map((entry) => ({
        id: entry.id,
        name: entry.name,
        stage: entry.stage,
        readiness: entry.readiness,
        readinessTone: entry.readinessTone,
        telemetry: {
          coverage: entry.telemetryCoverage,
          history: entry.telemetryHistory,
          owner: entry.telemetryOwner,
          label: entry.telemetryLabel,
          lastSync: entry.telemetryTimestamp,
        },
      })),
    };
    const json = JSON.stringify(payload, null, 2);
    const embedSnippet = `<script type="application/json" id="nebula-progress-${activeDataset.value.id}">\n${json}\n<\/script>`;
    return {
      datasetId: activeDataset.value.id,
      payload,
      json,
      embedSnippet,
    };
  });

  const telemetrySummary: ComputedRef<{
    total: number;
    open: number;
    acknowledged: number;
    highPriority: number;
    lastEventAt: string | null;
    lastEventLabel: string;
    updatedAt: string | null;
  }> = computed(() => {
    const summary = telemetry.value?.summary;
    const lastEventAt = summary?.lastEventAt || null;
    return {
      total: summary?.totalEvents ?? 0,
      open: summary?.openEvents ?? 0,
      acknowledged: summary?.acknowledgedEvents ?? 0,
      highPriority: summary?.highPriorityEvents ?? 0,
      lastEventAt,
      lastEventLabel: lastEventAt ? formatRelativeTime(lastEventAt) : 'Nessun evento',
      updatedAt: telemetry.value?.updatedAt || lastUpdated.value,
    };
  });

  const telemetryStreams = computed(() => {
    const coverageHistory = telemetry.value?.coverage?.history ?? [];
    const incidentTimeline = telemetry.value?.incidents?.timeline ?? [];
    return {
      coverage: coverageHistory,
      incidents: incidentTimeline.map((entry) => entry.total),
      highPriority: incidentTimeline.map((entry) => entry.highPriority),
    };
  });

  const telemetryDistribution = computed(() => {
    const distribution = telemetry.value?.coverage?.distribution || {
      success: 0,
      warning: 0,
      neutral: 0,
      critical: 0,
    };
    return distribution;
  });

  const telemetryCoverageAverage = computed(() => telemetry.value?.coverage?.average ?? 0);

  return {
    header,
    cards,
    timelineEntries,
    evolutionMatrix,
    share,
    telemetrySummary,
    telemetryStreams,
    telemetryDistribution,
    telemetryCoverageAverage,
    loading,
    error,
    lastUpdated,
    refresh: () => loadAtlas(),
  };
}
