import { computed, reactive } from 'vue';
import { createLogger } from '../utils/logger.ts';

const MAX_ENTRIES = 200;

function createListenerMap() {
  const map = new Map();

  const on = (event, handler) => {
    if (!event || typeof handler !== 'function') {
      return () => {};
    }
    const key = String(event);
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    const listeners = map.get(key);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
      if (listeners.size === 0) {
        map.delete(key);
      }
    };
  };

  const off = (event, handler) => {
    if (!event) {
      return;
    }
    const listeners = map.get(String(event));
    if (!listeners) {
      return;
    }
    if (typeof handler === 'function') {
      listeners.delete(handler);
    } else {
      listeners.clear();
    }
    if (listeners.size === 0) {
      map.delete(String(event));
    }
  };

  const emit = (event, payload) => {
    if (!event) {
      return;
    }
    const listeners = map.get(String(event));
    if (!listeners || listeners.size === 0) {
      return;
    }
    [...listeners].forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        // Evitiamo che errori nei listener interrompano il logging
      }
    });
  };

  return { on, off, emit };
}

function normaliseEntry(entry) {
  return {
    id: entry.id,
    scope: entry.scope,
    level: entry.level,
    message: entry.message,
    timestamp: entry.timestamp,
    event: entry.event,
    request_id: entry.request_id,
    meta: entry.meta,
    validation: entry.validation,
    source: entry.source,
    ...(entry.data !== undefined ? { data: entry.data } : {}),
    ...(entry.context !== undefined ? { context: entry.context } : {}),
  };
}

export function useFlowLogger() {
  const state = reactive({ entries: [] });
  const events = createListenerMap();

  const loggers = new Map();

  const sink = (entry) => {
    const normalised = normaliseEntry(entry);
    state.entries.unshift(normalised);
    if (state.entries.length > MAX_ENTRIES) {
      state.entries.length = MAX_ENTRIES;
    }
    events.emit(entry.event, normalised);
  };

  const getLogger = (scope) => {
    const resolvedScope = typeof scope === 'string' && scope.trim().length ? scope : 'flow';
    if (!loggers.has(resolvedScope)) {
      loggers.set(resolvedScope, createLogger(resolvedScope, { sink }));
    }
    return loggers.get(resolvedScope);
  };

  const emit = (method, event, details = {}) => {
    const { scope, ...rest } = details || {};
    return getLogger(scope)[method](event, { source: 'flow', ...rest });
  };

  const log = (event, details) => emit('log', event, details);
  const info = (event, details) => emit('info', event, details);
  const warn = (event, details) => emit('warn', event, details);
  const error = (event, details) => emit('error', event, details);

  const logs = computed(() => state.entries.map((entry) => ({ ...entry })));

  const on = (event, handler) => events.on(event, handler);
  const off = (event, handler) => events.off(event, handler);

  return { log, info, warn, error, logs, on, off };
}

export const __internals__ = {
  MAX_ENTRIES,
};
