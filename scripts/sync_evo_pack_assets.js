#!/usr/bin/env node

/**
 * Synchronises the Evo Tactics pack catalog assets with the local docs and
 * public folders so that static bundles always ship with the latest fallbacks.
 */

const fs = require('node:fs');
const path = require('node:path');

const { readJsonFile, writeJsonFile } = require('./utils/jsonio');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACK_DOCS_DIR = path.join(REPO_ROOT, 'packs', 'evo_tactics_pack', 'docs', 'catalog');
const DOCS_TARGET = path.join(REPO_ROOT, 'docs', 'evo-tactics-pack');
const PUBLIC_TARGET = path.join(REPO_ROOT, 'public', 'docs', 'evo-tactics-pack');

const PATH_PREFIX_SOURCE = '../../data/';
const PATH_PREFIX_TARGET = '../../packs/evo_tactics_pack/data/';

const ASSET_MAP = [
  { source: 'catalog_data.json', targets: ['catalog_data.json'], rewritePaths: true },
  { source: 'env_traits.json', targets: ['env-traits.json'] },
  { source: 'trait_reference.json', targets: ['trait-reference.json'] },
  { source: 'trait_glossary.json', targets: ['trait-glossary.json'] },
  { source: 'hazards.json', targets: ['hazards.json'] },
  { source: 'species-index.json', targets: ['species-index.json'], rewritePaths: true },
];

function ensureDir(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

function copyFile(sourcePath, targetPath) {
  ensureDir(targetPath);
  fs.copyFileSync(sourcePath, targetPath);
}

function rewritePathPrefix(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.startsWith(PATH_PREFIX_TARGET)) {
    return value;
  }
  if (value.startsWith(PATH_PREFIX_SOURCE)) {
    return PATH_PREFIX_TARGET + value.slice(PATH_PREFIX_SOURCE.length);
  }
  return value;
}

function updatePathFields(value) {
  if (typeof value === 'string') {
    return rewritePathPrefix(value);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      value[index] = updatePathFields(entry);
    });
    return value;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  Object.keys(value).forEach((key) => {
    value[key] = updatePathFields(value[key]);
  });
  return value;
}

function rewriteJsonWithMutator(sourcePath, targetPath, mutator) {
  const data = readJsonFile(sourcePath);
  const mutated = mutator(data) ?? data;
  writeJsonFile(targetPath, mutated);
}

function syncMirrorFile(sourcePath, targetPath, rewritePaths) {
  if (rewritePaths && path.extname(sourcePath) === '.json') {
    rewriteJsonWithMutator(sourcePath, targetPath, updatePathFields);
    return;
  }
  copyFile(sourcePath, targetPath);
}

function syncAssets() {
  ASSET_MAP.forEach(({ source, targets, rewritePaths }) => {
    const sourcePath = path.join(PACK_DOCS_DIR, source);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Asset mancante: ${sourcePath}`);
      return;
    }
    targets.forEach((targetName) => {
      const docsTarget = path.join(DOCS_TARGET, targetName);
      const publicTarget = path.join(PUBLIC_TARGET, targetName);
      syncMirrorFile(sourcePath, docsTarget, rewritePaths);
      syncMirrorFile(sourcePath, publicTarget, rewritePaths);
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
      const docsTarget = path.join(DOCS_TARGET, 'species', entry.name);
      const publicTarget = path.join(PUBLIC_TARGET, 'species', entry.name);
      syncMirrorFile(sourcePath, docsTarget, true);
      syncMirrorFile(sourcePath, publicTarget, true);
    });
  }
}

syncAssets();
