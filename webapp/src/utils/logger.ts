import { logEvent as clientLogEvent } from '../services/clientLogger.js';

export type LoggerLevel = 'info' | 'warn' | 'warning' | 'error' | 'success' | string;

export interface LoggerPayload {
  id?: string;
  level?: LoggerLevel;
  message?: string;
  request_id?: string | null;
  requestId?: string | null;
  meta?: unknown;
  validation?: unknown;
  data?: unknown;
  source?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface LoggerEntry {
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
  context?: Record<string, unknown>;
}

export interface LoggerOptions {
  sink?: (entry: LoggerEntry) => void;
  console?: boolean;
}

let sequence = 0;

function normaliseScope(value: string): string {
  const text = (value || '').trim();
  return text.length ? text : 'app';
}

function resolveConsoleMethod(level: LoggerLevel, fallback: 'info' | 'warn' | 'error'): keyof Console {
  const normalised = String(level || '').toLowerCase();
  if (normalised === 'warn' || normalised === 'warning') {
    return 'warn';
  }
  if (normalised === 'error' || normalised === 'critical') {
    return 'error';
  }
  return fallback;
}

function buildEntry(
  scope: string,
  event: string,
  level: LoggerLevel,
  payload: LoggerPayload = {},
): LoggerEntry {
  const message = typeof payload.message === 'string' ? payload.message : '';
  const requestId =
    (payload.request_id as string | null | undefined) ??
    (payload.requestId as string | null | undefined) ??
    null;
  const timestamp =
    typeof payload.timestamp === 'string' && payload.timestamp.length
      ? payload.timestamp
      : new Date().toISOString();
  const { meta = null, validation = null, data = null, source = 'ui', ...rest } = payload;
  const context = { ...rest } as Record<string, unknown>;
  delete context.id;
  delete context.level;
  delete context.message;
  delete context.request_id;
  delete context.requestId;
  delete context.meta;
  delete context.validation;
  delete context.data;
  delete context.source;
  delete context.timestamp;

  const hasContext = Object.keys(context).length > 0;

  return {
    id:
      typeof payload.id === 'string' && payload.id.length
        ? payload.id
        : `${scope}-${Date.now()}-${sequence++}`,
    event: event || 'app.event',
    scope,
    level: payload.level ?? level,
    message,
    timestamp,
    request_id: requestId,
    meta,
    validation,
    data,
    source: typeof source === 'string' && source.length ? source : 'ui',
    ...(hasContext ? { context } : {}),
  };
}

function emit(
  scope: string,
  defaultLevel: 'info' | 'warn' | 'error',
  event: string,
  payload: LoggerPayload,
  options: LoggerOptions,
): LoggerEntry {
  const entry = buildEntry(scope, event, defaultLevel, payload);
  clientLogEvent(entry.event, {
    id: entry.id,
    scope: entry.scope,
    level: entry.level,
    message: entry.message,
    request_id: entry.request_id,
    meta: entry.meta,
    validation: entry.validation,
    data: entry.data,
    source: entry.source,
    timestamp: entry.timestamp,
  });
  if (options.console !== false && typeof console !== 'undefined') {
    const method = resolveConsoleMethod(entry.level, defaultLevel);
    const args: unknown[] = [`[${entry.scope}] ${entry.event}`];
    if (entry.message) {
      args.push(entry.message);
    }
    const details: Record<string, unknown> = {};
    if (entry.meta !== null && entry.meta !== undefined) {
      details.meta = entry.meta as Record<string, unknown>;
    }
    if (entry.validation !== null && entry.validation !== undefined) {
      details.validation = entry.validation as Record<string, unknown>;
    }
    if (entry.data !== null && entry.data !== undefined) {
      details.data = entry.data as Record<string, unknown>;
    }
    if (entry.context && Object.keys(entry.context).length > 0) {
      details.context = entry.context;
    }
    if (Object.keys(details).length > 0) {
      args.push(details);
    }
    const consoleMethod = (console as Record<string, (...args: unknown[]) => void>)[method] || console.log;
    consoleMethod(...args);
  }
  if (typeof options.sink === 'function') {
    options.sink(entry);
  }
  return entry;
}

export interface Logger {
  scope: string;
  log: (event: string, payload?: LoggerPayload) => LoggerEntry;
  info: (event: string, payload?: LoggerPayload) => LoggerEntry;
  warn: (event: string, payload?: LoggerPayload) => LoggerEntry;
  error: (event: string, payload?: LoggerPayload) => LoggerEntry;
}

export function createLogger(scope: string, options: LoggerOptions = {}): Logger {
  const resolvedScope = normaliseScope(scope);
  return {
    scope: resolvedScope,
    log(event: string, payload: LoggerPayload = {}): LoggerEntry {
      const defaultLevel: 'info' | 'warn' | 'error' = ((): 'info' | 'warn' | 'error' => {
        const level = String(payload.level || '').toLowerCase();
        if (level === 'warn' || level === 'warning') {
          return 'warn';
        }
        if (level === 'error' || level === 'critical') {
          return 'error';
        }
        return 'info';
      })();
      return emit(resolvedScope, defaultLevel, event, payload, options);
    },
    info(event: string, payload: LoggerPayload = {}): LoggerEntry {
      return emit(resolvedScope, 'info', event, payload, options);
    },
    warn(event: string, payload: LoggerPayload = {}): LoggerEntry {
      if (!payload.level) {
        payload.level = 'warning';
      }
      return emit(resolvedScope, 'warn', event, payload, options);
    },
    error(event: string, payload: LoggerPayload = {}): LoggerEntry {
      payload.level = payload.level || 'error';
      return emit(resolvedScope, 'error', event, payload, options);
    },
  };
}
