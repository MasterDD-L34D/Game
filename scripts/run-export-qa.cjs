#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const env = {
  ...process.env,
  ORCHESTRATOR_METRICS_DISABLED: 'true',
};

const result = spawnSync('node scripts/export-qa-report.js', {
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status ?? 1);
