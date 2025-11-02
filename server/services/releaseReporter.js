'use strict';

const { __internals__: snapshotInternals } = require('../routes/generationSnapshot');
const { computeGoNoGo } = require('../../tools/deploy/goNoGo');

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function summariseSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      qualityChecks: [],
      runtime: null,
      biomes: { total: 0, validated: 0, pending: 0 },
      encounters: { variants: 0, warnings: 0, seeds: 0 },
    };
  }
  const biomes = snapshot.biomeSummary || {};
  const encounters = snapshot.encounterSummary || {};
  const qualityChecks = [];
  const checks = snapshot.qualityRelease?.checks || {};
  for (const [key, stats] of Object.entries(checks)) {
    if (!stats) {
      continue;
    }
    const passed = toNumber(stats.passed);
    const total = toNumber(stats.total);
    const conflicts = toNumber(stats.conflicts ?? stats.failures);
    const blocking = total > 0 && passed < total;
    qualityChecks.push({
      id: key,
      label: key.replace(/_/g, ' '),
      passed,
      total,
      conflicts,
      coverage: total > 0 ? Math.round((passed / total) * 100) : null,
      blocking,
    });
  }
  const runtime = snapshot.runtime
    ? {
        error: snapshot.runtime.error || null,
        fallbackUsed: Boolean(snapshot.runtime.fallbackUsed),
        validationMessages: toNumber(snapshot.runtime.validationMessages, null),
        lastBlueprintId: snapshot.runtime.lastBlueprintId || null,
        lastRequestId: snapshot.runtime.lastRequestId || null,
      }
    : null;
  return {
    qualityChecks,
    runtime,
    biomes: {
      total: toNumber(biomes.total, toNumber(biomes.validated) + toNumber(biomes.pending)),
      validated: toNumber(biomes.validated),
      pending: toNumber(biomes.pending),
    },
    encounters: {
      variants: toNumber(encounters.variants),
      warnings: toNumber(encounters.warnings),
      seeds: toNumber(encounters.seeds),
    },
  };
}

function summariseTraitDiagnostics(diagnostics, status = {}) {
  const summary = diagnostics?.summary || diagnostics?.meta?.summary || {};
  const normalisedStatus = {
    fetchedAt: status.fetchedAt || null,
    error: status.error || null,
  };
  const normalisedSummary = {
    total_traits: toNumber(summary.total_traits ?? summary.totalTraits),
    glossary_ok: toNumber(summary.glossary_ok ?? summary.glossaryOk),
    with_conflicts: toNumber(summary.with_conflicts ?? summary.conflicts),
    matrix_mismatch: toNumber(summary.matrix_mismatch ?? summary.matrixMismatch),
    glossary_missing: toNumber(summary.glossary_missing ?? summary.glossaryMissing),
  };
  return {
    summary: normalisedSummary,
    status: normalisedStatus,
    collectedAt: normalisedStatus.fetchedAt || new Date().toISOString(),
  };
}

function summariseNebula(atlas, error) {
  const telemetrySummary = atlas?.telemetry?.summary || {};
  const generator = atlas?.generator || {};
  const generatorMetrics = generator.metrics || {};
  const orchestratorSummary = atlas?.orchestrator?.summary || {};
  return {
    telemetry: {
      summary: {
        totalEvents: toNumber(telemetrySummary.totalEvents),
        openEvents: toNumber(telemetrySummary.openEvents),
        acknowledgedEvents: toNumber(telemetrySummary.acknowledgedEvents),
        highPriorityEvents: toNumber(telemetrySummary.highPriorityEvents),
        lastEventAt: telemetrySummary.lastEventAt || null,
      },
    },
    generator: {
      status: generator.status || 'unknown',
      label: generator.label || null,
      metrics: {
        generationTimeMs: generatorMetrics.generationTimeMs ?? null,
        speciesTotal: toNumber(generatorMetrics.speciesTotal, null),
        enrichedSpecies: toNumber(generatorMetrics.enrichedSpecies, null),
        coverageAverage: generatorMetrics.coverageAverage ?? null,
      },
      updatedAt: generator.updatedAt || null,
    },
    orchestrator: {
      summary: {
        totalEntries: toNumber(orchestratorSummary.totalEntries),
        errorCount: toNumber(orchestratorSummary.errorCount),
        warningCount: toNumber(orchestratorSummary.warningCount),
        infoCount: toNumber(orchestratorSummary.infoCount),
        lastEventAt: orchestratorSummary.lastEventAt || null,
      },
    },
    error: error || null,
    collectedAt: atlas?.updatedAt || new Date().toISOString(),
  };
}

function createReleaseReporter(options = {}) {
  const snapshotStore = options.snapshotStore;
  const traitDiagnostics = options.traitDiagnostics;
  const nebulaAggregator = options.nebulaAggregator;

  if (!snapshotStore || typeof snapshotStore.getSnapshot !== 'function') {
    throw new Error('Release reporter richiede uno snapshot store.');
  }

  const buildSnapshot = snapshotInternals.buildSnapshot;

  async function loadTraitDiagnostics() {
    if (!traitDiagnostics || typeof traitDiagnostics.ensureLoaded !== 'function') {
      return {
        diagnostics: null,
        status: { fetchedAt: null, error: 'Trait diagnostics non configurato' },
      };
    }
    try {
      await traitDiagnostics.ensureLoaded();
    } catch (error) {
      const status = traitDiagnostics.getStatus ? traitDiagnostics.getStatus() : {};
      return {
        diagnostics: null,
        status: {
          fetchedAt: status.fetchedAt || null,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
    const diagnostics = traitDiagnostics.getDiagnostics ? traitDiagnostics.getDiagnostics() : null;
    const status = traitDiagnostics.getStatus ? traitDiagnostics.getStatus() : {};
    return {
      diagnostics,
      status: {
        fetchedAt: status.fetchedAt || null,
        error: status.error || null,
      },
    };
  }

  async function collectTelemetry() {
    const { diagnostics, status: traitStatus } = await loadTraitDiagnostics();
    const dataset = await snapshotStore.getSnapshot({ refresh: false });
    const snapshot = buildSnapshot({ dataset, diagnostics });
    const snapshotSummary = summariseSnapshot(snapshot);
    const traitSummary = summariseTraitDiagnostics(diagnostics, traitStatus);

    let nebulaAtlas = null;
    let nebulaError = null;
    if (nebulaAggregator && typeof nebulaAggregator.getAtlas === 'function') {
      try {
        nebulaAtlas = await nebulaAggregator.getAtlas();
      } catch (error) {
        nebulaError = error instanceof Error ? error.message : String(error);
      }
    }
    const nebulaSummary = summariseNebula(nebulaAtlas, nebulaError);

    const goNoGo = computeGoNoGo({
      snapshot: snapshotSummary,
      traitDiagnostics: traitSummary,
      nebula: nebulaSummary,
    });

    const collectedAt = new Date().toISOString();

    return {
      snapshot: {
        data: snapshot,
        summary: snapshotSummary,
        collectedAt,
      },
      traitDiagnostics: {
        diagnostics,
        summary: traitSummary.summary,
        status: traitSummary.status,
        collectedAt: traitSummary.collectedAt,
      },
      nebula: {
        atlas: nebulaAtlas,
        summary: nebulaSummary,
        collectedAt: nebulaSummary.collectedAt,
      },
      goNoGo: {
        ...goNoGo,
        generatedAt: collectedAt,
      },
    };
  }

  async function buildReport(baseStatus = {}) {
    const snapshotStatus = (typeof baseStatus === 'object' && baseStatus !== null)
      ? { ...baseStatus }
      : {};
    const telemetry = await collectTelemetry();
    snapshotStatus.telemetry = {
      snapshot: telemetry.snapshot,
      traitDiagnostics: telemetry.traitDiagnostics,
      nebula: telemetry.nebula,
    };
    snapshotStatus.goNoGo = telemetry.goNoGo;
    return snapshotStatus;
  }

  return {
    collect: collectTelemetry,
    buildReport,
  };
}

module.exports = {
  createReleaseReporter,
};
