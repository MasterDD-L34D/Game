import assert from 'node:assert/strict';
import test from 'node:test';

import { squadSyncTypeDefs } from '../../graphql/schema.js';
import { createSquadSyncResolver, filterReportByRange } from '../../graphql/resolvers/squadsync.js';
import type { SquadSyncReport } from '../../graphql/schema.js';

const MOCK_REPORT: SquadSyncReport = {
  range: {
    start: '2023-10-24',
    end: '2023-11-05',
    days: 13,
  },
  generatedAt: '2023-11-06T06:30:00Z',
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
        {
          date: '2023-10-24',
          activeMembers: 8,
          standups: 2,
          deployments: 1,
          incidents: 0,
          engagement: 0.744,
        },
        {
          date: '2023-10-25',
          activeMembers: 7,
          standups: 1,
          deployments: 0,
          incidents: 1,
          engagement: 0.439,
        },
        {
          date: '2023-10-31',
          activeMembers: 9,
          standups: 2,
          deployments: 2,
          incidents: 0,
          engagement: 0.9,
        },
        {
          date: '2023-11-05',
          activeMembers: 8,
          standups: 2,
          deployments: 3,
          incidents: 1,
          engagement: 0.894,
        },
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
        {
          date: '2023-10-24',
          activeMembers: 6,
          standups: 1,
          deployments: 0,
          incidents: 2,
          engagement: 0.333,
        },
        {
          date: '2023-10-27',
          activeMembers: 7,
          standups: 1,
          deployments: 1,
          incidents: 1,
          engagement: 0.539,
        },
        {
          date: '2023-10-30',
          activeMembers: 5,
          standups: 1,
          deployments: 1,
          incidents: 0,
          engagement: 0.478,
        },
        {
          date: '2023-11-05',
          activeMembers: 6,
          standups: 1,
          deployments: 2,
          incidents: 1,
          engagement: 0.583,
        },
      ],
    },
  ],
  totals: {
    deployments: 10,
    standups: 11,
    incidents: 6,
    averageActiveMembers: 7,
    averageEngagement: 0.614,
  },
};

test('schema contiene il type SquadSyncReport', () => {
  assert.ok(squadSyncTypeDefs.includes('type SquadSyncReport'));
  assert.ok(squadSyncTypeDefs.includes('squadSyncAnalytics'));
});

test('resolver restituisce il report completo senza filtro range', async () => {
  const resolver = createSquadSyncResolver({
    readReport: async () => MOCK_REPORT,
    reportPath: '/tmp/mock.json',
  });
  const result = await resolver(null, {});

  assert.equal(result.range.start, '2023-10-24');
  assert.equal(result.squads.length, 2);
  assert.equal(result.totals.deployments, 10);
  assert.equal(result.squads[0].summary.engagementScore, 0.744);
  assert.equal(result.squads[1].daily[0].engagement, 0.333);
});

test('filterReportByRange riduce correttamente le squadre', () => {
  const filtered = filterReportByRange(MOCK_REPORT, {
    start: '2023-10-30',
    end: '2023-11-02',
  });

  assert.equal(filtered.range.days, 4);
  assert.equal(filtered.squads.length, 2);
  assert.equal(filtered.squads[0].summary.totalDeployments, 2);
  assert.equal(filtered.squads[0].summary.engagementScore, 0.9);
  assert.equal(filtered.squads[1].summary.averageActiveMembers, 5);
  assert.equal(filtered.totals.deployments, 3);
  assert.equal(filtered.totals.averageEngagement, 0.689);
});
