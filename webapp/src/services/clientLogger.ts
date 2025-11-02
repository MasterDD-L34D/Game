import { computed, reactive, readonly, type ComputedRef } from 'vue';
import { buildQaHighlightsSummary } from './qaHighlightFormatter.js';
import { useEventSource, type EventSourceState, type EventSourceStatus } from '../composables/useEventSource.ts';
import { resolveApiUrl, readEnvString } from './apiEndpoints.js';
import { recordLogDiagnostic } from '../observability/diagnosticsStore.ts';

type LoggerLevel = 'info' | 'warn' | 'warning' | 'error' | 'success' | string;

type ClientLogPayload = {
  id?: string;
  scope?: string;
  level?: LoggerLevel;
  message?: string;
  timestamp?: string;
  request_id?: string | null;
  requestId?: string | null;
  meta?: unknown;
  validation?: unknown;
  data?: unknown;
  source?: string;
  [key: string]: unknown;
};

type ClientLogEntry = {
  id: string;
  event: string;
  scope: string;
  level: LoggerLevel;
  message: string;
  timestamp: string;
  request_id: string | null;
  meta: unknown;
  validation: unknown;
  data: unknown;
  source: string;
};

type LogFilter = (entry: ClientLogEntry) => boolean;

type LogExportFormat = 'json' | 'csv';

type LogExportOptions = {
  filename?: string;
  format?: LogExportFormat;
  filter?: LogFilter;
};

type LogExportResult = {
  entries: ClientLogEntry[];
  format: LogExportFormat;
  filename: string;
  content: string;
  contentType: string;
  blob: Blob | null;
};

type StreamEntryDefaults = {
  scope?: string;
  level?: LoggerLevel;
  source?: string;
  event?: string;
};

type ConnectStreamOptions = StreamEntryDefaults & {
  url?: string | null;
  event?: string;
  parseJson?: boolean;
};

type ClientLoggerOptions = {
  streamUrl?: string | null;
  autoConnect?: boolean;
  event?: string;
  scope?: string;
};

type ClientLoggerApi = {
  entries: Readonly<ClientLogEntry[]>;
  total: ComputedRef<number>;
  list: (filter?: LogFilter) => ClientLogEntry[];
  snapshot: (options?: { filter?: LogFilter }) => ClientLogEntry[];
  createLogExport: (options?: LogExportOptions) => LogExportResult;
  exportLogs: (options?: LogExportOptions) => LogExportResult;
  exportLogsAsJson: (options?: LogExportOptions) => void;
  exportLogsAsCsv: (options?: LogExportOptions) => void;
  logEvent: typeof logEvent;
  logQaBadgeSummary: typeof logQaBadgeSummary;
  clear: () => void;
  connectStream: (options?: ConnectStreamOptions) => void;
  disconnectStream: () => void;
  reconnectStream: () => void;
  streamState: Readonly<EventSourceState>;
  streamStatus: ComputedRef<EventSourceStatus>;
  streamUrl: ComputedRef<string | null>;
  streamError: ComputedRef<Error | null>;
  streamLastEventAt: ComputedRef<number | null>;
  streamAttempts: ComputedRef<number>;
  streamSupported: ComputedRef<boolean>;
  streamConnected: ComputedRef<boolean>;
  defaultStreamUrl: string | null;
};

const MAX_ENTRIES = 500;
const CSV_FIELDS: Array<[string, (entry: ClientLogEntry) => string]> = [
  ['id', (entry) => entry.id || ''],
  ['timestamp', (entry) => entry.timestamp || ''],
  ['scope', (entry) => entry.scope || ''],
  ['level', (entry) => entry.level || ''],
  ['message', (entry) => entry.message || ''],
  ['request_id', (entry) => entry.request_id || ''],
  [
    'meta',
    (entry) =>
      entry.meta === undefined || entry.meta === null ? '' : JSON.stringify(entry.meta, null, 0),
  ],
  [
    'validation',
    (entry) =>
      entry.validation === undefined || entry.validation === null
        ? ''
        : JSON.stringify(entry.validation, null, 0),
  ],
  [
    'data',
    (entry) => (entry.data === undefined || entry.data === null ? '' : JSON.stringify(entry.data, null, 0)),
  ],
  ['source', (entry) => entry.source || ''],
];

let sequence = 0;

const state = reactive<{ entries: ClientLogEntry[] }>({
  entries: [],
});

const streamController = useEventSource(null, {
  autoReconnect: true,
  reconnectDelay: (attempt) => Math.min((attempt + 1) * 1200, 8000),
});

let streamDisposer: (() => void) | null = null;
let lastStreamOptions: Required<StreamEntryDefaults> & { event: string; parseJson: boolean } = {
  scope: 'quality',
  level: 'info',
  source: 'stream',
  event: 'message',
  parseJson: true,
};

function readDefaultStreamUrl(): string | null {
  const override = readEnvString('VITE_QA_LOG_STREAM_URL');
  if (typeof override === 'string') {
    const trimmed = override.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.toLowerCase() === 'null') {
      return null;
    }
    return resolveApiUrl(trimmed);
  }
  return resolveApiUrl('/api/v1/quality/logs/stream');
}

const DEFAULT_STREAM_URL = readDefaultStreamUrl();

function serialise<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function collectEntries(filter?: LogFilter): ClientLogEntry[] {
  if (typeof filter === 'function') {
    return state.entries.filter(filter);
  }
  return state.entries.slice();
}

function cloneEntry(entry: ClientLogEntry): ClientLogEntry {
  return {
    ...entry,
    meta: serialise(entry.meta),
    validation: serialise(entry.validation),
    data: serialise(entry.data),
  };
}

function appendEntry(entry: ClientLogEntry): ClientLogEntry {
  const normalised = cloneEntry(entry);
  state.entries.unshift(normalised);
  if (state.entries.length > MAX_ENTRIES) {
    state.entries.length = MAX_ENTRIES;
  }
  const level = typeof normalised.level === 'string' ? normalised.level.toLowerCase() : '';
  if (level === 'error' || level === 'warn' || level === 'warning') {
    recordLogDiagnostic({
      id: normalised.id,
      level: normalised.level,
      message: normalised.message,
      scope: normalised.scope,
      source: normalised.source,
      timestamp: Date.parse(normalised.timestamp) || Date.now(),
    });
  }
  return normalised;
}

function normaliseScope(value: string | undefined): string {
  const text = (value || '').trim();
  return text.length ? text : 'app';
}

function normaliseTimestamp(value?: string | number | Date | null): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string' && value.length) {
    return value;
  }
  return new Date().toISOString();
}

function createEntry(event: string, payload: ClientLogPayload, defaults: Partial<ClientLogPayload> = {}): ClientLogEntry {
  const scope = normaliseScope((payload.scope as string | undefined) ?? (defaults.scope as string | undefined));
  const level = (payload.level ?? defaults.level ?? 'info') as LoggerLevel;
  const message = typeof payload.message === 'string' ? payload.message : '';
  const timestamp = normaliseTimestamp(payload.timestamp ?? defaults.timestamp ?? null);
  const requestId =
    (payload.request_id as string | null | undefined) ??
    (payload.requestId as string | null | undefined) ??
    (defaults.request_id as string | null | undefined) ??
    null;
  const source = typeof payload.source === 'string' && payload.source.length ? payload.source : defaults.source || 'ui';
  const baseId =
    typeof payload.id === 'string' && payload.id.length
      ? payload.id
      : typeof defaults.id === 'string' && defaults.id.length
        ? defaults.id
        : `${event}-${Date.now()}-${sequence++}`;

  return {
    id: baseId,
    event: event || 'app.event',
    scope,
    level,
    message,
    timestamp,
    request_id: requestId,
    meta: serialise(payload.meta ?? defaults.meta ?? null),
    validation: serialise(payload.validation ?? defaults.validation ?? null),
    data: serialise(payload.data ?? defaults.data ?? null),
    source,
  };
}

function toCsvValue(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (!text.length) {
    return '';
  }
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function createCsvContent(entries: ClientLogEntry[]): string {
  const header = CSV_FIELDS.map(([label]) => label).join(',');
  const rows = entries.map((entry) => CSV_FIELDS.map(([, projector]) => toCsvValue(projector(entry))).join(','));
  return [header, ...rows].join('\r\n');
}

function createBlob(content: string, type: string): Blob | null {
  if (typeof Blob === 'function') {
    return new Blob([content], { type });
  }
  return null;
}

function createJsonContent(entries: ClientLogEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

function buildExport(entries: ClientLogEntry[], { filename, format }: { filename?: string; format?: LogExportFormat }): LogExportResult {
  const resolvedFormat: LogExportFormat = String(format || 'json').toLowerCase() === 'csv' ? 'csv' : 'json';
  const normalisedEntries = entries.map((entry) => cloneEntry(entry));
  if (resolvedFormat === 'csv') {
    const content = createCsvContent(normalisedEntries);
    const contentType = 'text/csv;charset=utf-8';
    return {
      entries: normalisedEntries,
      format: 'csv',
      filename: filename || 'qa-flow-logs.csv',
      content,
      contentType,
      blob: createBlob(content, contentType),
    };
  }
  const content = createJsonContent(normalisedEntries);
  const contentType = 'application/json';
  return {
    entries: normalisedEntries,
    format: 'json',
    filename: filename || 'qa-flow-logs.json',
    content,
    contentType,
    blob: createBlob(content, contentType),
  };
}

function downloadBlob(blob: Blob | null, filename: string) {
  if (!blob || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function logEvent(event: string, payload: ClientLogPayload = {}): ClientLogEntry {
  const entry = createEntry(event, payload);
  return appendEntry(entry);
}

export function logQaBadgeSummary(badges: unknown[], options: Record<string, unknown> = {}) {
  const summary = buildQaHighlightsSummary(badges, options);
  if (!summary) {
    return null;
  }
  const metrics = (summary.metrics || {}) as Record<string, unknown>;
  const hasAlerts = Boolean(metrics.conflicts || metrics.matrixMismatch || metrics.zeroCoverage);
  logEvent('quality.qa.badges', {
    scope: 'quality',
    level: hasAlerts ? 'warn' : 'info',
    message: 'Aggiornati badge QA',
    data: {
      metrics,
      badges: summary.badges,
      sections: Array.isArray(summary.sections)
        ? summary.sections.map((section: Record<string, unknown>) => ({
            key: section.key,
            total: section.total,
          }))
        : [],
      checks: summary.checks,
    },
  });
  return summary;
}

export function clearLogs() {
  state.entries.splice(0, state.entries.length);
}

export function getLogsSnapshot({ filter }: { filter?: LogFilter } = {}) {
  const entries = collectEntries(filter);
  return entries.map((entry) => cloneEntry(entry));
}

export function createLogExport({ filename, filter, format = 'json' }: LogExportOptions = {}) {
  const entries = collectEntries(filter);
  return buildExport(entries, { filename, format });
}

export function exportLogs(options: LogExportOptions = {}) {
  const exportResult = createLogExport(options);
  downloadBlob(exportResult.blob, exportResult.filename);
  return exportResult;
}

export function exportLogsAsJson(options: LogExportOptions = {}) {
  exportLogs({ ...options, format: 'json' });
}

export function exportLogsAsCsv(options: LogExportOptions = {}) {
  exportLogs({ ...options, format: 'csv' });
}

function normaliseStreamEntry(payload: unknown, defaults: StreamEntryDefaults): ClientLogEntry | null {
  if (payload == null) {
    return null;
  }
  if (typeof payload === 'string') {
    const message = payload.trim();
    if (!message) {
      return null;
    }
    return createEntry(defaults.event || 'quality.stream.log', {
      message,
      scope: defaults.scope,
      level: defaults.level,
      source: defaults.source,
    });
  }
  if (typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const event = typeof record.event === 'string' && record.event.length ? record.event : defaults.event || 'quality.stream.log';
  const entry = createEntry(event, {
    id: typeof record.id === 'string' && record.id.length ? record.id : undefined,
    scope: (record.scope as string | undefined) ?? defaults.scope,
    level: (record.level as LoggerLevel | undefined) ?? defaults.level,
    message: typeof record.message === 'string' ? record.message : '',
    timestamp: (record.timestamp as string | undefined) ?? (record.time as string | undefined),
    request_id: (record.request_id as string | null | undefined) ?? (record.requestId as string | null | undefined),
    meta: record.meta,
    validation: record.validation,
    data: record.data,
    source: (record.source as string | undefined) ?? defaults.source,
  });
  return entry;
}

function normaliseStreamPayload(payload: unknown, defaults: StreamEntryDefaults): ClientLogEntry[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normaliseStreamEntry(item, defaults))
      .filter((entry): entry is ClientLogEntry => Boolean(entry));
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.entries)) {
      return record.entries
        .map((item) => normaliseStreamEntry(item, defaults))
        .filter((entry): entry is ClientLogEntry => Boolean(entry));
    }
    if (Array.isArray(record.logs)) {
      return record.logs
        .map((item) => normaliseStreamEntry(item, defaults))
        .filter((entry): entry is ClientLogEntry => Boolean(entry));
    }
    if (record.entry) {
      const single = normaliseStreamEntry(record.entry, defaults);
      return single ? [single] : [];
    }
  }
  const single = normaliseStreamEntry(payload, defaults);
  return single ? [single] : [];
}

function bindStreamHandler(options: ConnectStreamOptions) {
  if (streamDisposer) {
    streamDisposer();
    streamDisposer = null;
  }
  const defaults: StreamEntryDefaults = {
    scope: options.scope ?? lastStreamOptions.scope,
    level: options.level ?? lastStreamOptions.level,
    source: options.source ?? lastStreamOptions.source,
    event: options.event ?? lastStreamOptions.event,
  };
  lastStreamOptions = {
    scope: defaults.scope || 'quality',
    level: defaults.level || 'info',
    source: defaults.source || 'stream',
    event: defaults.event || 'message',
    parseJson: options.parseJson !== false,
  };
  streamDisposer = streamController.on(lastStreamOptions.event, (event) => {
    let payload: unknown = event.data;
    if (lastStreamOptions.parseJson && typeof payload === 'string') {
      const text = payload.trim();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (error) {
          payload = text;
        }
      }
    }
    const entries = normaliseStreamPayload(payload, {
      scope: lastStreamOptions.scope,
      level: lastStreamOptions.level,
      source: lastStreamOptions.source,
      event: event.type && event.type !== 'message' ? event.type : options.event || 'quality.stream.log',
    });
    entries.forEach((entry) => appendEntry({ ...entry, source: entry.source || lastStreamOptions.source }));
  });
}

function connectStream(options: ConnectStreamOptions = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  const targetUrl = options.url ?? streamController.state.url ?? DEFAULT_STREAM_URL;
  if (!targetUrl) {
    disconnectStream();
    return;
  }
  bindStreamHandler(options);
  streamController.setUrl(targetUrl);
  streamController.connect(targetUrl);
}

function disconnectStream() {
  if (streamDisposer) {
    streamDisposer();
    streamDisposer = null;
  }
  streamController.disconnect();
}

function reconnectStream() {
  streamController.reconnect();
}

function useClientLogger(options: ClientLoggerOptions = {}): ClientLoggerApi {
  if (options.autoConnect) {
    connectStream({
      url: options.streamUrl ?? DEFAULT_STREAM_URL,
      event: options.event ?? 'message',
      scope: options.scope ?? 'quality',
    });
  } else if (options.streamUrl) {
    connectStream({
      url: options.streamUrl,
      event: options.event ?? 'message',
      scope: options.scope ?? 'quality',
    });
  }

  const entriesRef = readonly(state.entries);
  const total = computed(() => state.entries.length);
  const streamState = streamController.state;
  const streamStatus = computed(() => streamState.status);
  const streamUrl = computed(() => streamState.url);
  const streamError = computed(() => streamState.error);
  const streamLastEventAt = computed(() => streamState.lastEventAt);
  const streamAttempts = computed(() => streamState.attempts);
  const streamSupported = computed(() => streamState.status !== 'unsupported');
  const streamConnected = computed(() => streamState.status === 'open');

  return {
    entries: entriesRef,
    total,
    list: (filter?: LogFilter) => collectEntries(filter),
    snapshot: (options?: { filter?: LogFilter }) => getLogsSnapshot({ filter: options?.filter }),
    createLogExport,
    exportLogs,
    exportLogsAsJson,
    exportLogsAsCsv,
    logEvent,
    logQaBadgeSummary,
    clear: clearLogs,
    connectStream,
    disconnectStream,
    reconnectStream,
    streamState,
    streamStatus,
    streamUrl,
    streamError,
    streamLastEventAt,
    streamAttempts,
    streamSupported,
    streamConnected,
    defaultStreamUrl: DEFAULT_STREAM_URL,
  };
}

export { useClientLogger, type ClientLogEntry, type LogExportOptions, type ConnectStreamOptions, DEFAULT_STREAM_URL as defaultStreamUrl };
export { buildQaHighlightsSummary };
