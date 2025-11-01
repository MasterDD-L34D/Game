import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  watch,
  isRef,
  type ComputedRef,
  type Ref,
} from 'vue';

import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from '../services/apiEndpoints.js';
import { fetchJsonWithFallback, resolveFetchImplementation } from '../services/fetchWithFallback.js';
import { atlasDataset as staticDataset } from '../state/atlasDataset.js';
import { resolveDataSource } from '../config/dataSources.js';

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
  state?: 'live' | 'offline' | string;
};

type GeneratorMetrics = {
  generationTimeMs: number | null;
  speciesTotal: number;
  enrichedSpecies: number;
  eventTotal: number;
  datasetSpeciesTotal: number;
  coverageAverage: number;
  coreTraits: number;
  optionalTraits: number;
  synergyTraits: number;
  expectedCoreTraits: number;
};

type GeneratorStreams = {
  generationTime: number[];
  species: number[];
  enriched: number[];
};

type NebulaGeneratorTelemetry = {
  status: string;
  label: string;
  generatedAt: string | null;
  dataRoot?: string | null;
  metrics: GeneratorMetrics;
  streams: GeneratorStreams;
  updatedAt: string | null;
  sourceLabel: string;
};

type TelemetryMode = 'live' | 'fallback' | 'mock';

type NebulaApiResponse = {
  dataset?: NebulaDataset;
  telemetry?: NebulaTelemetry;
  generator?: NebulaGeneratorTelemetry;
  orchestrator?: NebulaOrchestratorTelemetry;
};

type NebulaOrchestratorTelemetry = {
  summary: {
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    lastEventAt: string | null;
  };
  events: Array<{
    timestamp: string | null;
    level: string;
    message: string;
    details?: Record<string, unknown> | null;
  }>;
  updatedAt: string | null;
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
  telemetryMock?: string | null;
};

type DatasetSource = 'remote' | 'fallback' | 'static';

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

function createIntervalRunner(callback: () => void | Promise<void>, interval: MaybeRef<number>) {
  const intervalRef = isRef(interval) ? interval : ref(Number(unref(interval)) || 0);
  const active = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function clearTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    active.value = false;
  }

  function execute() {
    try {
      const result = callback();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).catch((error) => {
          console.warn('[nebula-progress] errore polling', error instanceof Error ? error.message : error);
        });
      }
    } catch (error) {
      console.warn('[nebula-progress] errore polling', error instanceof Error ? error.message : error);
    }
  }

  function start() {
    clearTimer();
    const delay = Number(unref(intervalRef));
    if (!Number.isFinite(delay) || delay <= 0) {
      return;
    }
    active.value = true;
    timer = setInterval(execute, delay);
  }

  function stop() {
    clearTimer();
  }

  watch(
    intervalRef,
    () => {
      if (active.value) {
        start();
      }
    },
    { flush: 'post' },
  );

  return {
    start,
    stop,
    pause: stop,
    resume: start,
    isActive: computed(() => active.value),
    interval: intervalRef,
  } as const;
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

function createEmptyTelemetry(updatedAt?: string | null): NebulaTelemetry {
  return {
    summary: {
      totalEvents: 0,
      openEvents: 0,
      acknowledgedEvents: 0,
      highPriorityEvents: 0,
      lastEventAt: null,
    },
    coverage: {
      average: 0,
      history: [],
      distribution: {
        success: 0,
        warning: 0,
        neutral: 0,
        critical: 0,
      },
    },
    incidents: { timeline: [] },
    updatedAt: updatedAt || new Date().toISOString(),
    sample: [],
    state: 'offline',
  };
}

function toError(value: unknown, fallbackMessage = 'Errore sconosciuto'): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = typeof value === 'string' && value.trim().length > 0 ? value : fallbackMessage;
  return new Error(message);
}

export function useNebulaProgressModule(
  sources: NebulaModuleSources = {},
  options: UseNebulaProgressOptions = {},
) {
  const dataSource = resolveDataSource('nebulaAtlas', {
    endpoint: Object.prototype.hasOwnProperty.call(options, 'endpoint') ? options.endpoint : undefined,
    fallback: Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : undefined,
    mock: Object.prototype.hasOwnProperty.call(options, 'telemetryMock') ? options.telemetryMock : undefined,
  });
  const endpoint = resolveApiUrl(options.endpoint || dataSource.endpoint);
  const fallbackUrl = dataSource.fallback ? resolveAssetUrl(dataSource.fallback) : null;
  const telemetryMockUrl = dataSource.mock ? resolveAssetUrl(dataSource.mock) : null;
  const allowFallback =
    options && Object.prototype.hasOwnProperty.call(options, 'allowFallback')
      ? Boolean(options.allowFallback)
      : isStaticDeployment();
  const pollIntervalMs = Number.isFinite(options.pollIntervalMs)
    ? Math.max(0, Number(options.pollIntervalMs))
    : 15000;
  const fetchImpl = resolveFetchImplementation(options.fetcher);

  const dataset = ref<NebulaDataset | null>(null);
  const datasetSource = ref<DatasetSource>('static');
  const telemetry = ref<NebulaTelemetry | null>(null);
  const generator = ref<NebulaGeneratorTelemetry | null>(null);
  const orchestrator = ref<NebulaOrchestratorTelemetry | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const lastUpdated = ref<string | null>(null);
  const telemetryMode = ref<TelemetryMode>('live');
  const pollInterval = ref(pollIntervalMs);
  const pollRunner = createIntervalRunner(() => {
    loadAtlas().catch(() => {
      // error già gestito in loadAtlas
    });
  }, pollInterval);

  const overview = computed(() => (unref(sources.overview) as Record<string, unknown>) || {});
  const qualityRelease = computed(() => (unref(sources.qualityRelease) as Record<string, unknown>) || {});
  const timelineState = computed(() => (unref(sources.timeline) as Record<string, unknown>) || {});

  const activeDataset = computed<NebulaDataset>(() => dataset.value || staticDataset);

  async function loadDatasetFallback(reason?: Error): Promise<DatasetSource> {
    let source: DatasetSource = 'static';
    if (fallbackUrl) {
      try {
        const response = await fetchImpl(fallbackUrl, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Dataset Nebula fallback non disponibile (${response.status})`);
        }
        const payload = (await response.json()) as NebulaApiResponse;
        if (payload?.dataset) {
          dataset.value = payload.dataset;
        } else {
          dataset.value = staticDataset;
        }
        if (payload?.telemetry) {
          telemetry.value = {
            ...payload.telemetry,
            state: payload.telemetry.state || 'offline',
          };
          lastUpdated.value = payload.telemetry.updatedAt || new Date().toISOString();
        }
        if (payload?.generator) {
          generator.value = payload.generator;
        }
        if (payload?.orchestrator) {
          orchestrator.value = payload.orchestrator;
        } else {
          orchestrator.value = null;
        }
        source = 'fallback';
        console.warn('[nebula-progress] Dataset caricato da fallback locale', {
          source: fallbackUrl,
          reason: reason?.message || 'endpoint remoto non disponibile',
        });
      } catch (fallbackError) {
        const mapped = toError(fallbackError, 'Dataset Nebula locale non disponibile');
        console.warn('[nebula-progress] Impossibile utilizzare il dataset fallback', {
          source: fallbackUrl,
          reason: mapped.message,
        });
        dataset.value = staticDataset;
        orchestrator.value = null;
        source = 'static';
      }
    } else {
      dataset.value = staticDataset;
      orchestrator.value = null;
      source = 'static';
    }
    datasetSource.value = source;
    if (!lastUpdated.value) {
      lastUpdated.value = new Date().toISOString();
    }
    if (!telemetry.value) {
      telemetry.value = createEmptyTelemetry(lastUpdated.value);
    }
    telemetryMode.value = source === 'remote' ? 'live' : 'fallback';
    error.value = null;
    return source;
  }

  async function loadTelemetryMock(reason?: Error) {
    if (!telemetryMockUrl) {
      throw reason || new Error('Mock telemetria non configurato');
    }
    const response = await fetchImpl(telemetryMockUrl, { cache: 'no-store' });
    if (!response.ok) {
      const message = `Mock telemetria non disponibile (${response.status})`;
      throw new Error(message);
    }
    const payload = (await response.json()) as NebulaTelemetry;
    telemetry.value = {
      ...payload,
      state: payload.state || 'offline',
    };
    telemetryMode.value = 'mock';
    lastUpdated.value = payload?.updatedAt || new Date().toISOString();
    error.value = null;
    console.warn('[nebula-progress] Telemetria mock attiva', {
      source: telemetryMockUrl,
      reason: reason?.message || 'caricamento remoto non disponibile',
    });
  }

  async function loadAtlas() {
    loading.value = true;
    try {
      const response = await fetchJsonWithFallback(endpoint, {
        fetchImpl,
        requestInit: { cache: 'no-store' },
        fallbackUrl,
        allowFallback,
        errorMessage: 'Impossibile caricare dataset Nebula',
        fallbackErrorMessage: 'Dataset Nebula locale non disponibile',
      });
      const { data: payload, error: remoteError } = response;
      const endpointSource = response.source;
      const data = (payload ?? {}) as NebulaApiResponse;
      if (data?.dataset) {
        dataset.value = data.dataset;
      }
      datasetSource.value = endpointSource === 'fallback' ? 'fallback' : 'remote';
      if (data?.telemetry) {
        const telemetryPayload: NebulaTelemetry = {
          ...data.telemetry,
          state: data.telemetry.state || (endpointSource === 'fallback' ? 'offline' : 'live'),
        };
        telemetry.value = telemetryPayload;
        lastUpdated.value = telemetryPayload.updatedAt || new Date().toISOString();
        telemetryMode.value = endpointSource === 'fallback' ? 'fallback' : 'live';
      } else {
        lastUpdated.value = new Date().toISOString();
        telemetryMode.value = endpointSource === 'fallback' ? 'fallback' : 'live';
        if (!telemetry.value) {
          telemetry.value = createEmptyTelemetry(lastUpdated.value);
        }
      }
      if (data?.generator) {
        generator.value = data.generator;
      }
      if (data?.orchestrator) {
        orchestrator.value = data.orchestrator;
      } else {
        orchestrator.value = null;
      }
      error.value = null;
      if (endpointSource === 'fallback') {
        console.warn(
          '[nebula-progress] Dataset caricato da fallback locale',
          { source: fallbackUrl, reason: remoteError?.message || 'endpoint remoto non disponibile' },
        );
      } else {
        console.info('[nebula-progress] Dataset sincronizzato da endpoint remoto', { source: endpoint });
      }
    } catch (err) {
      const loadError = toError(err);
      console.warn('[nebula-progress] Endpoint Nebula non disponibile, attivo modalità demo', {
        reason: loadError.message,
      });
      const source = await loadDatasetFallback(loadError);
      if (source === 'static') {
        try {
          await loadTelemetryMock(loadError);
        } catch (mockError) {
          const mapped = toError(mockError);
          console.warn('[nebula-progress] Telemetria mock non disponibile', {
            reason: mapped.message,
          });
          if (!telemetry.value) {
            telemetry.value = createEmptyTelemetry(lastUpdated.value);
          }
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function activateDemoTelemetry() {
    try {
      await loadTelemetryMock();
      return;
    } catch (mockError) {
      const mapped = toError(mockError);
      error.value = mapped;
      throw mapped;
    }
  }

  function startPolling() {
    if (pollInterval.value <= 0) {
      return;
    }
    pollRunner.start();
  }

  function stopPolling() {
    pollRunner.stop();
  }

  function setPollingInterval(value: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    const next = Math.max(0, Math.floor(numeric));
    const wasActive = pollRunner.isActive.value;
    pollInterval.value = next;
    if (next <= 0) {
      pollRunner.stop();
    } else if (wasActive) {
      pollRunner.start();
    }
  }

  onMounted(() => {
    loadAtlas().catch(() => {
      // error già gestito in loadAtlas
    });
    startPolling();
  });

  onBeforeUnmount(() => {
    pollRunner.stop();
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
        telemetryMode: telemetryMode.value,
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
      telemetryMode: telemetryMode.value,
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
          mode: entry.telemetryMode,
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

  const datasetStatus = computed(() => {
    const source = datasetSource.value;
    if (source === 'remote') {
      return {
        source,
        label: 'Dataset live',
        offline: false,
        demo: false,
      } as const;
    }
    if (source === 'fallback') {
      return {
        source,
        label: 'Dataset offline · fallback',
        offline: true,
        demo: true,
      } as const;
    }
    return {
      source,
      label: 'Dataset statico · demo',
      offline: true,
      demo: true,
    } as const;
  });

  const telemetrySummary: ComputedRef<{
    total: number;
    open: number;
    acknowledged: number;
    highPriority: number;
    lastEventAt: string | null;
    lastEventLabel: string;
    updatedAt: string | null;
    mode: TelemetryMode;
    isDemo: boolean;
    sourceLabel: string;
    state: 'live' | 'offline';
  }> = computed(() => {
    const summary = telemetry.value?.summary;
    const lastEventAt = summary?.lastEventAt || null;
    const mode = telemetryMode.value;
    const telemetryState = telemetry.value?.state === 'offline' ? 'offline' : 'live';
    const isOffline = telemetryState === 'offline' || mode !== 'live';
    const sourceLabel = isOffline
      ? mode === 'fallback'
        ? 'Telemetria offline · fallback'
        : mode === 'mock'
          ? 'Telemetria offline · demo'
          : 'Telemetria offline'
      : 'Telemetria live';
    return {
      total: summary?.totalEvents ?? 0,
      open: summary?.openEvents ?? 0,
      acknowledged: summary?.acknowledgedEvents ?? 0,
      highPriority: summary?.highPriorityEvents ?? 0,
      lastEventAt,
      lastEventLabel: lastEventAt ? formatRelativeTime(lastEventAt) : 'Nessun evento',
      updatedAt: telemetry.value?.updatedAt || lastUpdated.value,
      mode,
      isDemo: isOffline,
      sourceLabel,
      state: telemetryState,
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

  const telemetryStatus = computed(() => {
    const mode = telemetryMode.value;
    const baseState = telemetry.value?.state === 'offline' ? 'offline' : 'live';
    const offline = baseState === 'offline' || mode !== 'live';
    const state = offline ? 'offline' : 'live';
    const label = offline
      ? mode === 'fallback'
        ? 'Telemetria offline · fallback'
        : mode === 'mock'
          ? 'Telemetria offline · demo'
          : 'Telemetria offline'
      : 'Telemetria live';
    return {
      mode,
      offline,
      variant: offline ? 'demo' : 'live',
      label,
      state,
    };
  });

  const liveState = computed(() => {
    const telemetryStatusValue = telemetryStatus.value;
    const datasetOffline = datasetSource.value !== 'remote';
    const telemetryOffline = telemetryStatusValue.offline;
    const offline = datasetOffline || telemetryOffline;
    let label = 'LIVE';
    if (offline) {
      if (datasetOffline && telemetryOffline) {
        label = 'OFFLINE · dataset + telemetria';
      } else if (datasetOffline) {
        label = 'OFFLINE · dataset';
      } else {
        label = 'OFFLINE · telemetria';
      }
    }
    return {
      state: offline ? 'offline' : 'live',
      label,
      offline,
      datasetOffline,
      telemetryOffline,
    } as const;
  });

  const generatorStatus = computed(() => {
    const payload = generator.value;
    if (!payload) {
      return {
        status: 'unknown',
        label: 'Generatore non disponibile',
        generatedAt: null,
        updatedAt: null,
        sourceLabel: 'Generator telemetry offline',
      };
    }
    return {
      status: payload.status,
      label: payload.label || 'Generatore online',
      generatedAt: payload.generatedAt || null,
      updatedAt: payload.updatedAt || null,
      sourceLabel: payload.sourceLabel || 'Generator telemetry',
    };
  });

  const generatorMetrics = computed<GeneratorMetrics>(() => {
    const payload = generator.value?.metrics;
    if (!payload) {
      return {
        generationTimeMs: null,
        speciesTotal: 0,
        enrichedSpecies: 0,
        eventTotal: 0,
        datasetSpeciesTotal: activeDataset.value?.species?.length || 0,
        coverageAverage: telemetry.value?.coverage?.average ?? 0,
        coreTraits: 0,
        optionalTraits: 0,
        synergyTraits: 0,
        expectedCoreTraits: 0,
      };
    }
    return payload;
  });

  const generatorStreams = computed<GeneratorStreams>(() => {
    const streams = generator.value?.streams;
    if (!streams) {
      return { generationTime: [], species: [], enriched: [] };
    }
    return {
      generationTime: Array.isArray(streams.generationTime) ? streams.generationTime : [],
      species: Array.isArray(streams.species) ? streams.species : [],
      enriched: Array.isArray(streams.enriched) ? streams.enriched : [],
    };
  });

  return {
    header,
    cards,
    timelineEntries,
    evolutionMatrix,
    share,
    datasetStatus,
    telemetrySummary,
    telemetryStreams,
    telemetryDistribution,
    telemetryCoverageAverage,
    telemetryStatus,
    liveState,
    generatorStatus,
    generatorMetrics,
    generatorStreams,
    orchestrator,
    pollingInterval: pollRunner.interval,
    isPollingActive: pollRunner.isActive,
    setPollingInterval,
    startPolling,
    stopPolling,
    loading,
    error,
    lastUpdated,
    refresh: () => loadAtlas(),
    activateDemoTelemetry,
  };
}
