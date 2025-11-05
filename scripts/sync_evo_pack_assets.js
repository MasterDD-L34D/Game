#!/usr/bin/env node

/**
 * Synchronises the Evo Tactics pack catalog assets with the local docs and
 * public folders so that static bundles always ship with the latest fallbacks.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACK_DOCS_DIR = path.join(REPO_ROOT, 'packs', 'evo_tactics_pack', 'docs', 'catalog');
const DOCS_TARGET = path.join(REPO_ROOT, 'docs', 'evo-tactics-pack');
const PUBLIC_TARGET = path.join(REPO_ROOT, 'public', 'docs', 'evo-tactics-pack');

const ASSET_MAP = [
  { source: 'catalog_data.json', targets: ['catalog_data.json'] },
  { source: 'env_traits.json', targets: ['env-traits.json'] },
  { source: 'trait_reference.json', targets: ['trait-reference.json'] },
  { source: 'trait_glossary.json', targets: ['trait-glossary.json'] },
  { source: 'hazards.json', targets: ['hazards.json'] },
  { source: 'species-index.json', targets: ['species-index.json'] },
];

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function syncAssets() {
  ASSET_MAP.forEach(({ source, targets }) => {
    const sourcePath = path.join(PACK_DOCS_DIR, source);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Asset mancante: ${sourcePath}`);
      return;
    }
    targets.forEach((targetName) => {
      copyFile(sourcePath, path.join(DOCS_TARGET, targetName));
      copyFile(sourcePath, path.join(PUBLIC_TARGET, targetName));
    });
  });

  // Copy trait category index used by the generator fallback.
  const traitIndexSource = path.join(DOCS_TARGET, 'traits');
  if (fs.existsSync(traitIndexSource)) {
    const entries = fs.readdirSync(traitIndexSource, { withFileTypes: true });
    entries.forEach((entry) => {
      const sourcePath = path.join(traitIndexSource, entry.name);
      const targetPath = path.join(PUBLIC_TARGET, 'traits', entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
      } else {
        copyFile(sourcePath, targetPath);
      }
    });
  }

  // Copy generated species registry directory for completeness.
  const speciesDir = path.join(PACK_DOCS_DIR, 'species');
  if (fs.existsSync(speciesDir)) {
    const entries = fs.readdirSync(speciesDir, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry.isFile()) return;
      const sourcePath = path.join(speciesDir, entry.name);
      copyFile(sourcePath, path.join(DOCS_TARGET, 'species', entry.name));
      copyFile(sourcePath, path.join(PUBLIC_TARGET, 'species', entry.name));
    });
  }
}

syncAssets();
