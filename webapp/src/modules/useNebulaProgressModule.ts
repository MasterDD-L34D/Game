import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  type ComputedRef,
  type Ref,
} from 'vue';
import { ZodError } from 'zod';

import { resolveApiUrl, resolveAssetUrl, isStaticDeployment } from '../services/apiEndpoints';
import { fetchJsonWithFallback, resolveFetchImplementation } from '../services/fetchWithFallback.js';
import { atlasDataset as staticDataset } from '../state/atlasDataset';
import { resolveDataSource } from '../config/dataSources';
import { createLogger } from '../utils/logger';
import { fromZodError, toServiceError } from '../services/errorHandling';
import {
  parseNebulaAggregate,
  parseNebulaDataset,
  parseNebulaGenerator,
  parseNebulaTelemetry,
} from '../validation/nebula';
import type {
  DatasetSource,
  GeneratorMetrics,
  GeneratorStreams,
  NebulaApiResponse,
  NebulaDataset,
  NebulaGeneratorTelemetry,
  NebulaTelemetry,
  TelemetryMode,
} from '../types/nebula';

type MaybeRef<T> = Ref<T> | { value: T } | T | undefined;

type NebulaModuleSources = {
  overview?: MaybeRef<Record<string, unknown>>;
  qualityRelease?: MaybeRef<Record<string, unknown>>;
  timeline?: MaybeRef<Record<string, unknown>>;
};

type UseNebulaProgressOptions = {
  endpoint?: string;
  datasetEndpoint?: string | null;
  telemetryEndpoint?: string | null;
  generatorEndpoint?: string | null;
  aggregateEndpoint?: string | null;
  fallback?: string | null;
  allowFallback?: boolean;
  pollIntervalMs?: number;
  fetcher?: typeof fetch;
  telemetryMock?: string | null;
};

function normaliseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isAggregateEndpoint(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const lower = value.trim().toLowerCase();
  return lower.includes('/api/nebula/atlas') || lower.endsWith('atlas.json');
}

function stripKnownSegments(value: string): string {
  return value.replace(/\/(?:dataset|telemetry|generator)\/?$/i, '');
}

function deriveSegmentEndpoint(base: string | null | undefined, segment: string): string | null {
  if (!base || typeof base !== 'string') {
    return null;
  }
  const trimmed = base.trim();
  if (!trimmed) {
    return null;
  }
  const normalised = trimmed.replace(/\/+$/, '');
  const lower = normalised.toLowerCase();
  if (lower.endsWith(`/${segment}`)) {
    return normalised;
  }
  if (isAggregateEndpoint(normalised)) {
    return null;
  }
  if (/(?:\/dataset|\/telemetry|\/generator)\/?$/i.test(lower)) {
    const basePath = stripKnownSegments(normalised);
    return `${basePath}/${segment}`;
  }
  return `${normalised}/${segment}`;
}

function resolveEndpointUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  return resolveApiUrl(value);
}

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
  };
}

function toError(value: unknown, fallback = 'Errore sconosciuto'): Error {
  if (value instanceof Error) {
    if (!value.message && fallback) {
      value.message = fallback;
    }
    return value;
  }
  const message = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return new Error(message || 'Errore sconosciuto');
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
  const baseEndpoint = normaliseOptionalString(dataSource.endpoint) ?? null;
  const baseAggregateEndpoint = baseEndpoint ? stripKnownSegments(baseEndpoint) : null;
  const datasetEndpointCandidate = Object.prototype.hasOwnProperty.call(options, 'datasetEndpoint')
    ? normaliseOptionalString(options.datasetEndpoint)
    : deriveSegmentEndpoint(baseEndpoint, 'dataset');
  const telemetryEndpointCandidate = Object.prototype.hasOwnProperty.call(options, 'telemetryEndpoint')
    ? normaliseOptionalString(options.telemetryEndpoint)
    : deriveSegmentEndpoint(baseEndpoint, 'telemetry');
  const generatorEndpointCandidate = Object.prototype.hasOwnProperty.call(options, 'generatorEndpoint')
    ? normaliseOptionalString(options.generatorEndpoint)
    : deriveSegmentEndpoint(baseEndpoint, 'generator');
  const aggregateEndpointCandidate = Object.prototype.hasOwnProperty.call(options, 'aggregateEndpoint')
    ? normaliseOptionalString(options.aggregateEndpoint)
    : baseAggregateEndpoint;

  const datasetEndpoint = resolveEndpointUrl(datasetEndpointCandidate);
  const telemetryEndpoint = resolveEndpointUrl(telemetryEndpointCandidate);
  const generatorEndpoint = resolveEndpointUrl(generatorEndpointCandidate);
  const aggregateEndpoint = resolveEndpointUrl(aggregateEndpointCandidate);
  const fallbackUrl = dataSource.fallback ? resolveAssetUrl(dataSource.fallback) : null;
  const telemetryMockUrl = dataSource.mock ? resolveAssetUrl(dataSource.mock) : null;
  const allowFallback =
    options && Object.prototype.hasOwnProperty.call(options, 'allowFallback')
      ? Boolean(options.allowFallback)
      : isStaticDeployment();
  const pollIntervalMs = Number.isFinite(options.pollIntervalMs) ? Number(options.pollIntervalMs) : 15000;
  const fetchImpl = resolveFetchImplementation(options.fetcher);
  const logger = createLogger('nebula');

  const dataset = ref<NebulaDataset | null>(null);
  const datasetSource = ref<DatasetSource>('static');
  const telemetry = ref<NebulaTelemetry | null>(null);
  const generator = ref<NebulaGeneratorTelemetry | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const lastUpdated = ref<string | null>(null);
  const telemetryMode = ref<TelemetryMode>('live');
  let pollHandle: ReturnType<typeof setInterval> | null = null;

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
        const raw = await response.json();
        const parsed = (() => {
          try {
            if (raw && typeof raw === 'object' && ('dataset' in raw || 'telemetry' in raw || 'generator' in raw)) {
              return parseNebulaAggregate(raw as Record<string, unknown>);
            }
            const datasetOnly = parseNebulaDataset(raw as Record<string, unknown>);
            return { dataset: datasetOnly, telemetry: null, generator: null };
          } catch (parseError) {
            if (parseError instanceof ZodError) {
              throw fromZodError(parseError, 'Dataset Nebula fallback non valido', {
                code: 'nebula.dataset.invalid',
              });
            }
            throw toServiceError(parseError, 'Dataset Nebula fallback non valido', {
              code: 'nebula.dataset.invalid',
            });
          }
        })();
        if (parsed?.dataset) {
          dataset.value = parsed.dataset;
        } else {
          dataset.value = staticDataset;
        }
        if (parsed?.telemetry) {
          telemetry.value = parsed.telemetry;
          lastUpdated.value = parsed.telemetry.updatedAt || new Date().toISOString();
        }
        if (parsed?.generator) {
          generator.value = parsed.generator;
        }
        source = 'fallback';
        logger.warn('nebula.dataset.fallback', {
          message: 'log.nebula.dataset.fallback',
          meta: {
            source: fallbackUrl,
            reason: reason?.message || 'endpoint remoto non disponibile',
          },
        });
      } catch (fallbackError) {
        const mapped = toError(fallbackError, 'Dataset Nebula locale non disponibile');
        logger.error('nebula.dataset.fallback_failed', {
          message: 'log.nebula.dataset.fallback_failed',
          meta: {
            source: fallbackUrl,
            reason: mapped.message,
          },
        });
        dataset.value = staticDataset;
        source = 'static';
      }
    } else {
      dataset.value = staticDataset;
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

  async function fetchAggregateRemote(): Promise<NebulaApiResponse | null> {
    if (!aggregateEndpoint) {
      return null;
    }
    try {
      const response = await fetchImpl(aggregateEndpoint, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Aggregato Nebula non disponibile (${response.status})`);
      }
      const raw = await response.json();
      try {
        const parsed = parseNebulaAggregate(raw as Record<string, unknown>);
        logger.info('nebula.dataset.aggregate', {
          message: 'log.nebula.dataset.aggregate',
          meta: { source: aggregateEndpoint },
        });
        return parsed;
      } catch (parseError) {
        const mapped =
          parseError instanceof ZodError
            ? fromZodError(parseError, 'Aggregato Nebula non valido', { code: 'nebula.aggregate.invalid' })
            : toServiceError(parseError, 'Aggregato Nebula non valido', { code: 'nebula.aggregate.invalid' });
        logger.warn('nebula.dataset.aggregate_unavailable', {
          message: 'log.nebula.dataset.aggregate_unavailable',
          meta: { reason: mapped.message, source: aggregateEndpoint },
        });
        return null;
      }
    } catch (aggregateError) {
      const mapped = toError(aggregateError, 'Aggregato Nebula non disponibile');
      logger.warn('nebula.dataset.aggregate_unavailable', {
        message: 'log.nebula.dataset.aggregate_unavailable',
        meta: { reason: mapped.message, source: aggregateEndpoint },
      });
      return null;
    }
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
    const raw = await response.json();
    const parsed = (() => {
      try {
        return parseNebulaTelemetry(raw as Record<string, unknown>);
      } catch (parseError) {
        if (parseError instanceof ZodError) {
          throw fromZodError(parseError, 'Telemetria mock non valida', { code: 'nebula.telemetry.invalid' });
        }
        throw toServiceError(parseError, 'Telemetria mock non valida', { code: 'nebula.telemetry.invalid' });
      }
    })();
    telemetry.value = parsed;
    telemetryMode.value = 'mock';
    lastUpdated.value = parsed?.updatedAt || new Date().toISOString();
    error.value = null;
    logger.warn('nebula.telemetry.mock.active', {
      message: 'log.nebula.telemetry.mock_active',
      meta: {
        source: telemetryMockUrl,
        reason: reason?.message || 'caricamento remoto non disponibile',
      },
      data: parsed,
    });
  }

  async function loadAtlas() {
    loading.value = true;
    try {
      let aggregatedPayload: NebulaApiResponse | null = null;
      let datasetSourceKind: DatasetSource = datasetSource.value || 'static';
      let remoteDatasetError: Error | null = null;

      const seedFromAggregate = (aggregate: NebulaApiResponse) => {
        aggregatedPayload = aggregate;
        datasetSourceKind = 'remote';
        if (aggregate.dataset) {
          dataset.value = aggregate.dataset;
        }
        if (aggregate.telemetry) {
          telemetry.value = aggregate.telemetry;
          telemetryMode.value = 'live';
          lastUpdated.value = aggregate.telemetry.updatedAt || lastUpdated.value || new Date().toISOString();
        }
        if (aggregate.generator) {
          generator.value = aggregate.generator;
        }
      };

      if (datasetEndpoint) {
        try {
          const response = await fetchJsonWithFallback(datasetEndpoint, {
            fetchImpl,
            requestInit: { cache: 'no-store' },
            fallbackUrl,
            allowFallback,
            errorMessage: 'Impossibile caricare dataset Nebula',
            fallbackErrorMessage: 'Dataset Nebula locale non disponibile',
          });
          const { data: payload, source, error: fallbackError } = response;
          const parsed = (() => {
            try {
              if (payload && typeof payload === 'object' && ('dataset' in payload || 'telemetry' in payload || 'generator' in payload)) {
                return parseNebulaAggregate(payload as Record<string, unknown>);
              }
              const datasetOnly = parseNebulaDataset((payload ?? {}) as Record<string, unknown>);
              return { dataset: datasetOnly, telemetry: null, generator: null };
            } catch (parseError) {
              if (parseError instanceof ZodError) {
                throw fromZodError(parseError, 'Dataset Nebula non valido', { code: 'nebula.dataset.invalid' });
              }
              throw toServiceError(parseError, 'Dataset Nebula non valido', { code: 'nebula.dataset.invalid' });
            }
          })();
          datasetSourceKind = source === 'fallback' ? 'fallback' : 'remote';
          aggregatedPayload = parsed;
          if (parsed?.dataset) {
            dataset.value = parsed.dataset;
          }
          if (parsed?.telemetry) {
            telemetry.value = parsed.telemetry;
            telemetryMode.value = source === 'fallback' ? 'fallback' : 'live';
            lastUpdated.value = parsed.telemetry.updatedAt || new Date().toISOString();
          }
          if (parsed?.generator) {
            generator.value = parsed.generator;
          }
          datasetSource.value = datasetSourceKind;
          error.value = null;
          if (source === 'fallback') {
            logger.warn('nebula.dataset.remote_fallback', {
              message: 'log.nebula.dataset.remote_fallback',
              meta: {
                source: fallbackUrl,
                reason: fallbackError?.message || 'endpoint remoto non disponibile',
              },
            });
          } else {
            logger.info('nebula.dataset.remote', {
              message: 'log.nebula.dataset.remote',
              meta: { source: datasetEndpoint },
            });
          }
        } catch (err) {
          remoteDatasetError = toError(err);
          if (aggregateEndpoint) {
            const aggregate = await fetchAggregateRemote();
            if (aggregate) {
              seedFromAggregate(aggregate);
              remoteDatasetError = null;
            }
          }
        }
      } else if (aggregateEndpoint) {
        const aggregate = await fetchAggregateRemote();
        if (aggregate) {
          seedFromAggregate(aggregate);
          logger.info('nebula.dataset.remote', {
            message: 'log.nebula.dataset.remote',
            meta: { source: aggregateEndpoint },
          });
        } else {
          remoteDatasetError = new Error('Aggregato Nebula non disponibile');
        }
      } else {
        remoteDatasetError = new Error('Endpoint dataset Nebula non configurato');
      }

      if (remoteDatasetError) {
        logger.warn('nebula.dataset.remote_unavailable', {
          message: 'log.nebula.dataset.remote_unavailable',
          meta: { reason: remoteDatasetError.message },
        });
        datasetSourceKind = await loadDatasetFallback(remoteDatasetError);
        aggregatedPayload = null;
        if (datasetSourceKind === 'static') {
          try {
            await loadTelemetryMock(remoteDatasetError);
          } catch (mockError) {
            const mapped = toError(mockError);
            logger.error('nebula.telemetry.mock.failed', {
              message: 'log.nebula.telemetry.mock_failed',
              meta: { reason: mapped.message },
            });
            if (!telemetry.value) {
              telemetry.value = createEmptyTelemetry(lastUpdated.value);
            }
          }
        }
      }

      if (!dataset.value) {
        dataset.value = staticDataset;
      }

      datasetSource.value = datasetSourceKind;
      if (!lastUpdated.value) {
        lastUpdated.value = new Date().toISOString();
      }

      const ensureAggregatePayload = async () => {
        if (aggregatedPayload) {
          return aggregatedPayload;
        }
        const remote = await fetchAggregateRemote();
        if (remote) {
          aggregatedPayload = remote;
        }
        return aggregatedPayload;
      };

      let telemetryLoaded = false;
      if (telemetryEndpoint) {
        try {
          const telemetryResponse = await fetchJsonWithFallback(telemetryEndpoint, {
            fetchImpl,
            requestInit: { cache: 'no-store' },
            allowFallback: false,
            errorMessage: 'Impossibile caricare telemetria Nebula',
          });
          try {
            const parsed = parseNebulaTelemetry(telemetryResponse.data as Record<string, unknown>);
            telemetry.value = parsed;
            telemetryMode.value = 'live';
            lastUpdated.value = parsed?.updatedAt || lastUpdated.value || new Date().toISOString();
            telemetryLoaded = true;
          } catch (telemetryParseError) {
            const mapped =
              telemetryParseError instanceof ZodError
                ? fromZodError(telemetryParseError, 'Telemetria Nebula non valida', {
                    code: 'nebula.telemetry.invalid',
                  })
                : toServiceError(telemetryParseError, 'Telemetria Nebula non valida', {
                    code: 'nebula.telemetry.invalid',
                  });
            logger.warn('nebula.telemetry.remote_unavailable', {
              message: 'log.nebula.telemetry.remote_unavailable',
              meta: { reason: mapped.message },
            });
          }
        } catch (telemetryError) {
          const mapped = toError(telemetryError);
          logger.warn('nebula.telemetry.remote_unavailable', {
            message: 'log.nebula.telemetry.remote_unavailable',
            meta: { reason: mapped.message },
          });
        }
      }

      if (!telemetryLoaded) {
        if (!telemetry.value) {
          const aggregate = await ensureAggregatePayload();
          if (aggregate?.telemetry) {
            telemetry.value = aggregate.telemetry;
            telemetryMode.value = datasetSourceKind === 'remote' ? 'live' : 'fallback';
            lastUpdated.value = aggregate.telemetry.updatedAt || lastUpdated.value || new Date().toISOString();
          } else {
            telemetry.value = createEmptyTelemetry(lastUpdated.value);
            telemetryMode.value = datasetSourceKind === 'remote' ? 'live' : 'fallback';
          }
        } else if (telemetryMode.value === 'live' && datasetSourceKind !== 'remote') {
          telemetryMode.value = 'fallback';
        }
      }

      let generatorLoaded = false;
      if (generatorEndpoint) {
        try {
          const generatorResponse = await fetchJsonWithFallback(generatorEndpoint, {
            fetchImpl,
            requestInit: { cache: 'no-store' },
            allowFallback: false,
            errorMessage: 'Impossibile caricare telemetria generatore',
          });
          try {
            const parsed = parseNebulaGenerator(generatorResponse.data as Record<string, unknown>);
            generator.value = parsed;
            generatorLoaded = true;
          } catch (generatorParseError) {
            const mapped =
              generatorParseError instanceof ZodError
                ? fromZodError(generatorParseError, 'Telemetria generatore non valida', {
                    code: 'nebula.generator.invalid',
                  })
                : toServiceError(generatorParseError, 'Telemetria generatore non valida', {
                    code: 'nebula.generator.invalid',
                  });
            logger.warn('nebula.generator.remote_unavailable', {
              message: 'log.nebula.generator.remote_unavailable',
              meta: { reason: mapped.message },
            });
          }
        } catch (generatorError) {
          const mapped = toError(generatorError);
          logger.warn('nebula.generator.remote_unavailable', {
            message: 'log.nebula.generator.remote_unavailable',
            meta: { reason: mapped.message },
          });
        }
      }

      if (!generatorLoaded && !generator.value) {
        const aggregate = await ensureAggregatePayload();
        if (aggregate?.generator) {
          generator.value = aggregate.generator;
        }
      }

      error.value = null;
    } catch (err) {
      const loadError = toError(err);
      error.value = loadError;
      logger.error('nebula.dataset.load_failed', {
        message: 'log.nebula.dataset.load_failed',
        meta: { reason: loadError.message },
      });
      if (!telemetry.value) {
        telemetry.value = createEmptyTelemetry(lastUpdated.value);
        telemetryMode.value = 'fallback';
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
  }> = computed(() => {
    const summary = telemetry.value?.summary;
    const lastEventAt = summary?.lastEventAt || null;
    const mode = telemetryMode.value;
    const isDemo = mode !== 'live';
    const sourceLabel =
      mode === 'live'
        ? 'Telemetria live'
        : mode === 'fallback'
          ? 'Telemetria offline · fallback'
          : 'Telemetria offline · demo';
    return {
      total: summary?.totalEvents ?? 0,
      open: summary?.openEvents ?? 0,
      acknowledged: summary?.acknowledgedEvents ?? 0,
      highPriority: summary?.highPriorityEvents ?? 0,
      lastEventAt,
      lastEventLabel: lastEventAt ? formatRelativeTime(lastEventAt) : 'Nessun evento',
      updatedAt: telemetry.value?.updatedAt || lastUpdated.value,
      mode,
      isDemo,
      sourceLabel,
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
    const offline = mode !== 'live';
    const label =
      mode === 'live'
        ? 'Telemetria live'
        : mode === 'fallback'
          ? 'Telemetria offline · fallback'
          : 'Telemetria offline · demo';
    return {
      mode,
      offline,
      variant: offline ? 'demo' : 'live',
      label,
    };
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
    generatorStatus,
    generatorMetrics,
    generatorStreams,
    loading,
    error,
    lastUpdated,
    refresh: () => loadAtlas(),
    activateDemoTelemetry,
  };
}
