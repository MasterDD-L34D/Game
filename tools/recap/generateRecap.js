#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const SNAPSHOT_ENDPOINT =
  process.env.RECAP_SNAPSHOT_ENDPOINT || 'http://localhost:3000/api/v1/generation/snapshot';
const NEBULA_BASE = process.env.RECAP_NEBULA_BASE || 'http://localhost:3000/api/v1/atlas';
const NEBULA_DATASET_ENDPOINT =
  process.env.RECAP_NEBULA_DATASET_ENDPOINT || `${NEBULA_BASE.replace(/\/$/, '')}/dataset`;
const NEBULA_TELEMETRY_ENDPOINT =
  process.env.RECAP_NEBULA_TELEMETRY_ENDPOINT || `${NEBULA_BASE.replace(/\/$/, '')}/telemetry`;
const NEBULA_GENERATOR_ENDPOINT =
  process.env.RECAP_NEBULA_GENERATOR_ENDPOINT || `${NEBULA_BASE.replace(/\/$/, '')}/generator`;
const NEBULA_LEGACY_ENDPOINT =
  process.env.RECAP_NEBULA_ENDPOINT || 'http://localhost:3000/api/nebula/atlas';
const QA_ENDPOINT = process.env.RECAP_QA_ENDPOINT || 'http://localhost:3000/api/qa/status';

const REPORTS_ROOT = path.resolve(__dirname, '../../reports');
const QA_BASELINE_PATH = path.join(REPORTS_ROOT, 'trait_baseline.json');
const QA_VALIDATION_PATH = path.join(REPORTS_ROOT, 'generator_validation.json');
const QA_CHANGELOG_PATH = path.join(REPORTS_ROOT, 'qa-changelog.md');
const QA_BADGES_PATH = path.join(REPORTS_ROOT, 'qa_badges.json');
const STATUS_REPORT_PATH = path.join(REPORTS_ROOT, 'status.json');

const FETCH_TIMEOUT_MS = Number(process.env.RECAP_FETCH_TIMEOUT_MS || 8000);

function abortableFetch(url, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch non disponibile: usa Node.js >= 18');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
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
    const data = await response.json();
    return { data, response };
  } catch (error) {
    console.warn(`[recap] impossibile recuperare ${label || url}:`, error.message || error);
    return null;
  }
}

function unwrapNebulaDataset(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  if (payload.dataset && typeof payload.dataset === 'object' && !Array.isArray(payload.dataset)) {
    return payload.dataset;
  }
  return payload;
}

function warnIfDeprecated(result, label) {
  const header = result?.response?.headers?.get('deprecation');
  if (header) {
    const link = result.response.headers.get('link');
    const suffix = link ? ` (link: ${link})` : '';
    console.warn(`[recap] endpoint ${label} deprecato${suffix}`);
  }
}

async function loadNebulaBundle() {
  const [datasetResult, telemetryResult, generatorResult] = await Promise.all([
    fetchJson(NEBULA_DATASET_ENDPOINT, 'nebula dataset'),
    fetchJson(NEBULA_TELEMETRY_ENDPOINT, 'nebula telemetry'),
    fetchJson(NEBULA_GENERATOR_ENDPOINT, 'nebula generator'),
  ]);

  const bundle = {
    dataset: null,
    telemetry: null,
    generator: null,
  };

  if (datasetResult) {
    warnIfDeprecated(datasetResult, NEBULA_DATASET_ENDPOINT);
    const dataset = unwrapNebulaDataset(datasetResult.data);
    if (dataset && typeof dataset === 'object') {
      bundle.dataset = dataset;
    }
    if (!bundle.telemetry && datasetResult.data?.telemetry) {
      bundle.telemetry = datasetResult.data.telemetry;
    }
    if (!bundle.generator && datasetResult.data?.generator) {
      bundle.generator = datasetResult.data.generator;
    }
  }

  if (telemetryResult) {
    warnIfDeprecated(telemetryResult, NEBULA_TELEMETRY_ENDPOINT);
    bundle.telemetry = telemetryResult.data;
  }

  if (generatorResult) {
    warnIfDeprecated(generatorResult, NEBULA_GENERATOR_ENDPOINT);
    bundle.generator = generatorResult.data;
  }

  if (!bundle.dataset && !bundle.telemetry && !bundle.generator) {
    const legacyResult = await fetchJson(NEBULA_LEGACY_ENDPOINT, 'nebula legacy bundle');
    if (legacyResult && typeof legacyResult.data === 'object') {
      warnIfDeprecated(legacyResult, NEBULA_LEGACY_ENDPOINT);
      bundle.dataset = unwrapNebulaDataset(legacyResult.data);
      bundle.telemetry = legacyResult.data.telemetry || null;
      bundle.generator = legacyResult.data.generator || null;
    }
  }

  return bundle;
}

async function readJsonMaybe(filePath) {
  if (!filePath) {
    return null;
  }
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

async function readTextMaybe(filePath) {
  if (!filePath) {
    return null;
  }
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
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

function formatDistribution(distribution = {}) {
  const entries = Object.entries(distribution)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${value}`);
  if (!entries.length) {
    return null;
  }
  return entries.join(' · ');
}

function formatHistory(history = []) {
  const points = history.filter((value) => Number.isFinite(value));
  if (!points.length) {
    return null;
  }
  return points.map((value) => `${value}%`).join(' → ');
}

function buildReleaseReadinessSection({ goNoGo, coverage, snapshotSummary, qaSummary }) {
  if (!goNoGo || !Array.isArray(goNoGo.checks)) {
    return [
      '## Release Readiness',
      'Dati go/no-go non disponibili. Aggiorna `reports/status.json` eseguendo un refresh dello status deploy.',
    ].join('\n');
  }

  const stats = goNoGo.stats || {};
  const total = stats.total ?? goNoGo.checks.length;
  const failed = stats.failed ?? goNoGo.checks.filter((entry) => entry.status === 'failed').length;
  const warnings =
    stats.warnings ?? goNoGo.checks.filter((entry) => entry.status === 'warning').length;
  const passed = stats.passed ?? total - failed - warnings;

  const lines = ['## Release Readiness'];
  if (goNoGo.generatedAt) {
    lines.push(`- Ultimo aggiornamento Flow Shell: ${formatDate(goNoGo.generatedAt)}`);
  }
  lines.push(`- Stato complessivo: **${(goNoGo.status || 'nd').toUpperCase()}**`);
  lines.push(`- Esiti checklist: ${passed}/${total} ok · ${warnings} warning · ${failed} fail`);

  if (coverage) {
    const averageLabel =
      coverage.average !== undefined && coverage.average !== null ? `${coverage.average}%` : 'n/d';
    const historyLabel = formatHistory(ensureArray(coverage.history));
    const distributionLabel = formatDistribution(coverage.distribution || {});
    lines.push(
      `- Copertura Nebula: ${averageLabel}${historyLabel ? ` (storico: ${historyLabel})` : ''}`,
    );
    if (distributionLabel) {
      lines.push(`- Distribuzione readiness specie: ${distributionLabel}`);
    }
  }

  if (snapshotSummary && typeof snapshotSummary === 'object') {
    const biomes = snapshotSummary.biomes || {};
    const encounters = snapshotSummary.encounters || {};
    lines.push(
      `- Snapshot Flow Shell: biomi validati ${biomes.validated || 0}/${biomes.total || 'n/d'} · varianti incontro ${encounters.variants || 0}`,
    );
  }

  if (qaSummary && typeof qaSummary === 'object') {
    const totalTraits = Number(qaSummary.total_traits ?? qaSummary.totalTraits ?? 0);
    const conflicts = Number(qaSummary.with_conflicts ?? qaSummary.conflicts ?? 0);
    lines.push(
      `- QA trait diagnostics: conflitti ${conflicts} · copertura glossario ${formatPercent(qaSummary.glossary_ok, totalTraits)}`,
    );
  }

  lines.push('', '### Checklist Flow Shell');
  for (const check of goNoGo.checks) {
    if (!check) {
      continue;
    }
    const status = check.status || 'warning';
    const checkbox = status === 'passed' ? '[x]' : '[ ]';
    const icon = status === 'failed' ? '❌' : status === 'warning' ? '⚠️' : '✅';
    const flowRef = check.flowReference || check.title || check.id || 'Flow Shell step';
    const summary = check.summary || 'Verifica richiesta.';
    lines.push(`- ${checkbox} ${icon} ${flowRef}: ${summary}`);
  }

  return lines.join('\n');
}

function buildIncidentSection({ summary, timeline, sample }) {
  if (!summary) {
    return '## Incidenti aperti\nNessuna telemetria incidenti disponibile.';
  }

  const lines = ['## Incidenti aperti'];
  lines.push(
    `- Eventi totali: ${summary.totalEvents || 0} · aperti: ${summary.openEvents || 0} · alta priorità: ${summary.highPriorityEvents || 0}`,
  );
  lines.push(`- Incidenti riconosciuti: ${summary.acknowledgedEvents || 0}`);
  if (summary.lastEventAt) {
    lines.push(`- Ultimo evento registrato: ${formatDate(summary.lastEventAt)}`);
  }

  const timelineRows = ensureArray(timeline).slice(-7);
  if (timelineRows.length) {
    lines.push('', '### Timeline ultimi 7 giorni');
    lines.push('| Data | Totale | Alta priorità |');
    lines.push('| --- | ---: | ---: |');
    for (const entry of timelineRows) {
      lines.push(`| ${entry.date || 'n/d'} | ${entry.total ?? 0} | ${entry.highPriority ?? 0} |`);
    }
  }

  const sampleEvents = ensureArray(sample).slice(0, 3);
  if (sampleEvents.length) {
    lines.push('', '### Eventi recenti');
    for (const event of sampleEvents) {
      const parts = [];
      parts.push(`- ${event.summary || event.message || 'Evento'} (${event.priority || 'n/d'})`);
      if (event.event_timestamp || event.timestamp || event.created_at) {
        const timestamp = event.event_timestamp || event.timestamp || event.created_at;
        parts.push(`  - Timestamp: ${formatDate(timestamp)}`);
      }
      if (event.status) {
        parts.push(`  - Stato: ${event.status}`);
      }
      if (event.owner) {
        parts.push(`  - Owner: ${event.owner}`);
      }
      if (event.component_tag || event.component) {
        parts.push(`  - Componente: ${event.component_tag || event.component}`);
      }
      lines.push(...parts);
    }
  }

  return lines.join('\n');
}

function buildSnapshotSection(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return '## Snapshot di generazione\nDati snapshot non disponibili.';
  }

  const lines = ['## Snapshot di generazione'];
  const biomes = ensureArray(snapshot.biomes);
  const biomeSummary = snapshot.biomeSummary || snapshot.summary?.biomes || {};
  const encounterSummary = snapshot.encounterSummary || snapshot.summary?.encounters || {};
  const qualityRelease = snapshot.qualityRelease || snapshot.summary?.qualityRelease || {};
  const runtime = snapshot.runtime || snapshot.summary?.runtime || {};
  const publishing = snapshot.publishing || snapshot.summary?.publishing || {};

  const validated = Number(biomeSummary.validated || 0);
  const pending = Number(biomeSummary.pending || 0);
  const totalBiomes = Number(biomeSummary.total || 0) || biomes.length;
  const encounterVariants = Number(encounterSummary.variants || 0);
  const encounterWarnings = Number(encounterSummary.warnings || 0);
  const encounterSeeds = Number(encounterSummary.seeds || 0);

  lines.push(
    '',
    `- Biomi validati: **${validated}** su **${totalBiomes || 'n/d'}** (${pending} in attesa)`,
  );
  lines.push(
    `- Varianti incontro: **${encounterVariants}** · Seeds: **${encounterSeeds}** · Avvisi: **${encounterWarnings}**`,
  );

  if (qualityRelease.checks && typeof qualityRelease.checks === 'object') {
    const checks = Object.entries(qualityRelease.checks).map(([name, stats]) => {
      const passed = Number(stats?.passed || 0);
      const total = Number(stats?.total || 0);
      const conflicts = Number(stats?.conflicts || stats?.failures || 0);
      return `| ${name} | ${passed}/${total || 'n/d'} | ${formatPercent(passed, total)} | ${conflicts || 0} |`;
    });
    if (checks.length) {
      lines.push(
        '',
        '### Quality release',
        '| Ambito | Passati | Copertura | Conflitti |',
        '| --- | --- | --- | --- |',
        ...checks,
      );
    }
  }

  if (qualityRelease.lastRun || ensureArray(qualityRelease.owners).length) {
    const owners = ensureArray(qualityRelease.owners);
    lines.push(
      '',
      '- Ultima esecuzione qualità:',
      `  - Timestamp: ${formatDate(qualityRelease.lastRun)}`,
    );
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
        lines.push(
          `  - ${label}: ${info?.status || 'n/d'} · Owner: ${info?.owner || 'n/d'} · ETA: ${info?.eta || 'n/d'}`,
        );
        if (info?.notes) {
          lines.push(`    - Note: ${info.notes}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function buildNebulaSection(nebulaPayload, nebulaSummary) {
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

  const telemetryNode = telemetry || nebulaSummary?.telemetry || {};
  if (telemetryNode && typeof telemetryNode === 'object') {
    const summary = telemetryNode.summary || {};
    lines.push('', '### Telemetria live');
    lines.push(`- Eventi totali: ${summary.totalEvents || 0} · aperti: ${summary.openEvents || 0}`);
    lines.push(
      `- Priorità alta: ${summary.highPriorityEvents || 0} · riconosciuti: ${summary.acknowledgedEvents || 0}`,
    );
    if (summary.lastEventAt) {
      lines.push(`- Ultimo evento: ${formatDate(summary.lastEventAt)}`);
    }
    const coverage = telemetryNode.coverage || {};
    if (coverage.average !== undefined && coverage.average !== null) {
      const historyLabel = formatHistory(ensureArray(coverage.history));
      lines.push(
        `- Copertura media: ${coverage.average}%${historyLabel ? ` (storico: ${historyLabel})` : ''}`,
      );
    }
    const distribution = formatDistribution(telemetryNode.coverage?.distribution || {});
    if (distribution) {
      lines.push(`- Distribuzione readiness: ${distribution}`);
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

function buildQaSection({ qaPayload, qaSummary, qaBadges, baseline, validation, changelog }) {
  const payload = qaPayload || {};
  const summary = qaSummary || payload.summary || payload.diagnostics?.summary || {};
  const checks = payload.checks || payload.diagnostics?.checks || {};
  const highlights = payload.highlights || payload.diagnostics?.highlights || {};
  const lines = ['## QA Highlights'];

  const totalTraits = Number(summary.total_traits || summary.totalTraits || 0);
  const glossaryOk = Number(summary.glossary_ok || summary.glossaryOk || 0);
  const conflicts = Number(summary.with_conflicts || summary.conflicts || 0);
  const matrixMismatch = Number(summary.matrix_mismatch || summary.matrixMismatch || 0);
  const zeroCoverage = ensureArray(
    highlights.zero_coverage_traits || highlights.zeroCoverageTraits,
  ).length;

  if (totalTraits) {
    lines.push(
      '',
      `- Glossario validato: ${glossaryOk}/${totalTraits} (${formatPercent(glossaryOk, totalTraits)})`,
    );
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
    lines.push(
      '',
      '### Top conflitti',
      ...topConflicts.map(
        (entry) => `- ${entry.id || entry.name}: ${entry.conflicts || entry.count}`,
      ),
    );
  }

  if (qaBadges && Array.isArray(qaBadges.badges) && qaBadges.badges.length) {
    lines.push(
      '',
      '### QA Badges',
      ...qaBadges.badges.map(
        (badge) =>
          `- ${badge.label || badge.id || 'Badge'}: ${badge.value || badge.status || 'n/d'}`,
      ),
    );
  }

  if (baseline && baseline.generated_at) {
    lines.push('', `Baseline generata il: ${formatDate(baseline.generated_at)}`);
  }
  if (validation && validation.generated_at) {
    lines.push(`Ultima validazione generatore: ${formatDate(validation.generated_at)}`);
  }
  if (changelog) {
    lines.push('', '### QA Changelog', changelog.trim());
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

  const statusReport = await readJsonMaybe(STATUS_REPORT_PATH);

  const [
    snapshotResult,
    nebulaFallback,
    qaResult,
    qaBaseline,
    qaValidation,
    qaChangelog,
    qaBadges,
  ] = await Promise.all([
    fetchJson(SNAPSHOT_ENDPOINT, 'snapshot'),
    loadNebulaBundle(),
    fetchJson(QA_ENDPOINT, 'QA'),
    readJsonMaybe(QA_BASELINE_PATH),
    readJsonMaybe(QA_VALIDATION_PATH),
    readTextMaybe(QA_CHANGELOG_PATH),
    readJsonMaybe(QA_BADGES_PATH),
  ]);

  const snapshotFromStatus =
    statusReport?.telemetry?.snapshot?.data || statusReport?.telemetry?.snapshot?.dataset || null;
  const snapshotSummary = statusReport?.telemetry?.snapshot?.summary || null;
  const snapshot = snapshotFromStatus || snapshotResult?.data || null;

  const nebulaAtlas = statusReport?.telemetry?.nebula?.atlas || null;
  const nebulaSummary = statusReport?.telemetry?.nebula?.summary || null;
  const nebula =
    nebulaAtlas ||
    (nebulaFallback.dataset || nebulaFallback.telemetry || nebulaFallback.generator
      ? nebulaFallback
      : null);

  const qaFromStatus = statusReport?.telemetry?.traitDiagnostics?.diagnostics || null;
  const qaSummary = statusReport?.telemetry?.traitDiagnostics?.summary || null;
  const qaPayload = qaFromStatus || qaResult?.data || null;

  const goNoGo = statusReport?.goNoGo || null;
  const coverage = nebulaSummary?.telemetry?.coverage || nebula?.telemetry?.coverage || null;
  const incidentSummary = nebulaSummary?.telemetry?.summary || nebula?.telemetry?.summary || null;
  const incidentTimeline =
    nebulaSummary?.telemetry?.incidents?.timeline || nebula?.telemetry?.incidents?.timeline || [];
  const incidentSample = nebula?.telemetry?.sample || [];

  const sections = [
    '# Live operations recap',
    '',
    `Generato: ${new Date().toISOString()}`,
    '',
    buildReleaseReadinessSection({
      goNoGo,
      coverage,
      snapshotSummary,
      qaSummary,
    }),
    '',
    buildIncidentSection({
      summary: incidentSummary,
      timeline: incidentTimeline,
      sample: incidentSample,
    }),
    '',
    buildSnapshotSection(snapshot),
    '',
    buildNebulaSection(nebula, nebulaSummary),
    '',
    buildQaSection({
      qaPayload,
      qaSummary,
      qaBadges,
      baseline: qaBaseline,
      validation: qaValidation,
      changelog: qaChangelog,
    }),
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
