#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');

const {
  createGenerationOrchestratorBridge,
} = require('../apps/backend/services/orchestratorBridge');

const REPO_ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
const TRAIT_BASELINE_PATH = path.join(REPORTS_DIR, 'trait_baseline.json');
const QA_BADGES_PATH = path.join(REPORTS_DIR, 'qa_badges.json');
const GENERATOR_VALIDATION_PATH = path.join(REPORTS_DIR, 'generator_validation.json');
const QA_CHANGELOG_PATH = path.join(REPORTS_DIR, 'qa-changelog.md');

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normaliseArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== undefined);
  }
  return [];
}

function toStringArray(value) {
  return normaliseArray(value).map((item) => String(item));
}

function normaliseTraitEntry(entry) {
  const coverage = {
    core: toNumber(entry?.coverage?.core),
    optional: toNumber(entry?.coverage?.optional),
    synergy: toNumber(entry?.coverage?.synergy),
  };
  coverage.total =
    toNumber(entry?.total_coverage) || coverage.core + coverage.optional + coverage.synergy;
  return {
    id: entry?.id || '',
    label: entry?.label || entry?.id || '',
    tier: entry?.tier || null,
    coverage,
    statuses: {
      glossary: entry?.statuses?.glossary || 'missing',
      matrix: entry?.statuses?.matrix || 'mismatch',
    },
    conflicts: normaliseArray(entry?.conflicts).map((value) => String(value)),
    synergies: normaliseArray(entry?.synergies).map((value) => String(value)),
    dataset_sources: normaliseArray(entry?.dataset_sources).map((value) => String(value)),
  };
}

function buildTraitBaselineReport(diagnostics) {
  const generatedAt =
    diagnostics?.generated_at || diagnostics?.generatedAt || new Date().toISOString();
  const traits = Array.isArray(diagnostics?.traits)
    ? diagnostics.traits.map(normaliseTraitEntry)
    : [];
  const summary = diagnostics?.summary || {};
  const matrixOnlyTraits = Array.isArray(diagnostics?.matrix_only_traits)
    ? diagnostics.matrix_only_traits.map((value) => String(value))
    : [];
  const missingGlossary = traits
    .filter((trait) => (trait.statuses?.glossary || 'missing') !== 'ok')
    .map((trait) => trait.id)
    .filter(Boolean);

  return {
    generated_at: generatedAt,
    summary: {
      total_traits: toNumber(summary.total_traits) || traits.length,
      glossary_ok: toNumber(summary.glossary_ok),
      glossary_missing:
        toNumber(summary.glossary_missing) ||
        Math.max(traits.length - toNumber(summary.glossary_ok), 0),
      matrix_ok: toNumber(summary.matrix_ok),
      matrix_mismatch: toNumber(summary.matrix_mismatch),
      with_conflicts: toNumber(summary.with_conflicts),
      matrix_only_traits: toNumber(summary.matrix_only_traits) || matrixOnlyTraits.length,
    },
    traits,
    matrix_only_traits: matrixOnlyTraits,
    missing_glossary: missingGlossary,
    sources: {
      trait_reference: diagnostics?.sources?.trait_reference || null,
      trait_matrix: diagnostics?.sources?.trait_matrix || null,
      trait_glossary: diagnostics?.sources?.trait_glossary || null,
    },
  };
}

function buildQaBadgesReport(baseline) {
  const traits = Array.isArray(baseline?.traits) ? baseline.traits : [];
  const summary = baseline?.summary || {};
  const topConflicts = traits
    .map((trait) => ({
      id: trait.id,
      conflicts: Array.isArray(trait.conflicts) ? trait.conflicts.length : 0,
    }))
    .filter((entry) => entry.conflicts > 0)
    .sort((a, b) => b.conflicts - a.conflicts)
    .slice(0, 20);

  const zeroCoverage = traits
    .filter((trait) => !trait.coverage?.total)
    .map((trait) => trait.id)
    .filter(Boolean)
    .slice(0, 20);

  const matrixIssues = traits
    .filter((trait) => (trait.statuses?.matrix || 'mismatch') !== 'ok')
    .map((trait) => trait.id)
    .filter(Boolean)
    .slice(0, 20);

  return {
    generated_at: baseline?.generated_at || new Date().toISOString(),
    summary,
    checks: {
      traits: {
        passed: summary.glossary_ok || 0,
        total: summary.total_traits || traits.length,
        conflicts: summary.with_conflicts || 0,
        missing_glossary: summary.glossary_missing || 0,
        matrix_mismatch: summary.matrix_mismatch || 0,
      },
    },
    highlights: {
      glossary_missing: Array.isArray(baseline?.missing_glossary)
        ? baseline.missing_glossary.slice(0, 20)
        : [],
      matrix_only_traits: Array.isArray(baseline?.matrix_only_traits)
        ? baseline.matrix_only_traits.slice(0, 20)
        : [],
      matrix_mismatch_traits: matrixIssues,
      zero_coverage_traits: zeroCoverage,
      top_conflicts: topConflicts,
    },
    sources: baseline?.sources || {},
  };
}

function normaliseValidationCheck(entry, index) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const label = entry.label || entry.name || entry.id || `check_${index}`;
  const status = String(entry.status || entry.result || '').toLowerCase() || 'unknown';
  const errors = toNumber(entry.errors);
  const warnings = toNumber(entry.warnings);
  const traits = toStringArray(entry.traits);
  const dataset = toStringArray(entry.dataset);
  const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : null;
  return {
    id: entry.id || entry.name || String(index),
    label,
    status,
    passed:
      status === 'ok' ||
      status === 'pass' ||
      status === 'passed' ||
      (errors === 0 && status !== 'fail' && status !== 'error'),
    errors,
    warnings,
    traits,
    dataset,
    message: entry.message || entry.summary || null,
    metadata,
  };
}

function buildGeneratorValidationReport(diagnostics) {
  const payload = diagnostics?.generator_validation || diagnostics?.generatorValidation || {};
  const generatedAt =
    payload?.generated_at ||
    payload?.generatedAt ||
    diagnostics?.generated_at ||
    new Date().toISOString();
  const summarySource = payload?.summary || {};
  const rawChecks = Array.isArray(payload?.checks)
    ? payload.checks
    : Array.isArray(payload?.results)
      ? payload.results
      : [];
  const checks = rawChecks
    .map((entry, index) => normaliseValidationCheck(entry, index))
    .filter(Boolean);
  const errors = toStringArray(payload?.errors);
  const warnings = toStringArray(payload?.warnings);
  const totalChecks = checks.length;
  const passedChecks = checks.filter((entry) => entry.passed).length;
  const failedChecks = totalChecks - passedChecks;
  const summary = {
    total_traits: toNumber(summarySource.total_traits) || null,
    validated_traits: toNumber(summarySource.validated_traits) || null,
    failed_traits: toNumber(summarySource.failed_traits) || failedChecks || null,
    checks_total: totalChecks || null,
    checks_passed: passedChecks || null,
    checks_failed: failedChecks || null,
  };
  const context = payload?.context && typeof payload.context === 'object' ? payload.context : {};
  const sources = payload?.sources && typeof payload.sources === 'object' ? payload.sources : {};

  return {
    generated_at: generatedAt,
    summary,
    checks,
    warnings,
    errors,
    context,
    sources,
  };
}

function extractTraitSet(baseline, predicate) {
  const traits = Array.isArray(baseline?.traits) ? baseline.traits : [];
  return new Set(
    traits
      .filter((trait) => predicate(trait))
      .map((trait) => trait.id)
      .filter(Boolean),
  );
}

function computeZeroCoverageSet(baseline) {
  return extractTraitSet(baseline, (trait) => !toNumber(trait?.coverage?.total));
}

function computeMissingGlossarySet(baseline) {
  return extractTraitSet(baseline, (trait) => (trait?.statuses?.glossary || 'missing') !== 'ok');
}

function computeMatrixMismatchSet(baseline) {
  return extractTraitSet(baseline, (trait) => (trait?.statuses?.matrix || 'mismatch') !== 'ok');
}

function computeMatrixOnlySet(baseline) {
  return new Set(toStringArray(baseline?.matrix_only_traits));
}

function diffTraitSets(label, currentSet, previousSet) {
  const added = [];
  const resolved = [];
  for (const value of currentSet) {
    if (!previousSet.has(value)) {
      added.push(value);
    }
  }
  for (const value of previousSet) {
    if (!currentSet.has(value)) {
      resolved.push(value);
    }
  }
  return { label, added, resolved };
}

function formatDelta(label, previousValue, nextValue) {
  const previous = toNumber(previousValue);
  const current = toNumber(nextValue);
  const delta = current - previous;
  const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0';
  return `- ${label}: ${current} (${deltaLabel} vs precedente)`;
}

function limitList(values, max = 20) {
  return Array.isArray(values) ? values.filter(Boolean).slice(0, max) : [];
}

function buildQaChangelog({
  baseline,
  previousBaseline,
  generatorValidation,
  previousGeneratorValidation,
  qaBadges,
  previousQaBadges,
}) {
  const lines = ['# QA export changelog'];
  const generatedAt = baseline?.generated_at || qaBadges?.generated_at || new Date().toISOString();
  lines.push('', `Generato: ${generatedAt}`);
  if (previousBaseline?.generated_at) {
    lines.push(`Baseline precedente: ${previousBaseline.generated_at}`);
  }

  const currentSummary = baseline?.summary || {};
  const previousSummary = previousBaseline?.summary || {};

  lines.push('', '## Metriche baseline');
  lines.push(
    formatDelta(
      'Tratti totali',
      previousSummary.total_traits || 0,
      currentSummary.total_traits || 0,
    ),
  );
  lines.push(
    formatDelta('Glossario OK', previousSummary.glossary_ok || 0, currentSummary.glossary_ok || 0),
  );
  lines.push(
    formatDelta(
      'Glossario mancanti',
      previousSummary.glossary_missing || 0,
      currentSummary.glossary_missing || 0,
    ),
  );
  lines.push(
    formatDelta(
      'Mismatch matrice',
      previousSummary.matrix_mismatch || 0,
      currentSummary.matrix_mismatch || 0,
    ),
  );
  lines.push(
    formatDelta(
      'Tratti con conflitti',
      previousSummary.with_conflicts || 0,
      currentSummary.with_conflicts || 0,
    ),
  );

  const missingDiff = diffTraitSets(
    'tratti senza glossario',
    computeMissingGlossarySet(baseline),
    computeMissingGlossarySet(previousBaseline),
  );
  const matrixDiff = diffTraitSets(
    'tratti con mismatch matrice',
    computeMatrixMismatchSet(baseline),
    computeMatrixMismatchSet(previousBaseline),
  );
  const matrixOnlyDiff = diffTraitSets(
    'tratti presenti solo nel matrix',
    computeMatrixOnlySet(baseline),
    computeMatrixOnlySet(previousBaseline),
  );
  const zeroCoverageDiff = diffTraitSets(
    'tratti senza copertura QA',
    computeZeroCoverageSet(baseline),
    computeZeroCoverageSet(previousBaseline),
  );

  const traitDiffs = [missingDiff, matrixDiff, matrixOnlyDiff, zeroCoverageDiff];
  for (const diff of traitDiffs) {
    if (!diff.added.length && !diff.resolved.length) {
      continue;
    }
    lines.push('', `### ${diff.label}`);
    if (diff.added.length) {
      lines.push('- Nuovi:', `  - ${limitList(diff.added).join(', ')}`);
      if (diff.added.length > 20) {
        lines.push(`  - … (${diff.added.length - 20} ulteriori)`);
      }
    }
    if (diff.resolved.length) {
      lines.push('- Risolti:', `  - ${limitList(diff.resolved).join(', ')}`);
      if (diff.resolved.length > 20) {
        lines.push(`  - … (${diff.resolved.length - 20} ulteriori)`);
      }
    }
  }

  if (qaBadges?.highlights) {
    const highlights = qaBadges.highlights;
    lines.push('', '## Highlights UI');
    const highlightEntries = [
      ['Glossario mancante', highlights.glossary_missing],
      ['Solo matrice', highlights.matrix_only_traits],
      ['Mismatch matrice', highlights.matrix_mismatch_traits],
      ['Zero coverage', highlights.zero_coverage_traits],
    ];
    for (const [label, values] of highlightEntries) {
      const list = limitList(values, 10);
      if (list.length) {
        lines.push(`- ${label}: ${list.join(', ')}`);
      }
    }
    const topConflicts = limitList(highlights.top_conflicts, 10);
    if (topConflicts.length) {
      lines.push(
        '- Top conflitti:',
        ...topConflicts.map((entry) => `  - ${entry.id}: ${entry.conflicts}`),
      );
    }
  }

  if (generatorValidation) {
    const genSummary = generatorValidation.summary || {};
    const prevSummary = previousGeneratorValidation?.summary || {};
    lines.push('', '## Validazione generatore');
    lines.push(
      formatDelta('Check passati', prevSummary.checks_passed || 0, genSummary.checks_passed || 0),
    );
    lines.push(
      formatDelta('Check falliti', prevSummary.checks_failed || 0, genSummary.checks_failed || 0),
    );
    lines.push(
      formatDelta(
        'Tratti validati',
        prevSummary.validated_traits || 0,
        genSummary.validated_traits || 0,
      ),
    );
    const failingChecks = (
      Array.isArray(generatorValidation.checks) ? generatorValidation.checks : []
    )
      .filter((entry) => !entry.passed)
      .map((entry) => `${entry.label} (${entry.status})`);
    if (failingChecks.length) {
      lines.push(
        '',
        '### Check da monitorare',
        ...limitList(failingChecks, 10).map((item) => `- ${item}`),
      );
    }
  }

  if (qaBadges && previousQaBadges) {
    const currentChecks = qaBadges?.checks?.traits || {};
    const previousChecks = previousQaBadges?.checks?.traits || {};
    lines.push('', '## Badge QA');
    lines.push(formatDelta('Tratti passed', previousChecks.passed || 0, currentChecks.passed || 0));
    lines.push(
      formatDelta('Conflitti badge', previousChecks.conflicts || 0, currentChecks.conflicts || 0),
    );
  }

  lines.push('', '_Report generato da scripts/export-qa-report.js_');
  return `${lines.join('\n')}\n`;
}

async function writeJson(filePath, payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, 'utf8');
}

async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function readJson(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function preserveGeneratedAt(existing, nextPayload) {
  if (!existing || !existing.generated_at) {
    return nextPayload;
  }

  const { generated_at: _oldGeneratedAt, ...existingRest } = existing;
  const { generated_at: _newGeneratedAt, ...nextRest } = nextPayload;

  if (JSON.stringify(existingRest) === JSON.stringify(nextRest)) {
    return {
      ...nextPayload,
      generated_at: existing.generated_at,
    };
  }

  return nextPayload;
}

async function run() {
  const orchestrator = createGenerationOrchestratorBridge({
    autoShutdownMs: Number(process.env.ORCHESTRATOR_AUTOCLOSE_MS) || null,
  });

  try {
    const diagnosticsPayload = await orchestrator.fetchTraitDiagnostics();
    const diagnostics = diagnosticsPayload?.diagnostics || diagnosticsPayload;
    if (!diagnostics || typeof diagnostics !== 'object') {
      throw new Error('Trait diagnostics non disponibili');
    }

    const previousBaseline = await readJson(TRAIT_BASELINE_PATH);
    const baseline = preserveGeneratedAt(previousBaseline, buildTraitBaselineReport(diagnostics));

    const previousQaBadges = await readJson(QA_BADGES_PATH);
    const qaBadges = preserveGeneratedAt(previousQaBadges, buildQaBadgesReport(baseline));

    const previousGeneratorValidation = await readJson(GENERATOR_VALIDATION_PATH);
    const generatorValidation = preserveGeneratedAt(
      previousGeneratorValidation,
      buildGeneratorValidationReport(diagnostics),
    );

    const changelog = buildQaChangelog({
      baseline,
      previousBaseline,
      generatorValidation,
      previousGeneratorValidation,
      qaBadges,
      previousQaBadges,
    });

    await writeJson(TRAIT_BASELINE_PATH, baseline);
    await writeJson(QA_BADGES_PATH, qaBadges);
    await writeJson(GENERATOR_VALIDATION_PATH, generatorValidation);
    await writeText(QA_CHANGELOG_PATH, changelog);

    console.log('[export-qa-report] trait baseline aggiornato:', TRAIT_BASELINE_PATH);
    console.log('[export-qa-report] badge QA aggiornati:', QA_BADGES_PATH);
    console.log('[export-qa-report] validazione generatore aggiornata:', GENERATOR_VALIDATION_PATH);
    console.log('[export-qa-report] changelog QA aggiornato:', QA_CHANGELOG_PATH);
  } finally {
    try {
      await orchestrator.close();
    } catch (error) {
      console.warn('[export-qa-report] errore in chiusura orchestrator', error);
    }
  }
}

run().catch((error) => {
  console.error('[export-qa-report] esecuzione fallita:', error);
  process.exitCode = 1;
});
