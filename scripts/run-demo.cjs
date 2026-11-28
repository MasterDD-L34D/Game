#!/usr/bin/env node
// Demo one-tunnel runner: single HTTP+WS server, single ngrok tunnel.
// Sets LOBBY_WS_SHARED=true so WS attaches to the same HTTP server,
// and the static /play route advertises same-origin /ws.

const { spawn } = require('node:child_process');
const path = require('node:path');

process.env.LOBBY_WS_SHARED = 'true';
process.env.LOBBY_WS_ENABLED = process.env.LOBBY_WS_ENABLED || 'true';

const backendEntry = path.resolve(__dirname, '..', 'apps', 'backend', 'index.js');
const child = spawn(process.execPath, [backendEntry], {
  stdio: 'inherit',
  env: process.env,
});

const forward = (sig) => () => {
  if (!child.killed) child.kill(sig);
};
process.on('SIGINT', forward('SIGINT'));
process.on('SIGTERM', forward('SIGTERM'));

child.on('exit', (code) => process.exit(code ?? 0));
