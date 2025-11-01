const DEFAULT_LIMIT = 10;

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normaliseArray(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
}

function formatPercentage(part, total) {
  if (!total) {
    return null;
  }
  const ratio = Number(part) / Number(total);
  if (!Number.isFinite(ratio) || total === 0) {
    return null;
  }
  return `${Math.round(ratio * 100)}%`;
}

function badgeColorForScore(passed, total) {
  if (!total) {
    return 'lightgrey';
  }
  if (passed >= total) {
    return 'brightgreen';
  }
  if (passed / total >= 0.8) {
    return 'green';
  }
  if (passed / total >= 0.6) {
    return 'yellow';
  }
  return 'orange';
}

function badgeColorForAlert(count) {
  return count > 0 ? 'orange' : 'brightgreen';
}

export function buildQaHighlightsSummary(payload, options = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const limit = Number(options.limit || DEFAULT_LIMIT) || DEFAULT_LIMIT;
  const summary = payload.summary || payload.baseline_summary || payload.diagnostics?.summary || {};
  const traitsCheck = payload.checks?.traits || payload.diagnostics?.checks?.traits || {};
  const highlights = payload.highlights || payload.diagnostics?.highlights || {};

  const totalTraits = toNumber(summary.total_traits || summary.totalTraits);
  const glossaryOk = toNumber(summary.glossary_ok || summary.glossaryOk);
  const glossaryMissing = toNumber(summary.glossary_missing || summary.glossaryMissing);
  const conflicts = toNumber(summary.with_conflicts || summary.conflicts);
  const matrixMismatch = toNumber(summary.matrix_mismatch || summary.matrixMismatch);
  const matrixOnly = normaliseArray(highlights.matrix_only_traits || highlights.matrixOnlyTraits).length;
  const zeroCoverageArray = normaliseArray(highlights.zero_coverage_traits || highlights.zeroCoverageTraits);
  const zeroCoverage = zeroCoverageArray.length;

  const badges = [
    {
      key: 'traits',
      label: 'Traits',
      value: `${glossaryOk}/${totalTraits || 'n/d'}`,
      color: badgeColorForScore(glossaryOk, totalTraits || traitsCheck.total),
      description: 'Tratti con metadati glossary validi',
    },
    {
      key: 'conflicts',
      label: 'Conflicts',
      value: String(traitsCheck.conflicts ?? conflicts ?? 0),
      color: badgeColorForAlert(traitsCheck.conflicts ?? conflicts ?? 0),
      description: 'Conflitti rilevati dal matrix QA',
    },
    {
      key: 'matrix',
      label: 'Matrix mismatch',
      value: String(traitsCheck.matrix_mismatch ?? matrixMismatch ?? 0),
      color: badgeColorForAlert(traitsCheck.matrix_mismatch ?? matrixMismatch ?? 0),
      description: 'Tratti non allineati con la coverage matrix',
    },
    {
      key: 'coverage',
      label: 'Zero coverage',
      value: String(zeroCoverage),
      color: badgeColorForAlert(zeroCoverage),
      description: 'Tratti senza copertura QA',
    },
  ];

  const sectionDefinitions = [
    { key: 'glossary_missing', title: 'Glossario mancante' },
    { key: 'matrix_only_traits', title: 'Solo matrice' },
    { key: 'matrix_mismatch_traits', title: 'Mismatch matrice' },
    { key: 'zero_coverage_traits', title: 'Zero coverage' },
  ];

  const sections = sectionDefinitions.map((section) => {
    const source = highlights[section.key] || highlights[section.key.replace(/_(.)/g, (_, char) => char.toUpperCase())];
    const values = normaliseArray(source).map((item) => String(item));
    return {
      key: section.key,
      title: section.title,
      total: values.length,
      items: values.slice(0, limit),
    };
  });

  const topConflicts = normaliseArray(highlights.top_conflicts || highlights.topConflicts).map((entry) => ({
    id: entry?.id || entry?.name || '',
    conflicts: toNumber(entry?.conflicts || entry?.count),
  }));

  const checksTotal = toNumber(traitsCheck.total || summary.total_traits);
  const checksPassed = toNumber(traitsCheck.passed || summary.glossary_ok);

  return {
    generatedAt: payload.generated_at || payload.generatedAt || null,
    metrics: {
      totalTraits,
      glossaryOk,
      glossaryMissing,
      glossaryPercent: formatPercentage(glossaryOk, totalTraits),
      conflicts,
      matrixMismatch,
      matrixOnly,
      zeroCoverage,
    },
    badges,
    sections,
    topConflicts: topConflicts.slice(0, limit),
    checks: {
      total: checksTotal,
      passed: checksPassed,
      percent: formatPercentage(checksPassed, checksTotal),
    },
  };
}

export default {
  buildQaHighlightsSummary,
};
