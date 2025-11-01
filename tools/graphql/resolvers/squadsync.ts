import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  SquadSyncAdaptivePayload,
  SquadSyncAdaptivePriority,
  SquadSyncAdaptiveResponse,
  SquadSyncAdaptiveSummary,
  SquadSyncAggregate,
  SquadSyncRange,
  SquadSyncRangeInput,
  SquadSyncReport,
  SquadSyncSquad,
  SquadSyncSquadSummary,
} from '../schema.js';
import { createAdaptiveEngine } from '../../../services/squadsync/adaptiveEngine.js';
import type { AdaptivePriority, AdaptiveResponseInput } from '../../../services/squadsync/adaptiveEngine.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(moduleDir, '../../..');
export const DEFAULT_REPORT_PATH = resolve(PROJECT_ROOT, 'data/derived/analysis/squadsync_report.json');

function createEmptyAdaptive(): SquadSyncAdaptivePayload {
  return {
    responses: [],
    summary: {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
      variants: [],
      squads: [],
    },
  };
}

export interface SquadSyncResolverOptions {
  reportPath?: string;
  readReport?: (path: string) => Promise<SquadSyncReport>;
}

async function defaultReadReport(path: string): Promise<SquadSyncReport> {
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<SquadSyncReport>;
  if (!parsed.adaptive) {
    parsed.adaptive = createEmptyAdaptive();
  }
  if (!parsed.squads) {
    parsed.squads = [];
  }
  if (!parsed.totals) {
    parsed.totals = {
      deployments: 0,
      standups: 0,
      incidents: 0,
      averageActiveMembers: 0,
      averageEngagement: 0,
    };
  }
  return parsed as SquadSyncReport;
}

function normaliseRange(range: SquadSyncRangeInput | undefined, fallback: SquadSyncRange): SquadSyncRange {
  const start = range?.start ?? fallback.start;
  const end = range?.end ?? fallback.end;
  if (typeof start !== 'string' || typeof end !== 'string') {
    throw new Error('Intervallo SquadSync non valido');
  }
  if (start > end) {
    throw new Error('Intervallo SquadSync non valido (start > end)');
  }
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  return {
    start,
    end,
    days: diffDays,
  };
}

interface SquadAccumulator {
  daily: SquadSyncSquad['daily'];
  summary: SquadSyncSquadSummary;
}

function toEnginePriority(priority: string | undefined): AdaptivePriority {
  const token = (priority || '').toLowerCase();
  if (token === 'critical' || token === 'warning' || token === 'info') {
    return token;
  }
  return 'info';
}

function buildAdaptivePayload(
  adaptive: SquadSyncReport['adaptive'] | undefined,
  range: SquadSyncRange,
): SquadSyncAdaptivePayload {
  const engine = createAdaptiveEngine({ ttlMs: 0, maxTotal: 500, maxPerSquad: 50 });
  const responses: AdaptiveResponseInput[] = Array.isArray(adaptive?.responses)
    ? (adaptive?.responses ?? []).map((response) => ({
        id: response.id,
        squad: response.squad,
        priority: toEnginePriority(response.priority),
        metric: response.metric,
        title: response.title,
        message: response.message,
        value: response.value,
        baseline: response.baseline ?? null,
        delta: response.delta ?? null,
        createdAt: response.createdAt,
        expiresAt: response.expiresAt ?? null,
        tags: response.tags ?? [],
        source: response.source ?? 'etl',
        variant: response.variant ?? 'adaptive',
        range: response.range ?? range,
        ttlMs: 0,
      }))
    : [];
  if (responses.length > 0) {
    engine.ingestMany(responses);
  }
  const snapshot = engine.snapshot({ range });
  const payloadResponses: SquadSyncAdaptiveResponse[] = snapshot.responses.map((item) => ({
    id: item.id,
    squad: item.squad,
    priority: item.priority.toUpperCase() as SquadSyncAdaptivePriority,
    metric: item.metric,
    title: item.title,
    message: item.message,
    value: item.value,
    baseline: item.baseline,
    delta: item.delta,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    tags: item.tags,
    source: item.source,
    variant: item.variant,
    range: item.range ?? null,
  }));
  const variants = Object.entries(snapshot.summary.variant)
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  const summary: SquadSyncAdaptiveSummary = {
    total: snapshot.summary.total,
    critical: snapshot.summary.critical,
    warning: snapshot.summary.warning,
    info: snapshot.summary.info,
    variants,
    squads: snapshot.summary.squads,
  };
  const payload: SquadSyncAdaptivePayload = {
    responses: payloadResponses,
    summary,
  };
  return payload;
}

function summariseSquad(squad: SquadSyncSquad, start: string, end: string): SquadAccumulator | null {
  const filtered = squad.daily
    .filter((entry) => entry.date >= start && entry.date <= end)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (filtered.length === 0) {
    return null;
  }

  const daysCovered = filtered.length;
  const totalDeployments = filtered.reduce((acc, item) => acc + item.deployments, 0);
  const totalStandups = filtered.reduce((acc, item) => acc + item.standups, 0);
  const totalIncidents = filtered.reduce((acc, item) => acc + item.incidents, 0);
  const totalActive = filtered.reduce((acc, item) => acc + item.activeMembers, 0);
  const totalEngagement = filtered.reduce((acc, item) => acc + item.engagement, 0);

  const summary: SquadSyncSquadSummary = {
    daysCovered,
    averageActiveMembers: Number((totalActive / daysCovered).toFixed(2)),
    totalDeployments,
    totalStandups,
    totalIncidents,
    engagementScore: Number((totalEngagement / daysCovered).toFixed(3)),
  };

  return {
    daily: filtered,
    summary,
  };
}

export function filterReportByRange(report: SquadSyncReport, range?: SquadSyncRangeInput): SquadSyncReport {
  const normalisedRange = normaliseRange(range, report.range);
  const { start, end } = normalisedRange;

  const squads = report.squads
    .map((squad) => {
      const aggregated = summariseSquad(squad, start, end);
      if (!aggregated) {
        return null;
      }
      return {
        name: squad.name,
        summary: aggregated.summary,
        daily: aggregated.daily,
      } satisfies SquadSyncSquad;
    })
    .filter((value): value is SquadSyncSquad => value !== null);

  if (squads.length === 0) {
    throw new Error('Nessuna squadra disponibile nel range richiesto');
  }

  type TotalsAccumulator = SquadSyncAggregate & { days: number };
  const totals = squads.reduce<TotalsAccumulator>(
    (acc, squad) => {
      acc.deployments += squad.summary.totalDeployments;
      acc.standups += squad.summary.totalStandups;
      acc.incidents += squad.summary.totalIncidents;
      acc.averageActiveMembers += squad.summary.averageActiveMembers * squad.summary.daysCovered;
      acc.averageEngagement += squad.summary.engagementScore * squad.summary.daysCovered;
      acc.days += squad.summary.daysCovered;
      return acc;
    },
    {
      deployments: 0,
      standups: 0,
      incidents: 0,
      averageActiveMembers: 0,
      averageEngagement: 0,
      days: 0,
    },
  );

  const days = totals.days;
  const averageActiveMembers = days > 0 ? Number((totals.averageActiveMembers / days).toFixed(2)) : 0;
  const averageEngagement = days > 0 ? Number((totals.averageEngagement / days).toFixed(3)) : 0;

  const filteredReport: SquadSyncReport = {
    range: normalisedRange,
    generatedAt: report.generatedAt,
    squads,
    totals: {
      deployments: totals.deployments,
      standups: totals.standups,
      incidents: totals.incidents,
      averageActiveMembers,
      averageEngagement,
    },
    adaptive: buildAdaptivePayload(report.adaptive, normalisedRange),
  };

  return filteredReport;
}

export function createSquadSyncResolver(options?: SquadSyncResolverOptions) {
  const reportPath = options?.reportPath ?? DEFAULT_REPORT_PATH;
  const reader = options?.readReport ?? defaultReadReport;

  return async function squadSyncAnalyticsResolver(
    _parent: unknown,
    args: { range?: SquadSyncRangeInput } = {},
  ): Promise<SquadSyncReport> {
    const report = await reader(reportPath);
    return filterReportByRange(report, args.range);
  };
}

interface RestLikeRequest {
  query?: Record<string, string | string[]>;
}

interface RestLikeResponse {
  status?: (code: number) => RestLikeResponse;
  json: (payload: unknown) => void;
}

function parseRangeFromQuery(query: Record<string, string | string[]> | undefined): SquadSyncRangeInput | undefined {
  if (!query) {
    return undefined;
  }
  const startRaw = query.start;
  const endRaw = query.end;
  const range: SquadSyncRangeInput = {};
  if (typeof startRaw === 'string' && startRaw.trim()) {
    range.start = startRaw.trim();
  }
  if (typeof endRaw === 'string' && endRaw.trim()) {
    range.end = endRaw.trim();
  }
  return Object.keys(range).length > 0 ? range : undefined;
}

export function createSquadSyncAdaptiveRestHandler(options?: SquadSyncResolverOptions) {
  const resolver = createSquadSyncResolver(options);
  return async function squadSyncAdaptiveHandler(req: RestLikeRequest, res: RestLikeResponse) {
    try {
      const range = parseRangeFromQuery(req.query);
      const report = await resolver(undefined, { range });
      res.json({
        range: report.range,
        generatedAt: report.generatedAt,
        adaptive: report.adaptive,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      const status =
        error instanceof Error && /Intervallo SquadSync/i.test(error.message) ? 400 : 500;
      const statusWriter = typeof res.status === 'function' ? res.status(status) : res;
      statusWriter.json({ error: message });
    }
  };
}
