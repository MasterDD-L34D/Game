#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DOCS_ROOT = path.resolve(__dirname, '..', 'docs');
const HOST = '0.0.0.0';
const PORT = Number(process.env.DOCS_PORT || 5000);
const API_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const API_ARGS = ['run', 'start:api'];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send404(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('404 – File non trovato');
}

function send500(res, error) {
  console.error('[docs] Errore server statico:', error);
  res.statusCode = 500;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('500 – Errore interno server statico');
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const safePath = decodeURIComponent(parsedUrl.pathname || '/');
    const requestedPath = path.normalize(safePath).replace(/^\/+/, '');
    const resolvedPath = path.join(DOCS_ROOT, requestedPath);

    if (!resolvedPath.startsWith(DOCS_ROOT)) {
      send404(res);
      return;
    }

    let finalPath = resolvedPath;
    fs.stat(finalPath, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Se non ha estensione prova con .html
          const candidateHtml = `${resolvedPath}.html`;
          fs.stat(candidateHtml, (htmlErr, htmlStats) => {
            if (htmlErr || !htmlStats.isFile()) {
              send404(res);
              return;
            }
            streamFile(candidateHtml, res);
          });
        } else {
          send500(res, err);
        }
        return;
      }

      if (stats.isDirectory()) {
        const indexPath = path.join(finalPath, 'index.html');
        fs.stat(indexPath, (indexErr, indexStats) => {
          if (indexErr || !indexStats.isFile()) {
            send404(res);
            return;
          }
          streamFile(indexPath, res);
        });
        return;
      }

      if (stats.isFile()) {
        streamFile(finalPath, res);
        return;
      }

      send404(res);
    });
  });
}

function streamFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || 'application/octet-stream';
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    send500(res, error);
  });
  stream.pipe(res);
}

function startApi() {
  const child = spawn(API_COMMAND, API_ARGS, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`\n[api] terminato con codice ${code ?? `signal ${signal}`}`);
    }
    shutdown(code ?? (signal ? 1 : 0));
  });

  child.on('error', (error) => {
    console.error('[api] errore di avvio:', error);
    shutdown(1);
  });

  return child;
}

const server = createStaticServer();
let apiProcess;
let shuttingDown = false;

server.listen(PORT, HOST, () => {
  console.log(`Server statico attivo su http://127.0.0.1:${PORT}`);
  console.log('Avvio backend Idea Engine...');
  apiProcess = startApi();
});

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill('SIGINT');
  }

  server.close(() => {
    process.exit(exitCode);
  });

  setTimeout(() => {
    process.exit(exitCode);
  }, 500).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
