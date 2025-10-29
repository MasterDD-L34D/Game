#!/usr/bin/env node

import { spawn } from 'node:child_process';
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
  const generatorScript = path.resolve(repoRoot, 'tools/drive/generate-approved-assets.mjs');
  const pushScript = path.resolve(repoRoot, 'tools/drive/push-approved-assets.mjs');

  const generatorArgs = [generatorScript];
  if (args.config) {
    generatorArgs.push('--config', args.config);
  }
  if (args.output) {
    generatorArgs.push('--output', args.output);
  }
  if (args.quiet) {
    generatorArgs.push('--quiet');
  }

  await runSubprocess('node', generatorArgs);

  const pushArgs = [pushScript];
  if (args.manifest) {
    pushArgs.push('--manifest', args.manifest);
  } else if (args.output) {
    pushArgs.push('--manifest', args.output);
  }
  if (args.url) {
    pushArgs.push('--url', args.url);
  }
  if (args.token) {
    pushArgs.push('--token', args.token);
  }
  if (args.tokenLocation) {
    pushArgs.push('--token-location', args.tokenLocation);
  }

  let dryRun = args.dryRun;
  const hasUrl = args.url || process.env.DRIVE_SYNC_WEBAPP_URL;
  if (!hasUrl && !dryRun) {
    dryRun = true;
    console.warn('URL del WebApp non configurato: eseguo push in modalità dry-run.');
  }
  if (dryRun) {
    pushArgs.push('--dry-run');
  }

  await runSubprocess('node', pushArgs);
}

async function runSubprocess(command, commandArgs) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: 'inherit' });
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code}`));
        return;
      }
      resolve();
    });
    child.on('error', error => {
      reject(error);
    });
  });
}

function parseArgs(argv) {
  const args = {
    quiet: false,
    dryRun: false
  };

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
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    const [key, value] = token.split('=', 2);
    if (key === '--config') {
      args.config = value !== undefined ? value : argv[++i];
      continue;
    }
    if (key === '--output') {
      args.output = value !== undefined ? value : argv[++i];
      continue;
    }
    if (key === '--manifest') {
      args.manifest = value !== undefined ? value : argv[++i];
      continue;
    }
    if (key === '--url') {
      args.url = value !== undefined ? value : argv[++i];
      continue;
    }
    if (key === '--token') {
      args.token = value !== undefined ? value : argv[++i];
      continue;
    }
    if (key === '--token-location') {
      const location = (value !== undefined ? value : argv[++i]) || 'body';
      if (!['body', 'query', 'header'].includes(location)) {
        console.error('Valore non valido per --token-location: usa body, query o header.');
        args.help = true;
        return args;
      }
      args.tokenLocation = location;
      continue;
    }

    console.error(`Argomento non riconosciuto: ${token}`);
    args.help = true;
    return args;
  }

  return args;
}

function printUsage() {
  console.log(`Uso: drive-sync [--config <path>] [--output <path>] [--manifest <path>] [--url <webapp>]` +
    ` [--token <value>] [--token-location body|query|header] [--dry-run] [--quiet]\n\n` +
    'Genera il manifest degli asset approvati e lo invia al WebApp driveSync.');
}

main().catch(error => {
  console.error('drive-sync fallito:', error.message || error);
  process.exitCode = 1;
});
