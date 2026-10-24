#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distRoot = path.join(repoRoot, 'dist', 'evo-tactics-pack');

const args = process.argv.slice(2);
let port = 4173;
for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  if ((value === '--port' || value === '-p') && index + 1 < args.length) {
    port = Number.parseInt(args[index + 1], 10) || port;
    index += 1;
  }
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function resolvePath(requestPath) {
  const sanitized = requestPath.split('?')[0].split('#')[0];
  const normalized = path.normalize(decodeURIComponent(sanitized));
  const candidate = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  return path.join(distRoot, candidate);
}

async function serveFile(filePath, response) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (await fileExists(indexPath)) {
        await serveFile(indexPath, response);
        return;
      }
      response.writeHead(403);
      response.end('Directory listing non disponibile');
      return;
    }

    const ext = path.extname(filePath);
    const mime = mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
    const data = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length });
    response.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      response.writeHead(404);
      response.end('Risorsa non trovata');
      return;
    }
    console.error('Errore durante la lettura di', filePath, error);
    response.writeHead(500);
    response.end('Errore interno');
  }
}

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

if (!existsSync(distRoot)) {
  console.error(
    '❌ Cartella dist/evo-tactics-pack non trovata. Esegui prima `npm run build:evo-tactics-pack`.',
  );
  process.exitCode = 1;
  process.exit();
}

const server = http.createServer(async (request, response) => {
  const method = request.method || 'GET';
  if (!['GET', 'HEAD'].includes(method)) {
    response.writeHead(405);
    response.end('Metodo non supportato');
    return;
  }

  let filePath = resolvePath(request.url || '/');
  if (!filePath.startsWith(distRoot)) {
    response.writeHead(403);
    response.end('Percorso non consentito');
    return;
  }

  if (filePath === distRoot) {
    filePath = path.join(distRoot, 'index.html');
  }

  await serveFile(filePath, response);
});

server.listen(port, () => {
  console.log(`▶ Anteprima disponibile su http://localhost:${port}`);
  console.log('  Premi CTRL+C per interrompere.');
});
