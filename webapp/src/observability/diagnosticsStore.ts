import { computed, reactive } from 'vue';
import { readEnvString } from '../services/apiEndpoints.js';

type DiagnosticsFlag = 'auto' | 'enabled' | 'disabled';

type FetchStatus = 'pending' | 'success' | 'fallback' | 'error';

export type FetchDiagnostic = {
  id: string;
  url: string;
  method: string;
  status: FetchStatus;
  source: 'remote' | 'fallback';
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  fallbackUrl: string | null;
  fallbackAttempted: boolean;
  message: string;
  error: string | null;
};

export type LogDiagnostic = {
  id: string;
  level: string;
  message: string;
  scope: string;
  source: string;
  timestamp: number;
};

export type MetricDiagnostic = {
  id: string;
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  navigationType?: string;
  entries?: number;
  timestamp: number;
  details?: Record<string, unknown>;
};

export type MetricDiagnosticPayload = Omit<MetricDiagnostic, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: number;
};

type DiagnosticsState = {
  enabled: boolean;
  fetches: FetchDiagnostic[];
  logs: LogDiagnostic[];
  metrics: MetricDiagnostic[];
};

const MAX_FETCH_ENTRIES = 30;
const MAX_LOG_ENTRIES = 60;
const MAX_METRIC_ENTRIES = 40;

function normaliseFlag(value: string | undefined, fallback: DiagnosticsFlag): DiagnosticsFlag {
  if (!value) {
    return fallback;
  }
  const normalised = value.trim().toLowerCase();
  if (['enabled', 'true', '1', 'on', 'yes'].includes(normalised)) {
    return 'enabled';
  }
  if (['disabled', 'false', '0', 'off', 'no'].includes(normalised)) {
    return 'disabled';
  }
  if (normalised === 'auto') {
    return 'auto';
  }
  return fallback;
}

const flag = normaliseFlag(readEnvString('VITE_OBSERVABILITY_DIAGNOSTICS'), 'auto');
const defaultEnabled = typeof window !== 'undefined' && import.meta.env.MODE !== 'production';
const diagnosticsEnabled = flag === 'enabled' || (flag === 'auto' && defaultEnabled);

const state: DiagnosticsState = reactive({
  enabled: diagnosticsEnabled,
  fetches: [],
  logs: [],
  metrics: [],
});

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function findFetchEntry(id: string): FetchDiagnostic | undefined {
  return state.fetches.find((entry) => entry.id === id);
}

export function beginFetchDiagnostic(payload: {
  id?: string;
  url: string;
  method?: string;
  fallbackUrl?: string | null;
  fallbackAllowed?: boolean;
}): string | null {
  if (!state.enabled) {
    return null;
  }
  const id = payload.id || generateId('fetch');
  const entry: FetchDiagnostic = {
    id,
    url: payload.url,
    method: (payload.method || 'GET').toUpperCase(),
    status: 'pending',
    source: 'remote',
    startedAt: Date.now(),
    completedAt: null,
    durationMs: null,
    fallbackUrl: payload.fallbackUrl || null,
    fallbackAttempted: Boolean(payload.fallbackAllowed && payload.fallbackUrl),
    message: 'Richiesta in corso',
    error: null,
  };
  state.fetches.unshift(entry);
  if (state.fetches.length > MAX_FETCH_ENTRIES) {
    state.fetches.length = MAX_FETCH_ENTRIES;
  }
  return id;
}

export function resolveFetchDiagnostic(
  id: string | null,
  payload: Partial<Pick<FetchDiagnostic, 'status' | 'source' | 'message' | 'error'>> & {
    completed?: boolean;
  } = {},
): void {
  if (!state.enabled || !id) {
    return;
  }
  const entry = findFetchEntry(id);
  if (!entry) {
    return;
  }
  if (payload.status) {
    entry.status = payload.status;
  }
  if (payload.source) {
    entry.source = payload.source;
  }
  if (payload.message) {
    entry.message = payload.message;
  }
  if (payload.error !== undefined) {
    entry.error = payload.error || null;
  }
  if (payload.completed !== false) {
    entry.completedAt = Date.now();
    entry.durationMs = entry.completedAt - entry.startedAt;
  }
}

export function recordFallbackSuccess(id: string | null, message: string): void {
  if (!state.enabled || !id) {
    return;
  }
  const entry = findFetchEntry(id);
  if (!entry) {
    return;
  }
  entry.status = 'fallback';
  entry.source = 'fallback';
  entry.message = message;
  entry.error = entry.error || null;
  entry.completedAt = Date.now();
  entry.durationMs = entry.completedAt - entry.startedAt;
}

export function recordFetchError(id: string | null, message: string, error?: unknown): void {
  if (!state.enabled || !id) {
    return;
  }
  const entry = findFetchEntry(id);
  if (!entry) {
    return;
  }
  entry.status = 'error';
  entry.source = 'remote';
  entry.message = message;
  entry.error = error instanceof Error ? error.message : typeof error === 'string' ? error : null;
  entry.completedAt = Date.now();
  entry.durationMs = entry.completedAt - entry.startedAt;
}

export function recordLogDiagnostic(payload: {
  id?: string;
  level: string;
  message: string;
  scope?: string;
  source?: string;
  timestamp?: number;
}): void {
  if (!state.enabled) {
    return;
  }
  const entry: LogDiagnostic = {
    id: payload.id || generateId('log'),
    level: payload.level,
    message: payload.message,
    scope: payload.scope || 'app',
    source: payload.source || 'client',
    timestamp: payload.timestamp ?? Date.now(),
  };
  state.logs.unshift(entry);
  if (state.logs.length > MAX_LOG_ENTRIES) {
    state.logs.length = MAX_LOG_ENTRIES;
  }
}

export function recordMetricDiagnostic(payload: MetricDiagnosticPayload): void {
  if (!state.enabled) {
    return;
  }
  const entry: MetricDiagnostic = {
    ...payload,
    id: payload.id || generateId('metric'),
    timestamp: payload.timestamp ?? Date.now(),
  };
  state.metrics.unshift(entry);
  if (state.metrics.length > MAX_METRIC_ENTRIES) {
    state.metrics.length = MAX_METRIC_ENTRIES;
  }
}

export function useDiagnosticsStore() {
  const fetchSummary = computed(() => {
    const total = state.fetches.length;
    const fallback = state.fetches.filter((entry) => entry.status === 'fallback').length;
    const failures = state.fetches.filter((entry) => entry.status === 'error').length;
    const pending = state.fetches.filter((entry) => entry.status === 'pending').length;
    return { total, fallback, failures, pending };
  });

  return {
    enabled: computed(() => state.enabled),
    fetches: computed(() => state.fetches),
    logs: computed(() => state.logs),
    metrics: computed(() => state.metrics),
    fetchSummary,
  } as const;
}

export function isDiagnosticsEnabled(): boolean {
  return state.enabled;
}

