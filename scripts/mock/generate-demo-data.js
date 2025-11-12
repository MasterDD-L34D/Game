#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const Ajv = require('ajv/dist/2020');

const {
  generationSnapshotSchema,
  telemetrySchema,
  speciesSchema,
} = require('../../packages/contracts');
const { atlasDataset } = require('../../data/nebula/atlasDataset.js');
const {
  createNebulaTelemetryAggregator,
} = require('../../server/services/nebulaTelemetryAggregator');

const ROOT = path.resolve(__dirname, '..', '..');
const SNAPSHOT_SOURCE = path.resolve(ROOT, 'data', 'flow-shell', 'atlas-snapshot.json');
const SNAPSHOT_TARGET = path.resolve(
  ROOT,
  'webapp',
  'public',
  'data',
  'flow',
  'snapshots',
  'flow-shell-snapshot.json',
);
const ATLAS_TARGET = path.resolve(ROOT, 'webapp', 'public', 'data', 'nebula', 'atlas.json');
const TELEMETRY_TARGET = path.resolve(ROOT, 'webapp', 'public', 'data', 'nebula', 'telemetry.json');
const DEFAULT_TELEMETRY_SOURCE = path.resolve(
  ROOT,
  'data',
  'derived',
  'exports',
  'qa-telemetry-export.json',
);
const DEFAULT_GENERATOR_SOURCE = path.resolve(
  ROOT,
  'logs',
  'tooling',
  'generator_run_profile.json',
);
const DEFAULT_SPECIES_MATRIX_PATH = path.resolve(
  ROOT,
  'reports',
  'evo',
  'rollout',
  'species_ecosystem_matrix.csv',
);

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat('date-time', true);
const validateSnapshot = ajv.compile(generationSnapshotSchema);
const validateTelemetry = ajv.compile(telemetrySchema);
const validateSpecies = ajv.compile(speciesSchema);

function parseArgs(argv = []) {
  const options = {
    telemetryOnly: false,
    snapshotOnly: false,
    speciesMatrix: DEFAULT_SPECIES_MATRIX_PATH,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--telemetry-only') {
      options.telemetryOnly = true;
      continue;
    }
    if (token === '--snapshot-only') {
      options.snapshotOnly = true;
      continue;
    }
    if ((token === '--species-matrix' || token === '--species-matrix-path') && argv[index + 1]) {
      options.speciesMatrix = path.resolve(ROOT, argv[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith('--species-matrix=')) {
      options.speciesMatrix = path.resolve(ROOT, token.slice('--species-matrix='.length));
      continue;
    }
    if (token.startsWith('--species-matrix-path=')) {
      options.speciesMatrix = path.resolve(ROOT, token.slice('--species-matrix-path='.length));
      continue;
    }
  }
  return options;
}

function formatErrors(validator) {
  if (!validator || !validator.errors || !validator.errors.length) {
    return 'Errore di validazione sconosciuto';
  }
  return ajv.errorsText(validator.errors, { separator: '; ' });
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJson(filePath, payload) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function generateSnapshot() {
  const snapshot = await readJson(SNAPSHOT_SOURCE);
  if (!validateSnapshot(snapshot)) {
    throw new Error(`Snapshot demo non conforme allo schema: ${formatErrors(validateSnapshot)}`);
  }
  await writeJson(SNAPSHOT_TARGET, snapshot);
  return snapshot;
}

async function validateSpeciesList(list) {
  if (!Array.isArray(list)) {
    return;
  }
  for (let index = 0; index < list.length; index += 1) {
    const entry = list[index];
    if (!validateSpecies(entry)) {
      const message = formatErrors(validateSpecies);
      throw new Error(`Specie Nebula non conforme (index ${index}): ${message}`);
    }
  }
}

async function generateAtlasBundle(options = {}) {
  const dataset = options.dataset || atlasDataset;
  const telemetryPath = options.telemetryPath || DEFAULT_TELEMETRY_SOURCE;
  const generatorTelemetryPath = options.generatorTelemetryPath || DEFAULT_GENERATOR_SOURCE;
  const speciesMatrixPath =
    options.speciesMatrixPath || options.speciesMatrix || DEFAULT_SPECIES_MATRIX_PATH;
  const atlasTarget = options.atlasTarget || ATLAS_TARGET;
  const telemetryTarget = options.telemetryTarget || TELEMETRY_TARGET;

  const aggregator = createNebulaTelemetryAggregator({
    staticDataset: dataset,
    telemetryPath,
    generatorTelemetryPath,
    speciesMatrixPath,
  });
  const atlas = await aggregator.getAtlas({});
  if (atlas?.dataset?.species) {
    await validateSpeciesList(atlas.dataset.species);
  }
  if (atlas?.telemetry && !validateTelemetry(atlas.telemetry)) {
    throw new Error(
      `Telemetria Nebula non conforme allo schema: ${formatErrors(validateTelemetry)}`,
    );
  }
  await writeJson(atlasTarget, atlas);
  if (atlas?.telemetry) {
    await writeJson(telemetryTarget, atlas.telemetry);
  }
  return atlas;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const skipSnapshot = options.telemetryOnly;
  const skipAtlas = options.snapshotOnly;

  const results = {};
  if (!skipSnapshot) {
    results.snapshot = await generateSnapshot();
  }
  if (!skipAtlas) {
    results.atlas = await generateAtlasBundle({ speciesMatrixPath: options.speciesMatrix });
  }

  console.log('[mock] Snapshot demo aggiornato:', skipSnapshot ? 'skip' : SNAPSHOT_TARGET);
  console.log('[mock] Atlas demo aggiornato:', skipAtlas ? 'skip' : ATLAS_TARGET);
  if (!skipAtlas) {
    console.log('[mock] Telemetria demo aggiornata:', TELEMETRY_TARGET);
  }
  return results;
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[mock] Errore generazione demo', error);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  generateSnapshot,
  generateAtlasBundle,
  DEFAULT_SPECIES_MATRIX_PATH,
  SNAPSHOT_SOURCE,
  SNAPSHOT_TARGET,
  ATLAS_TARGET,
  TELEMETRY_TARGET,
};
