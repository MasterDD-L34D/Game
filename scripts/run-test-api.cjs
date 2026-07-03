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
  // CI-orphaned: ~140 test files (711 tests) passed manually but never guarded,
  // so a refactor dropping behavior would stay green (anti-pattern #10
  // non-CI-guarded drop). Wire the whole subtree. All 711 verified passing both
  // standalone and as a parallel glob batch (2026-05-30) -> no port collision /
  // shared-state. Single-* globs (bash- and node-expandable, no globstar dep);
  // services nests max one level. Supersedes the ermes-only wiring (PR #2432).
  'node --test tests/services/*.test.js',
  'node --test tests/services/*/*.test.js',
  'node --test tests/ai/*.test.js',
  // tests/worldgen/** was likewise CI-orphaned (anti-pattern #10): 7 files
  // (meta-network resolver/routing/completability, foodweb filter/population,
  // cross-event engine, encounter threat) never matched by any glob above, so a
  // refactor dropping meta-network / foodweb behavior would stay green. Flat
  // subtree -> single-* glob suffices (no nesting). Verified passing standalone
  // + in-batch (2026-06-17).
  'node --test tests/worldgen/*.test.js',
  // tests/difficulty/** was also CI-orphaned (anti-pattern #10): calculator +
  // validator specs never matched a glob above, so the A2 encounter author-guard
  // (validate_encounter_difficulty.js: pressure_tier_floor <= difficulty_rating)
  // would NOT actually block a mis-authored encounter at merge. The validator
  // test runs the script against every real encounter (errors=0), so wiring this
  // glob makes the guard an enforced gate. Flat subtree -> single-* glob.
  'node --test tests/difficulty/*.test.js',
  // tests/codex/** -- SPEC-H HA2 A.L.I.E.N.A. authoring-gate validator. Same
  // anti-pattern #10 risk: the guard (validate_codex_aliena.js: 6-dim presence +
  // content) only blocks mis-authored codex entries if its test runs at merge.
  // The validator test runs the script against every real data/codex entry
  // (errors=0), so wiring this glob makes the authoring gate an enforced check.
  'node --test tests/codex/*.test.js',
  // tests/routes/** -- SPEC-F Custode HTTP routes (companion + skivCustode: share/
  // export/promote/import/crossbreed + per-Nido isolation Option A + write-gate
  // Option D). Same anti-pattern #10 risk: these express app.listen(0)+fetch tests
  // are the ONLY coverage of the flag-OFF byte-identical guards + the untrusted-body
  // and eviction-isolation invariants, but no glob above matched tests/routes/*.
  // Flat subtree -> single-* glob; wiring makes them an enforced gate.
  'node --test tests/routes/*.test.js',
  // tests/js/** -- encounter-geometry-difficulty-gate PR1 Task 5: grid-ratify
  // author-guard (validate_encounter_grid_ratify.js). Advisory / warn-only by
  // design (D9 "warn poi promuovi") -- the guard itself always exits 0, so this
  // step can never fail the suite; the test file asserts the guard's warn-count
  // logic (unit-level), not a CI-blocking gate. Wired anyway so a future refactor
  // that breaks the guard's behavior does not silently rot (anti-pattern #10).
  'node --test tests/js/*.test.js',
];

const baseEnv = {
  ...process.env,
  ORCHESTRATOR_AUTOCLOSE_MS: '2000',
};

// The parallel `node --test tests/api/*.test.js` batch builds dozens of apps;
// the real orchestrator bridge eagerly spawns Python worker subprocesses per
// app -> CPU/subprocess contention + noisy `Worker N terminato (SIGTERM)`
// teardown logs. Those API tests do not exercise /api/v1/generation/*, so swap
// in the no-op stub orchestrator for this step. Generation-specific files
// (species-generation, quality-release) opt back out at module load via
// `delete process.env.IDEA_ENGINE_STUB_ORCHESTRATOR`.
const API_GLOB_STEP = 'node --test tests/api/*.test.js';

for (const step of steps) {
  console.log(`\n$ ${step}`);
  const env = step === API_GLOB_STEP ? { ...baseEnv, IDEA_ENGINE_STUB_ORCHESTRATOR: '1' } : baseEnv;
  const result = spawnSync(step, {
    stdio: 'inherit',
    shell: true,
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
