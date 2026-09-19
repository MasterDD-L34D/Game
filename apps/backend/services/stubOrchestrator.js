'use strict';

// No-op (null object) generation orchestrator for Node-native API tests that
// never hit /api/v1/generation/*. The real bridge (orchestratorBridge.js)
// EAGERLY spawns poolSize Python worker subprocesses in its constructor; under
// the parallel `node --test tests/api/*.test.js` batch that means dozens of
// concurrent Python spawns -> CI subprocess/CPU contention and noisy SIGTERM
// teardown logs (`[trait-diagnostics] preload fallito ... Worker N terminato`).
//
// This stub satisfies exactly the surface app.js touches without any subprocess:
//   - fetchTraitDiagnostics(): boot-time preload -> resolve empty diagnostics
//   - close(): teardown -> no-op
//   - generateSpecies / generateSpeciesBatch(): only reachable from
//     /api/v1/generation/* and the quality "regenerate" path; tests that
//     exercise those keep the real bridge, so here we reject LOUDLY to surface
//     any accidental reliance on generation under the stub.
//
// Activated centrally via IDEA_ENGINE_STUB_ORCHESTRATOR=1 (see app.js gating +
// scripts/run-test-api.cjs) and injected explicitly by sessionTestHelpers.

const STUB_ERROR =
  'generation orchestrator stub: real Python bridge non disponibile sotto i test API ' +
  '(IDEA_ENGINE_STUB_ORCHESTRATOR). I test che generano specie devono usare il bridge reale.';

function createStubOrchestrator() {
  async function fetchTraitDiagnostics() {
    return {};
  }

  async function generateSpecies() {
    throw new Error(STUB_ERROR);
  }

  async function generateSpeciesBatch() {
    throw new Error(STUB_ERROR);
  }

  async function close() {
    // no subprocess to tear down
  }

  function getPoolStats() {
    return { stub: true, workers: 0 };
  }

  return {
    fetchTraitDiagnostics,
    generateSpecies,
    generateSpeciesBatch,
    close,
    getPoolStats,
  };
}

module.exports = { createStubOrchestrator };
