#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_DATASET = path.join(ROOT, 'data', 'telemetry', 'items.json');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'logs', 'balance_proposals');
const FILE_PREFIX = 'items-';
const FILE_EXTENSION = '.yaml';
const SEVERITY_ORDER = ['trivial', 'minor', 'moderate', 'major', 'critical'];

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    items: DEFAULT_DATASET,
    output: DEFAULT_OUTPUT_DIR,
    tag: '',
    dryRun: false,
    check: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const value = args[i];
    if (value === '--items' || value === '-i') {
      options.items = resolvePath(args[++i], DEFAULT_DATASET);
    } else if (value === '--output' || value === '-o') {
      options.output = resolvePath(args[++i], DEFAULT_OUTPUT_DIR);
    } else if (value === '--tag' || value === '-t') {
      options.tag = String(args[++i] || '').trim();
    } else if (value === '--dry-run') {
      options.dryRun = true;
    } else if (value === '--check') {
      options.check = true;
    } else if (value === '--help' || value === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Argomento sconosciuto: ${value}`);
    }
  }

  return options;
}

function resolvePath(input, fallback) {
  if (!input) {
    return fallback;
  }
  if (path.isAbsolute(input)) {
    return input;
  }
  return path.resolve(process.cwd(), input);
}

function printUsage() {
  console.log(`Utilizzo: node scripts/balance/tune_items.js [opzioni]\n\n` +
    `Opzioni:\n` +
    `  --items,  -i   Percorso al dataset JSON (default: data/telemetry/items.json)\n` +
    `  --output, -o   Directory di destinazione (default: logs/balance_proposals)\n` +
    `  --tag,    -t   Suffisso facoltativo per il nome del file\n` +
    `  --dry-run      Stampa il risultato su STDOUT senza scrivere file\n` +
    `  --check        Confronta l'output con l'ultimo file generato\n` +
    `  --help,   -h   Mostra questo messaggio`);
}

function readJson(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(src);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Dataset non trovato: ${filePath}`);
    }
    throw new Error(`Impossibile leggere ${filePath}: ${error.message}`);
  }
}

function ensureDirectory(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function toNumber(value) {
  if (value == null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundNumber(value) {
  if (!Number.isFinite(value)) {
    return value;
  }
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : 4;
  return Number(value.toFixed(digits));
}

function getRules(dataset) {
  const rules = dataset.rules || {};
  const defaults = rules.defaults || {};
  return {
    defaults: {
      tolerance: toNumber(defaults.tolerance) || 0.02,
      weight: toNumber(defaults.weight) || 1,
    },
    metrics: Object.entries(rules.metrics || {}).reduce((acc, [metric, config]) => {
      const tolerance = toNumber(config && config.tolerance);
      const weight = toNumber(config && config.weight);
      acc[metric] = {
        tolerance: tolerance || null,
        weight: weight || null,
      };
      return acc;
    }, {}),
  };
}

function metricTolerance(metric, rules) {
  const entry = rules.metrics[metric] || {};
  return entry.tolerance || rules.defaults.tolerance;
}

function metricWeight(metric, rules) {
  const entry = rules.metrics[metric] || {};
  return entry.weight || rules.defaults.weight;
}

function severityFromDelta(absDelta, tolerance) {
  if (!Number.isFinite(absDelta) || !Number.isFinite(tolerance) || tolerance <= 0) {
    return 'trivial';
  }
  const normalized = absDelta / tolerance;
  const epsilon = Number.EPSILON * 10;
  if (normalized + epsilon >= 3) return 'critical';
  if (normalized + epsilon >= 2) return 'major';
  if (normalized + epsilon >= 1) return 'moderate';
  if (normalized + epsilon >= 0.5) return 'minor';
  return 'trivial';
}

function compareSeverity(a, b) {
  return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b);
}

function actionFromDelta(delta, severity) {
  if (!Number.isFinite(delta) || severity === 'trivial' || delta === 0) {
    return 'hold';
  }
  return delta > 0 ? 'buff' : 'nerf';
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return `${roundNumber(value * 100)}%`;
}

function recommendation(metric, delta, severity) {
  if (severity === 'trivial' || !Number.isFinite(delta)) {
    return 'Monitorare: scostamento entro la soglia.';
  }
  const direction = delta > 0 ? 'Incrementare' : 'Ridurre';
  const magnitude = Math.abs(delta);
  const prettyMetric = metric.replace(/_/g, ' ');
  const relative = formatPercent(delta);
  const formattedDelta = roundNumber(magnitude);
  if (relative) {
    return `${direction} ${prettyMetric} di ${formattedDelta} (${relative}).`;
  }
  return `${direction} ${prettyMetric} di ${formattedDelta}.`;
}

function sanitizeItemDetails(item) {
  const result = {};
  if (item.id) result.id = String(item.id);
  if (item.name) result.name = String(item.name);
  if (item.role) result.role = String(item.role);
  if (item.rarity) result.rarity = String(item.rarity);
  if (item.notes) result.notes = String(item.notes);
  return result;
}

function buildProposal(dataset, { timestamp } = {}) {
  const rules = getRules(dataset);
  const items = Array.isArray(dataset.items) ? dataset.items : [];
  const now = timestamp ? new Date(timestamp) : new Date();

  let totalScore = 0;
  const enriched = [];
  for (const item of items) {
    const metrics = item.metrics || {};
    const resultMetrics = {};
    let highestSeverity = 'trivial';
    let itemScore = 0;
    let suggestedDirection = 'hold';

    for (const [metric, values] of Object.entries(metrics)) {
      const current = toNumber(values && values.current);
      const target = toNumber(values && values.target);
      if (!Number.isFinite(current) || !Number.isFinite(target)) {
        continue;
      }
      const delta = target - current;
      const absDelta = Math.abs(delta);
      const tolerance = metricTolerance(metric, rules);
      const weight = metricWeight(metric, rules);
      const severity = severityFromDelta(absDelta, tolerance);
      if (compareSeverity(severity, highestSeverity) > 0) {
        highestSeverity = severity;
      }
      const action = actionFromDelta(delta, severity);
      if (action !== 'hold') {
        suggestedDirection = action;
      }
      const score = Number.isFinite(tolerance) && tolerance > 0 ? (absDelta / tolerance) * weight : absDelta * weight;
      itemScore += score;
      totalScore += score;
      resultMetrics[metric] = {
        current: roundNumber(current),
        target: roundNumber(target),
        delta: roundNumber(delta),
        delta_ratio: Number.isFinite(target) && target !== 0 ? roundNumber(delta / target) : null,
        tolerance: roundNumber(tolerance),
        severity,
        action,
        weight: roundNumber(weight),
        score: roundNumber(score),
        recommendation: recommendation(metric, delta, severity),
      };
    }

    if (Object.keys(resultMetrics).length === 0) {
      continue;
    }

    const details = sanitizeItemDetails(item);
    details.summary = {
      peak_severity: highestSeverity,
      total_score: roundNumber(itemScore),
      suggested_direction: suggestedDirection,
    };
    details.metrics = Object.keys(resultMetrics)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        const metricDetails = resultMetrics[key];
        if (metricDetails.delta_ratio === null) {
          delete metricDetails.delta_ratio;
        }
        acc[key] = metricDetails;
        return acc;
      }, {});

    enriched.push(details);
  }

  enriched.sort((a, b) => {
    const scoreB = Number.isFinite(b.summary?.total_score) ? b.summary.total_score : 0;
    const scoreA = Number.isFinite(a.summary?.total_score) ? a.summary.total_score : 0;
    if (scoreB === scoreA) {
      return (a.id || '').localeCompare(b.id || '');
    }
    return scoreB - scoreA;
  });

  const alerts = enriched
    .filter((item) => compareSeverity(item.summary?.peak_severity || 'trivial', 'moderate') >= 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      peak_severity: item.summary?.peak_severity,
      total_score: item.summary?.total_score,
      suggested_direction: item.summary?.suggested_direction,
    }));

  const metadata = dataset.metadata || {};
  const summary = {
    generated_at: now.toISOString(),
    dataset_generated_at: metadata.generated_at || null,
    season: metadata.season || null,
    source_snapshot: metadata.source || null,
    items_considered: enriched.length,
    total_score: roundNumber(totalScore),
    average_score: enriched.length ? roundNumber(totalScore / enriched.length) : 0,
    defaults: {
      tolerance: roundNumber(rules.defaults.tolerance),
      weight: roundNumber(rules.defaults.weight),
    },
  };
  if (alerts.length > 0) {
    summary.alerts = alerts;
  }

  return {
    summary,
    items: enriched,
  };
}

function generateFileName(tag = '') {
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const suffix = tag ? `-${tag.replace(/[^a-z0-9_-]+/gi, '').toLowerCase()}` : '';
  return `${FILE_PREFIX}${timestamp}${suffix}${FILE_EXTENSION}`;
}

function findLatestProposal(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return null;
  }
  const files = fs.readdirSync(dirPath).filter((name) => name.startsWith(FILE_PREFIX) && name.endsWith(FILE_EXTENSION));
  if (files.length === 0) {
    return null;
  }
  files.sort();
  return path.join(dirPath, files[files.length - 1]);
}

function normalizeForComparison(proposal) {
  const clone = JSON.parse(JSON.stringify(proposal || {}));
  if (clone.summary) {
    delete clone.summary.generated_at;
  }
  if (Array.isArray(clone.items)) {
    clone.items = clone.items
      .map((item) => {
        const normalized = { ...item };
        if (normalized.metrics) {
          const ordered = Object.keys(normalized.metrics)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
              acc[key] = normalized.metrics[key];
              return acc;
            }, {});
          normalized.metrics = ordered;
        }
        return normalized;
      })
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  }
  return clone;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv);
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exit(1);
    return;
  }

  let dataset;
  try {
    dataset = readJson(options.items);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
    return;
  }

  const proposal = buildProposal(dataset);
  const yamlContent = yaml.dump(proposal, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });

  if (options.dryRun) {
    process.stdout.write(yamlContent);
    return;
  }

  ensureDirectory(options.output);

  if (options.check) {
    const latest = findLatestProposal(options.output);
    if (!latest) {
      console.error('Nessuna proposta trovata: generare un file prima di eseguire --check.');
      process.exit(1);
      return;
    }
    let existing;
    try {
      existing = yaml.load(fs.readFileSync(latest, 'utf8')) || {};
    } catch (error) {
      console.error(`Impossibile leggere ${latest}: ${error.message}`);
      process.exit(1);
      return;
    }

    const expected = normalizeForComparison(proposal);
    const current = normalizeForComparison(existing);
    if (JSON.stringify(expected) !== JSON.stringify(current)) {
      console.error('La proposta esistente non è aggiornata con i dati correnti.');
      console.error(`Ultimo file: ${path.relative(ROOT, latest)}`);
      console.error('Suggerimento: rieseguire lo script senza --check per aggiornare i delta.');
      process.exit(1);
      return;
    }

    console.log(`Proposta aggiornata: ${path.relative(ROOT, latest)}`);
    return;
  }

  const fileName = generateFileName(options.tag);
  const targetPath = path.join(options.output, fileName);
  fs.writeFileSync(targetPath, yamlContent);
  console.log(`Proposta di bilanciamento salvata in ${path.relative(ROOT, targetPath)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildProposal,
  parseArgs,
  severityFromDelta,
  actionFromDelta,
  normalizeForComparison,
};
