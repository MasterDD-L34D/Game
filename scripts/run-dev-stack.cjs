#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process');

function runSync(command) {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runSync('npm run dev:setup --workspace apps/backend');

const api = spawn('npm run start:api', {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

function stopApiAndExit(code) {
  if (!api.killed) {
    api.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => stopApiAndExit(130));
process.on('SIGTERM', () => stopApiAndExit(130));

api.on('exit', (code) => {
  process.exit(code ?? 0);
});
