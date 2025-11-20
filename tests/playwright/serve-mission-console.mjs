#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const consoleRoot = path.join(repoRoot, 'tests', 'playwright', 'mock-app');
const defaultHost = process.env.PLAYWRIGHT_WEB_HOST ?? '127.0.0.1';
const defaultPort = Number.parseInt(process.env.PLAYWRIGHT_WEB_PORT ?? '4173', 10);

const apiTarget = new URL(process.env.MISSION_CONSOLE_API_TARGET ?? 'http://127.0.0.1:3333');
const apiHost = apiTarget.hostname;
const apiPort = Number.parseInt(
  apiTarget.port || (apiTarget.protocol === 'https:' ? '443' : '80'),
  10,
);
const apiClient = apiTarget.protocol === 'https:' ? https : http;

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.webm', 'video/webm'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const apiProcess = spawn('node', ['apps/backend/index.js'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    HOST: process.env.MISSION_CONSOLE_API_HOST ?? apiHost,
    PORT: String(apiPort),
  },
  stdio: 'inherit',
});

apiProcess.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  if (code !== 0) {
    console.error(`[mission-console] API server exited with code ${code}`);
    process.exit(code ?? 1);
  }
});

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? `${defaultHost}:${defaultPort}`}`,
    );
    const { pathname, search } = requestUrl;

    if (pathname.startsWith('/api/')) {
      const proxyPath = pathname;
      const proxyReq = apiClient.request(
        {
          hostname: apiHost,
          port: apiPort,
          path: `${proxyPath}${search}`,
          method: req.method,
          headers: {
            ...req.headers,
            host: apiTarget.host,
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );

      proxyReq.on('error', (error) => {
        console.error('[mission-console] Proxy error:', error.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('Bad gateway');
      });

      if (req.method && !['GET', 'HEAD'].includes(req.method.toUpperCase())) {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }
      return;
    }

    if (pathname === '/' || pathname === '') {
      res.writeHead(302, { Location: '/index.html' });
      res.end();
      return;
    }

    const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    if (await serveConsoleAsset(relativePath, res)) {
      return;
    }

    await serveStatic(path.join(repoRoot, relativePath), res);
  } catch (error) {
    if (!res.headersSent) {
      const status = error.code === 'ENOENT' ? 404 : 500;
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(status === 404 ? 'Not found' : 'Internal server error');
    } else {
      res.end();
    }
  }
});

async function serveStatic(targetPath, res) {
  const resolvedPath = await resolveFile(targetPath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = mimeTypes.get(ext) ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  const stream = createReadStream(resolvedPath);
  stream.on('error', (error) => {
    console.error('[mission-console] Stream error:', error.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal server error');
  });
  stream.pipe(res);
}

async function serveConsoleAsset(relativePath, res) {
  const candidate = relativePath === '' ? 'index.html' : relativePath;
  try {
    await serveStatic(path.join(consoleRoot, candidate), res);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function resolveFile(targetPath) {
  const stats = await stat(targetPath);
  if (stats.isDirectory()) {
    return resolveFile(path.join(targetPath, 'index.html'));
  }
  return targetPath;
}

function shutdown() {
  server.close(() => process.exit(0));
  if (!apiProcess.killed) {
    apiProcess.kill('SIGTERM');
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(defaultPort, defaultHost, () => {
  console.log(
    `[mission-console] server listening on http://${defaultHost}:${defaultPort}/index.html`,
  );
});
