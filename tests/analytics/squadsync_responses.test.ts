import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';

import { createAdaptiveEngine } from '../../services/squadsync/adaptiveEngine.js';
import type { AdaptiveResponseInput } from '../../services/squadsync/adaptiveEngine.js';
import {
  createSquadSyncAdaptiveRestHandler,
  filterReportByRange,
  type SquadSyncResolverOptions,
} from '../../tools/graphql/resolvers/squadsync.js';
import type {
  SquadSyncReport,
  SquadSyncSquad,
  SquadSyncAdaptivePayload,
} from '../../tools/graphql/schema.js';

const describeImpl =
  typeof (globalThis as { describe?: unknown }).describe === 'function'
    ? ((globalThis as { describe: typeof nodeDescribe }).describe as typeof nodeDescribe)
    : nodeDescribe;
const itImpl =
  typeof (globalThis as { it?: unknown }).it === 'function'
    ? ((globalThis as { it: typeof nodeIt }).it as typeof nodeIt)
    : nodeIt;

const makeSquad = (name: string, engagements: number[]): SquadSyncSquad => ({
  name,
  summary: {
    daysCovered: engagements.length,
    averageActiveMembers: 4,
    totalDeployments: engagements.length * 3,
    totalStandups: engagements.length * 4,
    totalIncidents: Math.max(1, engagements.length - 1),
    engagementScore: Number((engagements.reduce((acc, value) => acc + value, 0) / engagements.length).toFixed(3)),
  },
  daily: engagements.map((value, index) => ({
    date: `2025-11-0${index + 1}`,
    activeMembers: 4,
    standups: 4,
    deployments: 3,
    incidents: index % 2 === 0 ? 1 : 2,
    engagement: value,
  })),
});

const baseReport: SquadSyncReport = {
  range: { start: '2025-11-01', end: '2025-11-05', days: 5 },
  generatedAt: '2025-11-06T12:00:00Z',
  totals: {
    deployments: 30,
    standups: 40,
    incidents: 12,
    averageActiveMembers: 4,
    averageEngagement: 0.68,
  },
  squads: [makeSquad('Bravo', [0.52, 0.55, 0.61]), makeSquad('Delta', [0.72, 0.76, 0.74])],
  adaptive: {
    responses: [
      {
        id: 'resp-1',
        squad: 'Bravo',
        priority: 'CRITICAL',
        metric: 'engagement',
        title: 'Boost Bravo',
        message: 'Mentorship mirato',
        value: 0.55,
        baseline: 0.7,
        delta: -0.15,
        createdAt: '2025-11-06T12:00:00Z',
        expiresAt: '2025-11-07T12:00:00Z',
        tags: ['engagement'],
        source: 'etl',
        variant: 'adaptive',
        range: { start: '2025-11-01', end: '2025-11-05' },
      },
      {
        id: 'resp-2',
        squad: 'Delta',
        priority: 'WARNING',
        metric: 'incidents',
        title: 'Mitiga incidenti',
        message: 'Rafforza il supporto',
        value: 5,
        baseline: 3,
        delta: 2,
        createdAt: '2025-11-06T12:05:00Z',
        expiresAt: '2025-11-07T12:00:00Z',
        tags: ['incidents'],
        source: 'etl',
        variant: 'adaptive',
        range: { start: '2025-11-01', end: '2025-11-05' },
      },
      {
        id: 'resp-3',
        squad: 'Delta',
        priority: 'INFO',
        metric: 'deployments',
        title: 'Celebra Delta',
        message: 'Condividi best practice',
        value: 8,
        baseline: 5,
        delta: 3,
        createdAt: '2025-11-06T12:10:00Z',
        expiresAt: '2025-11-07T12:00:00Z',
        tags: ['deployments'],
        source: 'etl',
        variant: 'control',
        range: { start: '2025-11-01', end: '2025-11-05' },
      },
    ],
    summary: {
      total: 3,
      critical: 1,
      warning: 1,
      info: 1,
      variants: [
        { key: 'adaptive', total: 2 },
        { key: 'control', total: 1 },
      ],
      squads: [],
    },
  },
};

const registerSuites = (describeFn: typeof nodeDescribe, itFn: typeof nodeIt) => {
  describeFn('AdaptiveEngine priority pipeline', () => {
    itFn('ordina per priorità e ripulisce le risposte scadute', () => {
      const engine = createAdaptiveEngine({ ttlMs: 5 * 60_000, now: () => new Date('2025-11-06T12:00:00Z') });
      const inputs: AdaptiveResponseInput[] = [
        {
          squad: 'Alpha',
          priority: 'info',
          metric: 'deployments',
          title: 'Info Alpha',
          message: 'Ottimo lavoro',
          value: 5,
          createdAt: '2025-11-06T11:58:00Z',
          variant: 'adaptive',
          range: { start: '2025-11-01', end: '2025-11-05' },
        },
        {
          squad: 'Alpha',
          priority: 'critical',
          metric: 'engagement',
          title: 'Allerta Alpha',
          message: 'Serve supporto',
          value: 0.42,
          createdAt: '2025-11-06T11:59:30Z',
          variant: 'adaptive',
          range: { start: '2025-11-01', end: '2025-11-05' },
        },
        {
          squad: 'Alpha',
          priority: 'warning',
          metric: 'incidents',
          title: 'Incidents Alpha',
          message: 'Riduci gli incidenti',
          value: 4,
          createdAt: '2025-11-06T11:58:30Z',
          variant: 'control',
          range: { start: '2025-11-01', end: '2025-11-05' },
        },
      ];
      engine.ingestMany(inputs);

      const initial = engine.getResponses();
      assert.equal(initial[0].priority, 'critical');
      assert.equal(initial[1].priority, 'warning');
      assert.equal(initial[2].priority, 'info');

      engine.purgeExpired(new Date('2025-11-06T12:30:00Z'));
      const afterExpiry = engine.getResponses();
      assert.equal(afterExpiry.length, 0);
    });

    itFn('calcola riepiloghi per variante A/B', () => {
      const engine = createAdaptiveEngine({ ttlMs: 0, now: () => new Date('2025-11-06T12:00:00Z') });
      engine.ingestMany([
        { squad: 'Bravo', priority: 'critical', metric: 'engagement', title: 'A', message: 'A', value: 0.5, variant: 'adaptive' },
        { squad: 'Bravo', priority: 'warning', metric: 'incidents', title: 'B', message: 'B', value: 3, variant: 'control' },
        { squad: 'Delta', priority: 'info', metric: 'deployments', title: 'C', message: 'C', value: 9, variant: 'adaptive' },
      ]);

      const snapshot = engine.snapshot();
      assert.equal(snapshot.summary.total, 3);
      assert.equal(snapshot.summary.variant.adaptive, 2);
      assert.equal(snapshot.summary.variant.control, 1);
      const bravoSummary = snapshot.summary.squads.find((entry) => entry.squad === 'Bravo');
      assert.ok(bravoSummary);
      assert.equal(bravoSummary?.critical, 1);
      assert.equal(bravoSummary?.warning, 1);
    });
  });

  describeFn('GraphQL + REST integration', () => {
    itFn('propaga le risposte adattive filtrate per range', () => {
      const filtered = filterReportByRange(baseReport, { start: '2025-11-02', end: '2025-11-03' });
      assert.equal(filtered.adaptive.summary.total, 3);
      assert.equal(filtered.adaptive.summary.variants[0].key, 'adaptive');
      assert.equal(filtered.adaptive.summary.variants[1].key, 'control');
    });

    itFn('espone un endpoint REST compatibile', async () => {
      const handler = createSquadSyncAdaptiveRestHandler({
        readReport: async () => baseReport,
      } satisfies SquadSyncResolverOptions);

      const outputs: unknown[] = [];
      const res = {
        status: (_code: number) => res,
        json: (payload: unknown) => {
          outputs.push(payload);
        },
      };

      await handler({ query: { start: '2025-11-02', end: '2025-11-03' } }, res);
      assert.equal(outputs.length, 1);
      const payload = outputs[0] as { adaptive: SquadSyncAdaptivePayload };
      assert.equal(payload.adaptive.summary.total, 3);
      assert.equal(payload.adaptive.responses[0].priority, 'CRITICAL');
    });
  });
};

registerSuites(describeImpl, itImpl);
