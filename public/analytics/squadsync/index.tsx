import React, { useEffect, useMemo, useState } from 'react';

import type { SquadSyncAdaptivePayload, SquadSyncReport } from '../../../tools/graphql/schema.js';
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
      adaptive {
        summary {
          total
          critical
          warning
          info
          variants {
            key
            total
          }
          squads {
            squad
            total
            critical
            warning
            info
            latestResponseAt
          }
        }
        responses {
          id
          squad
          priority
          metric
          title
          message
          value
          baseline
          delta
          createdAt
          expiresAt
          tags
          source
          variant
          range {
            start
            end
          }
        }
      }
    }
  }
`;

const FALLBACK_REPORT: SquadSyncReport = {
  range: { start: '2025-11-01', end: '2025-11-05', days: 5 },
  generatedAt: '2025-11-07T09:15:00Z',
  totals: {
    deployments: 32,
    standups: 59,
    incidents: 16,
    averageActiveMembers: 6,
    averageEngagement: 0.645,
  },
  squads: [
    {
      name: 'Bravo',
      summary: {
        daysCovered: 1,
        averageActiveMembers: 8,
        totalDeployments: 5,
        totalStandups: 10,
        totalIncidents: 2,
        engagementScore: 0.728,
      },
      daily: [
        { date: '2025-11-01', activeMembers: 8, standups: 10, deployments: 5, incidents: 2, engagement: 0.728 },
      ],
    },
    {
      name: 'Delta',
      summary: {
        daysCovered: 2,
        averageActiveMembers: 5.5,
        totalDeployments: 13,
        totalStandups: 22,
        totalIncidents: 6,
        engagementScore: 0.611,
      },
      daily: [
        { date: '2025-11-01', activeMembers: 8, standups: 9, deployments: 4, incidents: 2, engagement: 0.687 },
        { date: '2025-11-05', activeMembers: 3, standups: 13, deployments: 9, incidents: 4, engagement: 0.535 },
      ],
    },
    {
      name: 'Echo',
      summary: {
        daysCovered: 2,
        averageActiveMembers: 5.5,
        totalDeployments: 14,
        totalStandups: 27,
        totalIncidents: 8,
        engagementScore: 0.637,
      },
      daily: [
        { date: '2025-11-01', activeMembers: 8, standups: 9, deployments: 4, incidents: 2, engagement: 0.687 },
        { date: '2025-11-05', activeMembers: 3, standups: 18, deployments: 10, incidents: 6, engagement: 0.588 },
      ],
    },
  ],
  adaptive: {
    summary: {
      total: 3,
      critical: 1,
      warning: 1,
      info: 1,
      variants: [
        { key: 'adaptive', total: 2 },
        { key: 'control', total: 1 },
      ],
      squads: [
        { squad: 'Delta', total: 2, critical: 1, warning: 0, info: 1, latestResponseAt: '2025-11-05T09:30:00Z' },
        { squad: 'Bravo', total: 1, critical: 0, warning: 1, info: 0, latestResponseAt: '2025-11-01T10:00:00Z' },
      ],
    },
    responses: [
      {
        id: 'bravo-engagement',
        squad: 'Bravo',
        priority: 'WARNING',
        metric: 'engagement',
        title: 'Potenziamento engagement squadra Bravo',
        message: 'Coordina mentoring tra veterani e nuove reclute; calibra i briefing giornalieri sulle esigenze della squadra.',
        value: 0.589,
        baseline: 0.645,
        delta: -0.056,
        createdAt: '2025-11-05T08:00:00Z',
        expiresAt: '2025-11-06T20:00:00Z',
        tags: ['engagement', 'warning', 'adaptive'],
        source: 'etl',
        variant: 'adaptive',
        range: { start: '2025-11-01', end: '2025-11-05' },
      },
      {
        id: 'delta-incidents',
        squad: 'Delta',
        priority: 'CRITICAL',
        metric: 'incidents',
        title: 'Riduci incidenti operativi per Delta',
        message: 'Assegna un supporto tattico dedicato e rivedi i protocolli di escalation; programma un dry-run con focus su crowd-control.',
        value: 8,
        baseline: 4.5,
        delta: 3.5,
        createdAt: '2025-11-05T09:30:00Z',
        expiresAt: '2025-11-06T21:00:00Z',
        tags: ['incidents', 'critical', 'adaptive'],
        source: 'etl',
        variant: 'adaptive',
        range: { start: '2025-11-01', end: '2025-11-05' },
      },
      {
        id: 'delta-deployments',
        squad: 'Delta',
        priority: 'INFO',
        metric: 'deployments',
        title: 'Celebra l\'efficienza operativa di Delta',
        message: 'Mantieni il ritmo attuale con retrospettive brevi post-deployment; condividi le best practice nel canale cross-squad.',
        value: 14,
        baseline: 10,
        delta: 4,
        createdAt: '2025-11-05T09:30:00Z',
        expiresAt: '2025-11-06T21:00:00Z',
        tags: ['deployments', 'info', 'adaptive'],
        source: 'etl',
        variant: 'control',
        range: { start: '2025-11-01', end: '2025-11-05' },
      },
    ],
  },
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

const AdaptiveResponsesPanel: React.FC<{ payload: SquadSyncAdaptivePayload }> = ({ payload }) => {
  const { summary, responses } = payload;
  if (summary.total === 0) {
    return <p className="squadsync__placeholder">Nessuna risposta adattiva disponibile.</p>;
  }

  const variantBadges = summary.variants.length > 0 ? summary.variants : [{ key: 'adaptive', total: summary.total }];
  const maxTotal = summary.squads.reduce((acc, squad) => Math.max(acc, squad.total), 0) || summary.total;

  return (
    <>
      <div className="squadsync__adaptive-summary" aria-label="Riepilogo priorità">
        <span className="squadsync__adaptive-chip" data-priority="CRITICAL">
          Criticità <strong>{summary.critical}</strong>
        </span>
        <span className="squadsync__adaptive-chip" data-priority="WARNING">
          Attenzioni <strong>{summary.warning}</strong>
        </span>
        <span className="squadsync__adaptive-chip" data-priority="INFO">
          Informative <strong>{summary.info}</strong>
        </span>
      </div>
      <div className="squadsync__adaptive-summary" aria-label="Varianti A/B">
        {variantBadges.map((variant) => (
          <span key={variant.key} className="squadsync__adaptive-chip" data-priority="INFO">
            Variant {variant.key} <strong>{variant.total}</strong>
          </span>
        ))}
      </div>
      <div className="squadsync__adaptive-chart" aria-label="Distribuzione risposte per squadra">
        {summary.squads.length === 0 ? (
          <p className="squadsync__placeholder">Nessuna squadra con risposte attive.</p>
        ) : (
          summary.squads.map((squad) => (
            <div key={squad.squad} className="squadsync__adaptive-bar">
              <strong>{squad.squad}</strong>
              <div className="squadsync__adaptive-bar-track" aria-hidden="true">
                <span
                  className="squadsync__adaptive-bar-fill"
                  style={{
                    width: `${Math.max(10, (squad.total / Math.max(maxTotal, 1)) * 100)}%`,
                    background: '#6366f1',
                  }}
                />
              </div>
              <span>{squad.total}</span>
            </div>
          ))
        )}
      </div>
      <div className="squadsync__adaptive-list" aria-label="Dettaglio risposte adattive">
        {responses.map((response) => (
          <article key={response.id} className="squadsync__adaptive-item" data-priority={response.priority}>
            <h3>
              {response.title} — <span>{response.squad}</span>
            </h3>
            <p>{response.message}</p>
            <div className="squadsync__adaptive-meta">
              <span>Metric: {response.metric}</span>
              {typeof response.delta === 'number' && response.delta !== 0 && (
                <span>
                  Delta: {response.delta > 0 ? '+' : ''}
                  {response.delta.toFixed(2)}
                </span>
              )}
              {typeof response.baseline === 'number' && <span>Baseline: {response.baseline.toFixed(2)}</span>}
              <span>Creato il: {new Date(response.createdAt).toLocaleString()}</span>
              {response.expiresAt && <span>Scade il: {new Date(response.expiresAt).toLocaleString()}</span>}
              <span>Variant: {response.variant}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};

const SquadSyncPage: React.FC = () => {
  const featureEnabled = useFeatureFlag('analytics.squadsync_view', false);
  const [range, setRange] = useState<RangeValue>(DEFAULT_RANGE);
  const [report, setReport] = useState<SquadSyncReport>(FALLBACK_REPORT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'adaptive'>('overview');

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
        .squadsync__tabs { display: inline-flex; border: 1px solid #cbd5f5; border-radius: 0.5rem; overflow: hidden; margin-bottom: 1.5rem; }
        .squadsync__tabs button { padding: 0.5rem 1rem; background: white; border: none; font-size: 0.875rem; cursor: pointer; color: #1f2937; }
        .squadsync__tabs button[data-active="true"] { background: #4f46e5; color: white; }
        .squadsync__adaptive-summary { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .squadsync__adaptive-chip { padding: 0.5rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem; }
        .squadsync__adaptive-chip[data-priority="CRITICAL"] { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }
        .squadsync__adaptive-chip[data-priority="WARNING"] { background: rgba(249, 115, 22, 0.12); color: #c2410c; }
        .squadsync__adaptive-chip[data-priority="INFO"] { background: rgba(16, 185, 129, 0.12); color: #047857; }
        .squadsync__adaptive-chart { display: grid; gap: 0.75rem; margin-bottom: 1.5rem; }
        .squadsync__adaptive-bar { display: grid; grid-template-columns: 140px 1fr 40px; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
        .squadsync__adaptive-bar strong { font-weight: 600; }
        .squadsync__adaptive-bar-track { position: relative; height: 0.5rem; background: #e0e7ff; border-radius: 999px; overflow: hidden; }
        .squadsync__adaptive-bar-fill { position: absolute; inset: 0; border-radius: 999px; }
        .squadsync__adaptive-list { display: grid; gap: 1rem; }
        .squadsync__adaptive-item { border: 1px solid #e5e7eb; border-left-width: 4px; border-radius: 0.5rem; padding: 0.85rem 1rem; background: #ffffff; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05); }
        .squadsync__adaptive-item[data-priority="CRITICAL"] { border-left-color: #ef4444; }
        .squadsync__adaptive-item[data-priority="WARNING"] { border-left-color: #f97316; }
        .squadsync__adaptive-item[data-priority="INFO"] { border-left-color: #10b981; }
        .squadsync__adaptive-item h3 { margin: 0 0 0.35rem; font-size: 1rem; }
        .squadsync__adaptive-item p { margin: 0.35rem 0; font-size: 0.875rem; color: #374151; }
        .squadsync__adaptive-meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; font-size: 0.75rem; color: #6b7280; }
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
      <div className="squadsync__tabs" role="tablist">
        <button type="button" data-active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button type="button" data-active={activeTab === 'adaptive'} onClick={() => setActiveTab('adaptive')}>
          Adaptive responses
        </button>
      </div>
      {activeTab === 'overview' ? (
        <>
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
        </>
      ) : (
        <AdaptiveResponsesPanel payload={report.adaptive} />
      )}
    </main>
  );
};

export default SquadSyncPage;
