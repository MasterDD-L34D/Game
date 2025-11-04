import { normaliseTagId } from './normalizers.ts';

/**
 * @typedef {import('./types.ts').ActivityLogEntryInput} ActivityLogEntryInput
 * @typedef {import('./types.ts').ActivityLogTag} ActivityLogTag
 * @typedef {import('./types.ts').SerialisedActivityLogEntry} SerialisedActivityLogEntry
 */

/**
 * @param {ActivityLogEntryInput['timestamp']} value
 * @returns {string}
 */
function toIsoTimestamp(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === null || value === undefined || value === '') {
    return new Date().toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

/**
 * @param {ActivityLogEntryInput} entry
 * @returns {SerialisedActivityLogEntry | null}
 */
export function serialiseActivityLogEntry(entry) {
  if (!entry) return null;
  const tags = Array.isArray(entry.tags)
    ? entry.tags
        .map((tag) => {
          if (!tag) return null;
          if (typeof tag === 'object') {
            const tagObject = /** @type {Record<string, unknown>} */ tag;
            const idValue =
              (typeof tagObject.id === 'string' ? tagObject.id : null) ??
              (typeof tagObject.value === 'string' ? tagObject.value : null) ??
              null;
            const labelValue =
              (typeof tagObject.label === 'string' ? tagObject.label : null) ??
              (typeof tagObject.name === 'string' ? tagObject.name : null) ??
              (typeof tagObject.value === 'string' ? tagObject.value : null) ??
              (typeof tagObject.id === 'string' ? tagObject.id : null) ??
              null;
            if (!idValue && !labelValue) return null;
            return {
              id: idValue ?? (labelValue ? normaliseTagId(labelValue) || null : null),
              label: labelValue ?? (idValue ? String(idValue) : ''),
            };
          }
          const label = String(tag ?? '').trim();
          if (!label) return null;
          return { id: normaliseTagId(label) || null, label };
        })
        .filter((tag) => Boolean(tag))
    : [];

  return {
    id: entry.id ?? null,
    message: entry.message ?? '',
    tone: entry.tone ?? 'info',
    timestamp: toIsoTimestamp(entry.timestamp ?? null),
    tags: /** @type {ActivityLogTag[]} */ tags,
    action: entry.action ?? null,
    pinned: Boolean(entry.pinned),
    metadata: entry.metadata ?? null,
  };
}

/**
 * @param {SerialisedActivityLogEntry[]} entries
 * @returns {string}
 */
export function activityLogToCsv(entries) {
  const columns = ['id', 'timestamp', 'tone', 'message', 'tags', 'action', 'pinned', 'metadata'];

  /**
   * @param {unknown} value
   * @returns {string}
   */
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const header = columns.join(',');
  if (!entries.length) {
    return `${header}\n`;
  }

  const rows = entries.map((entry) => {
    const tags = Array.isArray(entry.tags)
      ? entry.tags
          .map((tag) => {
            if (!tag) return null;
            const label = tag.label ?? tag.id ?? '';
            return label ? String(label) : null;
          })
          .filter((value) => Boolean(value))
          .join('|')
      : '';
    const metadata =
      entry.metadata === null || entry.metadata === undefined
        ? ''
        : typeof entry.metadata === 'string'
          ? entry.metadata
          : JSON.stringify(entry.metadata);
    const record = {
      id: entry.id ?? '',
      timestamp: entry.timestamp ?? '',
      tone: entry.tone ?? '',
      message: entry.message ?? '',
      tags,
      action: entry.action ?? '',
      pinned: entry.pinned ? 'true' : 'false',
      metadata,
    };
    return columns.map((column) => escape(record[column])).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * @param {unknown} value
 * @param {number} [indent=0]
 * @returns {string}
 */
export function toYAML(value, indent = 0) {
  const space = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value
      .map((item) => `${space}- ${toYAML(item, indent + 1).replace(/^\s*/, '')}`)
      .join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(/** @type {Record<string, unknown>} */ value);
    if (!entries.length) return '{}';
    return entries
      .map(([key, val]) => {
        const formatted = toYAML(val, indent + 1);
        const needsBlock = typeof val === 'object' && val !== null;
        return `${space}${key}: ${needsBlock ? `\n${formatted}` : formatted}`;
      })
      .join('\n');
  }
  if (typeof value === 'string') {
    if (/[:#\-\[\]\{\}\n]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  return String(value);
}
