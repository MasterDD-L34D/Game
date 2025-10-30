import { computed, reactive, readonly } from 'vue';

const MAX_ENTRIES = 500;
const CSV_FIELDS = [
  ['id', (entry) => entry.id || ''],
  ['timestamp', (entry) => entry.timestamp || ''],
  ['scope', (entry) => entry.scope || ''],
  ['level', (entry) => entry.level || ''],
  ['message', (entry) => entry.message || ''],
  ['request_id', (entry) => entry.request_id || entry.requestId || ''],
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
    (entry) =>
      entry.data === undefined || entry.data === null ? '' : JSON.stringify(entry.data, null, 0),
  ],
  ['source', (entry) => entry.source || ''],
];

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

function collectEntries(filter) {
  if (typeof filter === 'function') {
    return state.entries.filter(filter);
  }
  return state.entries.slice();
}

function toCsvValue(value) {
  const text = value == null ? '' : String(value);
  if (!text.length) {
    return '';
  }
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function exportAsCsv(entries, filename) {
  const header = CSV_FIELDS.map(([label]) => label).join(',');
  const rows = entries.map((entry) =>
    CSV_FIELDS.map(([, projector]) => toCsvValue(projector(entry))).join(','),
  );
  const content = [header, ...rows].join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename || 'qa-flow-logs.csv');
}

function exportAsJson(entries, filename) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, filename || 'qa-flow-logs.json');
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

export function exportLogs({ filename, filter, format = 'json' } = {}) {
  const entries = collectEntries(filter);
  const resolvedFormat = String(format || 'json').toLowerCase();
  if (resolvedFormat === 'csv') {
    exportAsCsv(entries, filename);
    return;
  }
  exportAsJson(entries, filename);
}

export function exportLogsAsJson(options = {}) {
  exportLogs({ ...options, format: 'json' });
}

export function exportLogsAsCsv(options = {}) {
  exportLogs({ ...options, format: 'csv' });
}

export function useClientLogger() {
  return {
    entries: readonly(state.entries),
    total: computed(() => state.entries.length),
    list: (filter) => collectEntries(filter),
    exportLogs,
    exportLogsAsJson,
    exportLogsAsCsv,
    logEvent,
    clear: clearLogs,
  };
}
