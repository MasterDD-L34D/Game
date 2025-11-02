'use strict';

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normaliseCheckStatus(passed, severity) {
  if (passed) {
    return 'passed';
  }
  return severity === 'critical' ? 'failed' : 'warning';
}

function computeSnapshotQuality(summary = {}) {
  const checks = Array.isArray(summary.qualityChecks) ? summary.qualityChecks : [];
  const blocking = checks.filter((check) => check && check.blocking);
  const missingData = !checks.length;
  const passed = !missingData && blocking.length === 0;
  const severity = 'warning';
  const failedChecks = blocking.map((check) => check.label || check.id || 'quality-check');
  const summaryText = missingData
    ? 'Nessun quality check disponibile nello snapshot.'
    : failedChecks.length
      ? `Check non passati: ${failedChecks.join(', ')}`
      : 'Tutti i quality check marcati come passati.';
  return {
    id: 'snapshot-quality',
    title: 'Quality Release · Snapshot',
    flowReference: 'Quality Release → Snapshot',
    severity,
    passed,
    summary: summaryText,
    details: {
      total: checks.length,
      blocking: blocking.length,
    },
  };
}

function computeTraitDiagnosticsStatus(traitDiagnostics = {}) {
  const summary = traitDiagnostics.summary || {};
  const status = traitDiagnostics.status || {};
  const conflicts = toNumber(summary.with_conflicts ?? summary.conflicts);
  const matrixMismatch = toNumber(summary.matrix_mismatch ?? summary.matrixMismatch);
  const missingGlossary = toNumber(summary.glossary_missing ?? summary.glossaryMissing);
  const error = status.error ? String(status.error) : null;
  const passed = !error && conflicts === 0;
  let severity = 'warning';
  if (error || conflicts > 0) {
    severity = 'critical';
  } else if (matrixMismatch > 0 || missingGlossary > 0) {
    severity = 'warning';
  }
  const summaryParts = [];
  if (error) {
    summaryParts.push(`Errore diagnostica: ${error}`);
  }
  summaryParts.push(`Conflitti attivi: ${conflicts}`);
  if (matrixMismatch) {
    summaryParts.push(`Mismatch matrice: ${matrixMismatch}`);
  }
  if (missingGlossary) {
    summaryParts.push(`Glossario mancanti: ${missingGlossary}`);
  }
  return {
    id: 'trait-diagnostics',
    title: 'Quality Release · Trait diagnostics',
    flowReference: 'Quality Release → Trait diagnostics',
    severity,
    passed,
    summary: summaryParts.join(' · '),
    details: {
      conflicts,
      matrixMismatch,
      missingGlossary,
      fetchedAt: status.fetchedAt || null,
    },
  };
}

function computeTelemetryIncidents(nebula = {}) {
  const summary = nebula.telemetry?.summary || {};
  const error = nebula.error ? String(nebula.error) : null;
  const highPriority = toNumber(summary.highPriorityEvents);
  const openEvents = toNumber(summary.openEvents);
  const passed = !error && highPriority === 0;
  const severity = 'warning';
  const summaryParts = [];
  if (error) {
    summaryParts.push(`Errore telemetria: ${error}`);
  }
  summaryParts.push(`Incidenti alta priorità: ${highPriority}`);
  summaryParts.push(`Incidenti aperti: ${openEvents}`);
  if (summary.lastEventAt) {
    summaryParts.push(`Ultimo evento: ${summary.lastEventAt}`);
  }
  return {
    id: 'nebula-telemetry',
    title: 'Nebula Atlas · Telemetry',
    flowReference: 'Nebula Atlas → Telemetry',
    severity,
    passed,
    summary: summaryParts.join(' · '),
    details: {
      highPriority,
      openEvents,
      acknowledgedEvents: toNumber(summary.acknowledgedEvents),
      lastEventAt: summary.lastEventAt || null,
    },
  };
}

function computeGeneratorStatus(nebula = {}) {
  const generator = nebula.generator || {};
  const status = String(generator.status || 'unknown');
  const passed = status === 'success';
  const summaryParts = [`Stato generatore: ${status}`];
  const metrics = generator.metrics || {};
  if (metrics.generationTimeMs !== undefined && metrics.generationTimeMs !== null) {
    summaryParts.push(`Tempo medio: ${metrics.generationTimeMs}ms`);
  }
  if (metrics.coverageAverage !== undefined && metrics.coverageAverage !== null) {
    summaryParts.push(`Copertura media: ${metrics.coverageAverage}%`);
  }
  return {
    id: 'nebula-generator',
    title: 'Nebula Atlas · Generator',
    flowReference: 'Nebula Atlas → Generator',
    severity: 'warning',
    passed,
    summary: summaryParts.join(' · '),
    details: {
      status,
      generationTimeMs: metrics.generationTimeMs ?? null,
      coverageAverage: metrics.coverageAverage ?? null,
    },
  };
}

function computeRuntimeStatus(snapshot = {}) {
  const runtime = snapshot.runtime || {};
  const error = runtime.error ? String(runtime.error) : null;
  const fallbackUsed = Boolean(runtime.fallbackUsed);
  const passed = !error && !fallbackUsed;
  const severity = error ? 'critical' : 'warning';
  const summaryParts = [];
  if (error) {
    summaryParts.push(`Errore runtime: ${error}`);
  }
  if (fallbackUsed) {
    summaryParts.push('Fallback attivo');
  }
  if (runtime.validationMessages !== undefined && runtime.validationMessages !== null) {
    summaryParts.push(`Messaggi validazione: ${runtime.validationMessages}`);
  }
  if (!summaryParts.length) {
    summaryParts.push('Runtime stabile (nessun fallback)');
  }
  return {
    id: 'runtime-health',
    title: 'Quality Release · Runtime log',
    flowReference: 'Quality Release → Log runtime',
    severity,
    passed,
    summary: summaryParts.join(' · '),
    details: {
      fallbackUsed,
      error,
      validationMessages: runtime.validationMessages ?? null,
      lastBlueprintId: runtime.lastBlueprintId || null,
      lastRequestId: runtime.lastRequestId || null,
    },
  };
}

function computeGoNoGo(input = {}) {
  const checks = [];
  if (input.snapshot) {
    checks.push(computeSnapshotQuality(input.snapshot));
    checks.push(computeRuntimeStatus(input.snapshot));
  } else {
    checks.push({
      id: 'snapshot-quality',
      title: 'Quality Release · Snapshot',
      flowReference: 'Quality Release → Snapshot',
      severity: 'critical',
      passed: false,
      summary: 'Snapshot non disponibile.',
      details: {},
    });
    checks.push({
      id: 'runtime-health',
      title: 'Quality Release · Runtime log',
      flowReference: 'Quality Release → Log runtime',
      severity: 'warning',
      passed: false,
      summary: 'Runtime non disponibile.',
      details: {},
    });
  }

  checks.push(computeTraitDiagnosticsStatus(input.traitDiagnostics));
  checks.push(computeTelemetryIncidents(input.nebula));
  checks.push(computeGeneratorStatus(input.nebula));

  const enrichedChecks = checks.map((check) => ({
    ...check,
    status: normaliseCheckStatus(check.passed, check.severity),
  }));

  const failed = enrichedChecks.filter((check) => check.status === 'failed');
  const warnings = enrichedChecks.filter((check) => check.status === 'warning');
  const status = failed.length > 0 ? 'no-go' : warnings.length > 0 ? 'review' : 'go';

  return {
    status,
    checks: enrichedChecks,
    stats: {
      total: enrichedChecks.length,
      failed: failed.length,
      warnings: warnings.length,
      passed: enrichedChecks.length - failed.length - warnings.length,
    },
  };
}

function formatGoNoGoSummary(goNoGo) {
  if (!goNoGo || !Array.isArray(goNoGo.checks)) {
    return {
      status: 'unknown',
      summaryLine: 'Flow Shell go/no-go: dati non disponibili',
      detailLines: [],
    };
  }
  const stats = goNoGo.stats || {};
  const total = stats.total ?? goNoGo.checks.length;
  const failed = stats.failed ?? goNoGo.checks.filter((check) => check.status === 'failed').length;
  const warnings =
    stats.warnings ?? goNoGo.checks.filter((check) => check.status === 'warning').length;
  const passed = stats.passed ?? total - failed - warnings;
  const label = (goNoGo.status || 'nd').toUpperCase();
  const summaryLine = `Flow Shell go/no-go: ${label} (${passed}/${total} ok · ${warnings} warning · ${failed} fail)`;
  const detailLines = [];
  for (const check of goNoGo.checks) {
    if (check.status === 'passed') {
      continue;
    }
    const prefix = check.status === 'failed' ? '❌' : '⚠️';
    detailLines.push(`${prefix} ${check.flowReference}: ${check.summary}`);
  }
  return {
    status: goNoGo.status,
    summaryLine,
    detailLines,
  };
}

module.exports = {
  computeGoNoGo,
  formatGoNoGoSummary,
};
