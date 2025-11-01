#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SNAPSHOT_ENDPOINT =
  process.env.RECAP_SNAPSHOT_ENDPOINT || 'http://localhost:3000/api/generation/snapshot';
const NEBULA_ENDPOINT =
  process.env.RECAP_NEBULA_ENDPOINT || 'http://localhost:3000/api/nebula/atlas';
const QA_ENDPOINT = process.env.RECAP_QA_ENDPOINT || 'http://localhost:3000/api/qa/status';

const REPORTS_ROOT = path.resolve(__dirname, '../../reports');
const QA_BASELINE_PATH = path.join(REPORTS_ROOT, 'trait_baseline.json');
const QA_VALIDATION_PATH = path.join(REPORTS_ROOT, 'generator_validation.json');
const QA_CHANGELOG_PATH = path.join(REPORTS_ROOT, 'qa-changelog.md');
const QA_BADGES_PATH = path.join(REPORTS_ROOT, 'qa_badges.json');

const FETCH_TIMEOUT_MS = Number(process.env.RECAP_FETCH_TIMEOUT_MS || 8000);

function abortableFetch(url, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch non disponibile: usa Node.js >= 18');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function fetchJson(url, label) {
  if (!url) {
    return null;
  }
  try {
    const response = await abortableFetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`${label || 'request'} failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`[recap] impossibile recuperare ${label || url}:`, error.message || error);
    return null;
  }
}

async function readJsonMaybe(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn(`[recap] impossibile leggere ${filePath}:`, error.message || error);
    }
    return null;
  }
}

async function readTextMaybe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn(`[recap] impossibile leggere ${filePath}:`, error.message || error);
    }
    return null;
  }
}

async function loadQaHighlightBuilder() {
  const modulePath = pathToFileURL(path.join(__dirname, '../../webapp/src/services/qaHighlightFormatter.js'));
  try {
    const mod = await import(modulePath.href);
    if (mod && typeof mod.buildQaHighlightsSummary === 'function') {
      return mod.buildQaHighlightsSummary;
    }
  } catch (error) {
    console.warn('[recap] impossibile caricare il formatter QA', error.message || error);
  }
  return null;
}

function formatPercent(part, total) {
  const numerator = Number(part);
  const denominator = Number(total);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 'n/d';
  }
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatDate(value) {
  if (!value) {
    return 'n/d';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildSnapshotSection(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return '## Snapshot di generazione\nDati snapshot non disponibili.';
  }
  const lines = ['## Snapshot di generazione'];
  const biomes = ensureArray(snapshot.biomes);
  const biomeSummary = snapshot.biomeSummary || {};
  const encounterSummary = snapshot.encounterSummary || {};
  const qualityRelease = snapshot.qualityRelease || {};
  const runtime = snapshot.runtime || {};
  const publishing = snapshot.publishing || {};

  const validated = Number(biomeSummary.validated || 0);
  const pending = Number(biomeSummary.pending || 0);
  const totalBiomes = validated + pending || biomes.length;
  const encounterVariants = Number(encounterSummary.variants || 0);
  const encounterWarnings = Number(encounterSummary.warnings || 0);
  const encounterSeeds = Number(encounterSummary.seeds || 0);

  lines.push('',
    `- Biomi validati: **${validated}** su **${totalBiomes || 'n/d'}** (${pending} in attesa)`);
  lines.push(`- Varianti incontro: **${encounterVariants}** · Seeds: **${encounterSeeds}** · Avvisi: **${encounterWarnings}**`);

  if (qualityRelease.checks && typeof qualityRelease.checks === 'object') {
    const checks = Object.entries(qualityRelease.checks)
      .map(([name, stats]) => {
        const passed = Number(stats?.passed || 0);
        const total = Number(stats?.total || 0);
        const conflicts = Number(stats?.conflicts || stats?.failures || 0);
        return `| ${name} | ${passed}/${total || 'n/d'} | ${formatPercent(passed, total)} | ${conflicts || 0} |`;
      });
    if (checks.length) {
      lines.push('', '### Quality release', '| Ambito | Passati | Copertura | Conflitti |', '| --- | --- | --- | --- |', ...checks);
    }
  }

  if (qualityRelease.lastRun || ensureArray(qualityRelease.owners).length) {
    const owners = ensureArray(qualityRelease.owners);
    lines.push('', '- Ultima esecuzione qualità:', `  - Timestamp: ${formatDate(qualityRelease.lastRun)}`);
    if (owners.length) {
      lines.push(`  - Owner: ${owners.join(', ')}`);
    }
  }

  if (runtime && Object.keys(runtime).length) {
    lines.push('', '### Runtime recente');
    if (runtime.error) {
      lines.push(`- Errore: ${runtime.error}`);
    }
    if (runtime.lastBlueprintId) {
      lines.push(`- Ultimo blueprint rigenerato: ${runtime.lastBlueprintId}`);
    }
    if (runtime.lastRequestId) {
      lines.push(`- Richiesta: ${runtime.lastRequestId}`);
    }
    if (runtime.validationMessages !== undefined) {
      lines.push(`- Messaggi validazione: ${runtime.validationMessages}`);
    }
    if (runtime.fallbackUsed !== undefined) {
      lines.push(`- Fallback attivato: ${runtime.fallbackUsed ? 'sì' : 'no'}`);
    }
  }

  if (publishing && Object.keys(publishing).length) {
    const completion = `${Number(publishing.artifactsReady || 0)}/${Number(publishing.totalArtifacts || 0) || 'n/d'}`;
    lines.push('', '### Publishing');
    lines.push(`- Artifacts pronti: ${completion}`);
    const channels = ensureArray(publishing.channels);
    if (channels.length) {
      lines.push(`- Canali: ${channels.join(', ')}`);
    }
    if (publishing.workflow && typeof publishing.workflow === 'object') {
      lines.push('- Workflow:');
      for (const [step, info] of Object.entries(publishing.workflow)) {
        const label = step.charAt(0).toUpperCase() + step.slice(1);
        lines.push(`  - ${label}: ${info?.status || 'n/d'} · Owner: ${info?.owner || 'n/d'} · ETA: ${info?.eta || 'n/d'}`);
        if (info?.notes) {
          lines.push(`    - Note: ${info.notes}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function buildNebulaSection(nebulaPayload) {
  if (!nebulaPayload || typeof nebulaPayload !== 'object') {
    return '## Nebula atlas\nDati Nebula non disponibili.';
  }
  const { dataset, telemetry, generator } = nebulaPayload;
  const lines = ['## Nebula atlas'];

  if (dataset && typeof dataset === 'object') {
    const species = ensureArray(dataset.species);
    const readySpecies = species.filter((entry) => entry?.telemetry?.readiness === 'ready').length;
    lines.push('', `- Specie tracciate: **${species.length}** (Ready: ${readySpecies})`);
  }

  if (telemetry && typeof telemetry === 'object') {
    const summary = telemetry.summary || {};
    lines.push('', '### Telemetria live');
    lines.push(`- Eventi totali: ${summary.totalEvents || 0} · aperti: ${summary.openEvents || 0}`);
    lines.push(`- Priorità alta: ${summary.highPriorityEvents || 0} · riconosciuti: ${summary.acknowledgedEvents || 0}`);
    if (summary.lastEventAt) {
      lines.push(`- Ultimo evento: ${formatDate(summary.lastEventAt)}`);
    }
    const coverage = telemetry.coverage || {};
    if (coverage.average !== undefined) {
      lines.push(`- Copertura media: ${coverage.average}%`);
    }
    const distribution = coverage.distribution || {};
    const distEntries = Object.entries(distribution)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`);
    if (distEntries.length) {
      lines.push(`- Distribuzione readiness: ${distEntries.join(' · ')}`);
    }
  }

  if (generator && typeof generator === 'object') {
    lines.push('', '### Generatore');
    lines.push(`- Stato: ${generator.label || generator.status || 'n/d'}`);
    if (generator.generatedAt) {
      lines.push(`- Ultima generazione: ${formatDate(generator.generatedAt)}`);
    }
    if (generator.metrics && typeof generator.metrics === 'object') {
      const metrics = generator.metrics;
      lines.push(
        `- Specie generate: ${metrics.speciesTotal || 0} su dataset ${metrics.datasetSpeciesTotal || 'n/d'} · arricchite: ${metrics.enrichedSpecies || 0}`,
      );
      if (metrics.generationTimeMs !== null && metrics.generationTimeMs !== undefined) {
        lines.push(`- Tempo generazione medio: ${metrics.generationTimeMs}ms`);
      }
      lines.push(`- Eventi telemetria: ${metrics.eventTotal || 0}`);
    }
    if (generator.dataRoot) {
      lines.push(`- Data root: ${generator.dataRoot}`);
    }
  }

  return lines.join('\n');
}

function extractChangelogHighlights(markdown, limit = 5) {
  if (!markdown) {
    return [];
  }
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('*'));
  return lines.slice(0, limit);
}

function buildQaSection({ badges, baseline, generatorValidation, changelog, highlightBuilder }) {
  if (!badges && !baseline && !generatorValidation) {
    return '## QA Highlights\nDati QA non disponibili.';
  }
  const qaBadges = badges || baseline || {};
  const summary = qaBadges.summary || qaBadges.baseline_summary || qaBadges.diagnostics?.summary || {};
  const checks = qaBadges.checks || qaBadges.diagnostics?.checks || {};
  const highlights = qaBadges.highlights || qaBadges.diagnostics?.highlights || {};
  const lines = ['## QA Highlights'];

  let highlightSummary = null;
  if (typeof highlightBuilder === 'function') {
    try {
      highlightSummary = highlightBuilder(qaBadges, { limit: 6 });
    } catch (error) {
      console.warn('[recap] formatter QA non disponibile', error.message || error);
    }
  }

  if (highlightSummary && highlightSummary.metrics) {
    const metrics = highlightSummary.metrics;
    if (metrics.totalTraits) {
      lines.push(
        '',
        `- Glossario validato: ${metrics.glossaryOk}/${metrics.totalTraits} (${formatPercent(metrics.glossaryOk, metrics.totalTraits)})`,
      );
    }
    lines.push(
      `- Conflitti attivi: ${metrics.conflicts} · Mismatch matrice: ${metrics.matrixMismatch} · Solo matrice: ${metrics.matrixOnly} · Zero coverage: ${metrics.zeroCoverage}`,
    );
    if (Array.isArray(highlightSummary.sections) && highlightSummary.sections.length) {
      lines.push('', '### Highlights');
      for (const section of highlightSummary.sections) {
        if (!section.items || !section.items.length) {
          continue;
        }
        lines.push(`- **${section.title} (${section.total})**: ${section.items.join(', ')}`);
      }
    }
  } else {
    const totalTraits = Number(summary.total_traits || summary.totalTraits || 0);
    const glossaryOk = Number(summary.glossary_ok || summary.glossaryOk || 0);
    const conflicts = Number(summary.with_conflicts || summary.conflicts || 0);
    const matrixMismatch = Number(summary.matrix_mismatch || summary.matrixMismatch || 0);
    const zeroCoverage = ensureArray(highlights.zero_coverage_traits || highlights.zeroCoverageTraits).length;

    if (totalTraits) {
      lines.push('', `- Glossario validato: ${glossaryOk}/${totalTraits} (${formatPercent(glossaryOk, totalTraits)})`);
    }
    if (conflicts) {
      lines.push(`- Conflitti attivi: ${conflicts}`);
    }
    if (matrixMismatch) {
      lines.push(`- Mismatch matrice: ${matrixMismatch}`);
    }
    if (zeroCoverage) {
      lines.push(`- Tratti senza copertura QA: ${zeroCoverage}`);
    }

    if (checks.traits) {
      const traitCheck = checks.traits;
      const passed = Number(traitCheck.passed || 0);
      const total = Number(traitCheck.total || 0);
      const conflictsCount = Number(traitCheck.conflicts || 0);
      lines.push(
        '',
        '### Check tratti',
        `- Passed: ${passed}/${total || 'n/d'} (${formatPercent(passed, total)})`,
        `- Conflitti: ${conflictsCount}`,
      );
      if (traitCheck.missing_glossary !== undefined) {
        lines.push(`- Glossario mancanti: ${traitCheck.missing_glossary}`);
      }
      if (traitCheck.matrix_mismatch !== undefined) {
        lines.push(`- Mismatch matrice: ${traitCheck.matrix_mismatch}`);
      }
    }

    const topConflicts = ensureArray(highlights.top_conflicts || highlights.topConflicts).slice(0, 5);
    if (topConflicts.length) {
      lines.push('', '### Top conflitti', ...topConflicts.map((entry) => `- ${entry.id || entry.name}: ${entry.conflicts || entry.count}`));
    }
  }

  if (baseline && baseline.summary) {
    const baselineSummary = baseline.summary;
    lines.push('', '### Baseline tratti');
    lines.push(`- Glossario mancanti: ${baselineSummary.glossary_missing || 0}`);
    lines.push(`- Conflitti totali: ${baselineSummary.with_conflicts || 0}`);
    lines.push(`- Mismatch matrice: ${baselineSummary.matrix_mismatch || 0}`);
    lines.push(`- Tratti solo matrice: ${baselineSummary.matrix_only_traits || 0}`);
  }

  if (generatorValidation) {
    const validationSummary = generatorValidation.summary || {};
    const checksTotal = validationSummary.checks_total || 0;
    const checksPassed = validationSummary.checks_passed || 0;
    const checksFailed = validationSummary.checks_failed || 0;
    lines.push('', '### Validazione generatore');
    if (checksTotal) {
      lines.push(`- Check passati: ${checksPassed}/${checksTotal} (${formatPercent(checksPassed, checksTotal)})`);
    }
    if (validationSummary.validated_traits !== null && validationSummary.validated_traits !== undefined) {
      lines.push(`- Tratti validati: ${validationSummary.validated_traits}`);
    }
    if (checksFailed) {
      const failing = (Array.isArray(generatorValidation.checks) ? generatorValidation.checks : [])
        .filter((entry) => !entry.passed)
        .slice(0, 5)
        .map((entry) => entry.label || entry.id || 'check');
      if (failing.length) {
        lines.push(`- Check critici: ${failing.join(', ')}`);
      }
    }
    if (Array.isArray(generatorValidation.warnings) && generatorValidation.warnings.length) {
      lines.push(`- Warnings: ${generatorValidation.warnings.slice(0, 5).join(' · ')}`);
    }
    if (Array.isArray(generatorValidation.errors) && generatorValidation.errors.length) {
      lines.push(`- Errori: ${generatorValidation.errors.slice(0, 5).join(' · ')}`);
    }
  }

  const changelogHighlights = extractChangelogHighlights(changelog, 5);
  if (changelogHighlights.length) {
    lines.push('', '### QA changelog');
    for (const line of changelogHighlights) {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  let outputPath = null;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--output' && args[index + 1]) {
      outputPath = args[index + 1];
      index += 1;
    } else if (token.startsWith('--output=')) {
      outputPath = token.split('=')[1];
    }
  }

  const highlightBuilder = await loadQaHighlightBuilder();

  const [snapshot, nebula, qaFromEndpoint] = await Promise.all([
    fetchJson(SNAPSHOT_ENDPOINT, 'snapshot'),
    fetchJson(NEBULA_ENDPOINT, 'nebula'),
    fetchJson(QA_ENDPOINT, 'QA'),
  ]);

  const [qaBaseline, generatorValidation, qaChangelog, qaBadgesFallback] = await Promise.all([
    readJsonMaybe(QA_BASELINE_PATH),
    readJsonMaybe(QA_VALIDATION_PATH),
    readTextMaybe(QA_CHANGELOG_PATH),
    readJsonMaybe(QA_BADGES_PATH),
  ]);

  const qaBadges = qaFromEndpoint || qaBadgesFallback;
  const qaSection = buildQaSection({
    badges: qaBadges,
    baseline: qaBaseline,
    generatorValidation,
    changelog: qaChangelog,
    highlightBuilder,
  });

  const sections = [
    '# Live operations recap',
    '',
    `Generato: ${new Date().toISOString()}`,
    '',
    buildSnapshotSection(snapshot),
    '',
    buildNebulaSection(nebula),
    '',
    qaSection,
    '',
    '_Script: tools/recap/generateRecap.js_',
  ];

  const output = sections.filter(Boolean).join('\n');

  if (outputPath) {
    const resolvedPath = path.resolve(process.cwd(), outputPath);
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, `${output}\n`, 'utf8');
    console.log(`[recap] report generato in ${resolvedPath}`);
  } else {
    process.stdout.write(`${output}\n`);
  }
}

main().catch((error) => {
  console.error('[recap] errore generazione recap:', error);
  process.exitCode = 1;
});
