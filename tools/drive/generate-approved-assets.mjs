#!/usr/bin/env node

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)), '..');
  const configPath = path.resolve(repoRoot, args.config || 'config/drive/approved_asset_sources.json');
  const outputPath = path.resolve(repoRoot, args.output || 'data/drive/approved_assets.json');

  let config;
  try {
    const configRaw = await readFile(configPath, 'utf8');
    config = JSON.parse(configRaw);
  } catch (error) {
    console.error(`Impossibile leggere la configurazione ${configPath}:`, error.message || error);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(config.sources)) {
    console.error('La configurazione deve contenere una proprietà "sources" con una lista di sorgenti.');
    process.exitCode = 1;
    return;
  }

  const summary = [];
  const assets = [];

  for (const source of config.sources) {
    const normalized = normalizeSource(source);
    const rootPath = path.resolve(repoRoot, normalized.root);
    let rootStat;
    try {
      rootStat = await stat(rootPath);
    } catch (error) {
      summary.push({
        id: normalized.id,
        root: normalized.root,
        status: 'missing',
        reason: `Directory non trovata: ${normalized.root}`
      });
      continue;
    }

    if (!rootStat.isDirectory()) {
      summary.push({
        id: normalized.id,
        root: normalized.root,
        status: 'skipped',
        reason: 'Il percorso configurato non è una directory'
      });
      continue;
    }

    const collected = await collectAssetsFromSource({
      repoRoot,
      rootPath,
      source: normalized
    });

    assets.push(...collected.assets);
    summary.push({
      id: normalized.id,
      root: normalized.root,
      status: 'ok',
      total: collected.assets.length,
      skipped: collected.skipped
    });
  }

  assets.sort((a, b) => a.path.localeCompare(b.path));

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    config: {
      path: toPosix(path.relative(repoRoot, configPath)),
      version: config.version ?? null
    },
    totals: {
      assets: assets.length
    },
    summary,
    assets
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  if (!args.quiet) {
    console.log(`Manifest generato: ${path.relative(repoRoot, outputPath)} (${assets.length} asset approvati)`);
  }
}

function parseArgs(argv) {
  const args = { quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      return args;
    }
    if (token === '--quiet') {
      args.quiet = true;
      continue;
    }
    const [key, value] = token.split('=', 2);
    if (key === '--config') {
      if (value !== undefined) {
        args.config = value;
      } else {
        args.config = argv[++i];
      }
      continue;
    }
    if (key === '--output') {
      if (value !== undefined) {
        args.output = value;
      } else {
        args.output = argv[++i];
      }
      continue;
    }
    console.error(`Argomento non riconosciuto: ${token}`);
    args.help = true;
    break;
  }
  return args;
}

function printUsage() {
  console.log(`Uso: generate-approved-assets [--config <path>] [--output <path>] [--quiet]\n\n` +
    'Genera un manifest JSON con l\'elenco degli asset approvati da sincronizzare tramite driveSync.');
}

function normalizeSource(source) {
  if (!source || typeof source !== 'object') {
    return {
      id: null,
      root: '',
      extensions: [],
      include: [],
      exclude: []
    };
  }
  const toRegexList = entries =>
    (Array.isArray(entries) ? entries : [])
      .map(pattern => {
        try {
          return new RegExp(pattern, 'i');
        } catch (error) {
          console.warn(`Pattern regex non valido ignorato (${pattern}):`, error.message || error);
          return null;
        }
      })
      .filter(Boolean);

  const extensions = Array.isArray(source.extensions)
    ? source.extensions.map(ext => String(ext || '').toLowerCase())
    : [];

  return {
    id: source.id || null,
    description: source.description || null,
    root: source.root || '',
    driveSourceId: source.driveSourceId || null,
    extensions,
    include: toRegexList(source.include),
    exclude: toRegexList(source.exclude)
  };
}

async function collectAssetsFromSource({ repoRoot, rootPath, source }) {
  const assets = [];
  let skipped = 0;

  async function walk(currentPath) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const relPathFromRoot = toPosix(path.relative(rootPath, entryPath));
      const relPathFromRepo = toPosix(path.relative(repoRoot, entryPath));
      if (!shouldIncludeFile(relPathFromRoot, entryPath, source)) {
        skipped += 1;
        continue;
      }

      const info = await stat(entryPath);
      const sha256 = await hashFile(entryPath);
      assets.push({
        sourceId: source.id,
        driveSourceId: source.driveSourceId,
        fileName: path.basename(entryPath),
        path: relPathFromRepo,
        size: info.size,
        sha256,
        mtime: new Date(info.mtimeMs).toISOString()
      });
    }
  }

  await walk(rootPath);
  return { assets, skipped };
}

function shouldIncludeFile(relativePath, absolutePath, source) {
  const ext = path.extname(absolutePath).toLowerCase();
  if (source.extensions.length && !source.extensions.includes(ext)) {
    return false;
  }
  if (source.exclude.length && source.exclude.some(regex => regex.test(relativePath))) {
    return false;
  }
  if (source.include.length && !source.include.some(regex => regex.test(relativePath))) {
    return false;
  }
  return true;
}

async function hashFile(filePath) {
  const hash = createHash('sha256');
  const file = await readFile(filePath);
  hash.update(file);
  return hash.digest('hex');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

main().catch(error => {
  console.error('Errore non gestito durante la generazione del manifest:', error);
  process.exitCode = 1;
});
