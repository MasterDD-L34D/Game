#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { evaluateTraitStyle, SEVERITY_ORDER } = require('../apps/backend/services/traitStyleGuide');

const DEFAULT_DATA_ROOT = path.resolve(__dirname, '..', 'data', 'traits');

async function main(argv) {
  const options = parseArgs(argv);
  const traitFiles = await collectTraitFiles(options.traitsRoot);
  const issues = [];
  for (const filePath of traitFiles) {
    const payload = await readJson(filePath);
    const traitId = payload && typeof payload === 'object' ? payload.id : null;
    const { suggestions, summary } = evaluateTraitStyle(payload, { traitId });
    if (!suggestions.length) {
      continue;
    }
    suggestions.forEach((suggestion) => {
      issues.push({
        file: filePath,
        traitId: traitId || '<unknown>',
        path: suggestion.path || '',
        message: suggestion.message,
        severity: suggestion.severity || 'warning',
        fix: suggestion.fix || null,
      });
    });
  }

  issues.sort((a, b) => {
    const severityDiff = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    if (a.traitId !== b.traitId) {
      return a.traitId.localeCompare(b.traitId, 'it');
    }
    return a.path.localeCompare(b.path, 'it');
  });

  const summary = summariseIssues(issues, traitFiles.length);

  if (options.outputJson) {
    await writeJson(options.outputJson, summary);
  }

  if (options.outputMarkdown) {
    await writeMarkdown(options.outputMarkdown, summary, issues);
  }

  if (!options.quiet) {
    printSummary(summary, issues, options);
  }

  const failThreshold = SEVERITY_ORDER[options.failOn] ?? SEVERITY_ORDER.error;
  const maxSeverity = issues.reduce(
    (acc, issue) => Math.max(acc, SEVERITY_ORDER[issue.severity] ?? 0),
    0,
  );
  if (maxSeverity >= failThreshold && issues.length > 0) {
    return 1;
  }
  return 0;
}

function parseArgs(argv) {
  const args = Array.from(argv);
  const options = {
    traitsRoot: DEFAULT_DATA_ROOT,
    outputJson: null,
    outputMarkdown: null,
    failOn: 'error',
    quiet: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case '--traits-root':
        options.traitsRoot = resolvePath(args[++index]);
        break;
      case '--output-json':
        options.outputJson = resolvePath(args[++index]);
        break;
      case '--output-markdown':
        options.outputMarkdown = resolvePath(args[++index]);
        break;
      case '--fail-on':
        options.failOn = String(args[++index] || 'error');
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        // ignore unknown flags to stay flexible
        break;
    }
  }

  return options;
}

function printUsage() {
  process.stdout.write(`Trait style guide check\n\n`);
  process.stdout.write(`Usage: node scripts/trait_style_check.js [options]\n\n`);
  process.stdout.write(`Options:\n`);
  process.stdout.write(
    `  --traits-root <path>       Directory radice dei file trait (default data/traits)\n`,
  );
  process.stdout.write(`  --output-json <path>       Percorso di output per il report JSON\n`);
  process.stdout.write(`  --output-markdown <path>   Percorso di output per il report Markdown\n`);
  process.stdout.write(
    `  --fail-on <severity>       Soglia di errore (info|warning|error), default error\n`,
  );
  process.stdout.write(`  --quiet                    Non stampare il riepilogo a console\n`);
  process.stdout.write(`  -h, --help                 Mostra questo messaggio\n`);
}

async function collectTraitFiles(root) {
  const output = [];
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      if (entry.isDirectory()) {
        if (entry.name === '_versions' || entry.name === '_drafts') {
          continue;
        }
        await walk(path.join(directory, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        if (['index.json', 'index.csv', 'species_affinity.json'].includes(entry.name)) {
          continue;
        }
        output.push(path.join(directory, entry.name));
      }
    }
  }
  await walk(root);
  return output;
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function summariseIssues(issues, totalTraits) {
  const counts = { info: 0, warning: 0, error: 0 };
  issues.forEach((issue) => {
    const severity = issue.severity || 'warning';
    counts[severity] = (counts[severity] || 0) + 1;
  });
  return {
    generatedAt: new Date().toISOString(),
    totalTraits,
    totalIssues: issues.length,
    counts,
    traitsWithIssues: new Set(issues.map((issue) => issue.traitId)).size,
  };
}

async function writeJson(targetPath, payload) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeMarkdown(targetPath, summary, issues) {
  const lines = [];
  lines.push(`# Trait style guide report`, '');
  lines.push(`Generato: ${summary.generatedAt}`);
  lines.push(`Totale trait analizzati: ${summary.totalTraits}`);
  lines.push(`Totale suggerimenti: ${summary.totalIssues}`);
  lines.push(
    `Breakdown: error=${summary.counts.error}, warning=${summary.counts.warning}, info=${summary.counts.info}`,
  );
  lines.push(`Trait con suggerimenti: ${summary.traitsWithIssues}`, '');
  if (!issues.length) {
    lines.push('_Nessuna anomalia rilevata._');
  } else {
    const grouped = new Map();
    issues.forEach((issue) => {
      const key = issue.traitId;
      const bucket = grouped.get(key) || [];
      bucket.push(issue);
      grouped.set(key, bucket);
    });
    for (const [traitId, traitIssues] of grouped.entries()) {
      lines.push(`## ${traitId}`, '');
      traitIssues.forEach((issue) => {
        lines.push(
          `- **${issue.severity.toUpperCase()}** — ${issue.message} (_${path.relative(
            process.cwd(),
            issue.file,
          )}${issue.path ? ` → ${issue.path}` : ''}_ )`,
        );
      });
      lines.push('');
    }
  }
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${lines.join('\n')}\n`, 'utf8');
}

function printSummary(summary, issues, options) {
  const line = `Trait style: ${summary.totalIssues} suggerimenti (error=${summary.counts.error}, warning=${summary.counts.warning}, info=${summary.counts.info}) su ${summary.totalTraits} file`;
  if (summary.totalIssues === 0) {
    console.log(`${line} ✅`);
    return;
  }
  console.log(line);
  issues.slice(0, 5).forEach((issue) => {
    console.log(
      `  - [${issue.severity.toUpperCase()}] ${issue.traitId} ${issue.path || '/'} :: ${issue.message}`,
    );
  });
  if (issues.length > 5 && !options.quiet) {
    console.log(`  … altri ${issues.length - 5} suggerimenti`);
  }
}

function resolvePath(candidate) {
  if (!candidate) {
    return null;
  }
  return path.resolve(process.cwd(), candidate);
}

if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error('[trait-style-check] errore non gestito', error);
      process.exit(1);
    });
}
