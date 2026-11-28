#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const requiredFiles = [
  'public/data/flow/snapshots/flow-shell-snapshot.json',
  'public/data/flow/generation/species.json',
  'public/data/flow/generation/species-batch.json',
  'public/data/flow/generation/species-preview.json',
  'public/data/flow/validators/species.json',
  'public/data/flow/validators/biome.json',
  'public/data/flow/validators/foodweb.json',
  'public/data/flow/quality/suggestions/apply.json',
  'public/data/flow/traits/diagnostics.json',
  'public/data/nebula/atlas.json',
  'public/data/nebula/telemetry.json',
];

const cwd = process.cwd();
const missing = [];

for (const relativePath of requiredFiles) {
  const fullPath = resolve(cwd, relativePath);
  try {
    await access(fullPath, constants.R_OK);
    // eslint-disable-next-line no-console
    console.log(`✔︎ ${relativePath}`);
  } catch (error) {
    missing.push({ path: relativePath, error });
    // eslint-disable-next-line no-console
    console.error(`✖ ${relativePath} (non trovato)`);
  }
}

if (missing.length > 0) {
  process.exitCode = 1;
  // eslint-disable-next-line no-console
  console.error(`\nTotale file mancanti: ${missing.length}`);
} else {
  // eslint-disable-next-line no-console
  console.log('\nTutti i JSON richiesti sono presenti.');
}
