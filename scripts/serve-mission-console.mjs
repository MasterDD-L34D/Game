#!/usr/bin/env node
/**
 * Serve Mission Console with API proxy to backend.
 *
 * Usage: node scripts/serve-mission-console.mjs [port]
 *
 * Serves docs/mission-console/ as static SPA and proxies /api/* to backend
 * (default http://localhost:3334). Start backend first with `npm run start:api`.
 */
import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', 'docs', 'mission-console');
const PORT = Number(process.argv[2]) || 5555;
const API_TARGET = process.env.API_TARGET || 'http://localhost:3334';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function serveStatic(res, filePath) {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error('not a file');
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    return false;
  }
  return true;
}

function proxyToBackend(req, res) {
  const url = new URL(API_TARGET);
  const opts = {
    hostname: url.hostname,
    port: url.port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${url.hostname}:${url.port}` },
  };

  const proxy = httpRequest(opts, (upstream) => {
    res.writeHead(upstream.statusCode, upstream.headers);
    upstream.pipe(res);
  });

  proxy.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ error: 'Backend non raggiungibile', hint: 'Avvia npm run start:api' }),
    );
  });

  req.pipe(proxy);
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname;

  // Proxy API calls to backend
  if (pathname.startsWith('/api/')) {
    return proxyToBackend(req, res);
  }

  // Try static file
  const filePath = join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (await serveStatic(res, filePath)) return;

  // SPA fallback — serve index.html for client routes
  await serveStatic(res, join(ROOT, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`[mission-console] http://localhost:${PORT}`);
  console.log(`[mission-console] API proxy → ${API_TARGET}`);
  console.log(`[mission-console] Static root: ${ROOT}`);
});
