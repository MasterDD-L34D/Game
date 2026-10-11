import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createSquadSyncResolver } from '../../graphql/resolvers/squadsync.js';

const FIXTURE_PATH = fileURLToPath(
  new URL('../../../../graphql/tests/fixtures/squadsync_report_november.json', import.meta.url),
);

test('squadSyncAnalytics aggrega le squadre del report novembre 2025', async () => {
  const resolver = createSquadSyncResolver({ reportPath: FIXTURE_PATH });

  const report = await resolver(null, {});

  assert.equal(report.range.start, '2025-11-01');
  assert.equal(report.range.end, '2025-11-05');
  assert.equal(report.squads.length, 3);
  assert.equal(report.totals.deployments, 32);
  assert.equal(report.totals.averageEngagement, 0.645);

  const echo = report.squads.find((squad) => squad.name === 'Echo');
  assert.ok(echo);
  assert.equal(echo?.summary.totalStandups, 27);
  assert.equal(echo?.daily[1]?.engagement, 0.588);
});

test('squadSyncAnalytics filtra le squadre per la finestra del 5 novembre', async () => {
  const resolver = createSquadSyncResolver({ reportPath: FIXTURE_PATH });

  const report = await resolver(null, {
    range: { start: '2025-11-05', end: '2025-11-05' },
  });

  assert.equal(report.range.days, 1);
  assert.deepEqual(
    report.squads.map((squad) => squad.name),
    ['Delta', 'Echo'],
  );
  assert.equal(report.squads[0]?.summary.totalDeployments, 9);
  assert.equal(report.squads[1]?.summary.engagementScore, 0.588);
  assert.equal(report.totals.incidents, 10);
});
