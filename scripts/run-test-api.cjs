#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const tsxCli = path.join(path.dirname(require.resolve('tsx')), 'cli.mjs');
const tsxCmd = `node "${tsxCli}"`;

const steps = [
  'node --test tests/api/*.test.js',
  `${tsxCmd} tests/generation/flow-shell.spec.ts`,
  'node --test tests/server/generationSnapshot.spec.js',
  `${tsxCmd} tests/server/orchestrator-bridge.spec.ts`,
  `${tsxCmd} tests/server/orchestrator-latency.spec.ts`,
  `${tsxCmd} tests/scripts/tune_items.test.ts`,
  `${tsxCmd} tests/events/dynamicEvents.e2e.ts`,
  'node --test tests/tools/deploy-checks.spec.js',
  `${tsxCmd} tests/api/serviceActorSessions.spec.ts`,
  'node --test tests/scripts/speciesIndexIntegrity.test.js',
  'node --test tests/scripts/tutorialSpeciesExistence.test.js',
  'node --test tests/scripts/speciesTraitReferences.test.js',
  'node --test tests/scripts/replaceAllSafety.test.js',
  'node --test tests/scripts/damageCurvesIntegrity.test.js',
  'node --test tests/scripts/crossPlatformRunners.test.js',
  'node --test tests/i18n/parity.test.js',
  'node --test tests/play/*.test.js',
];

const env = {
  ...process.env,
  ORCHESTRATOR_AUTOCLOSE_MS: '2000',
};

for (const step of steps) {
  console.log(`\n$ ${step}`);
  const result = spawnSync(step, {
    stdio: 'inherit',
    shell: true,
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
