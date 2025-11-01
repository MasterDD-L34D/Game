import { computed, reactive } from 'vue';
import { logEvent as logClientEvent } from '../services/clientLogger.js';

let logSequence = 0;

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
        // Ignoriamo errori dei listener per non interrompere il logging
      }
    });
  };

  return { on, off, emit };
}

function normaliseScope(value) {
  if (value === null || value === undefined) {
    return 'flow';
  }
  return String(value || '').trim() || 'flow';
}

function normaliseLevel(value) {
  if (!value) {
    return 'info';
  }
  const text = String(value).toLowerCase();
  if (['info', 'warning', 'error', 'success'].includes(text)) {
    return text;
  }
  return 'info';
}

export function useFlowLogger() {
  const state = reactive({ entries: [] });
  const events = createListenerMap();

  const log = (event, details = {}) => {
    const entry = {
      id: `flow-${Date.now()}-${logSequence++}`,
      event: event || 'flow.event',
      scope: normaliseScope(details.scope),
      level: normaliseLevel(details.level),
      message: details.message || '',
      request_id: details.request_id || details.requestId || null,
      meta: details.meta || null,
      validation: details.validation || null,
      timestamp: new Date().toISOString(),
      source: details.source || 'flow',
    };
    state.entries.unshift(entry);
    if (state.entries.length > 200) {
      state.entries.length = 200;
    }
    logClientEvent(entry.event, {
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
    events.emit(entry.event, entry);
    return entry;
  };

  const logs = computed(() =>
    state.entries.map((entry) => ({
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
    })),
  );

  const on = (event, handler) => events.on(event, handler);
  const off = (event, handler) => events.off(event, handler);

  return { log, logs, on, off };
}

export const __internals__ = { normaliseScope, normaliseLevel };
