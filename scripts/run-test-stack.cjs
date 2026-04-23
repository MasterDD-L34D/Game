#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const result = spawnSync('npm run test:backend', {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
