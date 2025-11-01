import { computed, reactive } from 'vue';
import { createLogger } from '../utils/logger.ts';

const MAX_ENTRIES = 200;

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
  };
}

export function useFlowLogger() {
  const state = reactive({ entries: [] });

  const baseLogger = createLogger('flow', {
    sink(entry) {
      state.entries.unshift(normaliseEntry(entry));
      if (state.entries.length > MAX_ENTRIES) {
        state.entries.length = MAX_ENTRIES;
      }
    },
  });

  const log = (event, details = {}) => baseLogger.log(event, details);

  const logs = computed(() => state.entries.map((entry) => ({ ...entry })));

  return { log, logs };
}

export const __internals__ = {
  MAX_ENTRIES,
};
