#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const options = {
    id: 'flowSnapshot',
    configPath: null,
    targetDir: null,
    forceFallback: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--id' && argv[index + 1]) {
      options.id = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--config' && argv[index + 1]) {
      options.configPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--target' && argv[index + 1]) {
      options.targetDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--force-fallback') {
      options.forceFallback = true;
      continue;
    }
  }
  return options;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with status ${code}`));
    });
  });
}

async function downloadHttp(url, destination) {
  const target = new URL(url);
  const client = target.protocol === 'https:' ? https : http;
  await new Promise((resolve, reject) => {
    const request = client.get(target, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadHttp(response.headers.location, destination).then(resolve).catch(reject);
        return;
      }
      if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`HTTP download failed with status ${response.statusCode}`));
        response.resume();
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          await fs.writeFile(destination, Buffer.concat(chunks));
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
  });
}

async function syncFromShared(sharedUri, targetPath) {
  if (!sharedUri) {
    return false;
  }
  const tempPath = `${targetPath}.download`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  try {
    if (sharedUri.startsWith('s3://')) {
      await runCommand('aws', ['s3', 'cp', sharedUri, tempPath]);
    } else if (sharedUri.startsWith('http://') || sharedUri.startsWith('https://')) {
      await downloadHttp(sharedUri, tempPath);
    } else if (sharedUri.startsWith('file://')) {
      const resolved = sharedUri.slice('file://'.length);
      await fs.copyFile(resolved, tempPath);
    } else {
      const resolved = path.isAbsolute(sharedUri)
        ? sharedUri
        : path.resolve(ROOT_DIR, sharedUri);
      await fs.copyFile(resolved, tempPath);
    }
    await fs.rename(tempPath, targetPath);
    return true;
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    console.warn(`[snapshot-sync] sincronizzazione da ${sharedUri} fallita: ${error.message || error}`);
    return false;
  }
}

async function copyFallback(fallbackPath, targetPath) {
  if (!fallbackPath) {
    return false;
  }
  const absoluteFallback = path.isAbsolute(fallbackPath)
    ? fallbackPath
    : path.resolve(ROOT_DIR, fallbackPath);
  if (!(await fileExists(absoluteFallback))) {
    console.warn(`[snapshot-sync] fallback non trovato: ${absoluteFallback}`);
    return false;
  }
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(absoluteFallback, targetPath);
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.configPath
    ? path.resolve(ROOT_DIR, args.configPath)
    : path.join(ROOT_DIR, 'config', 'dataSources.json');

  const configRaw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(configRaw);
  const entry = config[args.id];
  if (!entry) {
    console.error(`[snapshot-sync] sorgente non configurata: ${args.id}`);
    process.exit(1);
    return;
  }

  const targetBase = args.targetDir
    ? path.resolve(ROOT_DIR, args.targetDir)
    : path.join(ROOT_DIR, 'data');
  const localRelative = entry.local || entry.localPath || 'flow-shell/atlas-snapshot.json';
  const targetPath = path.resolve(targetBase, localRelative);

  const sharedUri = args.forceFallback ? null : process.env.DEPLOY_SNAPSHOT_URI || entry.shared;

  let success = false;
  if (sharedUri) {
    console.log(`[snapshot-sync] sincronizzo snapshot da ${sharedUri}`);
    success = await syncFromShared(sharedUri, targetPath);
  }

  if (!success) {
    console.log('[snapshot-sync] utilizzo fallback locale per lo snapshot');
    success = await copyFallback(entry.fallback, targetPath);
  }

  if (!success) {
    console.error('[snapshot-sync] impossibile aggiornare lo snapshot iniziale');
    process.exit(1);
    return;
  }

  console.log(`[snapshot-sync] snapshot disponibile in ${targetPath}`);
}

main().catch((error) => {
  console.error('[snapshot-sync] errore inatteso', error);
  process.exit(1);
});
