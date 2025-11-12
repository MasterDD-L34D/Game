#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const {
  createNebulaTelemetryAggregator,
} = require('../../server/services/nebulaTelemetryAggregator');
const { createGenerationSnapshotStore } = require('../../server/services/generationSnapshotStore');
const { createReleaseReporter } = require('../../server/services/releaseReporter');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DEFAULT_STATUS_PATH = path.join(ROOT_DIR, 'reports', 'status.json');
const DEFAULT_SNAPSHOT_PATH = path.join(ROOT_DIR, 'data', 'flow-shell', 'atlas-snapshot.json');
const DEFAULT_TELEMETRY_PATH = path.join(
  ROOT_DIR,
  'data',
  'derived',
  'exports',
  'qa-telemetry-export.json',
);
const DEFAULT_GENERATOR_TELEMETRY_PATH = path.join(
  ROOT_DIR,
  'logs',
  'tooling',
  'generator_run_profile.json',
);
const DEFAULT_TRAIT_BASELINE_PATH = path.join(ROOT_DIR, 'reports', 'trait_baseline.json');
const DEFAULT_ORCHESTRATOR_LOG_DIR = path.join(ROOT_DIR, 'logs', 'orchestrator');
const DEFAULT_SPECIES_MATRIX_PATH = path.join(
  ROOT_DIR,
  'reports',
  'evo',
  'rollout',
  'species_ecosystem_matrix.csv',
);

function parseArgs(argv) {
  const options = {
    status: DEFAULT_STATUS_PATH,
    snapshot: DEFAULT_SNAPSHOT_PATH,
    telemetry: DEFAULT_TELEMETRY_PATH,
    generatorTelemetry: DEFAULT_GENERATOR_TELEMETRY_PATH,
    traitBaseline: DEFAULT_TRAIT_BASELINE_PATH,
    orchestratorLogDir: DEFAULT_ORCHESTRATOR_LOG_DIR,
    speciesMatrix: DEFAULT_SPECIES_MATRIX_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if ((token === '--status' || token === '--out') && argv[index + 1]) {
      options.status = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--status=')) {
      options.status = path.resolve(ROOT_DIR, token.slice('--status='.length));
      continue;
    }
    if ((token === '--snapshot' || token === '--snapshot-path') && argv[index + 1]) {
      options.snapshot = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--snapshot=')) {
      options.snapshot = path.resolve(ROOT_DIR, token.slice('--snapshot='.length));
      continue;
    }
    if ((token === '--telemetry' || token === '--telemetry-path') && argv[index + 1]) {
      options.telemetry = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--telemetry=')) {
      options.telemetry = path.resolve(ROOT_DIR, token.slice('--telemetry='.length));
      continue;
    }
    if ((token === '--generator-telemetry' || token === '--generator') && argv[index + 1]) {
      options.generatorTelemetry = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--generator-telemetry=')) {
      options.generatorTelemetry = path.resolve(
        ROOT_DIR,
        token.slice('--generator-telemetry='.length),
      );
      continue;
    }
    if ((token === '--trait-baseline' || token === '--baseline') && argv[index + 1]) {
      options.traitBaseline = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--trait-baseline=')) {
      options.traitBaseline = path.resolve(ROOT_DIR, token.slice('--trait-baseline='.length));
      continue;
    }
    if (token === '--orchestrator-log-dir' && argv[index + 1]) {
      options.orchestratorLogDir = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--orchestrator-log-dir=')) {
      options.orchestratorLogDir = path.resolve(
        ROOT_DIR,
        token.slice('--orchestrator-log-dir='.length),
      );
      continue;
    }
    if ((token === '--species-matrix' || token === '--species-matrix-path') && argv[index + 1]) {
      options.speciesMatrix = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--species-matrix=')) {
      options.speciesMatrix = path.resolve(ROOT_DIR, token.slice('--species-matrix='.length));
      continue;
    }
    if (token.startsWith('--species-matrix-path=')) {
      options.speciesMatrix = path.resolve(ROOT_DIR, token.slice('--species-matrix-path='.length));
      continue;
    }
  }

  return options;
}

async function readJsonMaybe(filePath, fallback = null) {
  if (!filePath) {
    return fallback;
  }
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, payload) {
  const targetDir = path.dirname(filePath);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function createStaticTraitDiagnostics(options = {}) {
  const baselinePath = options.baselinePath;
  let diagnostics = null;
  let status = { fetchedAt: null, error: null };

  async function load() {
    if (!baselinePath) {
      diagnostics = null;
      status = { fetchedAt: null, error: 'Trait baseline non configurato' };
      return null;
    }
    const baseline = await readJsonMaybe(baselinePath, null);
    if (!baseline) {
      diagnostics = null;
      status = { fetchedAt: null, error: 'Trait baseline non disponibile' };
      return null;
    }
    diagnostics = {
      summary: baseline.summary || {},
      checks: baseline.checks || {},
      highlights: baseline.highlights || {},
      generated_at: baseline.generated_at || baseline.generatedAt || null,
    };
    status = {
      fetchedAt: diagnostics.generated_at || new Date().toISOString(),
      error: null,
    };
    return diagnostics;
  }

  async function ensureLoaded() {
    if (diagnostics) {
      return diagnostics;
    }
    return load();
  }

  function getDiagnostics() {
    return diagnostics;
  }

  function getStatus() {
    return { ...status };
  }

  return {
    load,
    ensureLoaded,
    getDiagnostics,
    getStatus,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const snapshotStore = createGenerationSnapshotStore({ datasetPath: options.snapshot });
  const traitDiagnostics = createStaticTraitDiagnostics({ baselinePath: options.traitBaseline });
  const nebulaAggregator = createNebulaTelemetryAggregator({
    telemetryPath: options.telemetry,
    generatorTelemetryPath: options.generatorTelemetry,
    orchestrator: {
      logDir: options.orchestratorLogDir,
    },
    speciesMatrixPath: options.speciesMatrix,
  });

  const reporter = createReleaseReporter({
    snapshotStore,
    traitDiagnostics,
    nebulaAggregator,
  });

  const baseStatus = (await readJsonMaybe(options.status, null)) || {
    deployments: [],
    updatedAt: null,
  };
  const enriched = await reporter.buildReport(baseStatus);
  enriched.updatedAt = new Date().toISOString();

  await writeJson(options.status, enriched);
  console.log(`[status] report aggiornato in ${options.status}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[status] errore generazione status report:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_SPECIES_MATRIX_PATH,
  parseArgs,
  createStaticTraitDiagnostics,
  main,
};
