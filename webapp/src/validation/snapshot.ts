import { z } from 'zod';

import { renderMarkdownToSafeHtml, sanitizeHtml } from '../utils/sanitizer';

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

const checkSchema = z
  .object({
    total: z.unknown().optional(),
    passed: z.unknown().optional(),
  })
  .partial()
  .transform((check) => ({
    total: toNumber(check.total, 0),
    passed: toNumber(check.passed, 0),
  }));

const qualityReleaseSchema = z
  .object({
    checks: z.record(checkSchema).optional(),
    suggestions: z.array(z.record(z.unknown())).optional(),
    releaseNotesMarkdown: z.string().optional(),
    releaseNotesHtml: z.string().optional(),
  })
  .passthrough()
  .transform((value) => {
    const checks = value.checks ?? {};
    const suggestionsSource = Array.isArray(value.suggestions) ? value.suggestions : [];
    const suggestions = suggestionsSource.map((entry, index) => ({
      id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `suggestion-${index + 1}`,
      scope: typeof entry.scope === 'string' && entry.scope.trim() ? entry.scope.trim() : 'general',
      title: typeof entry.title === 'string' ? entry.title : 'Suggerimento',
      description: typeof entry.description === 'string' ? entry.description : '',
      applied: Boolean(entry.applied),
      running: Boolean(entry.running),
      error: typeof entry.error === 'string' && entry.error.trim() ? entry.error.trim() : undefined,
    }));
    const markdown = typeof value.releaseNotesMarkdown === 'string' ? value.releaseNotesMarkdown : '';
    const html = typeof value.releaseNotesHtml === 'string'
      ? sanitizeHtml(value.releaseNotesHtml)
      : markdown
        ? renderMarkdownToSafeHtml(markdown)
        : '';
    return {
      ...value,
      checks,
      suggestions,
      releaseNotesMarkdown: markdown,
      releaseNotesHtml: html,
    };
  });

const notificationSchema = z
  .object({
    id: z.string().optional(),
    channel: z.string().optional(),
    message: z.string().optional(),
    lastTriggeredAt: z.string().optional().nullable(),
  })
  .partial();

const releaseConsoleSchema = z
  .object({
    notifications: z.array(notificationSchema).optional(),
  })
  .passthrough()
  .transform((consoleState) => {
    const notifications = (consoleState.notifications ?? []).map((entry, index) => ({
      id: entry.id && entry.id.trim() ? entry.id.trim() : `notification-${index + 1}`,
      channel: entry.channel && entry.channel.trim() ? entry.channel.trim() : 'Canale interno',
      message: sanitizeHtml(entry.message || ''),
      lastTriggeredAt:
        typeof entry.lastTriggeredAt === 'string' && entry.lastTriggeredAt.trim()
          ? entry.lastTriggeredAt
          : null,
    }));
    return {
      ...consoleState,
      notifications,
    };
  });

const qualityReleaseContextSchema = z
  .object({
    releaseNotesMarkdown: z.string().optional(),
    releaseNotesHtml: z.string().optional(),
    releaseConsole: releaseConsoleSchema.optional(),
  })
  .passthrough()
  .transform((value) => {
    const markdown = typeof value.releaseNotesMarkdown === 'string' ? value.releaseNotesMarkdown : '';
    const html = typeof value.releaseNotesHtml === 'string'
      ? sanitizeHtml(value.releaseNotesHtml)
      : markdown
        ? renderMarkdownToSafeHtml(markdown)
        : '';
    return {
      ...value,
      releaseNotesMarkdown: markdown,
      releaseNotesHtml: html,
      releaseConsole: value.releaseConsole ?? { notifications: [] },
    };
  });

const snapshotSchema = z
  .object({
    qualityRelease: z
      .unknown()
      .optional()
      .transform((value) => qualityReleaseSchema.parse(value ?? {})),
    qualityReleaseContext: z
      .unknown()
      .optional()
      .transform((value) => qualityReleaseContextSchema.parse(value ?? {})),
  })
  .passthrough();

export type ParsedSnapshot = z.infer<typeof snapshotSchema>;

export function parseFlowSnapshot<T extends Record<string, unknown>>(input: T | null | undefined): ParsedSnapshot {
  const payload = input ?? {};
  return snapshotSchema.parse(payload);
}
