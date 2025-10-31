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

function cloneEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }
  return {
    ...entry,
    meta: serialise(entry.meta),
    validation: serialise(entry.validation),
    data: serialise(entry.data),
  };
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

function createCsvContent(entries) {
  const header = CSV_FIELDS.map(([label]) => label).join(',');
  const rows = entries.map((entry) =>
    CSV_FIELDS.map(([, projector]) => toCsvValue(projector(entry))).join(','),
  );
  return [header, ...rows].join('\r\n');
}

function createBlob(content, type) {
  if (typeof Blob === 'function') {
    return new Blob([content], { type });
  }
  return null;
}

function createJsonContent(entries) {
  return JSON.stringify(entries, null, 2);
}

function buildExport(entries, { filename, format }) {
  const resolvedFormat = String(format || 'json').toLowerCase() === 'csv' ? 'csv' : 'json';
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

export function getLogsSnapshot({ filter } = {}) {
  const entries = collectEntries(filter);
  return entries.map((entry) => cloneEntry(entry));
}

export function createLogExport({ filename, filter, format = 'json' } = {}) {
  const entries = collectEntries(filter);
  return buildExport(entries, { filename, format });
}

export function exportLogs(options = {}) {
  const exportResult = createLogExport(options);
  downloadBlob(exportResult.blob, exportResult.filename);
  return exportResult;
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
    snapshot: (options) => getLogsSnapshot(options),
    createLogExport,
    exportLogs,
    exportLogsAsJson,
    exportLogsAsCsv,
    logEvent,
    clear: clearLogs,
  };
}
