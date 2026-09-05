const test = require('node:test');
const assert = require('node:assert/strict');

const { computeGoNoGo, formatGoNoGoSummary } = require('../../tools/deploy/goNoGo');

test('computeGoNoGo returns go when all checks pass', () => {
  const goNoGo = computeGoNoGo({
    snapshot: {
      qualityChecks: [
        { id: 'traits', label: 'traits', passed: 5, total: 5, conflicts: 0, blocking: false },
      ],
      runtime: { fallbackUsed: false, error: null, validationMessages: 0 },
      biomes: { total: 2, validated: 2, pending: 0 },
      encounters: { variants: 3, warnings: 0, seeds: 5 },
    },
    traitDiagnostics: {
      summary: {
        with_conflicts: 0,
        matrix_mismatch: 0,
        glossary_missing: 0,
        total_traits: 10,
        glossary_ok: 10,
      },
      status: { fetchedAt: '2024-05-01T00:00:00Z', error: null },
    },
    nebula: {
      telemetry: { summary: { highPriorityEvents: 0, openEvents: 0, acknowledgedEvents: 0 } },
      generator: { status: 'success', metrics: { generationTimeMs: 120, coverageAverage: 85 } },
      orchestrator: { summary: { errorCount: 0, warningCount: 0, infoCount: 1 } },
      error: null,
    },
  });
  assert.equal(goNoGo.status, 'go');
  const summary = formatGoNoGoSummary(goNoGo);
  assert.equal(summary.status, 'go');
  assert.match(summary.summaryLine, /Flow Shell go\/no-go: GO/);
  assert.deepEqual(summary.detailLines, []);
});

test('computeGoNoGo: trait conflicts dichiarati non bloccano il deploy', () => {
  // NOTE: with_conflicts conta i tratti con antagonismi DICHIARATI (design
  // feature), non errori dati. Solo un errore reale in status.error deve
  // produrre un NO-GO.
  const goNoGo = computeGoNoGo({
    snapshot: {
      qualityChecks: [
        { id: 'biomes', label: 'biomes', passed: 2, total: 2, conflicts: 0, blocking: false },
      ],
      runtime: { fallbackUsed: false, error: null, validationMessages: 0 },
      biomes: { total: 2, validated: 2, pending: 0 },
      encounters: { variants: 1, warnings: 0, seeds: 2 },
    },
    traitDiagnostics: {
      summary: {
        with_conflicts: 3,
        matrix_mismatch: 0,
        glossary_missing: 0,
      },
      status: { fetchedAt: null, error: null },
    },
    nebula: {
      telemetry: { summary: { highPriorityEvents: 0, openEvents: 0, acknowledgedEvents: 0 } },
      generator: { status: 'success', metrics: { generationTimeMs: 140, coverageAverage: 80 } },
      orchestrator: { summary: { errorCount: 0, warningCount: 0, infoCount: 2 } },
    },
  });
  assert.notEqual(goNoGo.status, 'no-go');
  const traitCheck = goNoGo.checks.find((check) => check.id === 'trait-diagnostics');
  assert(traitCheck);
  assert.equal(traitCheck.status, 'passed');
  assert.equal(traitCheck.severity, 'warning');
  assert.match(traitCheck.summary, /Conflitti attivi: 3/);
});

test('computeGoNoGo: trait diagnostics error produce NO-GO', () => {
  // Solo un errore reale nel caricamento delle diagnostiche deve bloccare.
  const goNoGo = computeGoNoGo({
    snapshot: {
      qualityChecks: [
        { id: 'biomes', label: 'biomes', passed: 2, total: 2, conflicts: 0, blocking: false },
      ],
      runtime: { fallbackUsed: false, error: null, validationMessages: 0 },
    },
    traitDiagnostics: {
      summary: { with_conflicts: 0, matrix_mismatch: 0, glossary_missing: 0 },
      status: { fetchedAt: null, error: 'Trait baseline non disponibile' },
    },
    nebula: {
      telemetry: { summary: { highPriorityEvents: 0, openEvents: 0, acknowledgedEvents: 0 } },
      generator: { status: 'success', metrics: { generationTimeMs: 100, coverageAverage: 90 } },
      orchestrator: { summary: { errorCount: 0, warningCount: 0, infoCount: 0 } },
    },
  });
  assert.equal(goNoGo.status, 'no-go');
  const traitCheck = goNoGo.checks.find((check) => check.id === 'trait-diagnostics');
  assert.equal(traitCheck.status, 'failed');
  assert.equal(traitCheck.severity, 'critical');
  assert.match(traitCheck.summary, /Errore diagnostica/);
});

test('generator warning produces review status with warning details', () => {
  const goNoGo = computeGoNoGo({
    snapshot: {
      qualityChecks: [
        { id: 'traits', label: 'traits', passed: 4, total: 4, conflicts: 0, blocking: false },
      ],
      runtime: { fallbackUsed: false, error: null, validationMessages: 0 },
      biomes: { total: 1, validated: 1, pending: 0 },
      encounters: { variants: 1, warnings: 0, seeds: 1 },
    },
    traitDiagnostics: {
      summary: {
        with_conflicts: 0,
        matrix_mismatch: 0,
        glossary_missing: 0,
      },
      status: { fetchedAt: null, error: null },
    },
    nebula: {
      telemetry: { summary: { highPriorityEvents: 0, openEvents: 2, acknowledgedEvents: 1 } },
      generator: { status: 'warning', metrics: { generationTimeMs: 450, coverageAverage: 60 } },
      orchestrator: { summary: { errorCount: 0, warningCount: 0, infoCount: 0 } },
    },
  });
  assert.equal(goNoGo.status, 'review');
  const summary = formatGoNoGoSummary(goNoGo);
  assert.equal(summary.status, 'review');
  assert(summary.detailLines.some((line) => line.includes('Nebula Atlas → Generator')));
  assert(summary.detailLines.some((line) => line.includes('⚠️')));
});
