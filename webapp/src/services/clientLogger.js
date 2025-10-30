import { computed, reactive, readonly } from 'vue';

const MAX_ENTRIES = 500;
let sequence = 0;

const state = reactive({
  entries: [],
});

function serialise(value) {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

export function logEvent(event, payload = {}) {
  const level = payload.level || 'info';
  const scope = payload.scope || 'app';
  const entry = {
    id: payload.id || `${event}-${Date.now()}-${sequence++}`,
    event,
    scope,
    level,
    message: payload.message || '',
    timestamp: payload.timestamp || new Date().toISOString(),
    request_id: payload.request_id || payload.requestId || null,
    meta: serialise(payload.meta),
    validation: serialise(payload.validation),
    data: serialise(payload.data),
    source: payload.source || 'ui',
  };
  state.entries.unshift(entry);
  if (state.entries.length > MAX_ENTRIES) {
    state.entries.length = MAX_ENTRIES;
  }
  return entry;
}

export function clearLogs() {
  state.entries.splice(0, state.entries.length);
}

function downloadBlob(blob, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
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

export function exportLogs({ filename = 'qa-flow-logs.json', filter } = {}) {
  const dataset = typeof filter === 'function' ? state.entries.filter(filter) : state.entries;
  const blob = new Blob([JSON.stringify(dataset, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, filename);
}

export function useClientLogger() {
  return {
    entries: readonly(state.entries),
    total: computed(() => state.entries.length),
    exportLogs,
    logEvent,
    clear: clearLogs,
  };
}
