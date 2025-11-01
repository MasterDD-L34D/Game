import { randomUUID } from 'node:crypto';

export type AdaptivePriority = 'critical' | 'warning' | 'info';

export interface AdaptiveRange {
  start: string;
  end: string;
}

export interface AdaptiveResponseInput {
  id?: string;
  squad: string;
  priority: AdaptivePriority;
  metric: string;
  title: string;
  message: string;
  value: number;
  baseline?: number | null;
  delta?: number | null;
  createdAt?: string | Date;
  expiresAt?: string | Date | null;
  ttlMs?: number;
  tags?: string[];
  source?: string;
  variant?: string;
  range?: AdaptiveRange | null;
}

export interface AdaptiveResponse {
  id: string;
  squad: string;
  priority: AdaptivePriority;
  metric: string;
  title: string;
  message: string;
  value: number;
  baseline: number | null;
  delta: number | null;
  createdAt: string;
  expiresAt: string | null;
  tags: string[];
  source: string;
  variant: string;
  range: AdaptiveRange | null;
}

export interface AdaptiveSquadSummary {
  squad: string;
  total: number;
  critical: number;
  warning: number;
  info: number;
  latestResponseAt: string | null;
}

export interface AdaptiveVariantSummary {
  [variant: string]: number;
}

export interface AdaptiveSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  variant: AdaptiveVariantSummary;
  squads: AdaptiveSquadSummary[];
}

export interface AdaptiveSnapshot {
  responses: AdaptiveResponse[];
  summary: AdaptiveSummary;
}

export interface AdaptiveEngineOptions {
  ttlMs?: number;
  now?: () => Date;
  maxTotal?: number;
  maxPerSquad?: number;
}

const PRIORITY_ORDER: Record<AdaptivePriority, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function normaliseDate(value: string | Date | undefined | null, fallback: () => Date): Date {
  if (!value) {
    return fallback();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return fallback();
    }
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback();
  }
  return parsed;
}

function sortResponses(a: AdaptiveResponse, b: AdaptiveResponse): number {
  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  const aDate = new Date(a.createdAt).getTime();
  const bDate = new Date(b.createdAt).getTime();
  if (aDate !== bDate) {
    return bDate - aDate;
  }
  return a.id.localeCompare(b.id);
}

export class AdaptiveEngine {
  private readonly ttlMs: number;

  private readonly now: () => Date;

  private readonly maxTotal: number;

  private readonly maxPerSquad: number;

  private readonly store: Map<string, AdaptiveResponse>;

  constructor(options: AdaptiveEngineOptions = {}) {
    this.ttlMs = typeof options.ttlMs === 'number' && Number.isFinite(options.ttlMs) ? Math.max(0, options.ttlMs) : 6 * 60 * 60 * 1000;
    this.now = typeof options.now === 'function' ? options.now : () => new Date();
    this.maxTotal = typeof options.maxTotal === 'number' && Number.isFinite(options.maxTotal) ? Math.max(1, Math.floor(options.maxTotal)) : 200;
    this.maxPerSquad = typeof options.maxPerSquad === 'number' && Number.isFinite(options.maxPerSquad) ? Math.max(1, Math.floor(options.maxPerSquad)) : 20;
    this.store = new Map();
  }

  seed(responses: AdaptiveResponseInput[]): void {
    this.store.clear();
    this.ingestMany(responses);
  }

  ingest(input: AdaptiveResponseInput): AdaptiveResponse {
    const createdAt = normaliseDate(input.createdAt, this.now);
    const ttl = typeof input.ttlMs === 'number' && Number.isFinite(input.ttlMs) ? Math.max(0, input.ttlMs) : this.ttlMs;
    const expiresAtDate = input.expiresAt
      ? normaliseDate(input.expiresAt, () => new Date(createdAt.getTime() + ttl))
      : new Date(createdAt.getTime() + ttl);
    const expiresAt = ttl === 0 && !input.expiresAt ? null : expiresAtDate.toISOString();
    const baseline =
      typeof input.baseline === 'number' && Number.isFinite(input.baseline)
        ? Number(input.baseline)
        : input.baseline === null
          ? null
          : null;
    const inferredDelta =
      typeof input.delta === 'number' && Number.isFinite(input.delta)
        ? Number(input.delta)
        : baseline === null
          ? null
          : Number((Number(input.value) - baseline).toFixed(3));
    const response: AdaptiveResponse = {
      id: input.id && input.id.trim() ? input.id : randomUUID(),
      squad: input.squad,
      priority: input.priority,
      metric: input.metric,
      title: input.title,
      message: input.message,
      value: Number.isFinite(input.value) ? Number(input.value) : 0,
      baseline,
      delta: inferredDelta,
      createdAt: createdAt.toISOString(),
      expiresAt,
      tags: Array.isArray(input.tags) ? [...new Set(input.tags.map(String))] : [],
      source: input.source || 'stream',
      variant: input.variant || 'adaptive',
      range: input.range ?? null,
    };
    this.store.set(response.id, response);
    this.purgeExpired();
    this.enforceLimits();
    return response;
  }

  ingestMany(inputs: AdaptiveResponseInput[]): AdaptiveResponse[] {
    return inputs.map((item) => this.ingest(item));
  }

  private enforceLimits(): void {
    if (this.store.size <= this.maxTotal) {
      this.trimPerSquad();
      return;
    }
    const ordered = this.getResponses();
    const allowedIds = new Set(ordered.slice(0, this.maxTotal).map((item) => item.id));
    for (const id of this.store.keys()) {
      if (!allowedIds.has(id)) {
        this.store.delete(id);
      }
    }
    this.trimPerSquad();
  }

  private trimPerSquad(): void {
    const grouped = new Map<string, AdaptiveResponse[]>();
    for (const response of this.store.values()) {
      const list = grouped.get(response.squad) ?? [];
      list.push(response);
      grouped.set(response.squad, list);
    }
    for (const [squad, responses] of grouped) {
      if (responses.length <= this.maxPerSquad) {
        continue;
      }
      const ordered = responses.sort(sortResponses);
      const allowed = new Set(ordered.slice(0, this.maxPerSquad).map((item) => item.id));
      for (const response of responses) {
        if (!allowed.has(response.id)) {
          this.store.delete(response.id);
        }
      }
    }
  }

  purgeExpired(reference?: Date): void {
    const now = reference ?? this.now();
    for (const [id, response] of this.store.entries()) {
      if (!response.expiresAt) {
        continue;
      }
      const expires = new Date(response.expiresAt);
      if (!Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) {
        this.store.delete(id);
      }
    }
  }

  getResponses(options: {
    squad?: string;
    variant?: string;
    range?: AdaptiveRange;
    limit?: number;
  } = {}): AdaptiveResponse[] {
    this.purgeExpired();
    const { squad, variant, range } = options;
    const limit = typeof options.limit === 'number' && Number.isFinite(options.limit) ? Math.max(1, options.limit) : null;
    const filtered = Array.from(this.store.values()).filter((response) => {
      if (squad && response.squad !== squad) {
        return false;
      }
      if (variant && response.variant !== variant) {
        return false;
      }
      if (range && response.range) {
        const overlaps = response.range.start <= range.end && response.range.end >= range.start;
        if (!overlaps) {
          return false;
        }
      }
      return true;
    });
    const ordered = filtered.sort(sortResponses);
    if (limit && ordered.length > limit) {
      return ordered.slice(0, limit);
    }
    return ordered;
  }

  snapshot(options: {
    squad?: string;
    variant?: string;
    range?: AdaptiveRange;
    limit?: number;
  } = {}): AdaptiveSnapshot {
    const responses = this.getResponses(options);
    const summary = this.buildSummary(responses);
    return { responses, summary };
  }

  private buildSummary(responses: AdaptiveResponse[]): AdaptiveSummary {
    const summary: AdaptiveSummary = {
      total: responses.length,
      critical: 0,
      warning: 0,
      info: 0,
      variant: {},
      squads: [],
    };
    const perSquad = new Map<string, AdaptiveResponse[]>();

    for (const response of responses) {
      summary.variant[response.variant] = (summary.variant[response.variant] ?? 0) + 1;
      if (response.priority === 'critical') {
        summary.critical += 1;
      } else if (response.priority === 'warning') {
        summary.warning += 1;
      } else {
        summary.info += 1;
      }
      const bucket = perSquad.get(response.squad) ?? [];
      bucket.push(response);
      perSquad.set(response.squad, bucket);
    }

    const squads: AdaptiveSquadSummary[] = [];
    for (const [squad, bucket] of perSquad.entries()) {
      const ordered = bucket.sort(sortResponses);
      squads.push({
        squad,
        total: bucket.length,
        critical: bucket.filter((item) => item.priority === 'critical').length,
        warning: bucket.filter((item) => item.priority === 'warning').length,
        info: bucket.filter((item) => item.priority === 'info').length,
        latestResponseAt: ordered.length > 0 ? ordered[0].createdAt : null,
      });
    }
    squads.sort((a, b) => {
      if (a.total !== b.total) {
        return b.total - a.total;
      }
      if (a.latestResponseAt && b.latestResponseAt) {
        return new Date(b.latestResponseAt).getTime() - new Date(a.latestResponseAt).getTime();
      }
      if (a.latestResponseAt) return -1;
      if (b.latestResponseAt) return 1;
      return a.squad.localeCompare(b.squad);
    });
    summary.squads = squads;
    return summary;
  }

  clear(): void {
    this.store.clear();
  }
}

export function createAdaptiveEngine(options?: AdaptiveEngineOptions): AdaptiveEngine {
  return new AdaptiveEngine(options);
}
