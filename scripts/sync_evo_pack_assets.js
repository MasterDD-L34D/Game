#!/usr/bin/env node

/**
 * Synchronises the Evo Tactics pack catalog assets with the local docs and
 * public folders so that static bundles always ship with the latest fallbacks.
 */

const fs = require('node:fs');
const path = require('node:path');

const { readJsonFile, writeJsonFileFormatted } = require('./utils/jsonio');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PACK_ROOT = path.join(REPO_ROOT, 'packs', 'evo_tactics_pack');
const DEFAULT_DOCS_TARGET = path.join(REPO_ROOT, 'docs', 'evo-tactics-pack');
const DEFAULT_PUBLIC_TARGET = path.join(REPO_ROOT, 'public', 'docs', 'evo-tactics-pack');

function ensurePosix(value) {
  return value.split(path.sep).join('/');
}

function parseArgs(argv) {
  const args = {
    packRoot: DEFAULT_PACK_ROOT,
    docsTarget: DEFAULT_DOCS_TARGET,
    publicTarget: DEFAULT_PUBLIC_TARGET,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--pack-root' && argv[index + 1]) {
      args.packRoot = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (current === '--docs-target' && argv[index + 1]) {
      args.docsTarget = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (current === '--public-target' && argv[index + 1]) {
      args.publicTarget = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

const { packRoot, docsTarget, publicTarget } = parseArgs(process.argv.slice(2));

const PACK_DOCS_DIR = path.join(packRoot, 'docs', 'catalog');
const DOCS_TARGET = docsTarget;
const PUBLIC_TARGET = publicTarget;

const PATH_PREFIX_SOURCE = ensurePosix(
  path.relative(DOCS_TARGET, path.join(REPO_ROOT, 'data')) + '/',
);
const PATH_PREFIX_TARGET = ensurePosix(
  path.relative(DOCS_TARGET, path.join(packRoot, 'data')) + '/',
);

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
  // Skip identical targets so repeated syncs do not churn mtimes.
  if (fs.existsSync(targetPath)) {
    const source = fs.readFileSync(sourcePath);
    if (source.equals(fs.readFileSync(targetPath))) {
      return;
    }
  }
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

async function rewriteJsonWithMutator(sourcePath, targetPath, mutator) {
  const data = readJsonFile(sourcePath);
  const mutated = mutator(data) ?? data;
  // Strict comparison (no ignored keys): mirrors must track the pack source
  // byte-for-byte semantics, timestamps included. The skip only avoids
  // rewriting identical content with churned formatting.
  await writeJsonFileFormatted(targetPath, mutated, { ignoreKeys: [] });
}

async function syncMirrorFile(sourcePath, targetPath, rewritePaths) {
  // JSON mirrors always go through the semantic writer: a byte copy would
  // clobber prettier-formatted committed mirrors with the JSON.stringify
  // style (and CRLF line endings) of the pack sources.
  if (path.extname(sourcePath) === '.json') {
    const mutator = rewritePaths ? updatePathFields : (data) => data;
    await rewriteJsonWithMutator(sourcePath, targetPath, mutator);
    return;
  }
  copyFile(sourcePath, targetPath);
}

async function syncAssets() {
  for (const { source, targets, rewritePaths } of ASSET_MAP) {
    const sourcePath = path.join(PACK_DOCS_DIR, source);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Asset mancante: ${sourcePath}`);
      continue;
    }
    for (const targetName of targets) {
      const docsTarget = path.join(DOCS_TARGET, targetName);
      const publicTarget = path.join(PUBLIC_TARGET, targetName);
      await syncMirrorFile(sourcePath, docsTarget, rewritePaths);
      await syncMirrorFile(sourcePath, publicTarget, rewritePaths);
    }
  }

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
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const sourcePath = path.join(speciesDir, entry.name);
      const docsTarget = path.join(DOCS_TARGET, 'species', entry.name);
      const publicTarget = path.join(PUBLIC_TARGET, 'species', entry.name);
      await syncMirrorFile(sourcePath, docsTarget, true);
      await syncMirrorFile(sourcePath, publicTarget, true);
    }
  }
}

syncAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
