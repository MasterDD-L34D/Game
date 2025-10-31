#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');

const { createGenerationOrchestratorBridge } = require('../server/services/orchestratorBridge');

const REPO_ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
const TRAIT_BASELINE_PATH = path.join(REPORTS_DIR, 'trait_baseline.json');
const QA_BADGES_PATH = path.join(REPORTS_DIR, 'qa_badges.json');

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

function normaliseTraitEntry(entry) {
  const coverage = {
    core: toNumber(entry?.coverage?.core),
    optional: toNumber(entry?.coverage?.optional),
    synergy: toNumber(entry?.coverage?.synergy),
  };
  coverage.total = toNumber(entry?.total_coverage) || coverage.core + coverage.optional + coverage.synergy;
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
  const generatedAt = diagnostics?.generated_at || diagnostics?.generatedAt || new Date().toISOString();
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
      glossary_missing: toNumber(summary.glossary_missing) || Math.max(traits.length - toNumber(summary.glossary_ok), 0),
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
    .map((trait) => ({ id: trait.id, conflicts: Array.isArray(trait.conflicts) ? trait.conflicts.length : 0 }))
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

async function writeJson(filePath, payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, 'utf8');
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

    await writeJson(TRAIT_BASELINE_PATH, baseline);
    await writeJson(QA_BADGES_PATH, qaBadges);

    console.log('[export-qa-report] trait baseline aggiornato:', TRAIT_BASELINE_PATH);
    console.log('[export-qa-report] badge QA aggiornati:', QA_BADGES_PATH);
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
