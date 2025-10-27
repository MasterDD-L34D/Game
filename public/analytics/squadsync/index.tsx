import React, { useEffect, useMemo, useState } from 'react';

import type { SquadSyncReport } from '../../../tools/graphql/schema.js';
import EngagementSparkline from '../components/EngagementSparkline';
import SquadSummaryGrid from '../components/SquadSummaryGrid';
import RangePicker, { type RangeValue } from '../components/RangePicker';

const SQUADSYNC_QUERY = `
  query SquadSync($range: SquadSyncRangeInput) {
    squadSyncAnalytics(range: $range) {
      range {
        start
        end
        days
      }
      generatedAt
      totals {
        deployments
        standups
        incidents
        averageActiveMembers
        averageEngagement
      }
      squads {
        name
        summary {
          daysCovered
          averageActiveMembers
          totalDeployments
          totalStandups
          totalIncidents
          engagementScore
        }
        daily {
          date
          activeMembers
          standups
          deployments
          incidents
          engagement
        }
      }
    }
  }
`;

const FALLBACK_REPORT: SquadSyncReport = {
  range: { start: '2023-10-24', end: '2023-11-05', days: 13 },
  generatedAt: '2023-11-06T07:00:00Z',
  totals: {
    deployments: 10,
    standups: 11,
    incidents: 6,
    averageActiveMembers: 7,
    averageEngagement: 0.614,
  },
  squads: [
    {
      name: 'Atlas',
      summary: {
        daysCovered: 4,
        averageActiveMembers: 8,
        totalDeployments: 6,
        totalStandups: 7,
        totalIncidents: 2,
        engagementScore: 0.744,
      },
      daily: [
        { date: '2023-10-24', activeMembers: 8, standups: 2, deployments: 1, incidents: 0, engagement: 0.744 },
        { date: '2023-10-25', activeMembers: 7, standups: 1, deployments: 0, incidents: 1, engagement: 0.439 },
        { date: '2023-10-31', activeMembers: 9, standups: 2, deployments: 2, incidents: 0, engagement: 0.9 },
        { date: '2023-11-05', activeMembers: 8, standups: 2, deployments: 3, incidents: 1, engagement: 0.894 },
      ],
    },
    {
      name: 'Helios',
      summary: {
        daysCovered: 4,
        averageActiveMembers: 6,
        totalDeployments: 4,
        totalStandups: 4,
        totalIncidents: 4,
        engagementScore: 0.483,
      },
      daily: [
        { date: '2023-10-24', activeMembers: 6, standups: 1, deployments: 0, incidents: 2, engagement: 0.333 },
        { date: '2023-10-27', activeMembers: 7, standups: 1, deployments: 1, incidents: 1, engagement: 0.539 },
        { date: '2023-10-30', activeMembers: 5, standups: 1, deployments: 1, incidents: 0, engagement: 0.478 },
        { date: '2023-11-05', activeMembers: 6, standups: 1, deployments: 2, incidents: 1, engagement: 0.583 },
      ],
    },
  ],
};

function useFeatureFlag(flag: string, fallback = false): boolean {
  if (typeof globalThis === 'undefined') {
    return fallback;
  }
  const globalFlags = (globalThis as { __FEATURE_FLAGS__?: unknown }).__FEATURE_FLAGS__;
  if (Array.isArray(globalFlags)) {
    return globalFlags.includes(flag) ? true : fallback;
  }
  if (globalFlags && typeof globalFlags === 'object') {
    const value = (globalFlags as Record<string, unknown>)[flag];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return fallback;
}

async function requestReport(range: RangeValue): Promise<SquadSyncReport> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQUADSYNC_QUERY, variables: { range } }),
  });

  if (!response.ok) {
    throw new Error(`Richiesta GraphQL fallita (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { squadSyncAnalytics: SquadSyncReport };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message ?? 'Errore GraphQL sconosciuto');
  }

  if (!payload.data?.squadSyncAnalytics) {
    throw new Error('Risposta GraphQL priva del campo squadSyncAnalytics');
  }

  return payload.data.squadSyncAnalytics;
}

function computeEngagementTrend(report: SquadSyncReport) {
  const accumulator = new Map<string, { total: number; count: number }>();
  report.squads.forEach((squad) => {
    squad.daily.forEach((entry) => {
      const existing = accumulator.get(entry.date) ?? { total: 0, count: 0 };
      existing.total += entry.engagement;
      existing.count += 1;
      accumulator.set(entry.date, existing);
    });
  });
  return Array.from(accumulator.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, { total, count }]) => ({
      label: date.slice(5),
      value: Number((total / count).toFixed(3)),
    }));
}

const DEFAULT_RANGE: RangeValue = { start: FALLBACK_REPORT.range.start, end: FALLBACK_REPORT.range.end };

const SquadSyncPage: React.FC = () => {
  const featureEnabled = useFeatureFlag('analytics.squadsync_view', false);
  const [range, setRange] = useState<RangeValue>(DEFAULT_RANGE);
  const [report, setReport] = useState<SquadSyncReport>(FALLBACK_REPORT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!featureEnabled) {
      setReport(FALLBACK_REPORT);
      return;
    }

    let cancelled = false;
    setLoading(true);
    requestReport(range)
      .then((result) => {
        if (!cancelled) {
          setReport(result);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.warn('[SquadSync] Fallback su dataset mock', err);
          setReport(FALLBACK_REPORT);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [featureEnabled, range.start, range.end]);

  const trendPoints = useMemo(() => computeEngagementTrend(report), [report]);
  const highlightIndex = Math.max(0, trendPoints.length - 1);

  return (
    <main className="squadsync" data-feature-enabled={featureEnabled}>
      <style>{`
        .squadsync { font-family: 'Segoe UI', Roboto, sans-serif; padding: 2rem; color: #1f2937; }
        .squadsync h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .squadsync__banner { background: #eef2ff; border: 1px solid #c7d2fe; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }
        .squadsync__range { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
        .squadsync__range label { display: flex; flex-direction: column; font-size: 0.875rem; color: #4b5563; }
        .squadsync__range input { margin-top: 0.25rem; padding: 0.4rem 0.6rem; border: 1px solid #cbd5f5; border-radius: 0.375rem; }
        .squadsync__grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .squadsync__card { background: #ffffff; border-radius: 0.75rem; border: 1px solid #e5e7eb; padding: 1rem; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
        .squadsync__card-subtitle { margin: 0.25rem 0 1rem; color: #6b7280; font-size: 0.875rem; }
        .squadsync__metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; font-size: 0.875rem; }
        .squadsync__metrics dt { font-weight: 600; color: #4b5563; }
        .squadsync__metrics dd { margin: 0; color: #111827; }
        .squadsync__placeholder { color: #6b7280; font-style: italic; }
        .squadsync__sparkline { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; margin-bottom: 1.5rem; }
        .squadsync__sparkline svg { width: 100%; }
        .squadsync__sparkline-range { display: block; color: #6b7280; font-size: 0.75rem; }
        .squadsync__totals { margin-bottom: 1.5rem; display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .squadsync__totals-item { display: flex; flex-direction: column; }
        .squadsync__totals-item span { font-size: 0.75rem; color: #6b7280; }
        .squadsync__totals-item strong { font-size: 1.25rem; color: #111827; }
      `}</style>
      <header>
        <h1>SquadSync — Engagement & Deployments</h1>
        <p>Monitor canary del coordinamento squadre (dataset 24/10 → 05/11).</p>
      </header>
      {!featureEnabled && (
        <div className="squadsync__banner">
          <strong>Feature flag disabilitata.</strong> Visualizzazione in sola lettura basata su dataset mock.
        </div>
      )}
      {error && featureEnabled && <div className="squadsync__banner">Errore API: {error}</div>}
      <RangePicker value={range} min="2023-10-01" max="2023-12-31" onChange={setRange} />
      <EngagementSparkline title="Engagement medio giornaliero" points={trendPoints} highlightIndex={highlightIndex} />
      <section className="squadsync__totals" aria-label="Totali periodo">
        <div className="squadsync__totals-item">
          <span>Deployments</span>
          <strong>{report.totals.deployments}</strong>
        </div>
        <div className="squadsync__totals-item">
          <span>Stand-up</span>
          <strong>{report.totals.standups}</strong>
        </div>
        <div className="squadsync__totals-item">
          <span>Incidenti</span>
          <strong>{report.totals.incidents}</strong>
        </div>
        <div className="squadsync__totals-item">
          <span>Engagement medio</span>
          <strong>{report.totals.averageEngagement.toFixed(3)}</strong>
        </div>
        <div className="squadsync__totals-item">
          <span>Active members medi</span>
          <strong>{report.totals.averageActiveMembers.toFixed(1)}</strong>
        </div>
      </section>
      {loading && featureEnabled && <p className="squadsync__placeholder">Aggiornamento in corso…</p>}
      <SquadSummaryGrid squads={report.squads} />
    </main>
  );
};

export default SquadSyncPage;
