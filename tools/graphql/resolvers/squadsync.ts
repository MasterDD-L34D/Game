import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  SquadSyncAggregate,
  SquadSyncRange,
  SquadSyncRangeInput,
  SquadSyncReport,
  SquadSyncSquad,
  SquadSyncSquadSummary,
} from '../schema.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(moduleDir, '../../..');
export const DEFAULT_REPORT_PATH = resolve(PROJECT_ROOT, 'data/analysis/squadsync_report.json');

export interface SquadSyncResolverOptions {
  reportPath?: string;
  readReport?: (path: string) => Promise<SquadSyncReport>;
}

async function defaultReadReport(path: string): Promise<SquadSyncReport> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as SquadSyncReport;
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
