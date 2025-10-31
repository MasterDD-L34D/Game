import { computed, reactive } from 'vue';
import { logEvent as logClientEvent } from '../services/clientLogger.js';

let logSequence = 0;

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

  return { log, logs };
}

export const __internals__ = { normaliseScope, normaliseLevel };
