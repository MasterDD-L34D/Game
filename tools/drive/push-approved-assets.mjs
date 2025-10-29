#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
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
  const manifestPath = path.resolve(repoRoot, args.manifest || 'data/drive/approved_assets.json');
  const manifest = await loadManifest(manifestPath);

  const url = args.url || process.env.DRIVE_SYNC_WEBAPP_URL;
  if (!url) {
    console.error('Specifica l\'URL del WebApp Apps Script tramite --url o variabile DRIVE_SYNC_WEBAPP_URL.');
    process.exitCode = 1;
    return;
  }

  const token = args.token || process.env.DRIVE_SYNC_WEBAPP_TOKEN || '';
  const payload = {
    action: 'updateApprovedAssets',
    manifest
  };

  let requestUrl = url;
  const headers = { 'content-type': 'application/json' };

  if (token) {
    if (args.tokenLocation === 'query') {
      const separator = requestUrl.includes('?') ? '&' : '?';
      requestUrl = `${requestUrl}${separator}token=${encodeURIComponent(token)}`;
    } else if (args.tokenLocation === 'header') {
      headers.Authorization = `Bearer ${token}`;
    } else {
      payload.token = token;
    }
  }

  if (args.dryRun) {
    console.log('DRY-RUN: non invio nulla. Payload generato:');
    console.log(JSON.stringify({ url: requestUrl, headers, payload }, null, 2));
    return;
  }

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    const json = safeParseJson(text);
    if (!response.ok) {
      console.error(`Errore HTTP ${response.status}: ${text}`);
      process.exitCode = 1;
      return;
    }
    if (!json || json.ok !== true) {
      console.error('La risposta del WebApp indica un errore:', text);
      process.exitCode = 1;
      return;
    }
    const result = json.result || {};
    console.log(
      `Manifest approvato inviato con successo (${result.assets || manifest.assets?.length || 0} asset, timestamp ${result.generatedAt || manifest.generatedAt}).`
    );
  } catch (error) {
    console.error('Invio fallito:', error.message || error);
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const args = { tokenLocation: 'body', dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      return args;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    const [key, value] = token.split('=', 2);
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

async function loadManifest(manifestPath) {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Il manifest non contiene un JSON valido.');
    }
    return parsed;
  } catch (error) {
    console.error(`Impossibile leggere il manifest ${manifestPath}:`, error.message || error);
    process.exitCode = 1;
    throw error;
  }
}

function safeParseJson(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function printUsage() {
  console.log(`Uso: push-approved-assets [--manifest <path>] [--url <webapp>] [--token <value>] [--token-location body|query|header] [--dry-run]\n\n` +
    'Invia l\'elenco degli asset approvati al WebApp Apps Script driveSync.');
}

main().catch(error => {
  console.error('Errore inatteso:', error);
  process.exitCode = 1;
});
