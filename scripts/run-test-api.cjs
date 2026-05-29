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
  // tests/services/** + tests/ai/** were not covered by the globs above ->
  // CI-orphaned: they pass when run manually but never ran in CI, so a refactor
  // could silently drop behavior while CI stays green (anti-pattern #10
  // non-CI-guarded drop). All 140 files (1738 tests) verified passing in
  // parallel 2026-05-29; these broad subtree globs supersede the prior
  // ermes-scoped wiring (PR #2432).
  //
  // Globs are DOUBLE-QUOTED on purpose: spawnSync runs with shell:true, so a
  // bare tests/services/**/*.test.js would be expanded by the shell, not node.
  // POSIX sh (Linux CI) has no globstar -> collapses ** to a single level and
  // silently drops the 71 top-level files (1276 -> 249 tests). Quoting forces
  // node's own recursive glob, identical on cmd.exe (Windows) and sh (Linux).
  'node --test "tests/services/**/*.test.js"',
  'node --test "tests/ai/**/*.test.js"',
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
