import { normaliseTagId } from './normalizers.ts';
import type { ActivityLogEntryInput, ActivityLogTag, SerialisedActivityLogEntry } from './types.ts';

function toIsoTimestamp(value: ActivityLogEntryInput['timestamp']): string {
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

export function serialiseActivityLogEntry(
  entry: ActivityLogEntryInput,
): SerialisedActivityLogEntry | null {
  if (!entry) return null;
  const tags: ActivityLogTag[] = Array.isArray(entry.tags)
    ? entry.tags
        .map((tag) => {
          if (!tag) return null;
          if (typeof tag === 'object') {
            const id =
              (tag as { id?: string | null; value?: string | null }).id ??
              (tag as { value?: string | null }).value ??
              null;
            const label =
              (tag as { label?: string | null }).label ??
              (tag as { name?: string | null }).name ??
              (tag as { value?: string | null }).value ??
              (tag as { id?: string | null }).id ??
              null;
            if (!id && !label) return null;
            return {
              id: id ?? (label ? normaliseTagId(label) || null : null),
              label: label ?? (id ? String(id) : ''),
            } as ActivityLogTag;
          }
          const label = String(tag ?? '').trim();
          if (!label) return null;
          return { id: normaliseTagId(label) || null, label } as ActivityLogTag;
        })
        .filter((tag): tag is ActivityLogTag => Boolean(tag))
    : [];

  return {
    id: entry.id ?? null,
    message: entry.message ?? '',
    tone: entry.tone ?? 'info',
    timestamp: toIsoTimestamp(entry.timestamp ?? null),
    tags,
    action: entry.action ?? null,
    pinned: Boolean(entry.pinned),
    metadata: entry.metadata ?? null,
  };
}

export function activityLogToCsv(entries: SerialisedActivityLogEntry[]): string {
  const columns: (keyof SerialisedActivityLogEntry)[] = [
    'id',
    'timestamp',
    'tone',
    'message',
    'tags',
    'action',
    'pinned',
    'metadata',
  ];

  const escape = (value: unknown): string => {
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
          .filter((value): value is string => Boolean(value))
          .join('|')
      : '';
    const metadata =
      entry.metadata === null || entry.metadata === undefined
        ? ''
        : typeof entry.metadata === 'string'
          ? entry.metadata
          : JSON.stringify(entry.metadata);
    const record: Record<string, unknown> = {
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

export function toYAML(value: unknown, indent = 0): string {
  const space = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value
      .map((item) => `${space}- ${toYAML(item, indent + 1).replace(/^\s*/, '')}`)
      .join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
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
